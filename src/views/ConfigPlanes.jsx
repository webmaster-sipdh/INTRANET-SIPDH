import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  orderBy, 
  query, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  Box, 
  Button, 
  Typography, 
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
  Alert, 
  Divider 
} from '@mui/material';
import { Plus, Trash2, Layers, FileText } from 'lucide-react';
import { registrarLogAuditoria } from '../utils/auditLogger';

export default function ConfigPlanes({ currentUserEmail, userRole }) {
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados para Formulario de Nueva Plantilla
  const [openModal, setOpenModal] = useState(false);
  const [nombrePlan, setNombrePlan] = useState('');
  const [descripcionPlan, setDescripcionPlan] = useState('');
  
  // Lista temporal de cuotas relativas añadidas en memoria
  const [cuotasTemporales, setCuotasTemporales] = useState([]);
  
  // Campos del Renglón de Cuota Relativa Individual
  const [conceptoCuota, setConceptoCuota] = useState('');
  const [montoNeto, setMontoNeto] = useState('');
  const [mesesDesplazamiento, setMesesDesplazamiento] = useState('0');

  useEffect(() => {
    setError('');
    const qPlanes = query(collection(db, 'planes_generales'), orderBy('nombre', 'asc'));
    
    const unsubscribe = onSnapshot(qPlanes, (snapshot) => {
      setPlanes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Error en lectura live de plantillas:", err);
      setError("Error al sincronizar las plantillas generales con el servidor.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAnexarCuotaEnMemoria = (e) => {
    e.preventDefault();
    if (!conceptoCuota.trim() || !montoNeto) return;

    const nuevoHito = {
      idTemp: 'temp_hito_' + Date.now() + Math.random(),
      concepto: conceptoCuota.trim(),
      monto_neto: parseFloat(montoNeto),
      meses_desplazamiento: parseInt(mesesDesplazamiento) || 0
    };

    setCuotasTemporales(prev => [...prev, nuevoHito]);
    setConceptoCuota('');
    setMontoNeto('');
    setMesesDesplazamiento('0');
  };

  const handleRemoverCuotaDeMemoria = (idTemp) => {
    setCuotasTemporales(prev => prev.filter(c => c.idTemp !== idTemp));
  };

  const handleGuardarPlantillaGeneral = async (e) => {
    e.preventDefault();
    if (!nombrePlan.trim() || cuotasTemporales.length === 0) {
      setError('Operación inválida: Toda plantilla corporativa exige un nombre raíz y al menos un hito de cuota configurado.');
      return;
    }

    setError('');
    setSuccess('');

    // Limpiar identificadores temporales de memoria antes de persistir el Array puro
    const cuotasLimpias = cuotasTemporales.map(({ concepto, monto_neto, meses_desplazamiento }) => ({
      concepto,
      monto_neto,
      meses_desplazamiento
    }));

    try {
      await addDoc(collection(db, 'planes_generales'), {
        nombre: nombrePlan.trim(),
        descripcion: descripcionPlan.trim(),
        cuotas: cuotasLimpias,
        creado_por: currentUserEmail,
        fecha_creacion: new Date().toISOString()
      });

      await registrarLogAuditoria(
        currentUserEmail,
        'Creación de Plantilla Financiera',
        `Se dio de alta el Plan General "${nombrePlan.trim()}" con ${cuotasLimpias.length} cuotas relativas organizadas.`
      );

      setNombrePlan('');
      setDescripcionPlan('');
      setCuotasTemporales([]);
      setOpenModal(false);
      setSuccess(`Plantilla "${nombrePlan.trim()}" incorporada con éxito al catálogo institucional.`);
    } catch (err) {
      console.error(err);
      setError('Error en Firestore al intentar guardar la nueva plantilla.');
    }
  };

  const handleEliminarPlantillaGeneral = async (planObj) => {
    if (!window.confirm(`⚠️ ADVERTENCIA DE CONTROL DE RIESGOS:\n¿Está seguro de eliminar por completo la plantilla "${planObj.nombre}"?\nLos representados que ya tengan este plan asignado mantendrán sus cuotas, pero la plantilla ya no podrá ser seleccionada para nuevos expedientes.`)) return;

    setError('');
    setSuccess('');

    try {
      await deleteDoc(doc(db, 'planes_generales', planObj.id));

      await registrarLogAuditoria(
        currentUserEmail,
        'Eliminación de Plantilla Financiera',
        `Se borró la plantilla general ID: ${planObj.id} [Nombre: ${planObj.nombre}] del catálogo institucional.`
      );

      setSuccess('Plantilla removida del catálogo de forma correcta.');
    } catch (err) {
      console.error(err);
      setError('No se pudo suprimir la plantilla general.');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
          <Layers size={24} />
          <Typography variant="h5" fontWeight="bold">Catálogo de Planes Generales de Pago</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={() => {
            setCuotasTemporales([]);
            setOpenModal(true);
          }}
          sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 'bold' }}
        >
          Crear Plantilla Corporativa
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>{success}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : planes.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No se reportan plantillas de planes generales preestablecidas en la Intranet. Haga clic en el botón superior para crear la primera.
        </Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {planes.map((plan) => (
            <Paper 
              key={plan.id} 
              sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight="bold" color="primary.main">
                    {plan.nombre}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {plan.descripcion || 'Sin descripción material configurada.'}
                  </Typography>
                </Box>
                <IconButton 
                  color="error" 
                  title="Eliminar Plantilla del Catálogo"
                  onClick={() => handleEliminarPlantillaGeneral(plan)}
                  sx={{ border: '1px solid #fee2e2', bgcolor: '#fef2f2' }}
                >
                  <Trash2 size={18} />
                </IconButton>
              </Box>

              <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />

              <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                ESTRUCTURA DE COBROS RELATIVOS ({plan.cuotas?.length || 0} CUOTAS)
              </Typography>

              <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #f1f5f9', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Hito / Concepto</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Monto Neto Sugerido</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Cálculo IVA (13%)</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Desplazamiento Cronológico</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {plan.cuotas?.map((cuota, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ fontSize: '0.82rem' }}>{cuota.concepto}</TableCell>
                        <TableCell sx={{ fontSize: '0.82rem', fontWeight: 'medium' }}>${cuota.monto_neto.toFixed(2)} USD</TableCell>
                        <TableCell sx={{ fontSize: '0.82rem', color: 'orange' }}>${(cuota.monto_neto * 0.13).toFixed(2)} USD</TableCell>
                        <TableCell sx={{ fontSize: '0.82rem' }}>
                          <Chip 
                            label={cuota.meses_desplazamiento === 0 ? "Inmediato (Mes 0)" : `+ ${cuota.meses_desplazamiento} meses desp.`} 
                            size="small" 
                            variant="outlined"
                            sx={{ fontSize: '0.72rem', height: 18 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          ))}
        </Box>
      )}

      {/* MODAL COMPLETAMENTE FUNCIONAL: CREADOR MULTI-HITO DE PLANTILLAS CORPORATIVAS */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        fullWidth
        maxWidth="sm"
        disableEnforceFocus
        disableRestoreFocus
      >
        <DialogTitle fontWeight="bold">Nueva Plantilla Corporativa de Pagos</DialogTitle>
        <Box component="form" onSubmit={handleGuardarPlantillaGeneral}>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField 
              label="Nombre del Plan General" 
              placeholder="Ej: Plan Estándar Litigio CIDH / Contrato Corporativo Base" 
              fullWidth 
              required 
              value={nombrePlan} 
              onChange={e => setNombrePlan(e.target.value)} 
            />
            <TextField 
              label="Descripción o Alcance Comercial" 
              placeholder="Describa brevemente qué cubre este esquema de financiamiento..." 
              fullWidth 
              multiline 
              rows={2} 
              value={descripcionPlan} 
              onChange={e => setDescripcionPlan(e.target.value)} 
            />

            <Divider sx={{ my: 1 }}>Estructuración de Hitos Monetarios</Divider>

            {/* CUADRO INTERACTIVO DE ENTRADA: Añade renglones a la memoria temporal */}
            <Box 
              sx={{ 
                p: 2, 
                bgcolor: '#f8fafc', 
                borderRadius: 2.5, 
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}
            >
              <Typography variant="caption" fontWeight="bold" color="primary.main" display="block">
                ANEXAR HITOS AL CONTENEDOR TEMPORAL
              </Typography>
              
              <TextField 
                size="small"
                label="Concepto del hito" 
                placeholder="Ej: Honorario de Entrada / Cuota Intermedia" 
                fullWidth 
                value={conceptoCuota}
                onChange={e => setConceptoCuota(e.target.value)}
              />

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField 
                  size="small"
                  label="Monto Neto Sugerido (USD)" 
                  type="number"
                  slotProps={{ input: { step: 'any' } }}
                  fullWidth 
                  value={montoNeto}
                  onChange={e => setMontoNeto(e.target.value)}
                />
                <TextField 
                  size="small"
                  label="Meses de Desplazamiento Relativo" 
                  type="number"
                  helperText="Meses transcurridos desde el inicio para exigir esta cuota"
                  fullWidth 
                  value={mesesDesplazamiento}
                  onChange={e => setMesesDesplazamiento(e.target.value)}
                />
              </Box>

              <Button
                size="small"
                variant="outlined"
                startIcon={<Plus size={14} />}
                onClick={handleAnexarCuotaEnMemoria}
                disabled={!conceptoCuota.trim() || !montoNeto}
                sx={{ textTransform: 'none', fontWeight: 'bold', alignSelf: 'flex-end' }}
              >
                Anexar Hito
              </Button>
            </Box>

            {/* TABLA REFLEJO: Muestra los renglones que se guardarán en la plantilla final */}
            <Typography variant="caption" fontWeight="bold" color="text.secondary">
              RENGLONES PRE-ESTABLECIDOS EN LA PLANTILLA ({cuotasTemporales.length})
            </Typography>

            {cuotasTemporales.length === 0 ? (
              <Alert severity="warning" sx={{ py: 0, px: 2, fontSize: '0.8rem', borderRadius: 1.5 }}>
                Debe anexar obligatoriamente al menos un hito monetario para poder resguardar el Plan General.
              </Alert>
            ) : (
              <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #e2e8f0', borderRadius: 2, maxHeight: 180, overflowY: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Concepto</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Neto</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Desplazo</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', fontWeight: 'bold', textAlign: 'center' }}>Acción</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cuotasTemporales.map((item) => (
                      <TableRow key={item.idTemp} hover>
                        <TableCell sx={{ fontSize: '0.78rem' }}>{item.concepto}</TableCell>
                        <TableCell sx={{ fontSize: '0.78rem' }}>${item.monto_neto.toFixed(2)}</TableCell>
                        <TableCell sx={{ fontSize: '0.78rem' }}>{item.meses_desplazamiento === 0 ? 'Inmediato' : `+ ${item.meses_desplazamiento} meses`}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <IconButton size="small" color="error" onClick={() => handleRemoverCuotaDeMemoria(item.idTemp)}>
                            <Trash2 size={14} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setOpenModal(false)} color="inherit" sx={{ textTransform: 'none' }}>Cancelar</Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={cuotasTemporales.length === 0 || !nombrePlan.trim()}
              sx={{ textTransform: 'none', fontWeight: 'bold' }}
            >
              Guardar Plantilla General
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}