import React, { useState, useEffect } from 'react';
import { db, storage } from '../../config/firebase';
import { 
  doc, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  serverTimestamp, 
  deleteDoc,
  setDoc,
  onSnapshot 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  TextField, 
  Card, 
  CardContent, 
  CircularProgress, 
  Alert, 
  Divider, 
  List, 
  ListItem, 
  ListItemText, 
  LinearProgress, 
  Chip, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  IconButton,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  ArrowLeft, 
  Save, 
  User, 
  CreditCard, 
  StickyNote, 
  Upload, 
  File, 
  Plus, 
  Trash2,
  Eye,
  CheckCircle,
  AlertTriangle,
  Mail,
  Calendar
} from 'lucide-react';
import { registrarLogAuditoria } from '../../utils/auditLogger';

const DOC_TYPES = [
  'Cédula de Identidad', 
  'DNI', 
  'Pasaporte', 
  'RUT', 
  'Cédula de Residencia', 
  'Otro'
];

const COUNTRIES = [
  { code: 'CR', name: 'Costa Rica', phone: '+506' },
  { code: 'US', name: 'Estados Unidos', phone: '+1' },
  { code: 'MX', name: 'México', phone: '+52' },
  { code: 'ES', name: 'España', phone: '+34' },
  { code: 'CO', name: 'Colombia', phone: '+57' },
  { code: 'AR', name: 'Argentina', phone: '+54' },
  { code: 'CL', name: 'Chile', phone: '+56' },
  { code: 'PE', name: 'Perú', phone: '+51' },
  { code: 'EC', name: 'Ecuador', phone: '+593' },
  { code: 'PA', name: 'Panamá', phone: '+507' },
  { code: 'SV', name: 'El Salvador', phone: '+503' },
  { code: 'GT', name: 'Guatemala', phone: '+502' },
  { code: 'HN', name: 'Honduras', phone: '+504' },
  { code: 'NI', name: 'Nicaragua', phone: '+505' },
  { code: 'VE', name: 'Venezuela', phone: '+58' },
  { code: 'UY', name: 'Uruguay', phone: '+598' },
  { code: 'PY', name: 'Paraguay', phone: '+595' },
  { code: 'BO', name: 'Bolivia', phone: '+591' },
  { code: 'CA', name: 'Canadá', phone: '+1' },
  { code: 'GB', name: 'Reino Unido', phone: '+44' },
  { code: 'FR', name: 'Francia', phone: '+33' },
  { code: 'DE', name: 'Alemania', phone: '+49' },
  { code: 'IT', name: 'Italia', phone: '+39' }
];

