import React, { useState, useEffect } from 'react';
import { db, storage } from '../../config/firebase';
import { 
  collection, 
  addDoc, 
  setDoc,
  getDocs, 
  serverTimestamp, 
  doc, 
  deleteDoc, 
  query, 
  orderBy,
  updateDoc,
  arrayUnion
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
  Tabs, 
  Tab, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  TextField, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  IconButton, 
  Chip, 
  CircularProgress, 
  Alert, 
  Divider, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  LinearProgress, 
  List, 
  ListItem, 
  ListItemText,
  TablePagination,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  Checkbox,
  Collapse
} from '@mui/material';
import { 
  ArrowLeft, 
  Users, 
  FileText, 
  CreditCard, 
  Plus, 
  Eye, 
  Upload, 
  File, 
  Trash2,
  Clock,
  Calendar,
  Search,
  Mail
} from 'lucide-react';
import FichaCliente from './FichaCliente';
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

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// =====================================================================================
// SUB-COMPONENTE ENCAPSULADO: Maneja la expansión individual en el Historial de Casos
// =====================================================================================
function ItemComunicadoMasivo({ c }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <ListItem disablePadding sx={{ mb: 2, p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', display: 'block' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight="bold" color="primary.main">{c.asunto}</Typography>
          <Typography variant="caption" color="text.secondary">
            {`Enviado por: ${c.enviado_por} | Fecha: ${c.fecha_envio ? new Date(c.fecha_envio).toLocaleString() : ''} | Cobertura: ${c.tipo_cobertura === 'todos' ? 'Todos los representados' : 'Segmentación selectiva'} (${c.destinatarios_conteo || 0} correos)`}
          </Typography>
        </Box>
      </Box>

      <Button
        size="small"
        variant="text"
        onClick={() => setExpanded(!expanded)}
        sx={{ textTransform: 'none', fontSize: '0.75rem', p: 0, minWidth: 0, mb: 0.5, fontWeight: 'bold', color: 'primary.main' }}
      >
        {expanded ? "Ocultar contenido del mensaje" : "Ver contenido del mensaje"}
      </Button>

      <Collapse in={expanded}>
        <Typography variant="body2" sx={{ my: 1, whiteSpace: 'pre-wrap', color: 'text.primary', bgcolor: '#ffffff', p: 1.5, borderRadius: 1, border: '1px solid #e2e8f0' }}>
          {c.cuerpo}
        </Typography>
      </Collapse>

      <Divider sx={{ my: 1 }} />
      {c.pdf_url && (
        <Button
          component="a"
          href={c.pdf_url}
          target="_blank"
          rel="noopener"
          variant="text"
          size="small"
          startIcon={<File size={14} />}
          sx={{ textTransform: 'none', fontWeight: 'bold', p: 0 }}
        >
          {c.pdf_nombre || 'Ver Documento Adjunto (PDF)'}
        </Button>
      )}
    </ListItem>
  );
}

export default function DetalleCaso({ caso, onVolver, currentUserEmail, userRole }) {
  const [activeTab, setActiveTab] = useState(0);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState(null);
  
  // Estados para documentos comunes compartidos
  const [docsComunes, setDocsComunes] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadProgressDoc, setUploadProgressDoc] = useState(0);

  // Estados del formulario del representado
  const [openModal, setOpenModal] = useState(false);
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [tipoIdentificacion, setTipoIdentificacion] = useState('Cédula de Identidad');
  const [identificacion, setIdentificacion] = useState('');
  const [correoPrincipal, setCorreoPrincipal] = useState('');
  const [codigoTelefonoPrincipal, setCodigoTelefonoPrincipal] = useState('+506');
  const [telefonoPrincipal, setTelefonoPrincipal] = useState('');
  const [pais, setPais] = useState('Costa Rica');
  const [direccion, setDireccion] = useState('');
  const [notas, setNotas] = useState('');

  // Estados para control de plazos procesales fatales
  const [localPlazos, setLocalPlazos] = useState(caso.plazos || []);
  const [openPlazoModal, setOpenPlazoModal] = useState(false);
  const [descripcionPlazo, setDescripcionPlazo] = useState('');
  const [fechaFatalInput, setFechaFatalInput] = useState('');
  const [openCerrarModal, setOpenCerrarModal] = useState(false);
  const [plazoAActivar, setPlazoAActivar] = useState(null);
  
  // Estados de carga para el documento probatorio del plazo
  const [fileProbatorio, setFileProbatorio] = useState(null);
  const [uploadingPlazoDoc, setUploadingPlazoDoc] = useState(false);
  const [uploadProgressPlazoDoc, setUploadProgressPlazoDoc] = useState(0);

  // Nuevos estados para metadatos del documento de plazos
  const [descripcionProbatorio, setDescripcionProbatorio] = useState('');
  const [fechaDocumentoProbatorio, setFechaDocumentoProbatorio] = useState('');

  // Estado para el área de arrastre (Drag and Drop) e inputs de documentos comunes
  const [isDragging, setIsDragging] = useState(false);
  const [openUploadModal, setOpenUploadModal] = useState(false);
  const [fileComunSeleccionado, setFileComunSeleccionado] = useState(null);
  const [descripcionComun, setDescripcionComun] = useState('');
  const [fechaDocumentoComun, setFechaDocumentoComun] = useState('');

  // Estados locales para la caja de búsqueda y la paginación masiva de representados
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Estados locales para la sección de comunicados masivos enviados
  const [comunicados, setComunicados] = useState([]);
  const [loadingComunicados, setLoadingComunicados] = useState(false);
  const [openComunicadoModal, setOpenComunicadoModal] = useState(false);
  const [asuntoComunicado, setAsuntoComunicado] = useState('');
  const [cuerpoComunicado, setCuerpoComunicado] = useState('');
  const [fileComunicado, setFileComunicado] = useState(null);
  const [uploadingComunicado, setUploadingComunicado] = useState(false);
  const [uploadProgressComunicado, setUploadProgressComunicado] = useState(0);

  // Segmentación selectiva de destinatarios
  const [tipoDestinatario, setTipoDestinatario] = useState('todos'); 
  const [clientesSeleccionadosIds, setClientesSeleccionadosIds] = useState([]);
  const [filtroDestinatarios, setFiltroDestinatarios] = useState('');

  const fetchClientes = async () => {
    setLoading(true);
    setError('');
    try {
      const clientesRef = collection(db, 'casos', caso.id, 'clientes');
      const snapshot = await getDocs(clientesRef);
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      lista.sort((a, b) => (a.apellidos || '').localeCompare(b.apellidos || ''));
      setClientes(lista);
    } catch (err) {
      console.error(err);
      setError('Error al cargar la lista de clientes.');
    } finally { 
      setLoading(false); 
    }
  };

  const fetchDocsComunes = async () => {
    setLoadingDocs(true);
    try {
      const docsRef = collection(db, 'casos', caso.id, 'documentos_comunes');
      const snapshot = await getDocs(query(docsRef, orderBy('fecha_subida', 'desc')));
      setDocsComunes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally { 
      setLoadingDocs(false); 
    }
  };

  const fetchComunicados = async () => {
    setLoadingComunicados(true);
    try {
      const comRef = collection(db, 'casos', caso.id, 'comunicados');
      const snapshot = await getDocs(query(comRef, orderBy('fecha_envio', 'desc')));
      setComunicados(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComunicados(false);
    }
  };

  useEffect(() => {
    setLocalPlazos(caso.plazos || []);
    fetchClientes();
    fetchDocsComunes();
    fetchComunicados();
  }, [caso.id, caso.plazos]);

  const handleCreateCliente = async (e) => {
    e.preventDefault();
    if (!nombres.trim() || !apellidos.trim() || !identificacion.trim()) return;

    try {
      const clientesRef = collection(db, 'casos', caso.id, 'clientes');
      await addDoc(clientesRef, {
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        tipo_identificacion: tipoIdentificacion,
        identificacion: identificacion.trim(),
        correo_principal: correoPrincipal.trim(),
        correo_secundario: '',
        codigo_telefono_principal: codigoTelefonoPrincipal,
        telefono_principal: telefonoPrincipal.trim(),
        codigo_telefono_secundario: '+506',
        telefono_secundario: '',
        pais: pais,
        direccion: direccion.trim(),
        notas: notas.trim(),
        estado_pago: 'Pendiente',
        stripe_customer_id: '',
        fecha_registro: serverTimestamp()
      });

      await registrarLogAuditoria(
        currentUserEmail, 
        'Registro de Cliente', 
        `Se inscribió al representado "${apellidos.trim()}, ${nombres.trim()}" en el litigio [${caso.nombre}]`
      );

      setNombres('');
      setApellidos('');
      setIdentificacion('');
      setCorreoPrincipal('');
      setCodigoTelefonoPrincipal('+506');
      setTelefonoPrincipal('');
      setPais('Costa Rica');
      setDireccion('');
      setNotas('');
      setOpenModal(false);
      
      fetchClientes();
    } catch (err) {
      setError('No se pudo registrar al cliente.');
    }
  };

  const ejecutarCargaArchivoComun = async (file, desc, fechaDoc) => {
    if (!file) return;

    setUploadingDoc(true);
    setUploadProgressDoc(0);
    setError('');

    const storagePath = `casos/${caso.id}/documentos/${Date.now()}_${file.name}`;
    const storagePathRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storagePathRef, file);

    uploadTask.on('state_changed', 
      (snap) => {
        const progress = (snap.bytesTransferred / snap.totalBytes) * 100;
        setUploadProgressDoc(Math.round(progress));
      },
      (err) => { 
        setError('Error al subir documento común.'); 
        setUploadingDoc(false); 
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          await addDoc(collection(db, 'casos', caso.id, 'documentos_comunes'), {
            nombre: file.name,
            url: downloadURL,
            storage_path: storagePath,
            descripcion: desc.trim(),
            fecha_documento: fechaDoc,
            fecha_subida: new Date().toISOString()
          });

          await registrarLogAuditoria(
            currentUserEmail, 
            'Carga de Doc Común', 
            `Se subió el documento global "${file.name}" con descripción: "${desc.trim()}" para el caso "${caso.nombre}"`
          );
          
          fetchDocsComunes();
        } catch (ex) {
          setError(`Error en Firestore al guardar metadatos del documento: ${ex.message}`);
        } finally {
          setUploadingDoc(false);
        }
      }
    );
  };

  const handleUploadDocComun = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileComunSeleccionado(file);
      setOpenUploadModal(true);
    }
  };

  const handleDropDocComun = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setFileComunSeleccionado(file);
      setOpenUploadModal(true);
    }
  };

  const handleConfirmarSubidaComun = async (e) => {
    e.preventDefault();
    if (!fileComunSeleccionado || !descripcionComun.trim() || !fechaDocumentoComun) return;

    const file = fileComunSeleccionado;
    const desc = descripcionComun;
    const fecha = fechaDocumentoComun;

    setOpenUploadModal(false);
    setFileComunSeleccionado(null);
    setDescripcionComun('');
    setFechaDocumentoComun('');

    await ejecutarCargaArchivoComun(file, desc, fecha);
  };

  const handleDeleteDocComun = async (docId, storagePath) => {
    if (!window.confirm('¿Desea eliminar este documento global del caso?')) return;
    try {
      if (storagePath) {
        await deleteObject(ref(storage, storagePath));
      }
      await deleteDoc(doc(db, 'casos', caso.id, 'documentos_comunes', docId));

      await registrarLogAuditoria(
        currentUserEmail, 
        'Eliminación de Doc Común', 
        `Se borró el documento global ID: ${docId} del litigio [${caso.nombre}]`
      );

      fetchDocsComunes();
    } catch (err) { 
      setError('Error al suprimir el documento común.'); 
    }
  };

  const handleBoxAgregarPlazo = async (e) => {
    e.preventDefault();
    if (!descripcionPlazo.trim() || !fechaFatalInput) return;

    setError('');
    const nuevoPlazoObj = {
      id: 'plazo_' + Date.now(),
      descripcion: descripcionPlazo.trim(),
      fechaFatal: fechaFatalInput,
      completado: false,
      fechaPresentacion: '',
      documentoProbatorioNombre: '',
      documentoProbatorioUrl: '',
      documentoProbatorioDescripcion: '',
      documentoProbatorioFechaDocumento: '',
      storage_path: ''
    };

    try {
      const casoDocRef = doc(db, 'casos', caso.id);
      await updateDoc(casoDocRef, {
        plazos: arrayUnion(nuevoPlazoObj)
      });

      await registrarLogAuditoria(
        currentUserEmail,
        'Registro de Plazo',
        `Se asignó fecha fatal ${fechaFatalInput} para "${descripcionPlazo.trim()}" en el caso "${caso.nombre}"`
      );

      setLocalPlazos(prev => [...prev, nuevoPlazoObj]);
      setDescripcionPlazo('');
      setFechaFatalInput('');
      setOpenPlazoModal(false);
    } catch (err) {
      setError('No se pudo guardar el plazo procesal.');
    }
  };

  const handleConfirmarCierrePlazo = async (e) => {
    e.preventDefault();
    if (!plazoAActivar || !fileProbatorio || !descripcionProbatorio.trim() || !fechaDocumentoProbatorio) return;

    setUploadingPlazoDoc(true);
    setUploadProgressPlazoDoc(0);
    setError('');

    const storagePath = `casos/${caso.id}/documentos/${Date.now()}_${fileProbatorio.name}`;
    const storagePathRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storagePathRef, fileProbatorio);

    uploadTask.on('state_changed', 
      (snap) => {
        const progress = (snap.bytesTransferred / snap.totalBytes) * 100;
        setUploadProgressPlazoDoc(Math.round(progress));
      },
      (err) => { 
        setError('Error al subir el documento probatorio.'); 
        setUploadingPlazoDoc(false); 
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          await addDoc(collection(db, 'casos', caso.id, 'documentos_comunes'), {
            nombre: fileProbatorio.name,
            url: downloadURL,
            storage_path: storagePath,
            descripcion: descripcionProbatorio.trim(),
            fecha_documento: fechaDocumentoProbatorio,
            fecha_subida: new Date().toISOString()
          });

          const plazosModificados = localPlazos.map(p => {
            if (p.id === plazoAActivar.id) {
              return {
                ...p,
                completado: true,
                fechaPresentacion: new Date().toLocaleString(),
                documentoProbatorioNombre: fileProbatorio.name,
                documentoProbatorioUrl: downloadURL,
                documentoProbatorioDescripcion: descripcionProbatorio.trim(),
                documentoProbatorioFechaDocumento: fechaDocumentoProbatorio,
                storage_path: storagePath
              };
            }
            return p;
          });

          const casoDocRef = doc(db, 'casos', caso.id);
          await updateDoc(casoDocRef, { plazos: plazosModificados });

          await registrarLogAuditoria(
            currentUserEmail,
            'Resolución de Plazo',
            `Se solventó plazo ID: ${plazoAActivar.id} subiendo documento probatorio: "${fileProbatorio.name}"`
          );

          setLocalPlazos(plazosModificados);
          setFileProbatorio(null);
          setDescripcionProbatorio('');
          setFechaDocumentoProbatorio('');
          setPlazoAActivar(null);
          setOpenCerrarModal(false);
          fetchDocsComunes(); 
        } catch (ex) {
          setError(`Error en Firestore al resolver plazo: ${ex.message}`);
        } finally {
          setUploadingPlazoDoc(false);
        }
      }
    );
  };

  const handleCreateComunicado = async (e) => {
    e.preventDefault();
    if (!asuntoComunicado.trim() || !cuerpoComunicado.trim()) return;

    setUploadingComunicado(true);
    setUploadProgressComunicado(0);
    setError('');

    let poolClientesAEnviar = [];
    if (tipoDestinatario === 'todos') {
      poolClientesAEnviar = clientes;
    } else {
      poolClientesAEnviar = clientes.filter(c => clientesSeleccionadosIds.includes(c.id));
    }

    const listaCorreos = poolClientesAEnviar
      .map(c => c.correo_principal)
      .filter(email => email && email.trim() !== '');

    if (listaCorreos.length === 0) {
      setError('Operación cancelada: No se reportan destinatarios con correos válidos para este envío.');
      setUploadingComunicado(false);
      return;
    }

    const comunicadoCollectionRef = collection(db, 'casos', caso.id, 'comunicados');
    const nuevoComunicadoDoc = doc(comunicadoCollectionRef);
    const comunicadoId = nuevoComunicadoDoc.id;

    const guardarDocumentoEnFirestore = async (pdfNombre = '', pdfUrl = '', storagePath = '') => {
      try {
        const modeloDocumentoMail = {
          from: 'contacto@sipdh.com', 
          to: listaCorreos,
          template: {
            name: 'comunicado_institucional',
            data: {
              asunto: asuntoComunicado.trim(),
              cuerpo: cuerpoComunicado.trim()
            }
          },
          headers: {
            "X-SMTPAPI": JSON.stringify({
              unique_args: {
                casoId: caso.id,
                comunicadoId: comunicadoId
              }
            })
          },
          asunto: asuntoComunicado.trim(),
          cuerpo: cuerpoComunicado.trim(),
          fecha_envio: new Date().toISOString(),
          enviado_por: currentUserEmail,
          tipo_cobertura: tipoDestinatario,
          destinatarios_conteo: listaCorreos.length
        };

        if (pdfUrl) {
          modeloDocumentoMail.pdf_nombre = pdfNombre;
          modeloDocumentoMail.pdf_url = pdfUrl;
          modeloDocumentoMail.storage_path = storagePath;
          modeloDocumentoMail.message = {
            attachments: [{ filename: pdfNombre, path: pdfUrl }]
          };
        }

        await setDoc(nuevoComunicadoDoc, modeloDocumentoMail);

        const fechaCR = new Date().toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' });
        for (const clienteItem of poolClientesAEnviar) {
          const historialRef = doc(db, 'casos', caso.id, 'clientes', clienteItem.id, 'historial_comunicados', comunicadoId);
          await setDoc(historialRef, {
            comunicadoId: comunicadoId,
            asunto: asuntoComunicado.trim(),
            cuerpo: cuerpoComunicado.trim(),
            pdf_nombre: pdfNombre,
            pdf_url: pdfUrl,
            storage_path: storagePath,
            estado: 'Enviado',
            ultima_actualizacion: fechaCR
          });
        }

        await registrarLogAuditoria(
          currentUserEmail,
          'Envío de Comunicado',
          `Se registró comunicado: "${asuntoComunicado.trim()}" con destino a ${listaCorreos.length} representados.`
        );

        setAsuntoComunicado('');
        setCuerpoComunicado('');
        setFileComunicado(null);
        setClientesSeleccionadosIds([]);
        setFiltroDestinatarios('');
        setTipoDestinatario('todos');
        setOpenComunicadoModal(false);
        fetchComunicados();
      } catch (ex) {
        setError(`Error crítico en Firestore al registrar comunicado: ${ex.message}`);
      } finally {
        setUploadingComunicado(false);
      }
    };

    if (fileComunicado) {
      const storagePath = `casos/${caso.id}/documentos/${Date.now()}_${fileComunicado.name}`;
      const storagePathRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storagePathRef, fileComunicado);

      uploadTask.on('state_changed', 
        (snap) => {
          const progress = (snap.bytesTransferred / snap.totalBytes) * 100;
          setUploadProgressComunicado(Math.round(progress));
        },
        (err) => {
          setError(`Error al subir el archivo del comunicado a Storage: ${err.message}`);
          setUploadingComunicado(false);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            await guardarDocumentoEnFirestore(fileComunicado.name, downloadURL, storagePath);
          } catch (exURL) {
            setError(`Error obtaining the URL file: ${exURL.message}`);
            setUploadingComunicado(false);
          }
        }
      );
    } else {
      await guardarDocumentoEnFirestore();
    }
  };

  const semaforoGeneral = (() => {
    const plazosActivos = localPlazos.filter(p => !p.completado);
    if (plazosActivos.length === 0) return null;

    const fechasEnMilisegundos = plazosActivos.map(p => new Date(p.fechaFatal + 'T00:00:00').getTime());
    const fechaMasProximaMs = Math.min(...fechasEnMilisegundos);
    
    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    
    const fechaFatal = new Date(fechaMasProximaMs);
    fechaFatal.setHours(0,0,0,0);

    const diferenciaTiempo = fechaFatal.getTime() - hoy.getTime();
    const diasRestantes = Math.ceil(diferenciaTiempo / (1000 * 60 * 60 * 24));

    if (diasRestantes < 0) return { label: `Vencido (${Math.abs(diasRestantes)} d)`, color: '#b91c1c' };
    if (diasRestantes <= 2) return { label: `URGENTE (${diasRestantes} d)`, color: '#b91c1c' };
    if (diasRestantes <= 5) return { label: `Advertencia (${diasRestantes} d)`, color: '#b45309' };
    return { label: `${diasRestantes} días libres`, color: '#15803d' };
  })();

  const clientesFiltrados = clientes.filter(c => {
    const queryTerm = searchQuery.toLowerCase().trim();
    if (!queryTerm) return true;

    const nombreCompleto = `${c.nombres || ''} ${c.apellidos || ''}`.toLowerCase();
    const apellidosNombres = `${c.apellidos || ''} ${c.nombres || ''}`.toLowerCase();
    const documento = (c.identificacion || '').toLowerCase();
    const territorio = (c.pais || '').toLowerCase();
    const correoElectronico = (c.correo_principal || '').toLowerCase();

    return nombreCompleto.includes(queryTerm) || 
           apellidosNombres.includes(queryTerm) || 
           documento.includes(queryTerm) || 
           territorio.includes(queryTerm) || 
           correoElectronico.includes(queryTerm);
  });

  const clientesPaginados = clientesFiltrados.slice(page * rowsPerPage, (page * rowsPerPage) + rowsPerPage);

  if (clienteSeleccionadoId) {
    return (
      <FichaCliente 
        casoId={caso.id} 
        clienteId={clienteSeleccionadoId} 
        onVolver={() => setClienteSeleccionadoId(null)} 
        currentUserEmail={currentUserEmail} 
      />
    );
  }

  return (
    <Box>
      <Button 
        startIcon={<ArrowLeft size={16} />} 
        onClick={onVolver} 
        sx={{ mb: 2, textTransform: 'none', color: 'text.secondary' }}
      >
        Volver a todos los casos
      </Button>

      <Paper sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
        <Typography variant="h4" fontWeight="bold" color="primary.main" gutterBottom>
          {caso.nombre}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {caso.descripcion || 'Sin descripción del litigio.'}
        </Typography>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2, fontWeight: 'medium' }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)} textColor="primary" indicatorColor="primary">
          <Tab icon={<Users size={18} />} iconPosition="start" label="Fichas de Clientes" sx={{ textTransform: 'none', fontWeight: 'bold' }} />
          <Tab icon={<FileText size={18} />} iconPosition="start" label="Documentos Comunes" sx={{ textTransform: 'none', fontWeight: 'bold' }} />
          <Tab icon={<CreditCard size={18} />} iconPosition="start" label="Control de Pagos" sx={{ textTransform: 'none', fontWeight: 'bold' }} />
          <Tab 
            icon={<Clock size={18} style={{ color: semaforoGeneral ? semaforoGeneral.color : 'inherit' }} />} 
            iconPosition="start" 
            label={semaforoGeneral ? `Control de Vencimientos (${semaforoGeneral.label})` : "Control de Vencimientos"} 
            style={{ 
              textTransform: 'none', 
              fontWeight: 'bold', 
              color: semaforoGeneral ? semaforoGeneral.color : 'inherit' 
            }} 
          />
          <Tab icon={<Mail size={18} />} iconPosition="start" label="Comunicados Enviados" sx={{ textTransform: 'none', fontWeight: 'bold' }} />
        </Tabs>
      </Box>

      {/* PESTAÑA 1: RECONSTRUCCIÓN VERTICAL TABLA DE REPRESETADOS */}
      <TabPanel value={activeTab} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" fontWeight="bold">Representados en el Litigio</Typography>
          <Button 
            variant="contained" 
            startIcon={<Plus size={18} />} 
            onClick={() => setOpenModal(true)} 
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 'bold' }}
          >
            Agregar Cliente
          </Button>
        </Box>

        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            size="small"
            variant="outlined"
            placeholder="Buscar representados por nombres, apellidos, identificación, país de residencia o correo electrónico..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <Box sx={{ display: 'flex', alignItems: 'center', mr: 1, color: 'text.secondary' }}>
                  <Search size={18} />
                </Box>
              ),
            }}
          />
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : clientesFiltrados.length === 0 ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            {searchQuery ? 'No se localizaron registros de representados que coincidan con los criterios de búsqueda introducidos.' : 'No hay clientes registrados en este litigio.'}
          </Alert>
        ) : (
          <>
            <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Apellidos y Nombres</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Documento de Identidad</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>País</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Contacto Principal</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Pago Stripe</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {clientesPaginados.map((clienteItem) => (
                    <TableRow key={clienteItem.id} hover>
                      <TableCell sx={{ fontWeight: 'medium' }}>
                        {clienteItem.apellidos}, {clienteItem.nombres}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{clienteItem.identificacion}</Typography>
                        <Typography variant="caption" color="text.secondary">{clienteItem.tipo_identificacion}</Typography>
                      </TableCell>
                      <TableCell>
                        {clienteItem.pais || 'No especificado'}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{clienteItem.correo_principal || 'Sin correo'}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {clienteItem.telefono_principal ? `${clienteItem.codigo_telefono_principal} ${clienteItem.telefono_principal}` : 'Sin teléfono'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={clienteItem.estado_pago} 
                          size="small" 
                          color={clienteItem.estado_pago === 'Pagado' ? 'success' : 'warning'} 
                          sx={{ fontWeight: 'bold' }} 
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton 
                          size="small" 
                          color="primary" 
                          title="Ver Ficha Completa" 
                          onClick={() => setClienteSeleccionadoId(clienteItem.id)}
                        >
                          <Eye size={18} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[10, 25, 50]}
              component="div"
              count={clientesFiltrados.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              labelRowsPerPage="Representados por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            />
          </>
        )}
      </TabPanel>

      {/* PESTAÑA 2: DOCUMENTOS COMUNES */}
      <TabPanel value={activeTab} index={1}>
        <Paper 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDropDocComun}
          sx={{ 
            p: 3, 
            borderRadius: 3, 
            border: isDragging ? '2px dashed #1a365d' : '1px solid #e2e8f0', 
            bgcolor: isDragging ? '#f0f4f8' : '#ffffff',
            boxShadow: 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h6" fontWeight="bold">Escritos y Respuestas de Instancias Internacionales</Typography>
              <Typography variant="caption" color="text.secondary">Puede arrastrar y soltar archivos PDF directamente sobre este panel.</Typography>
            </Box>
            <Button 
              variant="contained" 
              component="label" 
              startIcon={<Upload size={18} />} 
              disabled={uploadingDoc} 
              sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 'bold' }}
            >
              {uploadingDoc ? 'Subiendo...' : 'Subir Documento Común'}
              <input type="file" accept="application/pdf,image/*" hidden onChange={handleUploadDocComun} />
            </Button>
          </Box>
          
          {uploadingDoc && (
            <Box sx={{ width: '100%', mb: 3 }}>
              <LinearProgress variant="determinate" value={uploadProgressDoc} />
            </Box>
          )}

          {loadingDocs ? (
            <CircularProgress />
          ) : docsComunes.length === 0 ? (
            <Alert severity="info">No hay documentos globales subidos para este litigio.</Alert>
          ) : (
            <List>
              {docsComunes.map((d) => (
                <ListItem key={d.id} disablePadding sx={{ mb: 1, display: 'flex', gap: 2 }}>
                  <Button 
                    component="a" 
                    href={d.url} 
                    target="_blank" 
                    variant="text" 
                    color="inherit" 
                    startIcon={<File size={16} />} 
                    sx={{ flexGrow: 1, justifyContent: 'flex-start', p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5 }}
                  >
                    <ListItemText 
                      primary={d.nombre} 
                      secondary={
                        <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
                          <Typography variant="body2" component="span" color="text.primary" sx={{ display: 'block', fontWeight: 'medium' }}>
                            {d.descripcion || 'Sin descripción configurada.'}
                          </Typography>
                          <Typography variant="caption" component="span" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                            {`Fecha Doc: ${d.fecha_documento || 'No específica'} | Subido: ${d.fecha_subida ? new Date(d.fecha_subida).toLocaleString() : ''}`}
                          </Typography>
                        </Box>
                      } 
                    />
                  </Button>
                  <IconButton 
                    size="small" 
                    color="error" 
                    onClick={() => handleDeleteDocComun(d.id, d.storage_path)} 
                    sx={{ border: '1px solid #fee2e2', bgcolor: '#fef2f2', p: 1.25 }}
                  >
                    <Trash2 size={18} />
                  </IconButton>
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </TabPanel>

      {/* PESTAÑA 3: PAGOS */}
      <TabPanel value={activeTab} index={2}>
        <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>Pasarela de Stripe</Typography>
          <Typography variant="body2" color="text.secondary">Registro general de conciliación de pagos de este litigio.</Typography>
        </Paper>
      </TabPanel>

      {/* PESTAÑA 4: CONTROL DE VENCIMIENTOS PROCESALES */}
      <TabPanel value={activeTab} index={3}>
        <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h6" fontWeight="bold">Fechas Fatales y Plazos Judiciales</Typography>
              <Typography variant="body2" color="text.secondary">Seguimiento de términos perentorios asociados a las notificaciones oficiales.</Typography>
            </Box>
            <Button 
              variant="contained" 
              startIcon={<Calendar size={18} />} 
              onClick={() => setOpenPlazoModal(true)} 
              sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 'bold' }}
            >
              Cargar Fecha Fatal
            </Button>
          </Box>

          {localPlazos.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>No hay plazos procesales configurados para este litigio.</Alert>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Término Procesal / Descripción</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Fecha Límite</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Estatus</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Documento Probatorio</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {localPlazos.map((plazo) => {
                    const cfg = (() => {
                      if (plazo.completado) return { colorChip: 'success', label: 'Presentado', bgFila: '#ffffff' };
                      const hoy = new Date();
                      hoy.setHours(0,0,0,0);
                      const fatal = new Date(plazo.fechaFatal + 'T00:00:00');
                      fatal.setHours(0,0,0,0);
                      const diff = Math.ceil((fatal.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

                      if (diff < 0) return { colorChip: 'error', label: 'Vencido', bgFila: '#fef2f2' };
                      if (diff <= 2) return { colorChip: 'error', label: 'CRÍTICO', bgFila: '#fef2f2' };
                      if (diff <= 5) return { colorChip: 'warning', label: 'Advertencia', bgFila: '#fffbeb' };
                      return { colorChip: 'info', label: 'A tiempo', bgFila: '#ffffff' };
                    })();

                    return (
                      <TableRow key={plazo.id} sx={{ bgcolor: cfg.bgFila }} hover>
                        <TableCell sx={{ fontWeight: 'medium', py: 1.5 }}>{plazo.descripcion}</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: '#b91c1c' }}>{plazo.fechaFatal}</TableCell>
                        <TableCell><Chip label={cfg.label} color={cfg.colorChip} size="small" sx={{ fontWeight: 'bold' }} /></TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>
                          {plazo.completado ? (
                            <Box>
                              <Button
                                component="a"
                                href={plazo.documentoProbatorioUrl}
                                target="_blank"
                                rel="noopener"
                                variant="text"
                                size="small"
                                startIcon={<File size={14} />}
                                sx={{ textTransform: 'none', p: 0, fontWeight: 'bold', justifyContent: 'flex-start' }}
                              >
                                {plazo.documentoProbatorioNombre || 'Ver Archivo'}
                              </Button>
                              <Typography variant="caption" display="block" color="text.primary" sx={{ fontWeight: 'medium', mt: 0.5 }}>
                                {plazo.documentoProbatorioDescripcion}
                              </Typography>
                              <Typography variant="caption" display="block" color="text.secondary">
                                Fecha Doc: {plazo.documentoProbatorioFechaDocumento || 'No asignada'}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                              Exigible ante la instancia
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          {!plazo.completado ? (
                            <Button 
                              variant="contained" 
                              color="success" 
                              size="small" 
                              onClick={() => { setPlazoAActivar(plazo); setOpenCerrarModal(true); }}
                              sx={{ textTransform: 'none', fontWeight: 'bold', borderRadius: 1.5 }}
                            >
                              Cerrar
                            </Button>
                          ) : (
                            <Chip label="Histórico" size="small" variant="outlined" disabled />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </TabPanel>

      {/* PESTAÑA 5: COMUNICADOS ENVIADOS (BITÁCORA DE MAILING MASIVO) */}
      <TabPanel value={activeTab} index={4}>
        <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h6" fontWeight="bold">Historial de Comunicados Enviados</Typography>
              <Typography variant="body2" color="text.secondary">Registro de circulares y comunicados enviados por correo a los representados.</Typography>
            </Box>
            <Button 
              variant="contained" 
              startIcon={<Plus size={18} />} 
              onClick={() => {
                setClientesSeleccionadosIds([]);
                setFiltroDestinatarios('');
                setTipoDestinatario('todos');
                setOpenComunicadoModal(true);
              }} 
              sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 'bold' }}
            >
              Redactar Comunicado
            </Button>
          </Box>

          {loadingComunicados ? (
            <CircularProgress />
          ) : comunicados.length === 0 ? (
            <Alert severity="info">No se registran comunicados masivos enviados para este litigio.</Alert>
          ) : (
            <List>
              {comunicados.map((c) => (
                <ItemComunicadoMasivo key={c.id} c={c} />
              ))}
            </List>
          )}
        </Paper>
      </TabPanel>

      {/* MODAL DE AGREGAR CLIENTE EXTENDIDO */}
      <Dialog 
        open={openModal} 
        onClose={() => setOpenModal(false)} 
        fullWidth 
        maxWidth="sm" 
        disableEnforceFocus
        disableRestoreFocus
        slotProps={{ 
          paper: { 
            component: 'form',
            onSubmit: handleCreateCliente,
            sx: { borderRadius: 3 } 
          } 
        }}
      >
        <DialogTitle fontWeight="bold">Nueva Ficha de Cliente</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2.5 }}>
            <TextField label="Nombres" autoFocus required fullWidth value={nombres} onChange={(e) => setNombres(e.target.value)} />
            <TextField label="Apellidos" required fullWidth value={apellidos} onChange={(e) => setApellidos(e.target.value)} />
          </Box>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2.5 }}>
            <FormControl fullWidth>
              <InputLabel>Tipo Identificación</InputLabel>
              <Select value={tipoIdentificacion} label="Tipo Identificación" onChange={(e) => setTipoIdentificacion(e.target.value)}>
                {DOC_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Número de Identificación" required fullWidth value={identificacion} onChange={(e) => setIdentificacion(e.target.value)} />
          </Box>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2.5 }}>
            <FormControl fullWidth>
              <InputLabel>País de Residencia</InputLabel>
              <Select 
                value={pais} 
                label="País de Residencia" 
                onChange={(e) => { 
                  setPais(e.target.value); 
                  const c = COUNTRIES.find(x => x.name === e.target.value); 
                  if (c) setCodigoTelefonoPrincipal(c.phone); 
                }}
              >
                {COUNTRIES.map(c => <MenuItem key={c.code} value={c.name}>{c.name}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Email Principal" type="email" required fullWidth value={correoPrincipal} onChange={(e) => setCorreoPrincipal(e.target.value)} />
          </Box>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 2, mb: 2.5 }}>
            <FormControl fullWidth>
              <InputLabel>Código</InputLabel>
              <Select value={codigoTelefonoPrincipal} label="Código" onChange={(e) => setCodigoTelefonoPrincipal(e.target.value)}>
                {COUNTRIES.map(c => <MenuItem key={c.code} value={c.phone}>{`${c.code} (${c.phone})`}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Número Telefónico Principal" fullWidth value={telefonoPrincipal} onChange={(e) => setTelefonoPrincipal(e.target.value)} />
          </Box>
          
          <Box sx={{ mb: 2.5 }}>
            <TextField label="Dirección Física Completa" fullWidth multiline rows={2} value={direccion} onChange={(e) => setDireccion(e.target.value)} />
          </Box>
          
          <TextField label="Notas Jurídicas Iniciales" fullWidth multiline rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenModal(false)} color="inherit">Cancelar</Button>
          <Button type="submit" variant="contained">Registrar en el Caso</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: CARGAR PLAZO */}
      <Dialog 
        open={openPlazoModal} 
        onClose={() => setOpenPlazoModal(false)} 
        fullWidth 
        maxWidth="xs" 
        disableEnforceFocus
        disableRestoreFocus
        slotProps={{ 
          paper: { 
            component: 'form',
            onSubmit: handleBoxAgregarPlazo,
            sx: { borderRadius: 3 } 
          } 
        }}
      >
        <DialogTitle fontWeight="bold">Cargar Término Procesal</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Descripción del Término (Ej: Recurso de Apelación)" autoFocus fullWidth required value={descripcionPlazo} onChange={e => setDescripcionPlazo(e.target.value)} />
          <TextField label="Fecha Límite Judicial (Fecha Fatal)" type="date" fullWidth required slotProps={{ inputLabel: { shrink: true } }} value={fechaFatalInput} onChange={e => setFechaFatalInput(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenPlazoModal(false)} color="inherit" sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button type="submit" variant="contained" sx={{ textTransform: 'none', fontWeight: 'bold' }}>Cargar Término</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL INTERMEDIO: INGRESO DE METADATOS PARA EL DOCUMENTO COMÚN */}
      <Dialog 
        open={openUploadModal} 
        onClose={() => { if (!uploadingDoc) { setOpenUploadModal(false); setFileComunSeleccionado(null); } }} 
        fullWidth 
        maxWidth="xs" 
        disableEnforceFocus
        disableRestoreFocus
        slotProps={{ 
          paper: { 
            component: 'form',
            onSubmit: handleConfirmarSubidaComun,
            sx: { borderRadius: 3 } 
          } 
        }}
      >
        <DialogTitle fontWeight="bold">Metadatos del Documento Común</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Typography variant="body2" color="text.secondary">
            Archivo detectado: <strong>{fileComunSeleccionado?.name}</strong>
          </Typography>
          <TextField label="Descripción Material del Documento" autoFocus fullWidth required value={descripcionComun} onChange={e => setDescripcionComun(e.target.value)} />
          <TextField label="Fecha de Emisión del Documento" type="date" fullWidth required slotProps={{ inputLabel: { shrink: true } }} value={fechaDocumentoComun} onChange={e => setFechaDocumentoComun(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => { setOpenUploadModal(false); setFileComunSeleccionado(null); }} color="inherit" sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button type="submit" variant="contained" sx={{ textTransform: 'none', fontWeight: 'bold' }}>Subir Documento</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: RESOLVER PLAZO CON ARCHIVO PROBATORIO Y METADATOS OBLIGATORIOS */}
      <Dialog 
        open={openCerrarModal} 
        onClose={() => { if (!uploadingPlazoDoc) { setOpenCerrarModal(false); setFileProbatorio(null); } }} 
        fullWidth 
        maxWidth="xs" 
        disableEnforceFocus
        disableRestoreFocus
        slotProps={{ 
          paper: { 
            component: 'form',
            onSubmit: handleConfirmarCierrePlazo,
            sx: { borderRadius: 3 } 
          } 
        }}
      >
        <DialogTitle fontWeight="bold">Subsanar y Cargar Documento Probatorio</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Typography variant="body2" color="text.secondary">
            Para dar por solventado este plazo ante instancias internacionales, debe anexar obligatoriamente el documento sustentatorio en formato digital.
          </Typography>
          
          <Button 
            variant="outlined" 
            component="label" 
            startIcon={<Upload size={18} />} 
            disabled={uploadingPlazoDoc} 
            fullWidth
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 'bold', py: 1.5, mb: 1 }}
          >
            {fileProbatorio ? fileProbatorio.name : 'Seleccionar Documento Probatorio'}
            <input type="file" accept="application/pdf,image/*" hidden required onChange={(e) => setFileProbatorio(e.target.files[0])} />
          </Button>

          <TextField label="Descripción Completa de la Prueba" autoFocus fullWidth required disabled={uploadingPlazoDoc} value={descripcionProbatorio} onChange={e => setDescripcionProbatorio(e.target.value)} />
          <TextField label="Fecha de Emisión de la Prueba" type="date" fullWidth required disabled={uploadingPlazoDoc} slotProps={{ inputLabel: { shrink: true } }} value={fechaDocumentoProbatorio} onChange={e => setFechaDocumentoProbatorio(e.target.value)} />

          {uploadingPlazoDoc && (
            <Box sx={{ width: '100%', mt: 1 }}>
              <LinearProgress variant="determinate" value={uploadProgressPlazoDoc} />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 0.5 }}>
                Subiendo archivo... {uploadProgressPlazoDoc}%
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => { setOpenCerrarModal(false); setFileProbatorio(null); }} color="inherit" sx={{ textTransform: 'none' }} disabled={uploadingPlazoDoc}>Abortar</Button>
          <Button type="submit" variant="contained" color="success" sx={{ textTransform: 'none', fontWeight: 'bold' }} disabled={uploadingPlazoDoc || !fileProbatorio}>
            {uploadingPlazoDoc ? 'Procesando...' : 'Registrar Presentación'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: REDACTAR COMUNICADO MASIVO O SELECTIVO CON FILTRO DE DESTINATARIOS */}
      <Dialog 
        open={openComunicadoModal} 
        onClose={() => { if (!uploadingComunicado) { setOpenComunicadoModal(false); setFileComunicado(null); } }} 
        fullWidth 
        maxWidth="sm" 
        disableEnforceFocus
        disableRestoreFocus
        slotProps={{ 
          paper: { 
            component: 'form',
            onSubmit: handleCreateComunicado,
            sx: { borderRadius: 3 } 
          } 
        }}
      >
        <DialogTitle fontWeight="bold">Redactar y Registrar Comunicado</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Typography variant="body2" color="text.secondary">
            El texto aquí registrado se enviará a los representados seleccionados. El archivo adjunto es opcional.
          </Typography>
          
          <TextField label="Asunto del Correo / Comunicado" autoFocus fullWidth required disabled={uploadingComunicado} value={asuntoComunicado} onChange={e => setAsuntoComunicado(e.target.value)} />
          <TextField label="Cuerpo del Mensaje (Texto del Email)" fullWidth multiline rows={4} required disabled={uploadingComunicado} value={cuerpoComunicado} onChange={e => setCuerpoComunicado(e.target.value)} />
          
          {/* CONTROL DE SEGMENTACIÓN DE DESTINATARIOS */}
          <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
            <FormLabel component="legend" style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#1a365d', marginBottom: '8px' }}>
              Destinatarios del Mensaje
            </FormLabel>
            <RadioGroup
              row
              value={tipoDestinatario}
              onChange={(e) => setTipoDestinatario(e.target.value)}
              disabled={uploadingComunicado}
            >
              <FormControlLabel value="todos" control={<Radio size="small" />} label={`Enviar a todos (${clientes.length})`} />
              <FormControlLabel value="especificos" control={<Radio size="small" />} label="Seleccionar específicos" />
            </RadioGroup>

            {/* PANEL DESPLEGABLE: SELECCIÓN MANUAL DE CLIENTES CON BUSCADOR DINÁMICO */}
            {tipoDestinatario === 'especificos' && (
              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px dashed #cbd5e1' }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar destinatario por nombre o país..."
                  value={filtroDestinatarios}
                  onChange={(e) => setFiltroDestinatarios(e.target.value)}
                  disabled={uploadingComunicado}
                  InputProps={{
                    startAdornment: (
                      <Box sx={{ color: 'text.secondary', display: 'flex', mr: 1 }}><Search size={16} /></Box>
                    ),
                  }}
                  sx={{ mb: 1, bgcolor: '#ffffff' }}
                />
                
                <Box sx={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column', bgcolor: '#ffffff', p: 1, borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
                  {clientes
                    .filter(c => {
                      const term = filtroDestinatarios.toLowerCase().trim();
                      if (!term) return true;
                      const matchesName = `${c.nombres} ${c.apellidos}`.toLowerCase().includes(term);
                      const matchesCountry = (c.pais || '').toLowerCase().includes(term);
                      return matchesName || matchesCountry;
                    })
                    .map((c) => {
                      const isChecked = clientesSeleccionadosIds.includes(c.id);
                      return (
                        <FormControlLabel
                          key={c.id}
                          control={
                            <Checkbox 
                              size="small"
                              checked={isChecked}
                              disabled={uploadingComunicado}
                              onChange={() => {
                                if (isChecked) {
                                  setClientesSeleccionadosIds(prev => prev.filter(id => id !== c.id));
                                } else {
                                  setClientesSeleccionadosIds(prev => [...prev, c.id]);
                                }
                              }}
                            />
                          }
                          label={
                            <Typography variant="body2">
                              <strong>{c.apellidos}, {c.nombres}</strong> {c.correo_principal ? `(${c.correo_principal})` : '[Sin correo]'}
                            </Typography>
                          }
                          sx={{ my: -0.25 }}
                        />
                      );
                    })}
                </Box>
                <Typography variant="caption" color="primary.main" sx={{ display: 'block', mt: 1, fontWeight: 'bold' }}>
                  {`Seleccionados: ${clientesSeleccionadosIds.length} representados.`}
                </Typography>
              </Box>
            )}
          </Box>

          <Button 
            variant="outlined" 
            component="label" 
            startIcon={<Upload size={18} />} 
            disabled={uploadingComunicado} 
            fullWidth
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 'bold', py: 1.5 }}
          >
            {fileComunicado ? fileComunicado.name : 'Adjuntar Documento del Comunicado (PDF) - Opcional'}
            <input type="file" accept="application/pdf" hidden onChange={(e) => setFileComunicado(e.target.files[0])} />
          </Button>

          {uploadingComunicado && (
            <Box sx={{ width: '100%', mt: 1 }}>
              <LinearProgress variant="determinate" value={uploadProgressComunicado} />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 0.5 }}>
                Subiendo circular... {uploadProgressComunicado}%
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenComunicadoModal(false)} color="inherit" sx={{ textTransform: 'none' }} disabled={uploadingComunicado}>Cancelar</Button>
          <Button type="submit" variant="contained" sx={{ textTransform: 'none', fontWeight: 'bold' }} disabled={uploadingComunicado || (tipoDestinatario === 'especificos' && clientesSeleccionadosIds.length === 0)}>
            {uploadingComunicado ? 'Procesando...' : 'Registrar Comunicado'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}