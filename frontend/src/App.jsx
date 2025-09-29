import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import ZabbixNavBar from './ZabbixNavBar';
import ZabbixAdmin from './ZabbixAdmin';
import Login from './Login';
import LoadingSpinner from './LoadingSpinner';
import './App.css';

// Componente principal que usa el contexto de autenticación
const AppContent = () => {
  const { currentUser, loading } = useAuth();
  const [activeComponent, setActiveComponent] = useState('dashboard');
  const [eventCount, setEventCount] = useState(0);

  // Simular carga de eventos desde API
  useEffect(() => {
    if (currentUser) {
      // Aquí iría la llamada real a la API
      const simulatedEventCount = Math.floor(Math.random() * 10);
      setEventCount(simulatedEventCount);
    }
  }, [currentUser]);

  const handleSelectComponent = (component) => {
    setActiveComponent(component);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!currentUser) {
    return <Login />;
  }

  return (
    <div className="app-container">
      <ZabbixNavBar 
        onSelectComponent={handleSelectComponent}
        activeComponent={activeComponent}
        eventCount={eventCount}
      />
      <main className="app-main" style={{ paddingTop: '0' }}>
  <ZabbixAdmin activeComponent={activeComponent} />
</main>
    </div>
  );
};

// Componente App principal
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;