// =====================================================================================
// SUB-COMPONENTE ENCAPSULADO: Maneja el estado expandible/colapsable de forma individual
// =====================================================================================
function ItemNotificacion({ item }) {
  const [expanded, setExpanded] = useState(false);

  const cfg = (() => {
    if (item.estado === 'Abierto') return { color: 'success', icon: <Eye size={14} />, label: 'Abierto' };
    if (item.estado === 'Entregado') return { color: 'info', icon: <CheckCircle size={14} />, label: 'Entregado' };
    if (item.estado === 'Rebotado') return { color: 'error', icon: <AlertTriangle size={14} />, label: 'Rebotado' };
    return { color: 'default', icon: <Mail size={14} />, label: 'Enviado' };
  })();

  return (
    <Box sx={{ mb: 2, p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
        <Typography variant="body2" fontWeight="bold" color="text.primary" sx={{ maxWidth: '70%' }}>
          {item.asunto}
        </Typography>
        <Chip size="small" color={cfg.color} label={cfg.label} sx={{ fontWeight: 'bold', fontSize: '0.7rem', height: 20 }} />
      </Box>
      
      <Button
        size="small"
        variant="text"
        onClick={() => setExpanded(!expanded)}
        sx={{ textTransform: 'none', fontSize: '0.72rem', p: 0, minWidth: 0, mb: 0.5, fontWeight: 'bold', color: 'primary.main' }}
      >
        {expanded ? "Ocultar contenido del mensaje" : "Ver contenido del mensaje"}
      </Button>

      <Collapse in={expanded}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', my: 1, whiteSpace: 'pre-wrap', bgcolor: '#ffffff', p: 1, borderRadius: 1, border: '1px solid #e2e8f0' }}>
          {item.cuerpo}
        </Typography>
      </Collapse>

      {item.pdf_url && (
        <Box sx={{ mt: 0.5 }}>
          <Button
            component="a"
            href={item.pdf_url}
            target="_blank"
            rel="noopener"
            variant="text"
            size="small"
            startIcon={<File size={12} />}
            sx={{ textTransform: 'none', fontWeight: 'bold', fontSize: '0.7rem', p: 0, justifyContent: 'flex-start' }}
          >
            Descargar Anexo: {item.pdf_nombre || 'Documento Adjunto'}
          </Button>
        </Box>
      )}

      <Divider sx={{ my: 1, borderStyle: 'dashed' }} />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {item.entregado_at && (
          <Typography variant="caption" color="text.secondary">
            Recibido: <strong>{item.entregado_at}</strong>
          </Typography>
        )}
        {item.abierto_at && (
          <Typography variant="caption" color="success.main">
            Abierto: <strong>{item.abierto_at}</strong>
          </Typography>
        )}
        {item.rebotado_at && (
          <Typography variant="caption" color="error.main">
            Rebote: <strong>{item.rebotado_at}</strong>
            {item.causa_rebote && <span style={{ display: 'block', fontStyle: 'italic', fontSize: '0.65rem', marginTop: '2px' }}>{item.causa_rebote}</span>}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default function FichaCliente({ casoId, clienteId, onVolver, currentUserEmail }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [cliente, setCliente] = useState(null);
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [tipoIdentificacion, setTipoIdentificacion] = useState('Cédula de Identidad');
  const [identificacion, setIdentificacion] = useState('');
  const [pais, setPais] = useState('Costa Rica');
  const [direccion, setDireccion] = useState('');

  const [correoPrincipal, setCorreoPrincipal] = useState('');
  const [correoSecundario, setCorreoSecundario] = useState('');
  const [codigoTelefonoPrincipal, setCodigoTelefonoPrincipal] = useState('+506');
  const [telefonoPrincipal, setTelefonoPrincipal] = useState('');
  const [codigoTelefonoSecundario, setCodigoTelefonoSecundario] = useState('+506');
  const [telefonoSecundario, setTelefonoSecundario] = useState('');

  const [notes, setNotas] = useState([]);
  const [nuevaNota, setNuevaNota] = useState('');
  const [documentos, setDocumentos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Estados reactivos en tiempo real para telemetría
  const [historialComunicados, setHistorialComunicados] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // NUEVOS ESTADOS EXCLUSIVOS: Control de Estructuración de Planes Financieros
  const [planPagos, setPlanPagos] = useState([]);
  const [openCuotaModal, setOpenCuotaModal] = useState(false);
  const [openPagoManualModal, setOpenPagoManualModal] = useState(false);
  
  // Campos del Generador de Planes de Cuotas Proyectadas
  const [tipoEstructura, setTipoEstructura] = useState('plan'); // Por defecto 'plan' para incentivar el financiamiento completo
  const [conceptoCuota, setConceptoCuota] = useState('');
  const [montoNetoCuota, setMontoNetoCuota] = useState(''); // Monto unitario base de la cuota
  const [fechaVencimientoCuota, setFechaVencimientoCuota] = useState(''); // Primer vencimiento del plan
  const [cantidadCuotas, setCantidadCuotas] = useState('4'); // Sugerido por omisión para plazos compuestos
  const [frecuenciaPlan, setFrecuenciaPlan] = useState('mensual'); 
  const [metodoCobroCuota, setMetodoCobroCuota] = useState('stripe'); // Canal planificado para alertas de vencimiento

  // Campos formulario de Registro Posterior de Pagos Hechos (Conciliación)
  const [cuotaSeleccionadaParaPagar, setCuotaSeleccionadaParaPagar] = useState(null);
  const [metodoPagoManual, setMetodoPagoManual] = useState('Transferencia Bancaria');
  const [referenciaManual, setReferenciaManual] = useState('');

  const clienteRef = doc(db, 'casos', casoId, 'clientes', clienteId);

  useEffect(() => {
    setLoading(true);
    setError('');

    // 1. Escuchador Live para los datos demográficos y de contacto de la Ficha
    const unsubCliente = onSnapshot(clienteRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCliente(data); 
        setNombres(data.nombres || ''); 
        setApellidos(data.apellidos || '');
        setTipoIdentificacion(data.tipo_identificacion || 'Cédula de Identidad');
        setIdentificacion(data.identificacion || ''); 
        setPais(data.pais || 'Costa Rica'); 
        setDireccion(data.direccion || '');
        setCorreoPrincipal(data.correo_principal || data.correo || ''); 
        setCorreoSecundario(data.correo_secundario || '');
        setCodigoTelefonoPrincipal(data.codigo_telefono_principal || data.codigo_telefono || '+506');
        setTelefonoPrincipal(data.telefono_principal || data.telefono || '');
        setCodigoTelefonoSecundario(data.codigo_telefono_secundario || '+506'); 
        setTelefonoSecundario(data.telefono_secundario || '');
      } else {
        setError('No se localizó la ficha del representado solicitado.');
      }
      setLoading(false);
    }, (err) => {
      setError('Error al sincronizar el expediente con el servidor.');
      setLoading(false);
    });

    // 2. Escuchador Live para la Bitácora de Notas Jurídicas
    const qNotas = query(collection(db, 'casos', casoId, 'clientes', clienteId, 'notes'), orderBy('fecha', 'desc'));
    // Nota: El original usaba 'notes' en la ruta de colecciones según la consulta, mantenemos el esquema de datos intacto
    const unsubNotas = onSnapshot(query(collection(db, 'casos', casoId, 'clientes', clienteId, 'notas'), orderBy('fecha', 'desc')), (snap) => {
      setNotas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 3. Escuchador Live para la Carga Inmutable de Documentos y Poderes
    const qDocs = query(collection(db, 'casos', casoId, 'clientes', clienteId, 'documentos'), orderBy('fecha_subida', 'desc'));
    const unsubDocs = onSnapshot(qDocs, (snap) => {
      setDocumentos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 4. Escuchador Live para el Plan de Pagos personalizado (Cuotas de Deuda Estructuradas)
    const qPagos = query(collection(db, 'casos', casoId, 'clientes', clienteId, 'plan_pagos'), orderBy('fecha_vencimiento', 'asc'));
    const unsubPagos = onSnapshot(qPagos, (snap) => {
      setPlanPagos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 5. Escuchador Live para la subcolección autónoma con los DATOS COMPLETOS del comunicado
    setLoadingHistorial(true);
    const historialRef = collection(db, 'casos', casoId, 'clientes', clienteId, 'historial_comunicados');
    const unsubHistorial = onSnapshot(historialRef, (snapHistorial) => {
      const listaEventos = snapHistorial.docs.map(d => ({ id: d.id, ...d.data() }));

      const parseFechaCRAMilisegundos = (str) => {
        if (!str) return 0;
        try {
          const partes = str.split(/[\s,]+/);
          const fechaPartes = partes[0].split('/');
          const horaPartes = partes[1].split(':');
          const dia = parseInt(fechaPartes[0], 10);
          const mes = parseInt(fechaPartes[1], 10) - 1;
          const anio = parseInt(fechaPartes[2], 10);
          const hora = parseInt(horaPartes[0], 10);
          const mi = parseInt(horaPartes[1], 10);
          const se = parseInt(horaPartes[2], 10);
          return new Date(anio, mes, dia, hora, mi, se).getTime();
        } catch (e) { return 0; }
      };

      // Ordenar de más nuevo a más viejo
      listaEventos.sort((a, b) => parseFechaCRAMilisegundos(b.ultima_actualizacion) - parseFechaCRAMilisegundos(a.ultima_actualizacion));
      setHistorialComunicados(listaEventos);
      setLoadingHistorial(false);
    }, (errHist) => {
      console.error("Error en sincronización de telemetría:", errHist);
      setLoadingHistorial(false);
    });

    return () => {
      unsubCliente();
      unsubNotas();
      unsubDocs();
      unsubPagos();
      unsubHistorial();
    };
  }, [casoId, clienteId]);

  const handleUpdateDatos = async (e) => {
    e.preventDefault(); 
    setError(''); 
    setSuccess('');
    try {
      await updateDoc(clienteRef, {
        nombres: nombres.trim(), 
        apellidos: apellidos.trim(), 
        tipo_identificacion: tipoIdentificacion,
        identificacion: identificacion.trim(), 
        pais: pais, 
        direccion: direccion.trim(), 
        correo_principal: correoPrincipal.trim(),
        correo_secundario: correoSecundario.trim(), 
        codigo_telefono_principal: codigoTelefonoPrincipal,
        telefono_principal: telefonoPrincipal.trim(), 
        codigo_telefono_secundario: codigoTelefonoSecundario, 
        telefono_secundario: telefonoSecundario.trim()
      });

      await registrarLogAuditoria(
        currentUserEmail, 
        'Actualización de Cliente', 
        `Se editaron los datos de contacto y demográficos del representado: ${apellidos.trim()}, ${nombres.trim()}`
      );
      
      setSuccess('Expediente de contacto actualizado correctamente.');
    } catch (err) { 
      setError('No se pudieron guardar los cambios.'); 
    }
  };

  const handleAddNota = async () => {
    if (!nuevaNota.trim()) return;
    try {
      const refNotas = collection(db, 'casos', casoId, 'clientes', clienteId, 'notas');
      await addDoc(refNotas, { 
        texto: nuevaNota.trim(), 
        fecha: serverTimestamp() 
      });

      await registrarLogAuditoria(
        currentUserEmail, 
        'Adición de Nota', 
        `Se estampó una nota jurídica interna en el expediente del cliente: ${apellidos}, ${nombres}`
      );

      setNuevaNota('');
    } catch (err) { 
      setError('Error al registrar la nota.'); 
    }
  };

  const handleUploadFile = async (e) => {
    const file = e.target.files[0]; 
    if (!file) return;
    
    setUploading(true); 
    setUploadProgress(0); 
    setError('');

    const storagePath = `casos/${casoId}/clientes/${clienteId}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snap) => {
        const progress = (snap.bytesTransferred / snap.totalBytes) * 100;
        setUploadProgress(Math.round(progress));
      },
      (err) => { 
        setError('Error físico al subir archivo.'); 
        setUploading(false); 
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        const refDocs = collection(db, 'casos', casoId, 'clientes', clienteId, 'documentos');
        await addDoc(refDocs, { 
          nombre: file.name, 
          url: downloadURL, 
          storage_path: storagePath, 
          fecha_subida: new Date().toISOString() 
        });

        await registrarLogAuditoria(
          currentUserEmail, 
          'Carga de Poder/Doc', 
          `Se cargó el archivo individual "${file.name}" en el expediente de: ${apellidos}, ${nombres}`
        );

        setUploading(false); 
        setSuccess('Archivo enlazado con éxito.');
      }
    );
  };

  const handleDeleteFile = async (docId, storagePath) => {
    if (!window.confirm('¿Desea suprimir este documento individual?')) return;
    try {
      if (storagePath) {
        await deleteObject(ref(storage, storagePath));
      }
      await deleteDoc(doc(db, 'casos', casoId, 'clientes', clienteId, 'documentos', docId));

      await registrarLogAuditoria(
        currentUserEmail, 
        'Eliminación de Poder/Doc', 
        `Se eliminó el documento ID: ${docId} perteneciente a: ${apellidos}, ${nombres}`
      );

      setSuccess('Documento removido correctamente.');
    } catch (err) { 
      setError('Error al eliminar archivo.'); 
    }
  };

  // ACCIÓN PRINCIPAL DE LA INTRAET: Establece por adelantado la estructura completa de cuotas
  const handleCrearCuotaEstructurada = async (e) => {
    e.preventDefault();
    if (!conceptoCuota.trim() || !montoNetoCuota || !fechaVencimientoCuota) return;

    setError('');
    setSuccess('');
    
    const netoBase = parseFloat(montoNetoCuota);
    const planPagosRef = collection(db, 'casos', casoId, 'clientes', clienteId, 'plan_pagos');

    try {
      if (tipoEstructura === 'unica') {
        const ivaCalculado = netoBase * 0.13; // 13% IVA Costa Rica
        const total = netoBase + ivaCalculado;

        await addDoc(planPagosRef, {
          concepto: conceptoCuota.trim(),
          monto_neto: netoBase,
          iva: ivaCalculado,
          monto_total: total,
          fecha_vencimiento: fechaVencimientoCuota,
          estado: 'pendiente', // Nace como compromiso financiero pendiente (Por pagar)
          metodo_pago: metodoCobroCuota, 
          stripe_invoice_id: null,
          stripe_invoice_url: null,
          fecha_pago_realizado: null,
          registrado_por: null,
          comprobante_referencia: ''
        });

        await registrarLogAuditoria(
          currentUserEmail,
          'Estructuración de Obligación Única',
          `Se proyectó cuota individual adeudada de honorarios por $${total.toFixed(2)} para ${apellidos}, ${nombres}`
        );
      } else {
        // PROCESADOR EN BUCLE: Inyecta el calendario total de plazos en estado puro de deuda
        const numCuotas = parseInt(cantidadCuotas) || 1;
        let fechaBase = new Date(fechaVencimientoCuota + 'T00:00:00');

        for (let i = 1; i <= numCuotas; i++) {
          if (i > 1) {
            if (frecuenciaPlan === 'mensual') {
              fechaBase.setMonth(fechaBase.getMonth() + 1);
            } else if (frecuenciaPlan === 'quincenal') {
              fechaBase.setDate(fechaBase.getDate() + 15);
            }
          }

          const yyyy = fechaBase.getFullYear();
          const mm = String(fechaBase.getMonth() + 1).padStart(2, '0');
          const dd = String(fechaBase.getDate()).padStart(2, '0');
          const fechaString = `${yyyy}-${mm}-${dd}`;

          const ivaCalculado = netoBase * 0.13;
          const total = netoBase + ivaCalculado;

          await addDoc(planPagosRef, {
            concepto: `Cuota ${i}/${numCuotas} - ${conceptoCuota.trim()}`,
            monto_neto: netoBase,
            iva: ivaCalculado,
            monto_total: total,
            fecha_vencimiento: fechaString,
            estado: 'pendiente', // Añadida al plan de forma visible como saldo insoluto
            metodo_pago: metodoCobroCuota,
            stripe_invoice_id: null,
            stripe_invoice_url: null,
            fecha_pago_realizado: null,
            registrado_por: null,
            comprobante_referencia: ''
          });
        }

        await registrarLogAuditoria(
          currentUserEmail,
          'Establecimiento de Plan Financiero',
          `Se estructuró calendario total de ${numCuotas} cuotas pendientes de $${(netoBase * 1.13).toFixed(2)} c/u para ${apellidos}, ${nombres}`
        );
      }

      setConceptoCuota('');
      montoNetoCuota ? setMontoNetoCuota('') : null;
      setMontoNetoCuota('');
      setFechaVencimientoCuota('');
      setMetodoCobroCuota('stripe');
      setTipoEstructura('plan');
      setCantidadCuotas('4');
      setFrecuenciaPlan('mensual');
      setOpenCuotaModal(false);
      setSuccess('Plan de cuotas futuras establecido correctamente en el expediente.');
    } catch (err) {
      setError('Error al registrar la estructura de cuotas en el servidor.');
    }
  };

  // ACCIÓN POSTERIOR DE CONCILIACIÓN: Registra un pago hecho sobre una cuota preexistente del plan
  const handleProcesarLiquidacionManual = async (e) => {
    e.preventDefault();
    if (!cuotaSeleccionadaParaPagar) return;

    setError('');
    setSuccess('');

    const ahora = new Date();
    const fechaCR = ahora.toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' });
    const periodoFiscal = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;

    try {
      const cuotaDocRef = doc(db, 'casos', casoId, 'clientes', clienteId, 'plan_pagos', cuotaSeleccionadaParaPagar.id);
      await updateDoc(cuotaDocRef, {
        estado: 'pagada', // Cambia a verde en la ficha
        fecha_pago_realizado: fechaCR,
        periodo_fiscal: periodoFiscal, // Segmentación contable mensual de IVA
        registrado_por: currentUserEmail,
        metodo_pago: metodoPagoManual === 'Efectivo' ? 'efectivo' : 'transferencia',
        comprobante_referencia: referenciaManual.trim() // Deja constancia del número de transferencia o recibo
      });

      await registrarLogAuditoria(
        currentUserEmail,
        'Registro Posterior de Pago',
        `Se anotó pago manual vía [${metodoPagoManual}] para la cuota "${cuotaSeleccionadaParaPagar.concepto}". Ref: ${referenciaManual.trim()}`
      );
      
      setCuotaSeleccionadaParaPagar(null);
      setReferenciaManual('');
      setOpenPagoManualModal(false);
      setSuccess('Pago recibido anotado y registrado con éxito.');
    } catch (err) {
      setError('No se pudo asentar el pago manual.');
    }
  };

  const obtenerSemaforoCuota = (estado, fechaVencimiento) => {
    if (estado === 'pagada') {
      return { label: 'PAGADA', color: '#2e7d32', textColor: '#fff' };
    }
    if (!fechaVencimiento) {
      return { label: 'PENDIENTE (DEUDA)', color: '#0288d1', textColor: '#fff' };
    }

    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    const vencimiento = new Date(fechaVencimiento + 'T00:00:00');
    vencimiento.setHours(0,0,0,0);

    if (hoy <= vencimiento) {
      return { label: 'PENDIENTE', color: '#0288d1', textColor: '#fff' };
    }

    const diffTiempo = Math.abs(hoy.getTime() - vencimiento.getTime());
    const diffDias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));

    if (diffDias <= 30) {
      return { label: `MORA (${diffDias} d)`, color: '#ed6c02', textColor: '#fff' };
    } else {
      return { label: `RETRASO CRÍTICO (+${diffDias} d)`, color: '#d32f2f', textColor: '#fff' };
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>
    );
  }

  return (
    <Box>
      <Button startIcon={<ArrowLeft size={16} />} onClick={onVolver} sx={{ mb: 3, textTransform: 'none' }}>
        Volver al Expediente
      </Button>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' }, gap: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          
          <Paper component="form" onSubmit={handleUpdateDatos} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, color: 'primary.main' }}>
              <User size={20} />
              <Typography variant="h6" fontWeight="bold">Datos del Representado & Contacto</Typography>
            </Box>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2.5 }}>
              <TextField label="Nombres" fullWidth value={nombres} onChange={(e) => setNombres(e.target.value)} required />
              <TextField label="Apellidos" fullWidth value={apellidos} onChange={(e) => setApellidos(e.target.value)} required />
            </Box>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2.5 }}>
              <FormControl fullWidth>
                <InputLabel>Tipo Identificación</InputLabel>
                <Select value={tipoIdentificacion} label="Tipo Identificación" onChange={(e) => setTipoIdentificacion(e.target.value)}>
                  {DOC_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="Número de Identificación" fullWidth value={identificacion} onChange={(e) => setIdentificacion(e.target.value)} required />
            </Box>
            
            <Box sx={{ mb: 2.5 }}>
              <FormControl fullWidth>
                <InputLabel>País de Residencia</InputLabel>
                <Select 
                  value={pais} 
                  label="País de Residencia" 
                  onChange={(e) => { 
                    setPais(e.target.value); 
                    const c = COUNTRIES.find(x => x.name === e.target.value); 
                    if (c) { 
                      setCodigoTelefonoPrincipal(c.phone); 
                      setCodigoTelefonoSecundario(c.phone); 
                    } 
                  }}
                >
                  {COUNTRIES.map(c => <MenuItem key={c.code} value={c.name}>{c.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ mb: 2.5 }}>
              <TextField label="Dirección Física Completa" fullWidth multiline rows={2} value={direccion} onChange={(e) => setDireccion(e.target.value)} />
            </Box>
            
            <Divider sx={{ my: 2.5 }}>Direcciones de Correo</Divider>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2.5 }}>
              <TextField label="Email Principal" type="email" fullWidth value={correoPrincipal} onChange={(e) => setCorreoPrincipal(e.target.value)} required />
              <TextField label="Email Secundario" type="email" fullWidth value={correoSecundario} onChange={(e) => setCorreoSecundario(e.target.value)} />
            </Box>
            
            <Divider sx={{ my: 2.5 }}>Números Telefónicos Internacionales</Divider>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 2, mb: 2.5 }}>
              <FormControl fullWidth>
                <InputLabel>Cód. Principal</InputLabel>
                <Select value={codigoTelefonoPrincipal} label="Cód. Principal" onChange={(e) => setCodigoTelefonoPrincipal(e.target.value)}>
                  {COUNTRIES.map(c => <MenuItem key={c.code} value={c.phone}>{`${c.code} (${c.phone})`}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="Teléfono Principal" fullWidth value={telefonoPrincipal} onChange={(e) => setTelefonoPrincipal(e.target.value)} />
            </Box>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 2, mb: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Cód. Secundario</InputLabel>
                <Select value={codigoTelefonoSecundario} label="Cód. Secundario" onChange={(e) => setCodigoTelefonoSecundario(e.target.value)}>
                  {COUNTRIES.map(c => <MenuItem key={c.code} value={c.phone}>{`${c.code} (${c.phone})`}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="Teléfono Secundario" fullWidth value={telefonoSecundario} onChange={(e) => setTelefonoSecundario(e.target.value)} />
            </Box>
            
            <Button type="submit" variant="contained" startIcon={<Save size={16} />}>
              Guardar Cambios del Expediente
            </Button>
          </Paper>

          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: 'primary.main' }}>
              <StickyNote size={20} />
              <Typography variant="h6" fontWeight="bold">Notas del Caso e Historial Jurídico</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
              <TextField label="Escribe una actualización..." fullWidth multiline rows={2} value={nuevaNota} onChange={(e) => setNuevaNota(e.target.value)} />
              <Button variant="outlined" onClick={handleAddNota} sx={{ minWidth: 48 }}>
                <Plus size={20} />
              </Button>
            </Box>
            
            <List sx={{ maxHeight: 300, overflow: 'auto' }}>
              {notes.length === 0 ? (
                <Typography variant="body2" color="text.disabled">No hay notas.</Typography>
              ) : (
                notes.map((n) => (
                  <Card key={n.id} sx={{ mb: 1.5, boxShadow: 'none', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <CardContent sx={{ p: '12px !important' }}>
                      <Typography variant="body2">{n.texto}</Typography>
                      <Typography variant="caption" color="text.disabled" display="block">
                        {n.fecha?.toDate ? n.fecha.toDate().toLocaleString() : 'Reciente'}
                      </Typography>
                    </CardContent>
                  </Card>
                ))
              )}
            </List>
          </Paper>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          
          {/* INTERFAZ DEL EXPEDIENTE FINANCIERO: PANEL DE CUOTAS QUE DEBE Y REGISTRO DE PAGOS HECHOS */}
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
                <CreditCard size={20} />
                <Typography variant="h6" fontWeight="bold">Plan de Pagos de la Ficha</Typography>
              </Box>
              <Button 
                size="small"
                variant="contained" 
                startIcon={<Plus size={14} />} 
                onClick={() => setOpenCuotaModal(true)}
                sx={{ textTransform: 'none', fontWeight: 'bold', borderRadius: 1.5 }}
              >
                Establecer Plan
              </Button>
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2.5, fontStyle: 'italic' }}>
              Visualización y trazabilidad del calendario de cuotas adeudadas y amortizaciones.
            </Typography>

            {planPagos.length === 0 ? (
              <Alert severity="info" sx={{ borderRadius: 2, fontSize: '0.85rem' }}>
                Este representado no registra un plan de cuotas o cobros configurados.
              </Alert>
            ) : (
              <List sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {planPagos.map((cuota) => {
                  const semaforo = obtenerSemaforoCuota(cuota.estado, cuota.fecha_vencimiento);
                  return (
                    <Box 
                      key={cuota.id} 
                      sx={{ 
                        p: 2, 
                        borderRadius: 2, 
                        bgcolor: cuota.estado === 'pagada' ? '#f0fdf4' : '#ffffff', 
                        border: cuota.estado === 'pagada' ? '1px solid #bbf7d0' : '1px solid #e2e8f0' 
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box sx={{ maxWidth: '65%' }}>
                          <Typography variant="body2" fontWeight="bold" color="text.primary">
                            {cuota.concepto}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Fecha Límite: {cuota.fecha_vencimiento}
                          </Typography>
                        </Box>
                        <Chip 
                          label={semaforo.label} 
                          size="small" 
                          sx={{ 
                            bgcolor: semaforo.color, 
                            color: semaforo.textColor, 
                            fontWeight: 'bold', 
                            fontSize: '0.68rem',
                            height: 20 
                          }} 
                        />
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, pt: 1, borderTop: '1px dashed #cbd5e1' }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1 }}>
                            Neto: ${cuota.monto_neto.toFixed(2)} | IVA (13%): ${cuota.iva.toFixed(2)}
                          </Typography>
                          <Typography variant="subtitle2" fontWeight="bold" color="primary.main">
                            Total Obligación: ${cuota.monto_total.toFixed(2)}
                          </Typography>
                        </Box>

                        {/* ACCIÓN DE REGISTRO POSTERIOR: Solo se habilita si la cuota del plan está pendiente */}
                        {cuota.estado === 'pendiente' ? (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => {
                              setCuotaSeleccionadaParaPagar(cuota);
                              setOpenPagoManualModal(true);
                            }}
                            sx={{ textTransform: 'none', fontSize: '0.72rem', fontWeight: 'bold', borderRadius: 1 }}
                          >
                            Anotar Pago
                          </Button>
                        ) : (
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" color="success.main" display="block" sx={{ fontSize: '0.65rem', fontWeight: 'bold' }}>
                              {cuota.metodo_pago === 'stripe' ? '💳 Conciliado por Stripe' : `📁 Recaudación Manual (${cuota.metodo_pago})`}
                            </Typography>
                            {cuota.comprobante_referencia && (
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.62rem', fontStyle: 'italic' }}>
                                Ref/Recibo: {cuota.comprobante_referencia}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>

                      {cuota.estado === 'pendiente' && cuota.metodo_pago === 'stripe' && cuota.stripe_invoice_url && (
                        <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #f1f5f9' }}>
                          <Button
                            component="a"
                            href={cuota.stripe_invoice_url}
                            target="_blank"
                            rel="noopener"
                            size="small"
                            variant="text"
                            sx={{ textTransform: 'none', fontSize: '0.68rem', p: 0, minWidth: 0 }}
                          >
                            Ver factura emitida en Stripe
                          </Button>
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </List>
            )}
          </Paper>

          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: 'primary.main' }}>
              <File size={20} />
              <Typography variant="h6" fontWeight="bold">Documentos y Poderes</Typography>
            </Box>
            
            <Button variant="outlined" component="label" fullWidth startIcon={<Upload size={16} />} disabled={uploading}>
              {uploading ? 'Subiendo...' : 'Subir Poder / Documento PDF'}
              <input type="file" accept="application/pdf,image/*" hidden onChange={handleUploadFile} />
            </Button>
            
            {uploading && (
              <Box sx={{ p: 1 }}>
                <LinearProgress variant="determinate" value={uploadProgress} />
              </Box>
            )}
            
            <Divider sx={{ my: 1.5 }} />
            
            <List>
              {documentos.map((d) => (
                <ListItem key={d.id} disablePadding sx={{ mb: 1, display: 'flex', gap: 1 }}>
                  <Button 
                    component="a" 
                    href={d.url} 
                    target="_blank" 
                    variant="text" 
                    color="inherit" 
                    startIcon={<File size={16} />} 
                    sx={{ flexGrow: 1, justifyContent: 'flex-start', p: 1, bgcolor: '#f8fafc', borderRadius: 1.5 }}
                  >
                    <ListItemText primary={d.nombre} secondary={d.fecha_subida ? new Date(d.fecha_subida).toLocaleDateString() : ''} />
                  </Button>
                  <IconButton size="small" color="error" onClick={() => handleDeleteFile(d.id, d.storage_path)} sx={{ border: '1px solid #fee2e2', bgcolor: '#fef2f2' }}>
                    <Trash2 size={16} />
                  </IconButton>
                </ListItem>
              ))}
            </List>
          </Paper>

          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: 'primary.main' }}>
              <Mail size={20} />
              <Typography variant="h6" fontWeight="bold">Historial de Notificaciones</Typography>
            </Box>
            
            {loadingHistorial ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={24} /></Box>
            ) : historialComunicados.length === 0 ? (
              <Typography variant="body2" color="text.disabled">No se registran notificaciones para este representado.</Typography>
            ) : (
              <List sx={{ maxHeight: 380, overflow: 'auto', p: 0 }}>
                {historialComunicados.map((item) => (
                  <ItemNotificacion key={item.id} item={item} />
                ))}
              </List>
            )}
          </Paper>

        </Box>
      </Box>

      {/* MODAL CORREGIDO: SECCIÓN PURA DE CREACIÓN Y ESTRUCTURACIÓN DE PLANES DE DEUDA */}
      <Dialog
        open={openCuotaModal}
        onClose={() => setOpenCuotaModal(false)}
        fullWidth
        maxWidth="xs"
        disableEnforceFocus
        disableRestoreFocus
        slotProps={{
          paper: {
            component: 'form',
            onSubmit: handleCrearCuotaEstructurada,
            sx: { borderRadius: 3 }
          }
        }}
      >
        <DialogTitle fontWeight="bold">Establecer Plan de Pagos Proyectados</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          
          <FormControl fullWidth>
            <InputLabel>Estructura Financiera del Plan</InputLabel>
            <Select 
              value={tipoEstructura} 
              label="Estructura Financiera del Plan" 
              onChange={e => setTipoEstructura(e.target.value)}
            >
              <MenuItem value="plan">Dividir en Múltiples Cuotas Sucesivas (Plan de Pagos)</MenuItem>
              <MenuItem value="unica">Registrar una Sola Cuota Aislada</MenuItem>
            </Select>
          </FormControl>

          <TextField 
            label="Concepto Raíz de la Obligación" 
            placeholder={tipoEstructura === 'unica' ? "Ej: Cuota de Entrada / Gastos de Admisión" : "Ej: Honorarios Profesionales por Etapa"} 
            autoFocus 
            fullWidth 
            required 
            value={conceptoCuota} 
            onChange={e => setConceptoCuota(e.target.value)} 
          />

          <TextField 
            label={tipoEstructura === 'unica' ? "Monto Neto de la Cuota (USD)" : "Monto Neto por Cuota Individual (USD)"}
            type="number" 
            fullWidth 
            required 
            slotProps={{ input: { step: 'any' } }}
            value={montoNetoCuota} 
            onChange={e => setMontoNetoCuota(e.target.value)} 
          />

          {tipoEstructura === 'plan' && (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField 
                label="Cantidad Total de Pagos" 
                type="number" 
                fullWidth 
                required 
                value={cantidadCuotas} 
                onChange={e => setCantidadCuotas(e.target.value)} 
              />
              <FormControl fullWidth>
                <InputLabel>Frecuencia de Vencimiento</InputLabel>
                <Select 
                  value={frecuenciaPlan} 
                  label="Frecuencia de Vencimiento" 
                  onChange={e => setFrecuenciaPlan(e.target.value)}
                >
                  <MenuItem value="mensual">Mensual</MenuItem>
                  <MenuItem value="quincenal">Quincenal</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
          
          {montoNetoCuota && !isNaN(parseFloat(montoNetoCuota)) && (
            <Box sx={{ p: 1.5, bgcolor: '#f1f5f9', borderRadius: 1.5 }}>
              <Typography variant="caption" color="text.secondary" display="block" fontWeight="bold">
                {tipoEstructura === 'unica' ? "Cálculo de la Cuota:" : "Cálculo por Cuota Planificada:"}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Base Honorario Neto: ${parseFloat(montoNetoCuota).toFixed(2)}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                IVA de Costa Rica (13%): ${(parseFloat(montoNetoCuota) * 0.13).toFixed(2)}
              </Typography>
              <Typography variant="subtitle2" fontWeight="bold" color="primary.main">
                Total Exigible por Cuota: ${(parseFloat(montoNetoCuota) * 1.13).toFixed(2)}
              </Typography>
              {tipoEstructura === 'plan' && (
                <Typography variant="caption" color="success.main" display="block" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                  Compromiso Total del Plan Proyectado ({cantidadCuotas} cuotas): ${(parseFloat(montoNetoCuota) * 1.13 * parseInt(cantidadCuotas || 0)).toFixed(2)}
                </Typography>
              )}
            </Box>
          )}

          <TextField 
            label={tipoEstructura === 'unica' ? "Fecha de Vencimiento" : "Vencimiento de la Primera Cuota"} 
            type="date" 
            fullWidth 
            required 
            slotProps={{ inputLabel: { shrink: true } }} 
            value={fechaVencimientoCuota} 
            onChange={e => setFechaVencimientoCuota(e.target.value)} 
          />

          <FormControl fullWidth>
            <InputLabel>Canal Planificado de Alerta / Cobro</InputLabel>
            <Select 
              value={metodoCobroCuota} 
              label="Canal Planificado de Alerta / Cobro" 
              onChange={e => setMetodoCobroCuota(e.target.value)}
            >
              <MenuItem value="stripe">Disparar Invoice de Stripe al Email al llegar la fecha</MenuItem>
              <MenuItem value="manual">Manejo Manual (El cliente pagará en banco o efectivo)</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenCuotaModal(false)} color="inherit" sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button type="submit" variant="contained" sx={{ textTransform: 'none', fontWeight: 'bold' }}>
            {tipoEstructura === 'unica' ? 'Guardar Cuota' : 'Generar Calendario de Deuda'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL INDEPENDIENTE: ANOTAR Y REGISTRAR UN PAGO RECIBIDO (CONCILIACIÓN MANUAL) */}
      <Dialog
        open={openPagoManualModal}
        onClose={() => setOpenPagoManualModal(false)}
        fullWidth
        maxWidth="xs"
        disableEnforceFocus
        disableRestoreFocus
        slotProps={{
          paper: {
            component: 'form',
            onSubmit: handleProcesarLiquidacionManual,
            sx: { borderRadius: 3 }
          }
        }}
      >
        <DialogTitle fontWeight="bold">Registrar Recaudación Manual</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Typography variant="body2" color="text.secondary">
            Vas a asentar y guardar el pago para la cuota preexistente: <strong style={{ color: '#1a365d' }}>{cuotaSeleccionadaParaPagar?.concepto}</strong>.
          </Typography>
          
          <Box sx={{ p: 1.5, bgcolor: '#f0fdf4', borderRadius: 1.5, border: '1px solid #bbf7d0' }}>
            <Typography variant="body2" color="success.main" fontWeight="bold">
              Monto Total Recibido: ${cuotaSeleccionadaParaPagar?.monto_total.toFixed(2)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              (Base Honorario: ${cuotaSeleccionadaParaPagar?.monto_neto.toFixed(2)} + IVA 13%: ${cuotaSeleccionadaParaPagar?.iva.toFixed(2)})
            </Typography>
          </Box>

          <FormControl fullWidth>
            <InputLabel>Forma de Pago Recibida</InputLabel>
            <Select 
              value={metodoPagoManual} 
              label="Forma de Pago Recibida" 
              onChange={e => setMetodoPagoManual(e.target.value)}
            >
              <MenuItem value="Transferencia Bancaria">Transferencia Bancaria (Depósito)</MenuItem>
              <MenuItem value="Efectivo">Efectivo / Caja Física</MenuItem>
            </Select>
          </FormControl>

          <TextField 
            label="Número de Referencia / Comprobante" 
            placeholder="Ej: Código de transferencia, SINPE o número de recibo" 
            fullWidth 
            required={metodoPagoManual === 'Transferencia Bancaria'}
            value={referenciaManual} 
            onChange={e => setReferenciaManual(e.target.value)} 
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenPagoManualModal(false)} color="inherit" sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button type="submit" variant="contained" color="success" sx={{ textTransform: 'none', fontWeight: 'bold' }}>
            Confirmar y Guardar Pago
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}