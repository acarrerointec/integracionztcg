import React, { useState, useEffect } from 'react';
import { 
  Activity, Server, Database, AlertTriangle, CheckCircle, 
  Clock, Filter, Search, BarChart3, PieChart, TrendingUp,
  MapPin, Users, Zap, Calendar, Eye, Download, RefreshCw,
  MessageSquare, PlayCircle, StopCircle, Hash, User, Tag
} from 'lucide-react';

const MessageDashboard = () => {
  const [messages, setMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateFilter, setDateFilter] = useState('today');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [viewMode, setViewMode] = useState('overview');
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const API_BASE_URL = 'http://localhost:3005/api';

  // 🔥 SECTORES DEFINIDOS BASADOS EN EL ANÁLISIS DE MENSAJES
  const SECTORS = {
    gpu: { name: 'GPU/Procesamiento', color: 'primary', icon: Zap },
    network: { name: 'Red/Latencia', color: 'info', icon: Activity },
    storage: { name: 'Almacenamiento', color: 'warning', icon: Database },
    service: { name: 'Servicios', color: 'success', icon: Server },
    monitoring: { name: 'Monitoreo', color: 'secondary', icon: BarChart3 },
    database: { name: 'Base de Datos', color: 'danger', icon: Database }
  };

  // 🔥 MEJORAR ANÁLISIS CON DETECCIÓN DE SECTORES
  const analyzeMessage = (message, subject) => {
    if (!message) return { 
      type: 'unknown', 
      status: 'unknown', 
      priority: 'low',
      sector: 'unknown',
      hasError: false 
    };
    
    const lowerMessage = message.toLowerCase();
    const lowerSubject = subject.toLowerCase();
    
    // Extraer Problem ID
    const problemIdMatch = message.match(/Original problem ID:?\s*(\d+)/i) || 
                          message.match(/Problem ID:?\s*(\d+)/i) ||
                          message.match(/ID:?\s*(\d+)/i);
    const problemId = problemIdMatch ? problemIdMatch[1] : null;

    // Detectar estado
    let status = 'unknown';
    if (lowerMessage.includes('resolved') || lowerMessage.includes('resuelto')) {
      status = 'resolved';
    } else if (lowerMessage.includes('started') || lowerMessage.includes('iniciado') || 
               lowerMessage.includes('began') || lowerMessage.includes('comenzó')) {
      status = 'in-progress';
    } else if (lowerMessage.includes('problem') && !lowerMessage.includes('resolved')) {
      status = 'open';
    }

    // Detectar tipo
    let type = 'info';
    if (lowerMessage.includes('error') || lowerMessage.includes('failed') || 
        lowerSubject.includes('error') || lowerSubject.includes('failed')) {
      type = 'error';
    } else if (lowerMessage.includes('warning') || lowerSubject.includes('warning')) {
      type = 'warning';
    } else if (lowerMessage.includes('success') || lowerSubject.includes('resolved')) {
      type = 'success';
    }

    // Detectar prioridad
    let priority = 'low';
    if (lowerMessage.includes('critical') || lowerMessage.includes('critico') || 
        lowerMessage.includes('high') || lowerSubject.includes('critical')) {
      priority = 'high';
    } else if (lowerMessage.includes('important') || lowerMessage.includes('medium')) {
      priority = 'medium';
    }

    // 🔥 DETECTAR SECTOR AUTOMÁTICAMENTE
    let sector = 'unknown';
    if (lowerMessage.includes('gpu') || lowerMessage.includes('procesamiento') || lowerMessage.includes('rendering')) {
      sector = 'gpu';
    } else if (lowerMessage.includes('latency') || lowerMessage.includes('latencia') || 
               lowerMessage.includes('network') || lowerMessage.includes('red') ||
               lowerMessage.includes('ping') || lowerMessage.includes('icmp')) {
      sector = 'network';
    } else if (lowerMessage.includes('disk') || lowerMessage.includes('disco') || 
               lowerMessage.includes('storage') || lowerMessage.includes('almacenamiento') ||
               lowerMessage.includes('space') || lowerMessage.includes('espacio')) {
      sector = 'storage';
    } else if (lowerMessage.includes('service') || lowerMessage.includes('servicio') ||
               lowerMessage.includes('nginx') || lowerMessage.includes('apache') ||
               lowerMessage.includes('down') || lowerMessage.includes('caída')) {
      sector = 'service';
    } else if (lowerMessage.includes('database') || lowerMessage.includes('base de datos') ||
               lowerMessage.includes('mysql') || lowerMessage.includes('elasticsearch')) {
      sector = 'database';
    } else if (lowerMessage.includes('monitor') || lowerMessage.includes('zabbix') ||
               lowerMessage.includes('agent') || lowerMessage.includes('health')) {
      sector = 'monitoring';
    }

    // Extraer información específica
    const hostMatch = message.match(/Host:?\s*([^\r\n]+)/i);
    const problemNameMatch = message.match(/Problem name:?\s*([^\r\n]+)/i) ||
                            subject.match(/Problem:\s*([^\r\n]+)/i);

    return {
      type,
      status,
      priority,
      sector,
      problemId,
      problemName: problemNameMatch ? problemNameMatch[1].trim() : subject,
      host: hostMatch ? hostMatch[1].trim() : null,
      timestamp: new Date()
    };
  };

  // 🔥 CARGAR MENSAJES
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/tickets?limit=1000`);
        
        if (!response.ok) throw new Error('Error al cargar los mensajes');
        
        const data = await response.json();
        
        if (data.success) {
          const messagesWithAnalysis = data.data.map(msg => ({
            ...msg,
            analysis: analyzeMessage(msg.message, msg.subject),
            timestamp: new Date(msg.created_at)
          }));
          
          setMessages(messagesWithAnalysis);
        } else {
          throw new Error(data.error || 'Error en la respuesta');
        }
      } catch (error) {
        console.error('Error:', error);
        setError(error.message);
        
        // Datos de ejemplo mejorados
        const sampleData = [
          {
            id: 1,
            subject: 'Problem: RCS-207-NWC1216 GPU >= 95% por más de 45 minutos',
            message: 'Problem started at 19:13:53 on 2025.09.26\nProblem name: RCS-207-NWC1216 GPU >= 95% por más de 45 minutos\nHost: RCS-207-NWC1216\nSeverity: Information\nOriginal problem ID: 11865562',
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            subject: 'High latency detected in delivery network',
            message: 'Latency over 100ms for more than 5 minutes\nHost: delivery-server-01\nSeverity: Warning\nOriginal problem ID: 11865397',
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 3,
            subject: 'Disk space critical on storage server',
            message: 'Disk usage over 95% on /dev/sda1\nHost: storage-server-01\nSeverity: Critical\nOriginal problem ID: 11865396',
            created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
          }
        ].map(msg => ({
          ...msg,
          analysis: analyzeMessage(msg.message, msg.subject),
          timestamp: new Date(msg.created_at)
        }));
        
        setMessages(sampleData);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    if (autoRefresh) {
      const interval = setInterval(fetchMessages, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // 🔥 FILTRAR MENSAJES
  useEffect(() => {
    let filtered = [...messages];
    
    // Filtro por sector
    if (sectorFilter !== 'all') {
      filtered = filtered.filter(msg => msg.analysis.sector === sectorFilter);
    }
    
    // Filtro por estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(msg => msg.analysis.status === statusFilter);
    }
    
    // Filtro por prioridad
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(msg => msg.analysis.priority === priorityFilter);
    }
    
    // Filtro por tiempo
    const now = new Date();
    let startTime = new Date();
    
    switch (timeRange) {
      case '1h':
        startTime.setHours(now.getHours() - 1);
        break;
      case '6h':
        startTime.setHours(now.getHours() - 6);
        break;
      case '24h':
        startTime.setDate(now.getDate() - 1);
        break;
      case '7d':
        startTime.setDate(now.getDate() - 7);
        break;
      case '30d':
        startTime.setDate(now.getDate() - 30);
        break;
      default:
        startTime = new Date(0); // Todos los tiempos
    }
    
    filtered = filtered.filter(msg => msg.timestamp >= startTime);
    
    setFilteredMessages(filtered);
  }, [messages, sectorFilter, statusFilter, priorityFilter, timeRange]);

  // 🔥 CALCULAR ESTADÍSTICAS POR SECTOR
  const calculateSectorStats = () => {
    const stats = {};
    
    // Inicializar sectores
    Object.keys(SECTORS).forEach(sector => {
      stats[sector] = {
        total: 0,
        open: 0,
        'in-progress': 0,
        resolved: 0,
        high: 0,
        medium: 0,
        low: 0,
        error: 0,
        warning: 0,
        success: 0
      };
    });
    
    // Contar mensajes por sector
    filteredMessages.forEach(msg => {
      const sector = msg.analysis.sector;
      if (stats[sector]) {
        stats[sector].total++;
        stats[sector][msg.analysis.status]++;
        stats[sector][msg.analysis.priority]++;
        stats[sector][msg.analysis.type]++;
      }
    });
    
    return stats;
  };

  const sectorStats = calculateSectorStats();

  // 🔥 ESTADÍSTICAS GENERALES
  const generalStats = {
    total: filteredMessages.length,
    open: filteredMessages.filter(m => m.analysis.status === 'resolved').length - filteredMessages.filter(m => m.analysis.status === 'in-progress').length,
    inProgress: filteredMessages.filter(m => m.analysis.status === 'in-progress').length,
    resolved: filteredMessages.filter(m => m.analysis.status === 'resolved').length,
    highPriority: filteredMessages.filter(m => m.analysis.priority === 'high').length,
    uniqueHosts: new Set(filteredMessages.map(m => m.analysis.host)).size,
    uniqueProblems: new Set(filteredMessages.map(m => m.analysis.problemId)).size
  };

  // 🔥 PROBLEMAS MÁS FRECUENTES
  const getFrequentProblems = () => {
    const problemCounts = {};
    
    filteredMessages.forEach(msg => {
      const problemName = msg.analysis.problemName;
      if (problemName) {
        problemCounts[problemName] = (problemCounts[problemName] || 0) + 1;
      }
    });
    
    return Object.entries(problemCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([problem, count]) => ({ problem, count }));
  };

  // 🔥 HOSTS CON MÁS PROBLEMAS
  const getProblematicHosts = () => {
    const hostCounts = {};
    
    filteredMessages.forEach(msg => {
      const host = msg.analysis.host;
      if (host) {
        hostCounts[host] = (hostCounts[host] || 0) + 1;
      }
    });
    
    return Object.entries(hostCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([host, count]) => ({ host, count }));
  };

  // 🔥 COMPONENTE DE TARJETA DE SECTOR
  const SectorCard = ({ sector }) => {
    const sectorData = SECTORS[sector];
    const stats = sectorStats[sector];
    const SectorIcon = sectorData.icon;
    
    return (
      <div className={`card border-${sectorData.color} shadow-sm h-100`}>
        <div className={`card-header bg-${sectorData.color} text-white d-flex justify-content-between align-items-center`}>
          <h6 className="mb-0 d-flex align-items-center">
            <SectorIcon size={18} className="me-2" />
            {sectorData.name}
          </h6>
          <span className="badge bg-light text-dark">{stats.total}</span>
        </div>
        <div className="card-body">
          <div className="row text-center mb-3">
            <div className="col-4">
              <div className={`text-${stats.open > 0 ? 'danger' : 'muted'}`}>
                <div className="h5 mb-0">{stats.open}</div>
                <small>Abiertos</small>
              </div>
            </div>
            <div className="col-4">
              <div className={`text-${stats['in-progress'] > 0 ? 'warning' : 'muted'}`}>
                <div className="h5 mb-0">{stats['in-progress']}</div>
                <small>En Progreso</small>
              </div>
            </div>
            <div className="col-4">
              <div className={`text-${stats.resolved > 0 ? 'success' : 'muted'}`}>
                <div className="h5 mb-0">{stats.resolved}</div>
                <small>Resueltos</small>
              </div>
            </div>
          </div>
          
          <div className="progress mb-2" style={{ height: '6px' }}>
            <div 
              className="progress-bar bg-danger" 
              style={{ width: `${stats.total > 0 ? (stats.open / stats.total * 100) : 0}%` }}
            ></div>
            <div 
              className="progress-bar bg-warning" 
              style={{ width: `${stats.total > 0 ? (stats['in-progress'] / stats.total * 100) : 0}%` }}
            ></div>
            <div 
              className="progress-bar bg-success" 
              style={{ width: `${stats.total > 0 ? (stats.resolved / stats.total * 100) : 0}%` }}
            ></div>
          </div>
          
          <div className="d-flex justify-content-between small text-muted">
            <span>Alta: {stats.high}</span>
            <span>Media: {stats.medium}</span>
            <span>Baja: {stats.low}</span>
          </div>
        </div>
        <div className="card-footer bg-transparent">
          <button 
            className="btn btn-outline-primary btn-sm w-100"
            onClick={() => {
              setSectorFilter(sector);
              setViewMode('details');
            }}
          >
            <Eye size={14} className="me-1" />
            Ver Detalles
          </button>
        </div>
      </div>
    );
  };

  // 🔥 COMPONENTE DE DETALLE DE SECTOR
  const SectorDetails = () => {
    const sectorData = SECTORS[sectorFilter];
    const stats = sectorStats[sectorFilter];
    const sectorMessages = filteredMessages.filter(msg => msg.analysis.sector === sectorFilter);
    
    return (
      <div className="card shadow-sm">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0 d-flex align-items-center">
            <sectorData.icon size={20} className="me-2" />
            Detalles: {sectorData.name}
          </h5>
          <div className="d-flex gap-2">
            <button 
              className="btn btn-outline-secondary btn-sm"
              onClick={() => setViewMode('overview')}
            >
              ← Volver al Resumen
            </button>
            <button className="btn btn-outline-primary btn-sm">
              <Download size={14} className="me-1" />
              Exportar
            </button>
          </div>
        </div>
        <div className="card-body">
          {/* Resumen del sector */}
          <div className="row mb-4">
            <div className="col-md-3">
              <div className="card bg-primary text-white">
                <div className="card-body text-center">
                  <div className="h3">{stats.total}</div>
                  <small>Total Eventos</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-danger text-white">
                <div className="card-body text-center">
                  <div className="h3">{stats.high}</div>
                  <small>Alta Prioridad</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-warning text-white">
                <div className="card-body text-center">
                  <div className="h3">{stats.open}</div>
                  <small>Pendientes</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-success text-white">
                <div className="card-body text-center">
                  <div className="h3">{stats.resolved}</div>
                  <small>Resueltos</small>
                </div>
              </div>
            </div>
          </div>
          
          {/* Lista de mensajes del sector */}
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Problem ID</th>
                  <th>Host</th>
                  <th>Problema</th>
                  <th>Estado</th>
                  <th>Prioridad</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sectorMessages.map(message => (
                  <tr key={message.id}>
                    <td>
                      {message.analysis.problemId ? (
                        <span className="badge bg-dark">
                          <Hash size={10} className="me-1" />
                          {message.analysis.problemId}
                        </span>
                      ) : 'N/A'}
                    </td>
                    <td>
                      <small>{message.analysis.host || 'N/A'}</small>
                    </td>
                    <td>
                      <div className="text-truncate" style={{ maxWidth: '200px' }}>
                        {message.analysis.problemName}
                      </div>
                    </td>
                    <td>
                      <span className={`badge bg-${getStatusColor(message.analysis.status)}`}>
                        {getStatusText(message.analysis.status)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge bg-${getPriorityColor(message.analysis.priority)}`}>
                        {message.analysis.priority}
                      </span>
                    </td>
                    <td>
                      <small>{new Date(message.created_at).toLocaleString('es-ES')}</small>
                    </td>
                    <td>
                      <button 
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => setSelectedProblem(message)}
                      >
                        <Eye size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // 🔥 FUNCIONES AUXILIARES
  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved': return 'success';
      case 'in-progress': return 'warning';
      case 'open': return 'danger';
      default: return 'secondary';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'resolved': return 'Resuelto';
      case 'in-progress': return 'En Progreso';
      case 'open': return 'Abierto';
      default: return 'Desconocido';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      default: return 'secondary';
    }
  };

  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (loading) {
    return (
      <div className="container-fluid py-4 d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-2 text-muted">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {/* HEADER */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h1 className="h3 mb-1 d-flex align-items-center">
                    <BarChart3 className="me-2 text-primary" />
                    Dashboard de Mensajes por Sectores
                  </h1>
                  <p className="text-muted mb-0">
                    {generalStats.total} eventos analizados • {generalStats.uniqueHosts} hosts • {generalStats.uniqueProblems} problemas únicos
                  </p>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <div className="form-check form-switch">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                    />
                    <label className="form-check-label small">Auto-refresh</label>
                  </div>
                  <button className="btn btn-outline-primary">
                    <Download size={16} className="me-1" />
                    Exportar
                  </button>
                  <button className="btn btn-primary" onClick={() => window.location.reload()}>
                    <RefreshCw size={16} className="me-1" />
                    Actualizar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-3">
                  <label className="form-label">Rango de Tiempo</label>
                  <select 
                    className="form-select"
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                  >
                    <option value="1h">Última hora</option>
                    <option value="6h">Últimas 6 horas</option>
                    <option value="24h">Últimas 24 horas</option>
                    <option value="7d">Últimos 7 días</option>
                    <option value="30d">Últimos 30 días</option>
                    <option value="all">Todos los tiempos</option>
                  </select>
                </div>
                
                <div className="col-md-3">
                  <label className="form-label">Estado</label>
                  <select 
                    className="form-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">Todos los estados</option>
                    <option value="open">Abiertos</option>
                    <option value="in-progress">En Progreso</option>
                    <option value="resolved">Resueltos</option>
                  </select>
                </div>
                
                <div className="col-md-3">
                  <label className="form-label">Prioridad</label>
                  <select 
                    className="form-select"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                  >
                    <option value="all">Todas las prioridades</option>
                    <option value="high">Alta</option>
                    <option value="medium">Media</option>
                    <option value="low">Baja</option>
                  </select>
                </div>
                
                <div className="col-md-3">
                  <label className="form-label">Búsqueda</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <Search size={16} />
                    </span>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Buscar host o problema..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ESTADÍSTICAS GENERALES */}
      <div className="row mb-4">
        <div className="col-md-2">
          <div className="card bg-primary text-white">
            <div className="card-body text-center">
              <div className="h4">{generalStats.total}</div>
              <small>Total Eventos</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card bg-danger text-white">
            <div className="card-body text-center">
              <div className="h4">{generalStats.open}</div>
              <small>Pendientes</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card bg-warning text-white">
            <div className="card-body text-center">
              <div className="h4">{generalStats.inProgress}</div>
              <small>En Progreso</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card bg-success text-white">
            <div className="card-body text-center">
              <div className="h4">{generalStats.resolved}</div>
              <small>Resueltos</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card bg-info text-white">
            <div className="card-body text-center">
              <div className="h4">{generalStats.highPriority}</div>
              <small>Alta Prioridad</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card bg-secondary text-white">
            <div className="card-body text-center">
              <div className="h4">{generalStats.uniqueHosts}</div>
              <small>Hosts Únicos</small>
            </div>
          </div>
        </div>
      </div>

      {/* VISTA PRINCIPAL */}
      {viewMode === 'overview' ? (
        <>
          {/* SECTORES */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card shadow-sm">
                <div className="card-header">
                  <h5 className="mb-0 d-flex align-items-center">
                    <MapPin className="me-2" />
                    Distribución por Sectores
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    {Object.keys(SECTORS).map(sector => (
                      <div key={sector} className="col-xl-4 col-lg-6">
                        <SectorCard sector={sector} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* INFORMACIÓN ADICIONAL */}
          <div className="row">
            {/* PROBLEMAS FRECUENTES */}
            <div className="col-lg-6">
              <div className="card shadow-sm h-100">
                <div className="card-header">
                  <h6 className="mb-0 d-flex align-items-center">
                    <AlertTriangle className="me-2" />
                    Problemas Más Frecuentes
                  </h6>
                </div>
                <div className="card-body">
                  {getFrequentProblems().map((item, index) => (
                    <div key={index} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                      <div className="text-truncate" style={{ maxWidth: '70%' }}>
                        {item.problem}
                      </div>
                      <span className="badge bg-primary">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* HOSTS PROBLEMÁTICOS */}
            <div className="col-lg-6">
              <div className="card shadow-sm h-100">
                <div className="card-header">
                  <h6 className="mb-0 d-flex align-items-center">
                    <Server className="me-2" />
                    Hosts con Más Problemas
                  </h6>
                </div>
                <div className="card-body">
                  {getProblematicHosts().map((item, index) => (
                    <div key={index} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                      <div className="text-truncate" style={{ maxWidth: '70%' }}>
                        {item.host}
                      </div>
                      <span className="badge bg-danger">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <SectorDetails />
      )}

      {/* MODAL DE DETALLE */}
      {selectedProblem && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Detalle del Problema</h5>
                <button className="btn-close" onClick={() => setSelectedProblem(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>Información General</h6>
                    <div className="list-group list-group-flush">
                      <div className="list-group-item d-flex justify-content-between">
                        <span>Problem ID:</span>
                        <span className="badge bg-dark">{selectedProblem.analysis.problemId || 'N/A'}</span>
                      </div>
                      <div className="list-group-item d-flex justify-content-between">
                        <span>Sector:</span>
                        <span className="badge bg-primary">{SECTORS[selectedProblem.analysis.sector]?.name || 'Desconocido'}</span>
                      </div>
                      <div className="list-group-item d-flex justify-content-between">
                        <span>Host:</span>
                        <span>{selectedProblem.analysis.host || 'N/A'}</span>
                      </div>
                      <div className="list-group-item d-flex justify-content-between">
                        <span>Estado:</span>
                        <span className={`badge bg-${getStatusColor(selectedProblem.analysis.status)}`}>
                          {getStatusText(selectedProblem.analysis.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <h6>Mensaje Completo</h6>
                    <div className="bg-light p-3 rounded">
                      <pre className="mb-0 small">{selectedProblem.message}</pre>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-primary" onClick={() => setSelectedProblem(null)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PIE DE PÁGINA */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="text-center text-muted small">
            <p>
              Dashboard de Monitoreo • 
              {viewMode === 'overview' ? ' Vista General' : ` Detalles de ${SECTORS[sectorFilter]?.name}`} • 
              Última actualización: {new Date().toLocaleString('es-ES')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageDashboard;