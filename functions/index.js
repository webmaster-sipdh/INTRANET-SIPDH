const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

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

      // 🚀 MAGIA: Leer los IDs directamente desde SendGrid gracias a los unique_args
      const casoId = evento.casoId;
      const comunicadoId = evento.comunicadoId;

      // Si el evento no trae nuestros IDs personalizados, lo ignoramos (no es de la intranet)
      if (!email || !casoId || !comunicadoId) {
        continue; 
      }

      // 🛡️ FILTRO 1: Ignorar bot de Apple MPP
      if (tipoEvento === 'open' && evento.apple_privacy_open === true) continue;
      
      // 🛡️ FILTRO 2: Ignorar escáneres de seguridad corporativos comunes
      if (tipoEvento === 'open' && evento.useragent) {
        const ua = evento.useragent.toLowerCase();
        if (ua.includes('bot') || ua.includes('spider') || ua.includes('crawl') || ua.includes('scanner')) continue;
      }

      // Buscar al cliente específico dentro del caso
      const clientesRef = db.collection('casos').doc(casoId).collection('clientes');
      const snapshot = await clientesRef.where('correo_principal', '==', email).limit(1).get();

      if (snapshot.empty) continue;

      const clienteId = snapshot.docs[0].id;
      const historialRef = db
        .collection('casos')
        .doc(casoId)
        .collection('clientes')
        .doc(clienteId)
        .collection('historial_comunicados')
        .doc(comunicadoId);

      let datosActualizacion = { ultima_actualizacion: fechaCR };

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
      console.log(`🎉 Evento [${tipoEvento}] guardado con éxito para ${email}`);
    }
    
    res.status(200).send('Eventos procesados correctamente');
  } catch (error) {
    console.error('❌ Error ejecutando webhook:', error);
    res.status(500).send('Error Interno del Servidor');
  }
});