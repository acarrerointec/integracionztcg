import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock, Activity, Database, Server, Wifi, WifiOff, RefreshCw } from 'lucide-react';

// Configuración de la API de Zabbix
const ZABBIX_CONFIG = {
  url: 'http://192.168.37.92/api_jsonrpc.php', // Cambiar por tu URL de Zabbix
  token: 'f10fafe7edd869fd2035124fcd78dbd83ce523343dc755ebb894b8ea2a6bcef4'
};

const ZabbixApiDashboard = () => {
  const [hosts, setHosts] = useState([]);
  const [triggers, setTriggers] = useState([]);
  const [problems, setProblems] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState({ ok: 0, warning: 0, critical: 0, unknown: 0 });
  const [lastUpdate, setLastUpdate] = useState(null);

  // Función para hacer llamadas a la API de Zabbix
  const zabbixApiCall = async (method, params = {}) => {
    try {
      const response = await fetch(ZABBIX_CONFIG.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: method,
          params: params,
          auth: ZABBIX_CONFIG.token,
          id: Math.floor(Math.random() * 1000)
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'Zabbix API Error');
      }
      
      return data.result;
    } catch (error) {
      console.error(`Error in ${method}:`, error);
      throw error;
    }
  };

  // Obtener hosts desde Zabbix
  const fetchHosts = async () => {
    try {
      const hostsData = await zabbixApiCall('host.get', {
        output: ['hostid', 'host', 'name', 'status', 'available'],
        selectInterfaces: ['ip', 'port', 'type'],
        selectTriggers: 'count',
        selectItems: 'count',
        filter: {
          status: 0 // Solo hosts habilitados
        }
      });

      return hostsData.map(host => ({
        id: host.hostid,
        name: host.name || host.host,
        host: host.host,
        status: getHostStatus(host.available),
        ip: host.interfaces[0]?.ip || 'N/A',
        triggers: host.triggers,
        items: host.items,
        lastCheck: 'Now'
      }));
    } catch (error) {
      console.error('Error fetching hosts:', error);
      return [];
    }
  };

  // Obtener problemas activos
  const fetchProblems = async () => {
    try {
      const problemsData = await zabbixApiCall('problem.get', {
        output: 'extend',
        selectHosts: ['host', 'name'],
        selectTriggers: ['description', 'priority'],
        recent: true,
        sortfield: ['eventid'],
        sortorder: 'DESC',
        limit: 50
      });

      return problemsData.map(problem => ({
        id: problem.eventid,
        objectid: problem.objectid,
        name: problem.name,
        severity: getSeverityFromPriority(problem.triggers[0]?.priority || '0'),
        host: problem.hosts[0]?.name || problem.hosts[0]?.host || 'Unknown',
        time: new Date(problem.clock * 1000).toLocaleString(),
        acknowledged: problem.acknowledged === '1',
        description: problem.triggers[0]?.description || problem.name
      }));
    } catch (error) {
      console.error('Error fetching problems:', error);
      return [];
    }
  };

  // Obtener eventos recientes
  const fetchEvents = async () => {
    try {
      const eventsData = await zabbixApiCall('event.get', {
        output: 'extend',
        selectHosts: ['host', 'name'],
        selectTriggers: ['description', 'priority'],
        sortfield: ['eventid'],
        sortorder: 'DESC',
        limit: 20,
        time_from: Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000) // Últimas 24 horas
      });

      return eventsData.map(event => ({
        id: event.eventid,
        service: event.hosts[0]?.name || event.hosts[0]?.host || 'Unknown',
        message: event.triggers[0]?.description || event.name || 'Unknown event',
        severity: getSeverityFromPriority(event.triggers[0]?.priority || '0'),
        time: new Date(event.clock * 1000).toLocaleString(),
        acknowledged: event.acknowledged === '1'
      }));
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  };

  // Función auxiliar para determinar el estado del host
  const getHostStatus = (available) => {
    switch (available) {
      case '1': return 'ok';      // Available
      case '2': return 'critical'; // Unavailable
      default: return 'unknown';   // Unknown
    }
  };

  // Convertir prioridad de Zabbix a severidad
  const getSeverityFromPriority = (priority) => {
    switch (priority) {
      case '5': return 'critical';  // Disaster
      case '4': return 'critical';  // High
      case '3': return 'warning';   // Average
      case '2': return 'warning';   // Warning
      case '1': return 'info';      // Information
      default: return 'info';
    }
  };

  // Cargar todos los datos
  const loadData = async () => {
    setLoading(true);
    try {
      setConnected(true);
      
      const [hostsData, problemsData, eventsData] = await Promise.all([
        fetchHosts(),
        fetchProblems(),
        fetchEvents()
      ]);

      setHosts(hostsData);
      setProblems(problemsData);
      setEvents(eventsData);

      // Calcular estadísticas
      const newStats = hostsData.reduce((acc, host) => {
        acc[host.status]++;
        return acc;
      }, { ok: 0, warning: 0, critical: 0, unknown: 0 });
      
      // Agregar problemas a las estadísticas
      problemsData.forEach(problem => {
        if (problem.severity === 'critical') newStats.critical++;
        else if (problem.severity === 'warning') newStats.warning++;
      });

      setStats(newStats);
      setLastUpdate(new Date());
      
    } catch (error) {
      console.error('Error loading data:', error);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(loadData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ok': return <CheckCircle className="text-success" size={24} />;
      case 'warning': return <AlertTriangle className="text-warning" size={24} />;
      case 'critical': return <XCircle className="text-danger" size={24} />;
      default: return <Clock className="text-secondary" size={24} />;
    }
  };

  const getStatusBadge = (status) => {
    const classes = {
      ok: 'badge bg-success',
      warning: 'badge bg-warning text-dark',
      critical: 'badge bg-danger',
      unknown: 'badge bg-secondary'
    };
    return classes[status] || 'badge bg-secondary';
  };

  const getSeverityBadge = (severity) => {
    const classes = {
      critical: 'badge bg-danger',
      warning: 'badge bg-warning text-dark',
      info: 'badge bg-info'
    };
    return classes[severity] || 'badge bg-secondary';
  };

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="h3 mb-0">
              <Activity className="me-2" />
              Zabbix API Dashboard
            </h1>
            <div className="d-flex gap-2 align-items-center">
              <div className="d-flex align-items-center me-3">
                {connected ? (
                  <Wifi size={16} className="text-success me-1" />
                ) : (
                  <WifiOff size={16} className="text-danger me-1" />
                )}
                <small className={`text-${connected ? 'success' : 'danger'}`}>
                  {connected ? 'Connected' : 'Disconnected'}
                </small>
              </div>
              {lastUpdate && (
                <small className="text-muted me-3">
                  Last update: {lastUpdate.toLocaleTimeString()}
                </small>
              )}
              <button 
                className="btn btn-outline-primary btn-sm" 
                onClick={loadData}
                disabled={loading}
              >
                <RefreshCw size={16} className={`me-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="row mb-4">
          <div className="col-12 text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 text-muted">Connecting to Zabbix API...</p>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card border-success">
            <div className="card-body text-center">
              <CheckCircle size={32} className="text-success mb-2" />
              <h4 className="text-success">{stats.ok}</h4>
              <p className="mb-0 text-muted">Healthy Hosts</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-warning">
            <div className="card-body text-center">
              <AlertTriangle size={32} className="text-warning mb-2" />
              <h4 className="text-warning">{stats.warning}</h4>
              <p className="mb-0 text-muted">Warning Issues</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-danger">
            <div className="card-body text-center">
              <XCircle size={32} className="text-danger mb-2" />
              <h4 className="text-danger">{stats.critical}</h4>
              <p className="mb-0 text-muted">Critical Issues</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-secondary">
            <div className="card-body text-center">
              <Clock size={32} className="text-secondary mb-2" />
              <h4 className="text-secondary">{stats.unknown}</h4>
              <p className="mb-0 text-muted">Unknown Status</p>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Hosts Table */}
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Zabbix Hosts ({hosts.length})</h5>
              <Server size={20} className="text-muted" />
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Status</th>
                      <th>Host Name</th>
                      <th>IP Address</th>
                      <th>Items/Triggers</th>
                      <th>Last Check</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hosts.length === 0 && !loading ? (
                      <tr>
                        <td colSpan="5" className="text-center py-4 text-muted">
                          No hosts found or connection error
                        </td>
                      </tr>
                    ) : (
                      hosts.map((host) => (
                        <tr key={host.id}>
                          <td>
                            <div className="d-flex align-items-center">
                              {getStatusIcon(host.status)}
                              <span className={`ms-2 ${getStatusBadge(host.status)}`}>
                                {host.status.toUpperCase()}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div>
                              <div className="fw-semibold">{host.name}</div>
                              <small className="text-muted">{host.host}</small>
                            </div>
                          </td>
                          <td className="text-muted">{host.ip}</td>
                          <td>
                            <small className="text-muted">
                              {host.items} items / {host.triggers} triggers
                            </small>
                          </td>
                          <td className="text-muted">{host.lastCheck}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Problems Section */}
          {problems.length > 0 && (
            <div className="card mt-4">
              <div className="card-header">
                <h5 className="mb-0 text-danger">Active Problems ({problems.length})</h5>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Severity</th>
                        <th>Host</th>
                        <th>Problem</th>
                        <th>Time</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {problems.slice(0, 10).map((problem) => (
                        <tr key={problem.id}>
                          <td>
                            <span className={getSeverityBadge(problem.severity)}>
                              {problem.severity.toUpperCase()}
                            </span>
                          </td>
                          <td className="fw-semibold">{problem.host}</td>
                          <td>{problem.description}</td>
                          <td className="text-muted small">{problem.time}</td>
                          <td>
                            {problem.acknowledged ? (
                              <span className="badge bg-secondary">Acknowledged</span>
                            ) : (
                              <span className="badge bg-warning text-dark">New</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Events Panel */}
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Recent Events</h5>
            </div>
            <div className="card-body">
              <div className="list-group list-group-flush">
                {events.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    No recent events
                  </div>
                ) : (
                  events.slice(0, 10).map((event) => (
                    <div key={event.id} className="list-group-item px-0 border-0">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <h6 className="mb-1">{event.service}</h6>
                          <p className="mb-1 small text-muted">{event.message}</p>
                          <small className="text-muted">{event.time}</small>
                        </div>
                        <div className="text-end">
                          <span className={getSeverityBadge(event.severity)}>
                            {event.severity}
                          </span>
                          {event.acknowledged && (
                            <div className="mt-1">
                              <span className="badge bg-secondary small">ACK</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Traffic Light Status */}
          <div className="card mt-4">
            <div className="card-header">
              <h5 className="mb-0">System Status</h5>
            </div>
            <div className="card-body">
              <div className="row justify-content-center">
                <div className="col-auto">
                  <div className="d-flex flex-column align-items-center p-3">
                    <div className="traffic-light mb-3">
                      <div 
                        className={`rounded-circle border mb-2 ${stats.critical > 0 ? 'bg-danger' : 'bg-light'}`} 
                        style={{ 
                          width: '50px', 
                          height: '50px', 
                          opacity: stats.critical > 0 ? 1 : 0.3,
                          boxShadow: stats.critical > 0 ? '0 0 20px rgba(220, 53, 69, 0.8)' : 'none'
                        }}
                      ></div>
                      <div 
                        className={`rounded-circle border mb-2 ${stats.warning > 0 ? 'bg-warning' : 'bg-light'}`} 
                        style={{ 
                          width: '50px', 
                          height: '50px', 
                          opacity: stats.warning > 0 ? 1 : 0.3,
                          boxShadow: stats.warning > 0 ? '0 0 20px rgba(255, 193, 7, 0.8)' : 'none'
                        }}
                      ></div>
                      <div 
                        className={`rounded-circle border ${stats.ok > 0 && stats.critical === 0 && stats.warning === 0 ? 'bg-success' : 'bg-light'}`} 
                        style={{ 
                          width: '50px', 
                          height: '50px', 
                          opacity: (stats.ok > 0 && stats.critical === 0 && stats.warning === 0) ? 1 : 0.3,
                          boxShadow: (stats.ok > 0 && stats.critical === 0 && stats.warning === 0) ? '0 0 20px rgba(25, 135, 84, 0.8)' : 'none'
                        }}
                      ></div>
                    </div>
                    <div className="text-center">
                      <h6 className="mb-0">Overall Status</h6>
                      <p className="text-muted small mb-0">
                        {stats.critical > 0 ? `${stats.critical} Critical Issues` : 
                         stats.warning > 0 ? `${stats.warning} Warnings` : 
                         stats.ok > 0 ? 'All Systems OK' : 'No Data'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZabbixApiDashboard;