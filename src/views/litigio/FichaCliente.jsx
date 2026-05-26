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
  Calendar,
  Edit3
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

// REQUERIMIENTO FACTURACIÓN HACIENDA CR v4.4: Tipos de identificación fiscal autorizados ampliados
const FISCAL_ID_TYPES = [
  'Cédula Física',
  'Cédula Jurídica',
  'DIMEX',
  'NITE',
  'Extranjero No Domiciliado',
  'No Contribuyente'
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
  { code: 'DE', name: 'Alemania', phone: '#49' },
  { code: 'IT', name: 'Italia', phone: '+39' }
];

// =====================================================================================
// UTILERÍA FINANCIERA: Definición del Semáforo de Control de Riesgos
// =====================================================================================
const obtenerSemaforoCuota = (estado, fechaVencimiento) => {
  const estadoLimpio = String(estado || '').toLowerCase().trim();

  if (estadoLimpio === 'pagada' || estadoLimpio === 'pagado') {
    return { label: 'PAGADO', color: '#22c55e', textColor: '#ffffff' }; 
  }

  if (fechaVencimiento) {
    try {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const [anio, mes, dia] = fechaVencimiento.split('-').map(Number);
      const fechaLimite = new Date(anio, mes - 1, dia);
      
      if (fechaLimite < hoy) {
        return { label: 'VENCIDO', color: '#ef4444', textColor: '#ffffff' }; 
      }
    } catch (err) {
      console.error("Falla en parseo cronológico de cuota:", err);
    }
  }

  return { label: 'PENDIENTE', color: '#f59e0b', textColor: '#ffffff' }; 
};

// =====================================================================================
// SUB-COMPONENTE ENCAPSULADO: Notificaciones
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

