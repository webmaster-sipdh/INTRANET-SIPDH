// src/views/HubIntranet.jsx
import React from 'react';
import { Box, Typography, Card, CardContent, Button, Divider } from '@mui/material';
import { Scale, Users, ShieldCheck, FileSpreadsheet, Activity, Globe } from 'lucide-react'; // 🚀 AGREGADO: Icono Globe

export default function HubIntranet({ setView, userRole }) {
  
  // CONTROL PERIMETRAL: Roles autorizados para cada sección
  const tieneAccesoLitigio = userRole !== 'Invitado';
  const tieneAccesoWeb = userRole === 'Superadmin'; // 🚀 AGREGADO: Llave exclusiva para el Superadmin

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2, mt: 2 }}>
      <Box sx={{ mb: 5, textAlign: 'center' }}>
        <Typography variant="h4" fontWeight="bold" color="primary.main" gutterBottom>
          Intranet Global SIPDH
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Seleccione el módulo operativo al que desea acceder
        </Typography>
      </Box>

      {/* REJILLA DE MÓDULOS DE NEGOCIO */}
      {/* 💡 NOTA: Mantenemos las 3 columnas en pantallas grandes; el 4to módulo bajará automáticamente de forma muy limpia */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, 
        gap: 3, 
        mb: 6 
      }}>
        
        {/* MÓDULO 1: LITIGIOS */}
        <Card sx={{ 
          borderRadius: 3, 
          border: '1px solid #e2e8f0', 
          boxShadow: 'none', 
          transition: 'all 0.2s',
          ...(!tieneAccesoLitigio && { opacity: 0.65, bgcolor: '#f8fafc' }),
          '&:hover': tieneAccesoLitigio ? { borderColor: 'primary.main', bgcolor: '#f8fafc' } : {}
        }}>
          <CardContent sx={{ p: 3, textAlign: 'center' }}>
            <Scale size={42} style={{ color: tieneAccesoLitigio ? '#1a365d' : '#94a3b8', marginBottom: '16px' }} />
            <Typography variant="h6" fontWeight="bold" gutterBottom color={tieneAccesoLitigio ? 'text.primary' : 'text.secondary'}>
              Gestión de Litigios
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ minHeight: 48, mb: 2 }}>
              Control de expedientes, registro de representados, plazos fatales y envío de comunicados.
            </Typography>
            
            <Button 
              variant={tieneAccesoLitigio ? "contained" : "outlined"} 
              fullWidth 
              disabled={!tieneAccesoLitigio}
              onClick={() => setView('casos')} 
              sx={{ 
                textTransform: 'none', 
                fontWeight: 'bold', 
                borderRadius: 2,
                ...(!tieneAccesoLitigio && { color: 'error.main', borderColor: 'error.light' })
              }}
            >
              {tieneAccesoLitigio ? "Ingresar al Módulo" : "Acceso Restringido"}
            </Button>
          </CardContent>
        </Card>

        {/* 🚀 MÓDULO 2: ADMINISTRACIÓN DEL SITIO WEB (Exclusivo Superadmin) */}
        <Card sx={{ 
          borderRadius: 3, 
          border: '1px solid #e2e8f0', 
          boxShadow: 'none', 
          transition: 'all 0.2s',
          ...(!tieneAccesoWeb && { opacity: 0.65, bgcolor: '#f8fafc' }),
          '&:hover': tieneAccesoWeb ? { borderColor: 'primary.main', bgcolor: '#f8fafc' } : {}
        }}>
          <CardContent sx={{ p: 3, textAlign: 'center' }}>
            <Globe size={42} style={{ color: tieneAccesoWeb ? '#1a365d' : '#94a3b8', marginBottom: '16px' }} />
            <Typography variant="h6" fontWeight="bold" gutterBottom color={tieneAccesoWeb ? 'text.primary' : 'text.secondary'}>
              Sitio Web
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ minHeight: 48, mb: 2 }}>
              Administración del sitio web, actualización de contenidos y gestión del portal público.
            </Typography>
            
            <Button 
              variant={tieneAccesoWeb ? "contained" : "outlined"} 
              fullWidth 
              disabled={!tieneAccesoWeb}
              // Abre de forma segura el portal externo en una pestaña nueva para no sacar al usuario de la Intranet
              onClick={() => window.open('https://sipdh.com/admin', '_blank', 'noopener,noreferrer')} 
              sx={{ 
                textTransform: 'none', 
                fontWeight: 'bold', 
                borderRadius: 2,
                ...(tieneAccesoWeb && { bgcolor: '#1a365d', '&:hover': { bgcolor: '#0f233c' } }),
                ...(!tieneAccesoWeb && { color: 'error.main', borderColor: 'error.light' })
              }}
            >
              {tieneAccesoWeb ? "Gestionar Sitio" : "Acceso Restringido"}
            </Button>
          </CardContent>
        </Card>

      </Box>

      {/* ACCESOS DIRECTOS ADMINISTRATIVOS */}
      {(userRole === 'Superadmin' || userRole === 'Admin') && (
        <>
          <Divider sx={{ mb: 4 }} />
          <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" sx={{ mb: 2, px: 0.5 }}>
            Controles de Seguridad del Sistema
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button 
              variant="outlined" 
              startIcon={<ShieldCheck size={16} />} 
              onClick={() => setView('usuarios')}
              sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 'medium' }}
            >
              Control de Usuarios Autorizados
            </Button>
            
            {userRole === 'Superadmin' && (
              <Button 
                variant="outlined" 
                startIcon={<Activity size={16} />} 
                onClick={() => setView('logs')}
                color="inherit"
                sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 'medium' }}
              >
                Bitácora de Auditoría (Logs)
              </Button>
            )}
          </Box>
        </>
      )}
    </Box>
  );
}