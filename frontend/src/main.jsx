import ReactDOM from 'react-dom/client'; // Importar desde 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import App from './App';

import Login from './Login';
import ZabbixAdmin from './ZabbixAdmin';
import ZabbixApiDashboard from './ZabbixApiDashboard';


// Crear un root para la aplicación
const root = ReactDOM.createRoot(document.getElementById('root'));

// Renderizar la aplicación
root.render(
  <Router>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/app" element={<App />} />
      <Route path="/admin" element={<ZabbixAdmin />} />
      <Route path="*" element={<Login />} />
      <Route path="/dashboard" element={<ZabbixApiDashboard />} />

    </Routes>
  </Router>
);