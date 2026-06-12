import React from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import { LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext'; // Ajusta según tu estructura real

export default function Login({ institutionalError, setInstitutionalError }) {
  const { loginWithGoogle } = useAuth(); // Ajusta según el nombre exacto de tu función de login

  const handleLogin = async () => {
    try {
      if (setInstitutionalError) setInstitutionalError('');
      await loginWithGoogle();
    } catch (error) {
      console.error("Error en autenticación:", error);
    }
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh', 
        bgcolor: '#f1f5f9',
        p: 2
      }}
    >
      <Paper 
        elevation={0}
        sx={{ 
          p: 4, 
          borderRadius: 4, 
          maxWidth: 420, // La tarjeta es más ancha que el logo, queda perfecto
          width: '100%',
          textAlign: 'center', 
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.02), 0 8px 10px -6px rgba(0,0,0,0.02)'
        }}
      >
        {/* 🚀 LOGO INSTITUCIONAL: Ajustado a 300x92px reales */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
          <img 
            src="/SPIDH-azul.png" 
            alt="Logo SIPDH" 
            style={{ 
              // Usamos ancho máximo para responsividad y alto automático para mantener aspect ratio
              maxWidth: '300px', 
              width: '100%', // Se encoge en móviles muy pequeños
              height: 'auto', // Calculado automáticamente a ~92px si el ancho es 300px
              objectFit: 'contain',
              display: 'block'
            }} 
          />
        </Box>

        {/* Identidad de la Intranet Global */}
        <Typography 
          variant="h5" 
          fontWeight="bold" 
          gutterBottom 
          color="#1a365d"
          sx={{ letterSpacing: 0.5, mb: 1 }}
        >
          Intranet Global SIPDH
        </Typography>

        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ mb: 4, px: 2, lineHeight: 1.6 }}
        >
          Acceso exclusivo para personal legal, administrativo y operativo autorizado de SIPDH.
        </Typography>

        {/* Mensaje de error perimetral */}
        {institutionalError && (
          <Typography 
            variant="caption" 
            color="error" 
            sx={{ display: 'block', mb: 2, fontWeight: 'bold', bgcolor: '#fef2f2', p: 1.5, borderRadius: 2 }}
          >
            {institutionalError}
          </Typography>
        )}

        {/* BOTÓN DE ACCESO SEGURO */}
        <Button 
          variant="contained" 
          fullWidth 
          startIcon={<LogIn size={18} />} 
          onClick={handleLogin}
          sx={{ 
            textTransform: 'none', 
            fontWeight: 'bold', 
            py: 1.5, 
            borderRadius: 2,
            bgcolor: '#1a365d',
            fontSize: '0.95rem',
            boxShadow: 'none',
            '&:hover': {
              bgcolor: '#0f233c',
              boxShadow: 'none'
            }
          }}
        >
          Iniciar con @iiresodh.org
        </Button>

        {/* FOOTER GENERAL */}
        <Typography 
          variant="caption" 
          color="text.disabled" 
          sx={{ display: 'block', mt: 4, fontSize: '0.75rem' }}
        >
          SIPDH - Intranet
        </Typography>
      </Paper>
    </Box>
  );
}