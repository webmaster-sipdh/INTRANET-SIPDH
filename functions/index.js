const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// =====================================================================================
// INICIALIZACIÓN DE STRIPE Y MÓDULOS MODERNOS V2 EXIGIDOS POR v7
// =====================================================================================
const stripeSecret = process.env.STRIPE_SECRET_KEY || 'sk_placeholder_for_deployment_analysis';
const stripe = require('stripe')(stripeSecret);

// Importaciones modulares de segunda generación (v2)
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");

/**
 * UTILERÍA AUXILIAR: Formatea montos según las reglas de Stripe.
 * Identifica monedas de cero decimales como el Colón Costarricense (CRC).
 */
function obtenerUnidadesStripe(monto, moneda) {
  const monedaLimpia = moneda.toLowerCase().trim();
  if (monedaLimpia === 'crc') {
    return Math.round(monto);
  }
  return Math.round(monto * 100);
}

/**
 * UTILERÍA AUXILIAR: Obtiene la fecha actual en YYYY-MM-DD en la zona horaria de Costa Rica.
 */
function obtenerFechaActualCR() {
  const opciones = { timeZone: 'America/Costa_Rica', year: 'numeric', month: '2-digit', day: '2-digit' };
  const formateador = new Intl.DateTimeFormat('en-CA', opciones);
  return formateador.format(new Date());
}