export default function FichaCliente({ casoId, clienteId, onVolver, currentUserEmail, userRole }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [cliente, setCliente] = useState(null);
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [tipoIdentificacion, setTipoIdentificacion] = useState('Cédula de Identidad');
  const [identificacion, setIdentificacion] = useState('');
  
  // REQUERIMIENTO HACIENDA CR: Estados del perfil fiscal corporativo/personal
  const [tipoCedulaFiscal, setTipoCedulaFiscal] = useState('Cédula Física');
  const [cedulaFiscal, setCedulaFiscal] = useState('');

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

  const [historialComunicados, setHistorialComunicados] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // CONTROL FINANCIERO COMPUESTO AVANZADO
  const [planPagos, setPlanPagos] = useState([]);
  const [openCuotaModal, setOpenCuotaModal] = useState(false);
  const [openPagoManualModal, setOpenPagoManualModal] = useState(false);
  
  // MODALES EXCLUSIVOS SUPERADMIN/ADMIN: Edición y Trazabilidad local
  const [openEditarCuotaModal, setOpenEditarCuotaModal] = useState(false);
  const [cuotaAEditar, setCuotaAEditar] = useState(null);
  const [editConcepto, setEditConcepto] = useState('');
  const [editMontoNeto, setEditMontoNeto] = useState('');
  const [editFechaVencimiento, setEditFechaVencimiento] = useState('');
  const [editMotivoCambio, setEditMotivoCambio] = useState('');

  const [planesGeneralesLista, setPlanesGeneralesLista] = useState([]);
  const [faseModal, setFaseModal] = useState(1); 
  const [origenPlan, setOrigenPlan] = useState('personalizado'); 
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState(null);

  // REQUERIMIENTO MULTIMONEDA: Soporte nativo USD y colones de Costa Rica
  const [monedaPlan, setMonedaPlan] = useState('usd');

  const [conceptoCuota, setConceptoCuota] = useState('');
  const [montoNetoCuota, setMontoNetoCuota] = useState(''); 
  const [fechaVencimientoCuota, setFechaVencimientoCuota] = useState(''); 
  const [cantidadCuotas, setCantidadCuotas] = useState('4'); 
  const [frecuenciaPlan, setFrecuenciaPlan] = useState('mensual'); 
  
  const [cuotasProyectadas, setCuotasProyectadas] = useState([]);

  // Recaudación Abierta (Cascada) e inputs dinámicos multifiscales
  const [montoAbonoCascada, setMontoAbonoCascada] = useState('');
  const [metodoPagoManual, setMetodoPagoManual] = useState('Transferencia Bancaria');
  const [referenciaManual, setReferenciaManual] = useState('');
  const [permitirCondonacionAdministrativa, setPermitirCondonacionAdministrativa] = useState(false);
  const [monedaRecibidaManual, setMonedaRecibidaManual] = useState('usd');
  const [tipoCambioManualInput, setTipoCambioManualInput] = useState('');

  const clienteRef = doc(db, 'casos', casoId, 'clientes', clienteId);

  const esAdministrador = userRole === 'Superadmin' || userRole === 'Admin';

  // CONSULTA AUTOMÁTICA EN VIVO: Se conecta al API cambiario oficial del BCCR al elegir colones
  useEffect(() => {
    if (monedaRecibidaManual === 'crc' && openPagoManualModal) {
      fetch('https://tipodecambio.paginasweb.cr/api')
        .then(res => res.json())
        .then(data => {
          if (data && data.venta) {
            setTipoCambioManualInput(data.venta.toString());
          }
        })
        .catch(err => {
          console.error("No se pudo conectar de forma automática con el API del BCCR:", err);
        });
    }
  }, [monedaRecibidaManual, openPagoManualModal]);

  useEffect(() => {
    setLoading(true);
    setError('');

    const unsubCliente = onSnapshot(clienteRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCliente(data); 
        setNombres(data.nombres || ''); 
        setApellidos(data.apellidos || '');
        setTipoIdentificacion(data.tipo_identificacion || 'Cédula de Identidad');
        setIdentificacion(data.identificacion || ''); 
        setTipoCedulaFiscal(data.tipo_cedula_fiscal || 'Cédula Física');
        setCedulaFiscal(data.cedula_fiscal || '');
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

    const unsubNotas = onSnapshot(query(collection(db, 'casos', casoId, 'clientes', clienteId, 'notas'), orderBy('fecha', 'desc')), (snap) => {
      setNotas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubDocs = onSnapshot(query(collection(db, 'casos', casoId, 'clientes', clienteId, 'documentos'), orderBy('fecha_subida', 'desc')), (snap) => {
      setDocumentos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubPagos = onSnapshot(query(collection(db, 'casos', casoId, 'clientes', clienteId, 'plan_pagos'), orderBy('fecha_vencimiento', 'asc')), (snap) => {
      setPlanPagos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubPlanesGenerales = onSnapshot(collection(db, 'planes_generales'), (snap) => {
      setPlanesGeneralesLista(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

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
      unsubPlanesGenerales();
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
        tipo_cedula_fiscal: tipoCedulaFiscal,
        cedula_fiscal: cedulaFiscal.trim(),
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
        `Se editaron los metadatos demográficos y el perfil fiscal de Hacienda para: ${apellidos.trim()}, ${nombres.trim()}`
      );
      
      setSuccess('Expediente fiscal y de contacto actualizado correctamente.');
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
      setSuccess('Documento removido correctamente.');
    } catch (err) { 
      setError('Error al eliminar archivo.'); 
    }
  };

  const generarBorradorDePlanYAvancePaso3 = () => {
    const listaTemporal = [];
    let fechaBase = fechaVencimientoCuota ? new Date(fechaVencimientoCuota + 'T00:00:00') : new Date();

    if (origenPlan === 'plantilla' && plantillaSeleccionada) {
      const cuotasPlantilla = plantillaSeleccionada.cuotas || [];
      cuotasPlantilla.forEach((cPlantilla, idx) => {
        let fechaCuota = new Date(fechaBase.getTime());
        const desplazo = parseInt(cPlantilla.meses_desplazamiento || 0);
        if (desplazo > 0) {
          fechaCuota.setMonth(fechaCuota.getMonth() + desplazo);
        }
        
        const yyyy = fechaCuota.getFullYear();
        const mm = String(fechaCuota.getMonth() + 1).padStart(2, '0');
        const dd = String(fechaCuota.getDate()).padStart(2, '0');

        listaTemporal.push({
          idTemp: 'temp_' + idx + '_' + Date.now() + '_' + Math.random(),
          concepto: cPlantilla.concepto,
          monto_neto: parseFloat(cPlantilla.monto_neto) || 0,
          fecha_vencimiento: `${yyyy}-${mm}-${dd}`
        });
      });
    } else {
      const numCuotas = parseInt(cantidadCuotas) || 1;
      // Si es arbitrario, las cuotas nacen en 0 para que tú digites cada cantidad
      const netoBase = frecuenciaPlan === 'arbitrario' ? 0 : (parseFloat(montoNetoCuota) || 0);

      for (let i = 1; i <= numCuotas; i++) {
        if (i > 1) {
          if (frecuenciaPlan === 'mensual') fechaBase.setMonth(fechaBase.getMonth() + 1);
          else if (frecuenciaPlan === 'trimestral') fechaBase.setMonth(fechaBase.getMonth() + 3);
          else if (frecuenciaPlan === 'semestral') fechaBase.setMonth(fechaBase.getMonth() + 6);
        }

        const yyyy = fechaBase.getFullYear();
        const mm = String(fechaBase.getMonth() + 1).padStart(2, '0');
        const dd = String(fechaBase.getDate()).padStart(2, '0');
        
        const fechaString = frecuenciaPlan === 'arbitrario' ? '' : `${yyyy}-${mm}-${dd}`;

        listaTemporal.push({
          idTemp: 'temp_' + i + '_' + Date.now() + '_' + Math.random(),
          concepto: `Cuota ${i}/${numCuotas} - ${conceptoCuota.trim()}`,
          monto_neto: netoBase,
          fecha_vencimiento: fechaString
        });
      }
    }

    setCuotasProyectadas(listaTemporal);
    setFaseModal(3); 
  };

  const handleCrearCuotaEstructurada = async (e) => {
    e.preventDefault();
    if (faseModal < 3) {
      generarBorradorDePlanYAvancePaso3();
      return;
    }

    setError('');
    setSuccess('');
    const planPagosRef = collection(db, 'casos', casoId, 'clientes', clienteId, 'plan_pagos');

    try {
      for (const item of cuotasProyectadas) {
        const neto = parseFloat(item.monto_neto) || 0;
        const ivaCalculado = neto * 0.13; 
        const total = neto + ivaCalculado;

        // REQUERIMIENTO COMPUESTO: Inyección de Esquemas Estrictos de la Versión 4.4 del Ministerio de Hacienda
        await addDoc(planPagosRef, {
          concepto: item.concepto.trim(),
          monto_neto: neto,
          iva: ivaCalculado,
          monto_total: total,
          monto_pagado: 0,
          saldo_pendiente: total,
          fecha_vencimiento: item.fecha_vencimiento, 
          estado: 'pendiente',
          metodo_pago: null,
          moneda: monedaPlan, 
          stripe_invoice_id: null,
          stripe_invoice_url: null,
          fecha_pago_realizado: null,
          registrado_por: null,
          comprobante_referencia: '',
          
          // METADATOS COMPATIBLES CON HACIENDA v4.4 (Estructura interna oculta API Ready)
          hacienda_version: "4.4",
          proveedor_sistemas: "0000000000", // Espacio reservado para ID de proveedor
          codigo_actividad_emisor: "691001", // Código para servicios legales
          codigo_actividad_receptor: cliente?.codigo_actividad_receptor || "", // Campo condicional v4.4
          condicion_venta: origenPlan === 'plantilla' ? "01" : "02", // Contado o Crédito
          plazo_credito: origenPlan === 'plantilla' ? 0 : 30, // Expresado forzadamente en días (Integer de 5 posiciones)
          
          // Detalle de Línea e Impuestos con renamings v4.4
          codigo_cabys: "6910010000000", // Mapeo de catálogo unificado
          unidad_medida: "Sp", // Servicios Profesionales (Nota 15)
          impuesto_codigo: "01", // Impuesto al Valor Agregado
          codigo_tarifa_iva: "08", // Tarifa general 13% (Obligatorio v4.4 para impuesto 01)
          impuesto_tarifa: 13,
          
          // Esquema de Nodos Condicionales con Nombres Quirúrgicos v4.4
          exoneracion_subnodo: {
            TipoDocumentoEX: "", // Renombrado en v4.4
            NumeroDocumento: "",
            NombreInstitucion: "",
            FechaEmisionEX: "", // Renombrado en v4.4
            TarifaExonerada: 0,
            MontoExoneracion: 0
          },
          otros_cargos_subnodo: {
            TipoDocumentoOC: "", // Renombrado en v4.4
            TipoDocumentoOTRO: "",
            PorcentajeOC: 0, // Renombrado en v4.4
            MontoCargo: 0
          },
          informacion_referencia_subnodo: {
            TipoDocIR: "", // Renombrado en v4.4
            Numero: "",
            FechaEmisionIR: "", // Renombrado en v4.4
            Codigo: "",
            Razon: ""
          },
          facturacion_electronica_ready: true
        });
      }

      await registrarLogAuditoria(
        currentUserEmail,
        'Establecimiento de Plan Financiero Avanzado',
        `Se inyectó un calendario de ${cuotasProyectadas.length} cuotas personalizadas en moneda [${monedaPlan.toUpperCase()}]`
      );

      setConceptoCuota('');
      setMontoNetoCuota('');
      setFechaVencimientoCuota('');
      setCantidadCuotas('4');
      setFrecuenciaPlan('mensual');
      setOrigenPlan('personalizado');
      setPlantillaSeleccionada(null);
      setCuotasProyectadas([]);
      setFaseModal(1);
      setOpenCuotaModal(false);
      setSuccess('Plan de cuotas y vencimientos establecido correctamente.');
    } catch (err) {
      setError('Error al registrar la estructura de cuotas en el servidor.');
    }
  };

  // =====================================================================================
  // ALGORITMO COMPUESTO: Motor de Conversión de Divisas v4.4 y Liquidación en Cascada
  // =====================================================================================
  const handleProcesarLiquidacionCascada = async (e) => {
    e.preventDefault();
    let montoEnColonesParaAuditoria = 0;
    let tipoCambioAplicado = 1;
    let poolDinero = parseFloat(montoAbonoCascada);
    if (!poolDinero || poolDinero <= 0) return;

    setError('');
    setSuccess('');

    // Si el abono físico entra en colones (CRC), se ejecuta la conversión instantánea a dólares (USD)
    if (monedaRecibidaManual === 'crc') {
      tipoCambioAplicado = parseFloat(tipoCambioManualInput);
      if (!tipoCambioAplicado || tipoCambioAplicado <= 0) {
        setError('Operación Cancelada: El tipo de cambio es obligatorio para transacciones en colones.');
        return;
      }
      montoEnColonesParaAuditoria = poolDinero;
      poolDinero = poolDinero / tipoCambioAplicado; 
    }

    const ahora = new Date();
    const fechaCR = ahora.toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' });
    const periodoFiscal = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;

    const cuotasPendientesOrdenadas = planPagos
      .filter(c => c.estado === 'pendiente')
      .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento));

    if (cuotasPendientesOrdenadas.length === 0) {
      setError('No existen obligaciones pendientes para amortizar en esta ficha.');
      return;
    }

    try {
      for (const cuota of cuotasPendientesOrdenadas) {
        if (poolDinero <= 0) break;

        const saldoExigibleActual = cuota.saldo_pendiente !== undefined ? cuota.saldo_pendiente : cuota.monto_total;
        const cuotaDocRef = doc(db, 'casos', casoId, 'clientes', clienteId, 'plan_pagos', cuota.id);

        let abonoEfectivoParaEstaCuota = 0;
        let nuevoEstado = 'pendiente';
        let nuevoSaldoPendiente = saldoExigibleActual;
        let nuevoMontoPagado = cuota.monto_pagado || 0;

        if (poolDinero >= saldoExigibleActual) {
          abonoEfectivoParaEstaCuota = saldoExigibleActual;
          poolDinero -= saldoExigibleActual;
          nuevoEstado = 'pagada';
          nuevoSaldoPendiente = 0;
          nuevoMontoPagado = cuota.monto_total;
        } else {
          abonoEfectivoParaEstaCuota = poolDinero;
          nuevoSaldoPendiente = saldoExigibleActual - poolDinero;
          nuevoMontoPagado = (cuota.monto_pagado || 0) + poolDinero;
          poolDinero = 0;
          nuevoEstado = 'pendiente';
        }

        const mutacionCampos = {
          estado: nuevoEstado,
          saldo_pendiente: nuevoSaldoPendiente,
          monto_pagado: nuevoMontoPagado,
          fecha_pago_realizado: fechaCR,
          periodo_fiscal: periodoFiscal,
          registrado_por: currentUserEmail,
          metodo_pago: metodoPagoManual === 'Efectivo' ? 'efectivo' : (metodoPagoManual === 'SINPE MOVIL' ? 'sinpe' : 'transferencia'),
          comprobante_referencia: referenciaManual.trim(),
          stripe_status_sync: cuota.stripe_invoice_id ? "void_requested" : null,
          monto_colones_original: montoEnColonesParaAuditoria,
          tipo_cambio_banco: tipoCambioAplicado
        };

        await updateDoc(cuotaDocRef, mutacionCampos);

        const logInternoRef = collection(db, 'casos', casoId, 'clientes', clienteId, 'plan_pagos', cuota.id, 'historial_cambios');
        await addDoc(logInternoRef, {
          tipo_accion: 'abono_cascada',
          monto_applied: abonoEfectivoParaEstaCuota,
          saldo_restante_cuota: nuevoSaldoPendiente,
          ejecutado_por: currentUserEmail,
          fecha: fechaCR,
          referencia: referenciaManual.trim(),
          monto_colones_original: montoEnColonesParaAuditoria,
          tipo_cambio_banco: tipoCambioAplicado
        });
      }

      await registrarLogAuditoria(
        currentUserEmail,
        'Recaudación Abierta en Cascada',
        `Se procesó un abono extraordinario de ${montoAbonoCascada} ${monedaRecibidaManual.toUpperCase()} convertido a USD diluyéndose en las cuotas más antiguas.`
      );

      setMontoAbonoCascada('');
      setReferenciaManual('');
      setMonedaRecibidaManual('usd');
      setTipoCambioManualInput('');
      setOpenPagoManualModal(false);
      setSuccess('Abono extraordinario procesado e impactado en cascada correctamente.');
    } catch (err) {
      setError('Error crítico ejecutando el bucle impositivo de cascada.');
    }
  };

  const handleEjecutarEdicionAdministrativa = async (e) => {
    e.preventDefault();
    if (!cuotaAEditar || !editConcepto.trim() || !editMontoNeto || !editFechaVencimiento || !editMotivoCambio.trim()) return;

    const nuevaBase = parseFloat(editMontoNeto);
    const nuevoIva = nuevaBase * 0.13;
    const nuevoTotal = nuevaBase + nuevoIva;

    const ahora = new Date();
    const fechaCR = ahora.toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' });

    try {
      const cuotaDocRef = doc(db, 'casos', casoId, 'clientes', clienteId, 'plan_pagos', cuotaAEditar.id);
      
      const antesMetadatos = {
        concepto: cuotaAEditar.concepto,
        monto_neto: cuotaAEditar.monto_neto,
        monto_total: cuotaAEditar.monto_total,
        fecha_vencimiento: cuotaAEditar.fecha_vencimiento
      };

      await updateDoc(cuotaDocRef, {
        concepto: editConcepto.trim(),
        monto_neto: nuevaBase,
        iva: nuevoIva,
        monto_total: nuevoTotal,
        saldo_pendiente: cuotaAEditar.estado === 'pagada' ? 0 : nuevoTotal - (cuotaAEditar.monto_pagado || 0),
        fecha_vencimiento: editFechaVencimiento
      });

      const logInternoRef = collection(db, 'casos', casoId, 'clientes', clienteId, 'plan_pagos', cuotaAEditar.id, 'historial_cambios');
      await addDoc(logInternoRef, {
        tipo_accion: 'modificacion_administrativa',
        ejecutado_por: currentUserEmail,
        fecha: fechaCR,
        motivo: editMotivoCambio.trim(),
        antes: antesMetadatos,
        despues: {
          concepto: editConcepto.trim(),
          monto_neto: nuevaBase,
          monto_total: nuevoTotal,
          fecha_vencimiento: editFechaVencimiento
        }
      });

      await registrarLogAuditoria(
        currentUserEmail,
        'Modificación Administrativa de Cuota',
        `Se alteró la cuota ID: ${cuotaAEditar.id}. Motivo: ${editMotivoCambio.trim()}`
      );

      setOpenEditarCuotaModal(false);
      setCuotaAEditar(null);
      setEditMotivoCambio('');
      setSuccess('Obligación modificada y auditada correctamente.');
    } catch (err) {
      setError('No se pudo actualizar la cuota administrativamente.');
    }
  };

  const handleEliminarCuotaAdministrativa = async (cuotaObj) => {
    if (!window.confirm(`⚠️ ADVERTENCIA DE AUDITORÍA CRÍTICA:\n¿Está seguro de eliminar por completo la cuota "${cuotaObj.concepto}"?\nEsta acción es inmutable y quedará grabada en los logs generales.`)) return;
    
    try {
      const cuotaDocRef = doc(db, 'casos', casoId, 'clientes', clienteId, 'plan_pagos', cuotaObj.id);
      await deleteDoc(cuotaDocRef);

      await registrarLogAuditoria(
        currentUserEmail,
        'Eliminación Administrativa de Cuota',
        `Se eliminó la cuota "${cuotaObj.concepto}" de $${cuotaObj.monto_total.toFixed(2)} perteneciente a la ficha: ${cliente?.apellidos}`
      );
      setSuccess('Cuota borrada del expediente de forma permanente.');
    } catch (err) {
      setError('No se pudo suprimir la cuota solicitada.');
    }
  };

  const handleCondonarSaldoAdministrativo = async (cuotaObj) => {
    const motivo = window.prompt(`🔒 SOLICITUD DE CONDONACIÓN ADMINISTRATIVA:\nEscriba el motivo justificable para perdonar el saldo insoluto de la cuota "${cuotaObj.concepto}" y darla por cumplida:`);
    if (!motivo || !motivo.trim()) {
      alert('Operación cancelada: El motivo es obligatorio para fines contables de la firma.');
      return;
    }

    const ahora = new Date();
    const fechaCR = ahora.toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' });

    try {
      const cuotaDocRef = doc(db, 'casos', casoId, 'clientes', clienteId, 'plan_pagos', cuotaObj.id);
      await updateDoc(cuotaDocRef, {
        estado: 'pagada', 
        saldo_pendiente: 0,
        condonado: true,
        motivo_condonacion: motivo.trim(),
        fecha_pago_realizado: fechaCR,
        registrado_por: currentUserEmail,
        stripe_status_sync: cuotaObj.stripe_invoice_id ? "void_requested" : null
      });

      const logInternoRef = collection(db, 'casos', casoId, 'clientes', clienteId, 'plan_pagos', cuotaObj.id, 'historial_cambios');
      await addDoc(logInternoRef, {
        tipo_accion: 'condonacion_saldo_insoluto',
        ejecutado_por: currentUserEmail,
        fecha: fechaCR,
        motivo: motivo.trim(),
        saldo_perdonado: cuotaObj.saldo_pendiente !== undefined ? cuotaObj.saldo_pendiente : cuotaObj.monto_total
      });

      await registrarLogAuditoria(
        currentUserEmail,
        'Condonación de Saldo',
        `Se dio por cumplida la cuota "${cuotaObj.concepto}" perdonando el saldo restante. Razón: ${motivo.trim()}`
      );
      setSuccess('Obligación dada por cumplida mediante condonación legítima.');
    } catch (err) {
      setError('No se pudo procesar la condonación.');
    }
  };

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

            {/* PREPARACIÓN HACIENDA COSTA RICA v4.4: Campos del perfil fiscal corporativo y alfanuméricos de 20 chars */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2.5 }}>
              <FormControl fullWidth>
                <InputLabel>Tipo Cédula Fiscal (Hacienda CR)</InputLabel>
                <Select value={tipoCedulaFiscal} label="Tipo Cédula Fiscal (Hacienda CR)" onChange={(e) => setTipoCedulaFiscal(e.target.value)}>
                  {FISCAL_ID_TYPES.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField 
                label="Número Identificación Fiscal" 
                placeholder="Ej: 1-1234-1234 o ID Extranjero alfanumérico" 
                fullWidth 
                slotProps={{ input: { maxLength: 20 } }} 
                value={cedulaFiscal} 
                onChange={(e) => setCedulaFiscal(e.target.value)} 
              />
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
          
          {/* INTERFAZ DEL EXPEDIENTE FINANCIERO HÍBRIDO AVANZADO */}
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
                onClick={() => {
                  setFaseModal(1);
                  setOpenCuotaModal(true);
                }}
                sx={{ textTransform: 'none', fontWeight: 'bold', borderRadius: 1.5 }}
              >
                Establecer Plan
              </Button>
            </Box>
            
            {/* BOTÓN ABIERTO EXTRAORDINARIO (Algoritmo de Cascada) */}
            <Button
              fullWidth
              size="small"
              variant="outlined"
              color="success"
              startIcon={<CheckCircle size={14} />}
              onClick={() => {
                setMontoAbonoCascada('');
                setOpenPagoManualModal(true);
              }}
              sx={{ textTransform: 'none', fontWeight: 'bold', borderRadius: 1.5, mb: 2 }}
            >
              Registrar Abono Extraordinario (Cascada)
            </Button>

            {planPagos.length === 0 ? (
              <Alert severity="info" sx={{ borderRadius: 2, fontSize: '0.85rem' }}>
                Este representado no registra un plan de cuotas o cobros configurados.
              </Alert>
            ) : (
              <List sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {planPagos.map((cuota) => {
                  const semaforo = obtenerSemaforoCuota(cuota.estado, cuota.fecha_vencimiento);
                  const simboloMoneda = cuota.moneda === 'crc' ? '¢' : '$';
                  const exigibleReal = cuota.saldo_pendiente !== undefined ? cuota.saldo_pendiente : cuota.monto_total;

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
                        <Box sx={{ maxWidth: '60%' }}>
                          <Typography variant="body2" fontWeight="bold" color="text.primary">
                            {cuota.concepto}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Fecha Límite: {cuota.fecha_vencimiento}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                          <Chip 
                            label={cuota.condonado ? 'CONDONADA' : semaforo.label} 
                            size="small" 
                            sx={{ 
                              bgcolor: cuota.condonado ? '#7e22ce' : semaforo.color, 
                              color: semaforo.textColor, 
                              fontWeight: 'bold', 
                              fontSize: '0.68rem',
                              height: 20 
                            }} 
                          />
                          
                          {/* PANEL DE ACCIONES EXCLUSIVAS DE ADMINISTRADORES */}
                          {esAdministrador && (
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <IconButton 
                                size="small" 
                                color="primary" 
                                title="Editar Obligación"
                                onClick={() => {
                                  setCuotaAEditar(cuota);
                                  setEditConcepto(cuota.concepto);
                                  setEditMontoNeto(cuota.monto_neto);
                                  setEditFechaVencimiento(cuota.fecha_vencimiento);
                                  setOpenEditarCuotaModal(true);
                                }}
                              >
                                <Edit3 size={14} />
                              </IconButton>
                              {cuota.estado === 'pendiente' && (
                                <IconButton 
                                  size="small" 
                                  color="secondary" 
                                  title="Condonar Saldo Insoluto"
                                  onClick={() => handleCondonarSaldoAdministrativo(cuota)}
                                >
                                  <CheckCircle size={14} style={{ color: '#7e22ce' }} />
                                </IconButton>
                              )}
                              <IconButton 
                                size="small" 
                                color="error" 
                                title="Eliminar del Plan"
                                onClick={() => handleEliminarCuotaAdministrativa(cuota)}
                              >
                                <Trash2 size={14} />
                              </IconButton>
                            </Box>
                          )}
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, pt: 1, borderTop: '1px dashed #cbd5e1' }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.68rem', lineHeight: 1 }}>
                            Base: {simboloMoneda}{cuota.monto_neto.toFixed(2)} | IVA 13%: {simboloMoneda}{cuota.iva.toFixed(2)}
                          </Typography>
                          <Typography variant="subtitle2" fontWeight="bold" color="primary.main">
                            Total: {simboloMoneda}{cuota.monto_total.toFixed(2)}
                          </Typography>
                          {cuota.monto_pagado > 0 && (
                            <Typography variant="caption" color="success.main" display="block" sx={{ fontSize: '0.68rem', fontWeight: 'bold' }}>
                              Abonado: {simboloMoneda}{cuota.monto_pagado.toFixed(2)}
                            </Typography>
                          )}
                          {cuota.estado === 'pendiente' && cuota.monto_pagado > 0 && (
                            <Typography variant="caption" color="error.main" display="block" sx={{ fontSize: '0.68rem', fontWeight: 'bold' }}>
                              Saldo Restante: {simboloMoneda}{exigibleReal.toFixed(2)}
                            </Typography>
                          )}
                        </Box>

                        {cuota.estado === 'pagada' && (
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" color="success.main" display="block" sx={{ fontSize: '0.65rem', fontWeight: 'bold' }}>
                              {cuota.condonado ? '📁 Cumplida por Condonación' : (cuota.metodo_pago === 'stripe' ? '💳 Pago por Stripe' : `📁 Recaudación (${cuota.metodo_pago})`)}
                            </Typography>
                            {cuota.comprobante_referencia && (
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.62rem', fontStyle: 'italic' }}>
                                Comprobante: {cuota.comprobante_referencia}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>

                      {cuota.estado === 'pendiente' && cuota.stripe_invoice_url && (
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

      {/* MODAL WIZARD GLOBAL DE PLANES DE DEUDA: ORIGEN -> PARÁMETROS -> AJUSTE FINO */}
      <Dialog
        open={openCuotaModal}
        onClose={() => {
          setOpenCuotaModal(false);
          setFaseModal(1);
          setCuotasProyectadas([]);
        }}
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
        <DialogTitle fontWeight="bold">
          {faseModal === 1 && 'Paso 1: Configuración del Origen'}
          {faseModal === 2 && 'Paso 2: Parámetros de Proyección'}
          {faseModal === 3 && 'Paso 3: Personalizar Plazos y Vencimientos'}
        </DialogTitle>
        <DialogContent dividers>
          
          {faseModal === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <FormControl fullWidth>
                <InputLabel>Estrategia de Inicialización</InputLabel>
                <Select 
                  value={origenPlan} 
                  label="Estrategia de Inicialización" 
                  onChange={e => {
                    setOrigenPlan(e.target.value);
                    setPlantillaSeleccionada(null);
                  }}
                >
                  <MenuItem value="personalizado">Crear plan personalizado desde cero</MenuItem>
                  <MenuItem value="plantilla">Cargar un Plan General Preestablecido (Plantilla)</MenuItem>
                </Select>
              </FormControl>

              {origenPlan === 'plantilla' && (
                <FormControl fullWidth>
                  <InputLabel>Seleccionar Plan Preestablecido</InputLabel>
                  <Select 
                    value={plantillaSeleccionada ? plantillaSeleccionada.id : ''} 
                    label="Seleccionar Plan Preestablecido" 
                    required
                    onChange={e => {
                      const found = planesGeneralesLista.find(p => p.id === e.target.value);
                      setPlantillaSeleccionada(found || null);
                    }}
                  >
                    {planesGeneralesLista.map(p => (
                      <MenuItem key={p.id} value={p.id}>{p.nombre} ({p.cuotas?.length || 0} cuotas)</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
          )}

          {faseModal === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              
              {/* REQUERIMIENTO MULTIMONEDA */}
              <FormControl fullWidth>
                <InputLabel>Moneda de la Deuda</InputLabel>
                <Select value={monedaPlan} label="Moneda de la Deuda" onChange={e => setMonedaPlan(e.target.value)}>
                  <MenuItem value="usd">Dólares Americanos ($ USD)</MenuItem>
                  <MenuItem value="crc">Colones Costarricenses (¢ CRC)</MenuItem>
                </Select>
              </FormControl>

              {origenPlan === 'personalizado' ? (
                <>
                  <FormControl fullWidth>
                    <InputLabel>Regla de Intervalo para el Plan</InputLabel>
                    <Select 
                      value={frecuenciaPlan} 
                      label="Regla de Intervalo para el Plan" 
                      onChange={e => setFrecuenciaPlan(e.target.value)}
                    >
                      <MenuItem value="mensual">Mensual (Proyección automática)</MenuItem>
                      <MenuItem value="trimestral">Trimestral (Proyección automática)</MenuItem>
                      <MenuItem value="semestral">Semestral (Proyección automática)</MenuItem>
                      <MenuItem value="arbitrario">Fechas y Montos Arbitrarios (Granular)</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField 
                    label="Concepto Raíz de la Obligación" 
                    placeholder="Ej: Honorarios Profesionales"
                    fullWidth 
                    required 
                    value={conceptoCuota} 
                    onChange={e => setConceptoCuota(e.target.value)} 
                  />

                  <TextField 
                    label="¿En cuántos pagos desea dividirlo?" 
                    type="number" 
                    fullWidth 
                    required 
                    value={cantidadCuotas} 
                    onChange={e => setCantidadCuotas(e.target.value)} 
                  />

                  {/* CAMPOS CONDICIONALES: Solo aparecen si NO es arbitrario */}
                  {frecuenciaPlan !== 'arbitrario' && (
                    <>
                      <TextField 
                        label={`Monto Neto por Cuota (${monedaPlan.toUpperCase()})`}
                        type="number" 
                        fullWidth 
                        required 
                        slotProps={{ input: { step: 'any' } }}
                        value={montoNetoCuota} 
                        onChange={e => setMontoNetoCuota(e.target.value)} 
                      />
                      
                      {montoNetoCuota && !isNaN(parseFloat(montoNetoCuota)) && (
                        <Box sx={{ p: 1.5, bgcolor: '#f1f5f9', borderRadius: 1.5 }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Base Neto: {monedaPlan === 'crc' ? '¢' : '$'}{parseFloat(montoNetoCuota).toFixed(2)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            IVA Costa Rica (13%): {monedaPlan === 'crc' ? '¢' : '$'}{(parseFloat(montoNetoCuota) * 0.13).toFixed(2)}
                          </Typography>
                          <Typography variant="subtitle2" fontWeight="bold" color="primary.main">
                            Total por Cuota: {monedaPlan === 'crc' ? '¢' : '$'}{(parseFloat(montoNetoCuota) * 1.13).toFixed(2)}
                          </Typography>
                        </Box>
                      )}

                      <TextField 
                        label="Fecha de la Primera Cuota" 
                        type="date" 
                        fullWidth 
                        required
                        slotProps={{ inputLabel: { shrink: true } }} 
                        value={fechaVencimientoCuota} 
                        onChange={e => setFechaVencimientoCuota(e.target.value)} 
                      />
                    </>
                  )}
                </>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary">
                    Plantilla elegida: <strong>{plantillaSeleccionada?.nombre}</strong>. Se poblarán {plantillaSeleccionada?.cuotas?.length} hitos libres.
                  </Typography>
                  <TextField 
                    label="Fecha de Arranque para la Proyección" 
                    type="date" 
                    fullWidth 
                    required 
                    slotProps={{ inputLabel: { shrink: true } }} 
                    value={fechaVencimientoCuota} 
                    onChange={e => setFechaVencimientoCuota(e.target.value)} 
                  />
                </>
              )}
            </Box>
          )}

          {faseModal === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '420px', overflowY: 'auto', pt: 1 }}>
              <Alert severity="info" sx={{ borderRadius: 2, fontSize: '0.8rem', py: 0.5, mb: 1 }}>
                Ajuste libremente montos y fechas sin restricciones cronológicas de ningún tipo.
              </Alert>
              {cuotasProyectadas.map((item, idx) => (
                <Box key={item.idTemp} sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Typography variant="caption" fontWeight="bold" color="primary.main">
                    EDICIÓN GRANULAR - PAGO {idx + 1}
                  </Typography>
                  <TextField
                    size="small"
                    label="Concepto específico"
                    fullWidth
                    required
                    value={item.concepto}
                    onChange={(e) => {
                      const nuevas = [...cuotasProyectadas];
                      nuevas[idx].concepto = e.target.value;
                      setCuotasProyectadas(nuevas);
                    }}
                  />
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <TextField
                      size="small"
                      label={`Monto Neto (${monedaPlan.toUpperCase()})`}
                      type="number"
                      required
                      value={item.monto_neto}
                      onChange={(e) => {
                        const nuevas = [...cuotasProyectadas];
                        nuevas[idx].monto_neto = parseFloat(e.target.value) || 0;
                        setCuotasProyectadas(nuevas);
                      }}
                    />
                    <TextField
                      size="small"
                      label="Vencimiento"
                      type="date"
                      required
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={item.fecha_vencimiento}
                      onChange={(e) => {
                        const nuevas = [...cuotasProyectadas];
                        nuevas[idx].fecha_vencimiento = e.target.value;
                        setCuotasProyectadas(nuevas);
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          )}

        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          {faseModal > 1 && (
            <Button onClick={() => setFaseModal(prev => prev - 1)} color="primary" sx={{ textTransform: 'none', mr: 'auto' }}>Atrás</Button>
          )}
          <Button onClick={() => setOpenCuotaModal(false)} color="inherit" sx={{ textTransform: 'none' }}>Cancelar</Button>
          
          {faseModal < 3 ? (
            <Button 
              variant="contained" 
              onClick={() => {
                if (faseModal === 1) setFaseModal(2);
                else if (faseModal === 2) generarBorradorDePlanYAvancePaso3();
              }}
              sx={{ textTransform: 'none', fontWeight: 'bold' }}
            >
              Siguiente
            </Button>
          ) : (
            <Button type="submit" variant="contained" onClick={handleCrearCuotaEstructurada} sx={{ textTransform: 'none', fontWeight: 'bold' }}>
              Confirmar Calendario Completo
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* MODAL INTRALÓGICO: RECAUDACIÓN EN CASCADA CON CONVERSIÓN EN CALIENTE AUTOMÁTICA */}
      <Dialog
        open={openPagoManualModal}
        onClose={() => {
          setOpenPagoManualModal(false);
          setMonedaRecibidaManual('usd');
          setTipoCambioManualInput('');
        }}
        fullWidth
        maxWidth="xs"
        disableEnforceFocus
        disableRestoreFocus
        slotProps={{
          paper: {
            component: 'form',
            onSubmit: handleProcesarLiquidacionCascada,
            sx: { borderRadius: 3 }
          }
        }}
      >
        <DialogTitle fontWeight="bold">Registrar Recaudación Híbrida</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Typography variant="body2" color="text.secondary">
            Digite el monto total recibido. Si selecciona colones, el sistema consultará en tiempo real el tipo de cambio oficial de venta del BCCR y convertirá el bote a USD antes de la amortización.
          </Typography>

          {/* Selector de Moneda de Entrada Física */}
          <FormControl fullWidth>
            <InputLabel>Moneda Recibida</InputLabel>
            <Select 
              value={monedaRecibidaManual} 
              label="Moneda Recibida" 
              onChange={e => {
                setMonedaRecibidaManual(e.target.value);
                if(e.target.value === 'usd') setTipoCambioManualInput('');
              }}
            >
              <MenuItem value="usd">Dólares Americanos ($ USD)</MenuItem>
              <MenuItem value="crc">Colones Costarricenses (¢ CRC)</MenuItem>
            </Select>
          </FormControl>

          <TextField 
            label={`Monto Recibido en ${monedaRecibidaManual.toUpperCase()}`}
            type="number" 
            fullWidth 
            required 
            slotProps={{ input: { step: 'any' } }}
            value={montoAbonoCascada} 
            onChange={e => setMontoAbonoCascada(e.target.value)} 
          />

          {/* Campo de Tipo de Cambio Dinámico Automatizado por API */}
          {monedaRecibidaManual === 'crc' && (
            <TextField 
              label="Tipo de Cambio de Venta (BCCR)"
              placeholder="Ej: 518.45"
              type="number" 
              fullWidth 
              required
              slotProps={{ input: { step: 'any' } }}
              value={tipoCambioManualInput} 
              onChange={e => setTipoCambioManualInput(e.target.value)} 
              helperText={montoAbonoCascada && tipoCambioManualInput ? `Equivale en tu contabilidad a: $${(parseFloat(montoAbonoCascada) / parseFloat(tipoCambioManualInput)).toFixed(2)} USD` : ""}
            />
          )}

          <FormControl fullWidth>
            <InputLabel>Forma de Pago Recibida</InputLabel>
            <Select value={metodoPagoManual} label="Forma de Pago Recibida" onChange={e => setMetodoPagoManual(e.target.value)}>
              <MenuItem value="Transferencia Bancaria">Transferencia Bancaria (Depósito)</MenuItem>
              <MenuItem value="Efectivo">Efectivo / Caja Física</MenuItem>
              <MenuItem value="SINPE MOVIL">SINPE MÓVIL (Código 06)</MenuItem> 
              <MenuItem value="Plataforma Digital">Plataforma Digital (Código 07)</MenuItem> 
            </Select>
          </FormControl>

          <TextField 
            label="Número de Referencia / Comprobante" 
            placeholder="Código bancario o número de recibo" 
            fullWidth 
            required={metodoPagoManual === 'Transferencia Bancaria' || metodoPagoManual === 'SINPE MOVIL'}
            value={referenciaManual} 
            onChange={e => setReferenciaManual(e.target.value)} 
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => { setOpenPagoManualModal(false); setMonedaRecibidaManual('usd'); setTipoCambioManualInput(''); }} color="inherit" sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button type="submit" variant="contained" color="success" sx={{ textTransform: 'none', fontWeight: 'bold' }}>
            Confirmar y Aplicar Cascada
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL ADJUNTO EXCLUSIVO: Edición Administrativa con Justificación Obligatoria */}
      <Dialog
        open={openEditarCuotaModal}
        onClose={() => setOpenEditarCuotaModal(false)}
        fullWidth
        maxWidth="xs"
        disableEnforceFocus
        disableRestoreFocus
        slotProps={{
          paper: {
            component: 'form',
            onSubmit: handleEjecutarEdicionAdministrativa,
            sx: { borderRadius: 3 }
          }
        }}
      >
        <DialogTitle fontWeight="bold">🔧 Modificación de Cuota (Auditoría)</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField label="Concepto de la obligación" fullWidth required value={editConcepto} onChange={e => setEditConcepto(e.target.value)} />
          <TextField label="Monto Neto" type="number" fullWidth required slotProps={{ input: { step: 'any' } }} value={editMontoNeto} onChange={e => setEditMontoNeto(e.target.value)} />
          <TextField label="Fecha Vencimiento" type="date" fullWidth required slotProps={{ inputLabel: { shrink: true } }} value={editFechaVencimiento} onChange={e => setEditFechaVencimiento(e.target.value)} />
          
          <TextField 
            label="Motivo / Justificación del Cambio" 
            placeholder="Escriba la razón de la renegociación o enmienda..." 
            fullWidth 
            required 
            multiline 
            rows={2} 
            value={editMotivoCambio} 
            onChange={e => setEditMotivoCambio(e.target.value)} 
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenEditarCuotaModal(false)} color="inherit" sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button type="submit" variant="contained" color="primary" sx={{ textTransform: 'none', fontWeight: 'bold' }}>
            Guardar y Sellar Auditoría
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}