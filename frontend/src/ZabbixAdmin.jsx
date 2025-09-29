import React, { useState } from 'react';
import { Container } from 'react-bootstrap';
import ZabbixNavBar from './ZabbixNavBar';
import ZabbixSystemDocumentation from './ZabbixSystemDocumentation';
import './ZabbixAdmin.css';

import TicketMonitoringDashboard from './Dashboard';
import Events from './Events';
import TicketManager from './TicketManager';
import Json from './Json';
import Dashboard from './Dashboard';
import MessageViewer from './MessageViewer';
import MessageDashboard from './MessageDashboard';

// Importaciones de otros componentes (debes crearlos luego)
// import Dashboard from './components/Dashboard';
// import Services from './components/Services';
// import Events from './components/Events';
// import Monitoring from './components/Monitoring';
// import SystemArchitecture from './components/SystemArchitecture';
// import Settings from './components/Settings';

const ZabbixAdmin = () => {
  const [activeComponent, setActiveComponent] = useState('dashboard');


  // Función para renderizar el componente activo
  const renderActiveComponent = () => {
    switch (activeComponent) {
      case 'dashboard':
         //return <Dashboard />;
     return <MessageDashboard />;
      case 'services':
       //  return < Json/>;
      // return <MessageViewer />;
        return <div className="p-5 text-center"><h2>Servicios en construcción</h2></div>;
      case 'events':
        return <MessageViewer />;
       //return <TicketManager />;
       //return <div className="p-5 text-center"><h2>Eventos en construcción</h2></div>;
      case 'monitoring':
        // return <RabbitMQDashboard/>;
        return <div className="p-5 text-center"><h2>Monitoreo en construcción</h2></div>;
      case 'metricas':
      //return <Json />;
        // return <Métricas />;
        //return <MessageDashboard />;
    return <div className="p-5 text-center"><h2>Métricas en construcción</h2></div>;
      case 'documentation':

        return <ZabbixSystemDocumentation />;
      case 'architecture':
        // return <SystemArchitecture />;

        return <div className="p-5 text-center"><h2>Arquitectura en construcción</h2></div>;
      case 'settings':
        // return <Settings />;
        return <div className="p-5 text-center"><h2>Configuración en construcción</h2></div>;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="zabbix-admin-app">
      <ZabbixNavBar 
        onSelectComponent={setActiveComponent} 
        activeComponent={activeComponent}
  
      />
      
      <main className="main-content">
    
        <Container fluid className="py-4">
          {renderActiveComponent()}
           
        </Container>
      </main>
    </div>
  );
};



export default ZabbixAdmin;