// =====================================================================================
// TU WEBHOOK ORIGINAL DE SENDGRID (100% INTACTO Y SIN ALTERACIONES)
// =====================================================================================
exports.webhookSendGrid = functions.https.onRequest(async (req, res) => {
  const eventos = req.body;

  if (!Array.isArray(eventos)) {
    res.status(400).send('Formato de carga inválido');
    return;
  }

  try {
    for (const evento of eventos) {
      const email = evento.email;
      const tipoEvento = evento.event; 
      const timestamp = evento.timestamp * 1000; 
      const fechaCR = new Date(timestamp).toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' });
      
      const smtpId = evento['smtp-id'];
      
      let sgToken = null;
      if (evento.sg_message_id) {
        sgToken = evento.sg_message_id.split('.')[0];
      }

      if (!email || (!smtpId && !sgToken)) {
        continue;
      }

      // 🛡️ FILTRO 1: Ignorar aperturas automáticas (Apple MPP y Máquinas de SendGrid)
      if (tipoEvento === 'open' && (evento.apple_privacy_open === true || evento.sg_machine_open === true)) {
        console.log(`🤖 Apertura de máquina detectada para ${email}. Ignorando falso positivo.`);
        continue;
      }

      // 🛡️ FILTRO 2: Tu lógica original exacta para ignorar bots clásicos
      if (tipoEvento === 'open' && evento.useragent) {
        const ua = evento.useragent.toLowerCase();
        if (ua.includes('bot') || ua.includes('spider') || ua.includes('crawl') || ua.includes('scanner') || ua.includes('cloudflarestub')) {
          console.log(`🤖 Escáner de seguridad detectado por User-Agent: ${evento.useragent}. Ignorando apertura falsa.`);
          continue;
        }
      }

      let comunicadoDoc = null;

      // Localizar el comunicado maestro
      if (smtpId) {
        const querySnap = await db.collectionGroup('comunicados')
          .where('delivery.info.messageId', '==', smtpId)
          .limit(1)
          .get();
        
        if (!querySnap.empty) {
          comunicadoDoc = querySnap.docs[0];
          if (sgToken) {
            await comunicadoDoc.ref.update({ sg_token: sgToken });
          }
        }
      } 
      
      if (!comunicadoDoc && sgToken) {
        const querySnap = await db.collectionGroup('comunicados')
          .where('sg_token', '==', sgToken)
          .limit(1)
          .get();
        
        if (!querySnap.empty) {
          comunicadoDoc = querySnap.docs[0];
        }
      }

      if (!comunicadoDoc) {
        continue;
      }

      const comunicadoId = comunicadoDoc.id;
      const pathSegments = comunicadoDoc.ref.path.split('/');
      const casoId = pathSegments[1];

      // Localizar representado
      const clientesRef = db.collection('casos').doc(casoId).collection('clientes');
      const snapshot = await clientesRef.where('correo_principal', '==', email).limit(1).get();

      if (snapshot.empty) {
        continue;
      }

      const clienteId = snapshot.docs[0].id;

      const historialRef = db
        .collection('casos')
        .doc(casoId)
        .collection('clientes')
        .doc(clienteId)
        .collection('historial_comunicados')
        .doc(comunicadoId);

      let datosActualizacion = {
        comunicadoId: comunicadoId,
        ultima_actualizacion: fechaCR
      };

      if (tipoEvento === 'processed' || tipoEvento === 'delivered') {
        datosActualizacion.entregado_at = fechaCR;
        datosActualizacion.estado = 'Entregado';
      } else if (tipoEvento === 'open') {
        datosActualizacion.abierto_at = fechaCR;
        datosActualizacion.estado = 'Abierto';
      } else if (tipoEvento === 'bounce') {
        datosActualizacion.rebotado_at = fechaCR;
        datosActualizacion.estado = 'Rebotado';
        datosActualizacion.causa_rebote = evento.reason || 'Rebote duro';
      }

      await historialRef.set(datosActualizacion, { merge: true });
      console.log(`🎉 Evento [${tipoEvento}] procesado legítimamente para el cliente: ${clienteId}`);
    }
    
    res.status(200).send('Eventos processed correctamente');
  } catch (error) {
    console.error('❌ Error ejecutando el bucle del webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

// =====================================================================================
// MOTOR CRON: Tarea programada nocturna v2 con consulta cambiaria automatizada BCCR
// =====================================================================================
exports.nightlyBillingCron = onSchedule({
  schedule: '0 0 * * *', 
  timeZone: 'America/Costa_Rica'
}, async (event) => {
  const hoyCR = obtenerFechaActualCR();
  console.log(`[CRON] Iniciando barrido masivo de obligaciones para la fecha fiscal: ${hoyCR}`);

  // REQUERIMIENTO COMPUESTO v4.4: Consulta automatizada de tasa oficial al BCCR para la ventana fiscal diaria
  let tipoCambioVentaBCCR = 1;
  try {
    const apiRes = await fetch('https://tipodecambio.paginasweb.cr/api');
    const apiData = await apiRes.json();
    if (apiData && apiData.venta) {
      tipoCambioVentaBCCR = parseFloat(apiData.venta);
      console.log(`[CRON API] Tipo de cambio oficial de venta obtenido correctamente del BCCR: ¢${tipoCambioVentaBCCR}`);
    }
  } catch (errCambiario) {
    console.error(`[CRON WARNING] Falla al consumir el API cambiario de Costa Rica. Se usará valor neutro (1):`, errCambiario);
  }

  try {
    const snapshotCuotas = await db.collectionGroup('plan_pagos')
      .where('estado', '==', 'pendiente')
      .where('fecha_vencimiento', '==', hoyCR)
      .get();

    if (snapshotCuotas.empty) {
      console.log(`[CRON] No se detectaron cuotas calendarizadas para cobro el día de hoy.`);
      return null;
    }

    console.log(`[CRON] Se localizaron ${snapshotCuotas.size} transacciones pendientes para procesar.`);

    for (const docCuota of snapshotCuotas.docs) {
      const cuotaData = docCuota.data();
      const cuotaRef = docCuota.ref;

      const pathParts = cuotaRef.path.split('/');
      const casoId = pathParts[1];
      const clienteId = pathParts[3];

      const clienteSnap = await db.collection('casos').doc(casoId).collection('clientes').doc(clienteId).get();
      if (!clienteSnap.exists) {
        console.error(`[CRON ERROR] Ficha de cliente inexistente para la cuota: ${cuotaRef.path}`);
        continue;
      }

      const clienteData = clienteSnap.data();
      const emailCliente = clienteData.correo_principal || clienteData.correo;
      const nombreCompleto = `${clienteData.nombres || ''} ${clienteData.apellidos || ''}`.trim();

      if (!emailCliente) {
        console.error(`[CRON ERROR] Omisión de cobro: El representado ${nombreCompleto} no registra email en su ficha.`);
        continue;
      }

      try {
        let stripeCustomerId = clienteData.stripe_customer_id;

        if (!stripeCustomerId) {
          console.log(`[CRON] Creando perfil de cliente en Stripe para: ${emailCliente}`);
          const customer = await stripe.customers.create({
            email: emailCliente.toLowerCase().trim(),
            name: nombreCompleto,
            metadata: { casoId, clienteId }
          });
          stripeCustomerId = customer.id;
          
          await db.collection('casos').doc(casoId).collection('clientes').doc(clienteId).update({
            stripe_customer_id: stripeCustomerId
          });
        }

        const monedaFormateada = (cuotaData.moneda || 'usd').toLowerCase();
        const unidadesMoneda = obtenerUnidadesStripe(cuotaData.monto_total, monedaFormateada);

        console.log(`[CRON] Fijando hito financiero en Stripe por valor de: ${cuotaData.monto_total} ${monedaFormateada.toUpperCase()}`);
        await stripe.invoiceItems.create({
          customer: stripeCustomerId,
          amount: unidadesMoneda,
          currency: monedaFormateada,
          description: cuotaData.concepto,
          metadata: { cuotaId: docCuota.id, pathCuota: cuotaRef.path }
        });

        const invoice = await stripe.invoices.create({
          customer: stripeCustomerId,
          auto_advance: true,
          collection_method: 'send_invoice',
          days_until_due: 7, 
          metadata: { cuotaId: docCuota.id, pathCuota: cuotaRef.path }
        });

        const finalizedInvoice = await stripe.invoices.sendInvoice(invoice.id);

        // Actualización persistiendo la traza del tipo de cambio oficial de la v4.4
        await cuotaRef.update({
          stripe_invoice_id: finalizedInvoice.id,
          stripe_invoice_url: finalizedInvoice.hosted_invoice_url,
          metodo_pago: 'stripe',
          fecha_cobro_disparado: new Date().toISOString(),
          tipo_cambio_banco: tipoCambioVentaBCCR
        });

        console.log(`[CRON SUCCESS] Cobro electrónico enviado con éxito a: ${emailCliente} | Invoice ID: ${finalizedInvoice.id}`);

      } catch (stripeErr) {
        console.error(`[CRON STRIPE ERROR] Error procesando pasarela para la cuota ${cuotaRef.path}:`, stripeErr);
      }
    }

  } catch (globalErr) {
    console.error(`[CRON CRITICAL ERROR] Detención inesperada de la tarea programada masiva:`, globalErr);
  }

  return null;
});

// =====================================================================================
// WEBHOOK RECEPTOR: Captura y conciliación automática de pagos en línea
// =====================================================================================
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder_for_deployment_analysis';
  
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    console.error(`[WEBHOOK ERROR] Error de validación criptográfica de firma: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'invoice.paid') {
    const invoice = event.data.object;
    const invoiceId = invoice.id;
    
    console.log(`[WEBHOOK] Capturado evento de pago exitoso para la Invoice de Stripe: ${invoiceId}`);

    try {
      const queryCuota = await db.collectionGroup('plan_pagos')
        .where('stripe_invoice_id', '==', invoiceId)
        .limit(1)
        .get();

      if (queryCuota.empty) {
        console.error(`[WEBHOOK ERROR] Conciliación huérfana: No existe ningún plan de pago en Firestore enlazado a la Invoice: ${invoiceId}`);
        return res.status(200).json({ received: true, status: 'orphan_invoice' });
      }

      const cuotaDoc = queryCuota.docs[0];
      const cuotaRef = cuotaDoc.ref;
      const cuotaData = cuotaDoc.data();

      const pathParts = cuotaRef.path.split('/');
      const casoId = pathParts[1];
      const clienteId = pathParts[3];

      const ahora = new Date();
      const fechaCRStr = ahora.toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' });
      const periodoFiscalStr = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;

      await cuotaRef.update({
        estado: 'pagada',
        saldo_pendiente: 0,
        monto_pagado: cuotaData.monto_total,
        fecha_pago_realizado: fechaCRStr,
        periodo_fiscal: periodoFiscalStr,
        metodo_pago: 'stripe',
        comprobante_referencia: invoice.payment_intent || invoice.charge || 'Stripe-API'
      });

      await db.collection('casos').doc(casoId).collection('clientes').doc(clienteId).update({
        estado_pago: 'Pagado'
      });

      await db.collection('logs_auditoria').add({
        usuario: 'STRIPE_WEBHOOK_AUTOMATICO',
        accion: 'Conciliación Automática de Pago',
        detalles: `El sistema validó el pago digital de la factura "${cuotaData.concepto}" por la suma total de cobro correspondiente al caso ID: ${casoId}`,
        fecha: admin.firestore.FieldValue.serverTimestamp()
      });

    } catch (dbErr) {
      console.error(`[WEBHOOK CRITICAL ERROR] Error de base de datos durante la conciliación de Stripe:`, dbErr);
      return res.status(500).send('Internal Database Error');
    }
  }

  return res.status(200).json({ received: true });
});

// =====================================================================================
// CORRECCIÓN MODULAR: Trigger de Firestore v2 (onDocumentUpdated) compatible con v7
// =====================================================================================
exports.syncStripeInvoiceStatus = onDocumentUpdated(
  'casos/{casoId}/clientes/{clienteId}/plan_pagos/{cuotaId}', 
  async (event) => {
    const dataNueva = event.data.after.data();
    const cuotaRef = event.data.after.ref;

    if (dataNueva.stripe_status_sync === 'void_requested' && dataNueva.stripe_invoice_id) {
      console.log(`[DB TRIGGER] Detectada solicitud de cancelación externa para la Invoice de Stripe: ${dataNueva.stripe_invoice_id}`);
      
      try {
        const currentStripeInvoice = await stripe.invoices.retrieve(dataNueva.stripe_invoice_id);

        if (currentStripeInvoice.status === 'draft') {
          console.log(`[DB TRIGGER] Removiendo borrador de factura en Stripe: ${dataNueva.stripe_invoice_id}`);
          await stripe.invoices.delete(dataNueva.stripe_invoice_id);
        } 
        else if (currentStripeInvoice.status === 'open') {
          console.log(`[DB TRIGGER] Ejecutando comando de anulación (Void) en Stripe para: ${dataNueva.stripe_invoice_id}`);
          await stripe.invoices.voidInvoice(dataNueva.stripe_invoice_id);
        }

        await cuotaRef.update({
          stripe_status_sync: null,
          stripe_invoice_status_cloud: 'voided'
        });

        console.log(`[DB TRIGGER SUCCESS] Sincronización de ciclo de vida completada para la Invoice: ${dataNueva.stripe_invoice_id}`);

      } catch (stripeVoidErr) {
        console.error(`[DB TRIGGER STRIPE ERROR] No se pudo anular la factura en Stripe de forma remota:`, stripeVoidErr);
        await cuotaRef.update({ stripe_status_sync: null });
      }
    }

    return null;
  }
);