import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { db } from './config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Typography, Paper, Box, CircularProgress } from '@mui/material';

// Vistas Generales de la Intranet
import Login from './views/Login';
import Layout from './components/Layout';
import HubIntranet from './views/HubIntranet'; 
import UsuariosAutorizados from './views/UsuariosAutorizados';
import LogsAuditoria from './views/LogsAuditoria';
import ConfigPlanes from './views/ConfigPlanes'; // REQUERIMIENTO COMPUESTO: Importación del nuevo panel de plantillas

// Vistas del Módulo de Litigio
import Casos from './views/litigio/Casos';
import DetalleCaso from './views/litigio/DetalleCaso';

// FILTRO DE CONSOLA: Mantiene el perímetro limpio bloqueando trazas automáticas de persistencia del SDK
const originalConsoleError = console.error;

console.error = (...args) => {
  const cadenaError = args.map((item) => {
    if (item instanceof Error) {
      return item.message + ' ' + item.stack;
    }
    if (typeof item === 'object') {
      try {
        return JSON.stringify(item);
      } catch (e) {
        return '';
      }
    }
    return String(item);
  }).join(' ');

  if (
    cadenaError.includes('FirebaseError') || 
    cadenaError.includes('permissions') || 
    cadenaError.includes('insufficient')
  ) {
    return; 
  }

  originalConsoleError(...args);
};

function App() {
  const { user, logout } = useAuth();
  
  const [view, setView] = useState('hub'); 
  const [casoSeleccionado, setCasoSeleccionado] = useState(null);
  
  const [userRole, setUserRole] = useState('Abogado/a'); 
  const [loadingRole, setLoadingRole] = useState(true);
  const [institutionalError, setInstitutionalError] = useState('');

  const handleSelectCaso = (caso) => {
    setView('detalle_caso');
    setCasoSeleccionado(caso);
  };

  const handleVolverCasos = () => {
    setView('casos');
    setCasoSeleccionado(null);
  };

  useEffect(() => {
    const resolverRolYPermisos = async () => {
      if (!user) {
        setLoadingRole(false);
        return;
      }

      setView('hub');
      setCasoSeleccionado(null);

      const emailLimpio = user.email.toLowerCase();

      if (emailLimpio === 'webmaster@iiresodh.org') {
        setUserRole('Superadmin');
        setInstitutionalError('');
        setLoadingRole(false);
        return;
      }

      // 🚀 EXCLUSIÓN ABSOLUTA: Si no pertenece al dominio institucional, fuera inmediatamente
      if (!emailLimpio.endsWith('@iiresodh.org')) {
        await logout();
        setInstitutionalError('Acceso denegado: Solo se permiten cuentas institucionales de SIPDH.');
        setLoadingRole(false);
        return;
      }

      try {
        const userDocRef = doc(db, 'usuarios_autorizados', emailLimpio);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userDoc = userDocSnap.data();
          setUserRole(userDoc.rol || 'Abogado/a');
          setInstitutionalError('');
        } else {
          // 🚀 FLEXIBILIDAD ESTRUCTURAL: Es @iiresodh.org pero no está registrado en Litigios.
          // Le damos acceso a la intranet general bajo el rol de 'Invitado'
          setUserRole('Invitado');
          setInstitutionalError('');
        }
      } catch (err) {
        setUserRole('Invitado');
        setInstitutionalError('');
      } finally {
        setLoadingRole(false);
      }
    };

    setLoadingRole(true);
    resolverRolYPermisos();
  }, [user]);

  // Protección de seguridad perimetral para vistas administrativas e internas
  useEffect(() => {
    if (!loadingRole) {
      if (view === 'usuarios' && userRole !== 'Superadmin' && userRole !== 'Admin') {
        setView('hub');
      }
      if (view === 'logs' && userRole !== 'Superadmin') {
        setView('hub');
      }
      // BLINDAJE DE VISTA: Protección perimetral para el panel de configuración de planes generales
      if (view === 'config_planes' && userRole !== 'Superadmin' && userRole !== 'Admin') {
        setView('hub');
      }
      // 🚀 BLINDAJE DE SEGURIDAD: Un invitado no puede entrar a la fuerza a los casos
      if ((view === 'casos' || view === 'detalle_caso') && userRole === 'Invitado') {
        setView('hub');
      }
    }
  }, [view, userRole, loadingRole]);

  if (!user || institutionalError) {
    return (
      <Login 
        institutionalError={institutionalError} 
        setInstitutionalError={setInstitutionalError} 
      />
    );
  }

  if (loadingRole) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  let vistaSegura = view;
  if (vistaSegura === 'usuarios' && userRole !== 'Superadmin' && userRole !== 'Admin') {
    vistaSegura = 'hub';
  }
  if (vistaSegura === 'logs' && userRole !== 'Superadmin') {
    vistaSegura = 'hub';
  }
  if (vistaSegura === 'config_planes' && userRole !== 'Superadmin' && userRole !== 'Admin') {
    vistaSegura = 'hub';
  }
  if ((vistaSegura === 'casos' || vistaSegura === 'detalle_caso') && userRole === 'Invitado') {
    vistaSegura = 'hub';
  }

  return (
    <Layout currentView={vistaSegura} setView={setView} userRole={userRole}>
      
      {vistaSegura === 'hub' && (
        <HubIntranet setView={setView} userRole={userRole} />
      )}

      {vistaSegura === 'casos' && (
        <Casos onSelectCaso={handleSelectCaso} userRole={userRole} currentUserEmail={user.email} />
      )}

      {vistaSegura === 'detalle_caso' && casoSeleccionado && (
        <DetalleCaso caso={casoSeleccionado} onVolver={handleVolverCasos} currentUserEmail={user.email} userRole={userRole} />
      )}

      {vistaSegura === 'usuarios' && (
        <UsuariosAutorizados currentUserEmail={user.email} userRole={userRole} />
      )}

      {vistaSegura === 'logs' && (
        <LogsAuditoria currentUserEmail={user.email} userRole={userRole} />
      )}

      {/* RENDERIZADO SEGURO DE LA NUEVA VISTA ADMINISTRATIVA DE PLANTILLAS */}
      {vistaSegura === 'config_planes' && (
        <ConfigPlanes currentUserEmail={user.email} userRole={userRole} />
      )}
    </Layout>
  );
}

export default App;