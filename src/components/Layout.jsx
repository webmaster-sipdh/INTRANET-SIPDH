import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Box, Drawer, AppBar, Toolbar, List, Typography, 
  ListItem, ListItemButton, ListItemIcon, ListItemText, 
  IconButton, Avatar, Divider 
} from '@mui/material';
import { Briefcase, ShieldAlert, LogOut, UserCheck, Home, Layers } from 'lucide-react';

const drawerWidth = 260;

export default function Layout({ children, currentView, setView, userRole }) {
  const { user, logout } = useAuth();

  const esHub = currentView === 'hub';
  const menuItems = [];

  if (!esHub) {
    menuItems.push({ text: 'Menú Principal', icon: <Home size={20} />, id: 'hub' });
  }

  menuItems.push({ text: 'Casos y Litigios', icon: <Briefcase size={20} />, id: 'casos' });

  if (userRole === 'Superadmin' || userRole === 'Admin') {
    menuItems.push({ text: 'Control de Usuarios', icon: <UserCheck size={20} />, id: 'usuarios' });
    // REQUERIMIENTO COMPUESTO: Acceso seguro al Panel de Plantillas Generales Corporativas
    menuItems.push({ text: 'Configuración de Planes', icon: <Layers size={20} />, id: 'config_planes' });
  }

  if (userRole === 'Superadmin') {
    menuItems.push({ text: 'Logs de Auditoría', icon: <ShieldAlert size={20} />, id: 'logs' });
  }

  return (
    <Box sx={{ display: 'flex' }}>
      {/* BARRA SUPERIOR BRANDING */}
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1, 
          bgcolor: '#1a365d', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)' 
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          
          {/* SECCIÓN IZQUIERDA: Alineación de activos de marca */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            
            {/* 🚀 ISOTIPO: Reducción de marca 
            <img 
              src="/Isotipo-w.png" 
              alt="Isotipo SIPDH" 
              style={{ 
                height: '36px', 
                width: 'auto', 
                objectFit: 'contain',
                display: 'block'
              }} 
            /> */}
            
            {/* 🚀 LOGO TEXTUAL: Reducción de proporciones en Toolbar */}
            <img 
              src="/SPIDH-white-52.png" 
              alt="SIPDH - Intranet" 
              style={{ 
                height: '52px', 
                width: 'auto', 
                objectFit: 'contain',
                display: 'block'
              }} 
            />
          </Box>
          
          {/* SECCIÓN DERECHA: Datos del Usuario Activo */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" fontWeight="medium" color="white">
                {user?.displayName || 'Abogado Staff'}
              </Typography>
              <Typography variant="caption" color="rgba(255,255,255,0.6)" display="block">
                {user?.email} ({userRole})
              </Typography>
            </Box>
            
            <Avatar 
              src={user?.photoURL} 
              sx={{ bgcolor: '#c5a880', width: 36, height: 36, fontSize: '0.9rem', fontWeight: 'bold' }}
            >
              {user?.email?.charAt(0).toUpperCase()}
            </Avatar>
            
            <IconButton color="inherit" onClick={logout} title="Cerrar Sesión" sx={{ ml: 1 }}>
              <LogOut size={20} color="#ff8a80" />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* BARRA LATERAL (SIDEBAR) */}
      {!esHub && (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: { 
              width: drawerWidth, 
              boxSizing: 'border-box', 
              borderRight: '1px solid #e2e8f0', 
              bgcolor: '#ffffff' 
            },
          }}
        >
          <Toolbar />
          <Box sx={{ overflow: 'auto', mt: 2 }}>
            <List sx={{ px: 1.5 }}>
              {menuItems.map((item, index) => (
                <React.Fragment key={item.id}>
                  {!esHub && index === 1 && <Divider sx={{ my: 1.5 }} />}
                  
                  <ListItem disablePadding sx={{ mb: 0.5 }}>
                    <ListItemButton 
                      onClick={() => setView(item.id)}
                      selected={currentView === item.id}
                      sx={{
                        borderRadius: 2,
                        color: currentView === item.id ? 'primary.main' : 'text.secondary',
                        bgcolor: currentView === item.id ? 'rgba(26, 54, 93, 0.04)' : 'transparent',
                        '&.Mui-selected': {
                          bgcolor: 'rgba(26, 54, 93, 0.08)',
                          color: 'primary.main',
                          fontWeight: 'bold',
                          '&:hover': { bgcolor: 'rgba(26, 54, 93, 0.12)' }
                        }
                      }}
                    >
                      <ListItemIcon sx={{ color: currentView === item.id ? 'primary.main' : 'text.disabled', minWidth: 40 }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText 
                        primary={item.text} 
                        primaryTypographyProps={{ 
                          fontSize: '0.9rem', 
                          fontWeight: currentView === item.id ? 600 : 500 
                        }} 
                      />
                    </ListItemButton>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </Box>
        </Drawer>
      )}

      {/* CONTENIDO DE LA INTRANET */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 4, 
          bgcolor: '#f8fafc', 
          minHeight: '100vh',
          width: esHub ? '100%' : `calc(100% - ${drawerWidth}px)`,
          transition: 'width 0.15s ease-in-out'
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}