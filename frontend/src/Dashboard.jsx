import React, { useState, useEffect } from 'react';
import { 
  Activity, AlertTriangle, CheckCircle, XCircle, Clock, 
  BarChart3, Filter, Search, TrendingUp, FileText, 
  Plus, Server, Monitor, Ticket, Calendar, User, Timer,
  ChevronDown, Calendar as CalendarIcon
} from 'lucide-react';

const Dashboard = () => {
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [allTickets, setAllTickets] = useState([]); // Todos los tickets sin filtrar
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    start: { closed: 0, inProgress: 0, open: 0, resolved: 0, total: 0 },
    platform: { closed: 0, inProgress: 0, open: 0, resolved: 0, total: 0 },
    delivery: { closed: 0, inProgress: 0, open: 0, resolved: 0, total: 0 }
  });
  const [requestTypeStats, setRequestTypeStats] = useState({
    Problem: 0,
    Incident: 0,
    Request: 0,
    Question: 0
  });
  const [sourceStats, setSourceStats] = useState({
    'ticket-system': 0,
    'zabbix': 0,
    'headend': 0
  });
  const [timeStats, setTimeStats] = useState({
    start: 0,
    platform: 0,
    delivery: 0,
    total: 0
  });
  const [showModal, setShowModal] = useState(false);
  const [modalTickets, setModalTickets] = useState([]);
  const [modalTitle, setModalTitle] = useState('');
  const [recentTickets, setRecentTickets] = useState([]);

// 🔥 NUEVO: Estados para filtros de fecha
  const [dateFilter, setDateFilter] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);



  // API Configuration - Usando la misma URL que TicketManager
  const API_BASE_URL = 'http://localhost:3005/api';

    // 🔥 NUEVO: Función para formatear fecha a YYYY-MM-DD
  const formatDateToInput = (date) => {
    return date.toISOString().split('T')[0];
  };

  // 🔥 NUEVO: Función para obtener el rango de fechas según el filtro seleccionado
  const getDateRange = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (dateFilter) {
      case 'today':
        return {
          start: today,
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        };
      
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          start: yesterday,
          end: today
        };
      
      case 'thisWeek':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        return {
          start: startOfWeek,
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        };
      
      case 'lastWeek':
        const startOfLastWeek = new Date(today);
        startOfLastWeek.setDate(today.getDate() - today.getDay() - 7);
        const endOfLastWeek = new Date(startOfLastWeek);
        endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
        return {
          start: startOfLastWeek,
          end: new Date(endOfLastWeek.getTime() + 24 * 60 * 60 * 1000)
        };
      
      case 'thisMonth':
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          start: startOfMonth,
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        };
      
      case 'lastMonth':
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        return {
          start: startOfLastMonth,
          end: new Date(endOfLastMonth.getTime() + 24 * 60 * 60 * 1000)
        };
      
      case 'custom':
        if (customStartDate && customEndDate) {
          return {
            start: new Date(customStartDate),
            end: new Date(new Date(customEndDate).getTime() + 24 * 60 * 60 * 1000)
          };
        }
        return { start: null, end: null };
      
      default:
        return { start: null, end: null };
    }
  };

  // 🔥 NUEVO: Función para aplicar filtros de fecha
  const applyDateFilter = (ticketList) => {
    if (dateFilter === 'all') {
      return ticketList;
    }

    const dateRange = getDateRange();
    if (!dateRange.start) return ticketList;

    return ticketList.filter(ticket => {
      const ticketDate = new Date(ticket["Ticket Date"]);
      return ticketDate >= dateRange.start && ticketDate < dateRange.end;
    });
  };

  // 🔥 NUEVO: Función para obtener el texto del filtro de fecha seleccionado
  const getDateFilterText = () => {
    const dateRange = getDateRange();
    
    switch (dateFilter) {
      case 'today':
        return `Hoy (${formatDateToInput(dateRange.start)})`;
      case 'yesterday':
        return `Ayer (${formatDateToInput(dateRange.start)})`;
      case 'thisWeek':
        return 'Esta semana';
      case 'lastWeek':
        return 'Semana pasada';
      case 'thisMonth':
        return 'Este mes';
      case 'lastMonth':
        return 'Mes pasado';
      case 'custom':
        if (customStartDate && customEndDate) {
          return `Personalizado (${customStartDate} a ${customEndDate})`;
        }
        return 'Personalizado';
      case 'all':
        return 'Todos los tiempos';
      default:
        return 'Seleccionar fecha';
    }
  };

  // 🔥 NUEVO: Función para aplicar todos los filtros
  const applyFilters = () => {
    let filtered = [...allTickets];
    
    // Aplicar filtro de fecha
    filtered = applyDateFilter(filtered);
    
    setFilteredTickets(filtered);
    
    // Recalcular estadísticas con los tickets filtrados
    calculatePlatformStats(filtered);
    calculateRequestTypeStats(filtered);
    calculateSourceStats(filtered);
    calculateTimeStats(filtered);
    getRecentTickets(filtered);
  };

  // 🔥 MODIFICADO: Actualizar useEffect para aplicar filtros cuando cambien
  useEffect(() => {
    applyFilters();
  }, [allTickets, dateFilter, customStartDate, customEndDate]);

  // Función para transformar los datos simples de TicketManager a la estructura esperada por Dashboard
  const transformTicketData = (ticketData) => {
    return ticketData.map((ticket, index) => {
      // Determinar el estado basado en el mensaje
      const status = getStatusFromMessage(ticket.message);
      
      // Determinar la plataforma basada en el subject
      const platform = getPlatformFromSubject(ticket.subject);
      
      // Determinar el tipo de request basado en el mensaje
      const requestType = getRequestTypeFromMessage(ticket.message);
      
      // Asignar una fuente por defecto
      const source = getSourceFromSubject(ticket.subject);
      
      // Generar un número de ticket si no existe
      const ticketNumber = ticket.id ? ticket.id.toString() : `T${Date.now()}${index}`;
      
      // Calcular un tiempo de resolución simulado (en minutos)
      const resolutionTime = calculateResolutionTime(ticket.created_at, status);
      
      return {
        id: ticket.id || index,
        "Ticket Number": ticketNumber,
        "Request type": requestType,
        "Ticket Subject": ticket.subject,
        "Platform": platform,
        "Ticket Status": status,
        "Original Status": status,
        "Ticket Date": ticket.created_at,
        "Last Update": ticket.created_at,
        "Last Reply": ticket.created_at,
        "Resolution Time": resolutionTime,
        "Submitter Name": "Sistema",
        "Source": source
      };
    });
  };


  // Función para determinar el estado basado en el mensaje
  const getStatusFromMessage = (message) => {
    if (!message) return 'Open';
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('resolved')) return 'Resolved';
    if (lowerMessage.includes('started')) return 'In Progress';
    return 'Open';
  };

  // Función para determinar la plataforma basada en el subject
  const getPlatformFromSubject = (subject) => {
    if (!subject) return 'platform';
    const lowerSubject = subject.toLowerCase();
    if (lowerSubject.includes('gpu') || lowerSubject.includes('platform')) return 'platform';
    if (lowerSubject.includes('latency') || lowerSubject.includes('delivery')) return 'delivery';
    if (lowerSubject.includes('service') || lowerSubject.includes('start') || lowerSubject.includes('cabecera')) return 'start';
    return 'platform'; // Por defecto
  };

  // Función para determinar el tipo de request basado en el mensaje
  const getRequestTypeFromMessage = (message) => {
    if (!message) return 'Problem';
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('problem')) return 'Problem';
    if (lowerMessage.includes('incident')) return 'Incident';
    if (lowerMessage.includes('request')) return 'Request';
    if (lowerMessage.includes('question')) return 'Question';
    return 'Problem'; // Por defecto
  };

  // Función para determinar la fuente basada en el subject
  const getSourceFromSubject = (subject) => {
    if (!subject) return 'ticket-system';
    const lowerSubject = subject.toLowerCase();
    if (lowerSubject.includes('zabbix') || lowerSubject.includes('monitor')) return 'zabbix';
    if (lowerSubject.includes('headend') || lowerSubject.includes('cabecera')) return 'headend';
    return 'ticket-system'; // Por defecto
  };

  // Función para calcular tiempo de resolución simulado
  const calculateResolutionTime = (createdAt, status) => {
    if (status !== 'Resolved') return 0;
    
    // Para tickets resueltos, calcular diferencia entre creación y ahora (simulado)
    const created = new Date(createdAt);
    const now = new Date();
    const diffMinutes = Math.round((now - created) / (1000 * 60));
    
    // Devolver un valor razonable entre 30 minutos y 48 horas
    return Math.min(Math.max(diffMinutes, 30), 2880);
  };

  // Función para obtener nombre de plataforma
  const getPlatformName = (platform) => {
    switch (platform) {
      case 'start': return 'Cabecera';
      case 'platform': return 'Plataforma';
      case 'delivery': return 'Distribución';
      default: return platform;
    }
  };

  // Función para obtener nombre de procedencia
  const getSourceName = (source) => {
    switch (source) {
      case 'ticket-system': return 'Sistema de Tickets';
      case 'zabbix': return 'Zabbix';
      case 'headend': return 'Cabecera';
      default: return source;
    }
  };

  // Función para obtener icono de procedencia
  const getSourceIcon = (source) => {
    switch (source) {
      case 'ticket-system': return <Ticket size={14} className="me-1" />;
      case 'zabbix': return <Monitor size={14} className="me-1" />;
      case 'headend': return <Server size={14} className="me-1" />;
      default: return <Ticket size={14} className="me-1" />;
    }
  };

  // Función para formatear tiempo
  const formatTime = (minutes) => {
    if (!minutes || minutes === 0) return '0m';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  // Función para obtener color del estado
  const getStatusColor = (status) => {
    switch (status) {
      case 'Closed':
      case 'Resolved': 
        return 'text-success';
      case 'In Progress': 
        return 'text-warning';
      case 'Open': 
        return 'text-danger';
      default: 
        return 'text-secondary';
    }
  };

  // Función para obtener icono del estado
  const getStatusIcon = (status) => {
    switch (status) {
      case 'Closed':
      case 'Resolved':
        return <CheckCircle size={16} />;
      case 'In Progress':
        return <AlertTriangle size={16} />;
      case 'Open':
        return <XCircle size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  // Función para obtener badge color para estado
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Closed':
      case 'Resolved':
        return 'bg-success';
      case 'In Progress':
        return 'bg-warning text-dark';
      case 'Open':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  };

  // Función para obtener badge color para plataforma
  const getPlatformBadge = (platform) => {
    switch (platform) {
      case 'start': return 'bg-primary';
      case 'platform': return 'bg-info';
      case 'delivery': return 'bg-success';
      default: return 'bg-secondary';
    }
  };

  // Función para obtener badge color para procedencia
  const getSourceBadge = (source) => {
    switch (source) {
      case 'ticket-system': return 'bg-primary';
      case 'zabbix': return 'bg-warning text-dark';
      case 'headend': return 'bg-info text-dark';
      default: return 'bg-secondary';
    }
  };

  // Función para formatear fecha
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Función para abrir el modal con los tickets filtrados
  const openModal = (filterFunction, title) => {
    const filtered = tickets.filter(filterFunction);
    setModalTickets(filtered);
    setModalTitle(title);
    setShowModal(true);
  };

  // Función para calcular estadísticas por plataforma
  const calculatePlatformStats = (ticketList) => {
    const newStats = {
      start: { closed: 0, inProgress: 0, open: 0, resolved: 0, total: 0 },
      platform: { closed: 0, inProgress: 0, open: 0, resolved: 0, total: 0 },
      delivery: { closed: 0, inProgress: 0, open: 0, resolved: 0, total: 0 }
    };

    ticketList.forEach(ticket => {
      const platform = ticket.Platform;
      const status = ticket["Ticket Status"];
      
      if (newStats[platform]) {
        newStats[platform].total++;
        
        switch (status) {
          case 'Closed':
            newStats[platform].closed++;
            break;
          case 'In Progress':
            newStats[platform].inProgress++;
            break;
          case 'Open':
            newStats[platform].open++;
            break;
          case 'Resolved':
            newStats[platform].resolved++;
            break;
        }
      }
    });

    setStats(newStats);
  };

  // Función para calcular estadísticas por tipo de request
  const calculateRequestTypeStats = (ticketList) => {
    const newRequestTypeStats = {
      Problem: 0,
      Incident: 0,
      Request: 0,
      Question: 0
    };

    ticketList.forEach(ticket => {
      const requestType = ticket["Request type"] || 'Problem';
      if (newRequestTypeStats.hasOwnProperty(requestType)) {
        newRequestTypeStats[requestType]++;
      }
    });

    setRequestTypeStats(newRequestTypeStats);
  };

  // Función para calcular estadísticas por fuente
  const calculateSourceStats = (ticketList) => {
    const newSourceStats = {
      'ticket-system': 0,
      'zabbix': 0,
      'headend': 0
    };

    ticketList.forEach(ticket => {
      const source = ticket.Source || 'ticket-system';
      if (newSourceStats.hasOwnProperty(source)) {
        newSourceStats[source]++;
      }
    });

    setSourceStats(newSourceStats);
  };

  // Función para calcular estadísticas de tiempo
  const calculateTimeStats = (ticketList) => {
    const platformTimes = {
      start: [],
      platform: [],
      delivery: []
    };

    ticketList.forEach(ticket => {
      if (platformTimes[ticket.Platform] && ticket["Resolution Time"] > 0) {
        platformTimes[ticket.Platform].push(ticket["Resolution Time"]);
      }
    });

    const newTimeStats = {
      start: platformTimes.start.length > 0 
        ? Math.round(platformTimes.start.reduce((a, b) => a + b, 0) / platformTimes.start.length) 
        : 0,
      platform: platformTimes.platform.length > 0 
        ? Math.round(platformTimes.platform.reduce((a, b) => a + b, 0) / platformTimes.platform.length) 
        : 0,
      delivery: platformTimes.delivery.length > 0 
        ? Math.round(platformTimes.delivery.reduce((a, b) => a + b, 0) / platformTimes.delivery.length) 
        : 0
    };

    // Calcular promedio total
    const allTimes = [...platformTimes.start, ...platformTimes.platform, ...platformTimes.delivery];
    newTimeStats.total = allTimes.length > 0 
      ? Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length)
      : 0;

    setTimeStats(newTimeStats);
  };

  // Función para obtener tickets recientes
  const getRecentTickets = (ticketList) => {
    const sorted = [...ticketList].sort((a, b) => 
      new Date(b["Ticket Date"]) - new Date(a["Ticket Date"])
    );
    setRecentTickets(sorted.slice(0, 5));
  };

  // Cargar tickets desde la API (usando el mismo endpoint que TicketManager)
  // 🔥 MODIFICADO: Cargar tickets desde la API
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/tickets`);
        
        if (!response.ok) {
          throw new Error('Error al cargar los tickets');
        }
        
        const data = await response.json();
        
        if (data.success) {
          const transformedData = transformTicketData(data.data);
          setAllTickets(transformedData); // Guardar todos los tickets
        } else {
          throw new Error(data.error || 'Error en la respuesta del servidor');
        }
      } catch (error) {
        console.error('Error:', error);
        setError(error.message);
        
        // Datos de ejemplo como fallback
        const fallbackData = [
          {
            id: 1,
            subject: 'Delivery latency is too high (over 100ms for 5m)',
            message: 'Problem has been resolved at 12:15:47 on 2025.09.15',
            created_at: new Date().toISOString().split('T')[0] + ' 15:15:50'
          },
          {
            id: 2,
            subject: 'GPU >= 95% por más de 45 minutos',
            message: 'Problem started at 12:42:53 on 2025.09.15',
            created_at: new Date().toISOString().split('T')[0] + ' 15:42:57'
          },
          {
            id: 3,
            subject: 'Caida de servicio en cabecera',
            message: 'Incident reported, investigating',
            created_at: new Date().toISOString().split('T')[0] + ' 16:30:00'
          }
        ];
        
        const transformedFallbackData = transformTicketData(fallbackData);
        setAllTickets(transformedFallbackData);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  // 🔥 NUEVO: Inicializar fechas por defecto
  useEffect(() => {
    const today = formatDateToInput(new Date());
    setCustomStartDate(today);
    setCustomEndDate(today);
  }, []);

  // Función para obtener totales generales
  const getTotalStats = () => {
    return {
      total: filteredTickets.length,
      closed: stats.start.closed + stats.platform.closed + stats.delivery.closed,
      resolved: stats.start.resolved + stats.platform.resolved + stats.delivery.resolved,
      inProgress: stats.start.inProgress + stats.platform.inProgress + stats.delivery.inProgress,
      open: stats.start.open + stats.platform.open + stats.delivery.open
    };
  };

  const totalStats = getTotalStats();

  return (
    <div className="container-fluid py-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="h3 mb-0 d-flex align-items-center">
              <Activity className="me-2" />
              Dashboard de Alertas/Tickets
            </h1>
            <div className="d-flex align-items-center gap-3">
              <small className="text-muted">
                Mostrando: {filteredTickets.length} de {allTickets.length} alertas
              </small>
              <small className="text-muted">
                Última actualización: {new Date().toLocaleTimeString('es-ES')}
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* 🔥 NUEVO: Filtros de fecha */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h6 className="mb-0 d-flex align-items-center">
                <CalendarIcon className="me-2" size={20} />
                Filtros de Fecha
              </h6>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setShowDateFilter(!showDateFilter)}
              >
                <Filter size={16} className="me-1" />
                {showDateFilter ? 'Ocultar Filtros' : 'Mostrar Filtros'}
              </button>
            </div>
            
            {showDateFilter && (
              <div className="card-body">
                <div className="row g-3 align-items-end">
                  <div className="col-md-4">
                    <label className="form-label">Rango de Fecha:</label>
                    <select 
                      className="form-select"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                    >
                      <option value="today">Hoy</option>
                      <option value="yesterday">Ayer</option>
                      <option value="thisWeek">Esta semana</option>
                      <option value="lastWeek">Semana pasada</option>
                      <option value="thisMonth">Este mes</option>
                      <option value="lastMonth">Mes pasado</option>
                      <option value="custom">Personalizado</option>
                      <option value="all">Todos los tiempos</option>
                    </select>
                  </div>

                  {dateFilter === 'custom' && (
                    <>
                      <div className="col-md-3">
                        <label className="form-label">Fecha Inicio:</label>
                        <input
                          type="date"
                          className="form-control"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Fecha Fin:</label>
                        <input
                          type="date"
                          className="form-control"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  <div className="col-md-2">
                    <div className="d-grid">
                      <button
                        className="btn btn-primary"
                        onClick={applyFilters}
                      >
                        <Search size={16} className="me-1" />
                        Aplicar
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 p-3 bg-light rounded">
                  <small className="text-muted">
                    <strong>Filtro activo:</strong> {getDateFilterText()} | 
                    <strong> Alertas mostradas:</strong> {filteredTickets.length}
                  </small>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mostrar error si existe */}
      {error && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="alert alert-warning d-flex align-items-center" role="alert">
              <AlertTriangle className="me-2" />
              <div>
                <strong>Conectando con datos de ejemplo:</strong> {error}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Loading spinner */}
      {loading && (
        <div className="row mb-4">
          <div className="col-12 text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
            <p className="mt-2 text-muted">Cargando datos del dashboard...</p>
          </div>
        </div>
      )}

      {!loading && (
        <>
          {/* Resumen general en la parte superior */}
          <div className="row mb-4">
            <div className="col-md-3 mb-3">
              <div className="card shadow-sm border-success">
                <div className="card-body text-center">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <CheckCircle className="text-success" size={24} />
                    <span className="badge bg-success">{totalStats.total > 0 ? ((totalStats.closed + totalStats.resolved) / totalStats.total * 100).toFixed(1) : 0}%</span>
                  </div>
                  <h3 className="text-success mb-1">{totalStats.closed + totalStats.resolved}</h3>
                  <small className="text-muted">Alertas Completadas</small>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card shadow-sm border-warning">
                <div className="card-body text-center">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <AlertTriangle className="text-warning" size={24} />
                    <span className="badge bg-warning text-dark">{totalStats.total > 0 ? (totalStats.inProgress / totalStats.total * 100).toFixed(1) : 0}%</span>
                  </div>
                  <h3 className="text-warning mb-1">{totalStats.inProgress}</h3>
                  <small className="text-muted">En Progreso</small>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card shadow-sm border-danger">
                <div className="card-body text-center">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <XCircle className="text-danger" size={24} />
                    <span className="badge bg-danger">{totalStats.total > 0 ? (totalStats.open / totalStats.total * 100).toFixed(1) : 0}%</span>
                  </div>
                  <h3 className="text-danger mb-1">{totalStats.open}</h3>
                  <small className="text-muted">Pendientes</small>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card shadow-sm border-info">
                <div className="card-body text-center">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <Timer className="text-info" size={24} />
                    <span className="badge bg-info">AVG</span>
                  </div>
                  <h3 className="text-info mb-1">{formatTime(timeStats.total)}</h3>
                  <small className="text-muted">Tiempo Promedio</small>
                </div>
              </div>
            </div>
          </div>

          {/* Cards de estadísticas por plataforma */}
          <div className="row mb-4">
            {/* Cabecera */}
            <div className="col-lg-4 mb-3">
              <div className="card h-100 shadow-sm">
                <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0">Cabecera (Start)</h5>
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-light text-primary">{stats.start.total}</span>
                    <BarChart3 size={20} />
                  </div>
                </div>
                <div className="card-body">
                  <div className="row text-center mb-3">
                    <div className="col-6 col-md-3">
                      <div 
                        className="p-2 rounded cursor-pointer" 
                        style={{ backgroundColor: '#d4edda', cursor: 'pointer' }}
                        onClick={() => openModal(
                          ticket => ticket.Platform === 'start' && ['Closed', 'Resolved'].includes(ticket["Ticket Status"]),
                          'Cabecera - Alertas Completadas'
                        )}
                      >
                        <CheckCircle className="text-success mb-1" size={20} />
                        <div className="h5 text-success mb-0">{stats.start.closed + stats.start.resolved}</div>
                        <small className="text-muted">OK</small>
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div 
                        className="p-2 rounded cursor-pointer" 
                        style={{ backgroundColor: '#fff3cd', cursor: 'pointer' }}
                        onClick={() => openModal(
                          ticket => ticket.Platform === 'start' && ticket["Ticket Status"] === 'In Progress',
                          'Cabecera - En Progreso'
                        )}
                      >
                        <AlertTriangle className="text-warning mb-1" size={20} />
                        <div className="h5 text-warning mb-0">{stats.start.inProgress}</div>
                        <small className="text-muted">Progreso</small>
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div 
                        className="p-2 rounded cursor-pointer" 
                        style={{ backgroundColor: '#f8d7da', cursor: 'pointer' }}
                        onClick={() => openModal(
                          ticket => ticket.Platform === 'start' && ticket["Ticket Status"] === 'Open',
                          'Cabecera - Alertas Abiertas'
                        )}
                      >
                        <XCircle className="text-danger mb-1" size={20} />
                        <div className="h5 text-danger mb-0">{stats.start.open}</div>
                        <small className="text-muted">Abiertas</small>
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="p-2 rounded" style={{ backgroundColor: '#e9ecef' }}>
                        <Timer className="text-info mb-1" size={20} />
                        <div className="h6 text-info mb-0">{formatTime(timeStats.start)}</div>
                        <small className="text-muted">Tiempo</small>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <button 
                      className="btn btn-outline-primary btn-sm w-100"
                      onClick={() => openModal(
                        ticket => ticket.Platform === 'start',
                        'Cabecera - Todas las Alertas'
                      )}
                    >
                      Ver todas las alertas
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Plataforma */}
            <div className="col-lg-4 mb-3">
              <div className="card h-100 shadow-sm">
                <div className="card-header bg-info text-white d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0">Plataforma</h5>
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-light text-info">{stats.platform.total}</span>
                    <BarChart3 size={20} />
                  </div>
                </div>
                <div className="card-body">
                  <div className="row text-center mb-3">
                    <div className="col-6 col-md-3">
                      <div 
                        className="p-2 rounded cursor-pointer" 
                        style={{ backgroundColor: '#d4edda', cursor: 'pointer' }}
                        onClick={() => openModal(
                          ticket => ticket.Platform === 'platform' && ['Closed', 'Resolved'].includes(ticket["Ticket Status"]),
                          'Plataforma - Alertas Completadas'
                        )}
                      >
                        <CheckCircle className="text-success mb-1" size={20} />
                        <div className="h5 text-success mb-0">{stats.platform.closed + stats.platform.resolved}</div>
                        <small className="text-muted">OK</small>
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div 
                        className="p-2 rounded cursor-pointer" 
                        style={{ backgroundColor: '#fff3cd', cursor: 'pointer' }}
                        onClick={() => openModal(
                          ticket => ticket.Platform === 'platform' && ticket["Ticket Status"] === 'In Progress',
                          'Plataforma - En Progreso'
                        )}
                      >
                        <AlertTriangle className="text-warning mb-1" size={20} />
                        <div className="h5 text-warning mb-0">{stats.platform.inProgress}</div>
                        <small className="text-muted">Progreso</small>
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div 
                        className="p-2 rounded cursor-pointer" 
                        style={{ backgroundColor: '#f8d7da', cursor: 'pointer' }}
                        onClick={() => openModal(
                          ticket => ticket.Platform === 'platform' && ticket["Ticket Status"] === 'Open',
                          'Plataforma - Alertas Abiertas'
                        )}
                      >
                        <XCircle className="text-danger mb-1" size={20} />
                        <div className="h5 text-danger mb-0">{stats.platform.open}</div>
                        <small className="text-muted">Abiertas</small>
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="p-2 rounded" style={{ backgroundColor: '#e9ecef' }}>
                        <Timer className="text-info mb-1" size={20} />
                        <div className="h6 text-info mb-0">{formatTime(timeStats.platform)}</div>
                        <small className="text-muted">Tiempo</small>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <button 
                      className="btn btn-outline-info btn-sm w-100"
                      onClick={() => openModal(
                        ticket => ticket.Platform === 'platform',
                        'Plataforma - Todas las Alertas'
                      )}
                    >
                      Ver todas las alertas
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Distribución */}
            <div className="col-lg-4 mb-3">
              <div className="card h-100 shadow-sm">
                <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0">Distribución</h5>
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-light text-success">{stats.delivery.total}</span>
                    <BarChart3 size={20} />
                  </div>
                </div>
                <div className="card-body">
                  <div className="row text-center mb-3">
                    <div className="col-6 col-md-3">
                      <div 
                        className="p-2 rounded cursor-pointer" 
                        style={{ backgroundColor: '#d4edda', cursor: 'pointer' }}
                        onClick={() => openModal(
                          ticket => ticket.Platform === 'delivery' && ['Closed', 'Resolved'].includes(ticket["Ticket Status"]),
                          'Distribución - Alertas Completadas'
                        )}
                      >
                        <CheckCircle className="text-success mb-1" size={20} />
                        <div className="h5 text-success mb-0">{stats.delivery.closed + stats.delivery.resolved}</div>
                        <small className="text-muted">OK</small>
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div 
                        className="p-2 rounded cursor-pointer" 
                        style={{ backgroundColor: '#fff3cd', cursor: 'pointer' }}
                        onClick={() => openModal(
                          ticket => ticket.Platform === 'delivery' && ticket["Ticket Status"] === 'In Progress',
                          'Distribución - En Progreso'
                        )}
                      >
                        <AlertTriangle className="text-warning mb-1" size={20} />
                        <div className="h5 text-warning mb-0">{stats.delivery.inProgress}</div>
                        <small className="text-muted">Progreso</small>
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div 
                        className="p-2 rounded cursor-pointer" 
                        style={{ backgroundColor: '#f8d7da', cursor: 'pointer' }}
                        onClick={() => openModal(
                          ticket => ticket.Platform === 'delivery' && ticket["Ticket Status"] === 'Open',
                          'Distribución - Alertas Abiertas'
                        )}
                      >
                        <XCircle className="text-danger mb-1" size={20} />
                        <div className="h5 text-danger mb-0">{stats.delivery.open}</div>
                        <small className="text-muted">Abiertas</small>
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="p-2 rounded" style={{ backgroundColor: '#e9ecef' }}>
                        <Timer className="text-info mb-1" size={20} />
                        <div className="h6 text-info mb-0">{formatTime(timeStats.delivery)}</div>
                        <small className="text-muted">Tiempo</small>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <button 
                      className="btn btn-outline-success btn-sm w-100"
                      onClick={() => openModal(
                        ticket => ticket.Platform === 'delivery',
                        'Distribución - Todas las Alertas'
                      )}
                    >
                      Ver todas las alertas
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Segunda fila: Estadísticas por tipo de request y fuentes */}
          <div className="row mb-4">
            {/* Estadísticas por tipo de request */}
            <div className="col-lg-6 mb-3">
              <div className="card shadow-sm h-100">
                <div className="card-header bg-secondary text-white d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0 d-flex align-items-center">
                    <FileText className="me-2" size={20} />
                    Tipos de Alerta
                  </h5>
                  <span className="badge bg-light text-secondary">{Object.values(requestTypeStats).reduce((a, b) => a + b, 0)}</span>
                </div>
                <div className="card-body">
                  <div className="row text-center">
                    <div className="col-6 col-md-3 mb-3">
                      <div 
                        className="p-3 rounded cursor-pointer" 
                        style={{ backgroundColor: '#e3f2fd', cursor: 'pointer' }}
                        onClick={() => openModal(
                          ticket => ticket["Request type"] === 'Problem',
                          'Alertas de Tipo Problem'
                        )}
                      >
                        <div className="h4 text-primary mb-1">{requestTypeStats.Problem}</div>
                        <small className="text-muted">Problem</small>
                      </div>
                    </div>
                    <div className="col-6 col-md-3 mb-3">
                      <div 
                        className="p-3 rounded cursor-pointer" 
                        style={{ backgroundColor: '#e0f2f1', cursor: 'pointer' }}
                        onClick={() => openModal(
                          ticket => ticket["Request type"] === 'Incident',
                          'Alertas de Tipo Incident'
                        )}
                      >
                        <div className="h4 text-info mb-1">{requestTypeStats.Incident}</div>
                        <small className="text-muted">Incident</small>
                      </div>
                    </div>
                    <div className="col-6 col-md-3 mb-3">
                      <div 
                        className="p-3 rounded cursor-pointer" 
                        style={{ backgroundColor: '#e8f5e8', cursor: 'pointer' }}
                        onClick={() => openModal(
                          ticket => ticket["Request type"] === 'Request',
                          'Alertas de Tipo Request'
                        )}
                      >
                        <div className="h4 text-success mb-1">{requestTypeStats.Request}</div>
                        <small className="text-muted">Request</small>
                      </div>
                    </div>
                    <div className="col-6 col-md-3 mb-3">
                      <div 
                        className="p-3 rounded cursor-pointer" 
                        style={{ backgroundColor: '#fff3e0', cursor: 'pointer' }}
                        onClick={() => openModal(
                          ticket => ticket["Request type"] === 'Question',
                          'Alertas de Tipo Question'
                        )}
                      >
                        <div className="h4 text-warning mb-1">{requestTypeStats.Question}</div>
                        <small className="text-muted">Question</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Estadísticas por fuente */}
            <div className="col-lg-6 mb-3">
              <div className="card shadow-sm h-100">
                <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0 d-flex align-items-center">
                    <Server className="me-2" size={20} />
                    Fuentes de Alertas
                  </h5>
                  <span className="badge bg-light text-dark">{Object.values(sourceStats).reduce((a, b) => a + b, 0)}</span>
                </div>
                <div className="card-body">
                  <div className="row text-center">
                    <div className="col-4 mb-3">
                      <div 
                        className="p-3 rounded cursor-pointer" 
                        style={{ backgroundColor: '#e3f2fd', cursor: 'pointer' }}
                        onClick={() => openModal(
                          ticket => ticket.Source === 'ticket-system',
                          'Alertas del Sistema de Tickets'
                        )}
                      >
                        <Ticket className="text-primary mb-2" size={24} />
                        <div className="h4 text-primary mb-1">{sourceStats['ticket-system']}</div>
                        <small className="text-muted">Sistema</small>
                      </div>
                    </div>
                    <div className="col-4 mb-3">
                      <div 
                        className="p-3 rounded cursor-pointer" 
                        style={{ backgroundColor: '#fff3cd', cursor: 'pointer' }}
                        onClick={() => openModal(
                          ticket => ticket.Source === 'zabbix',
                          'Alertas de Zabbix'
                        )}
                      >
                        <Monitor className="text-warning mb-2" size={24} />
                        <div className="h4 text-warning mb-1">{sourceStats.zabbix}</div>
                        <small className="text-muted">Zabbix</small>
                      </div>
                    </div>
                    <div className="col-4 mb-3">
                      <div 
                        className="p-3 rounded cursor-pointer" 
                        style={{ backgroundColor: '#d1ecf1', cursor: 'pointer' }}
                        onClick={() => openModal(
                          ticket => ticket.Source === 'headend',
                          'Alertas de Cabecera'
                        )}
                      >
                        <Server className="text-info mb-2" size={24} />
                        <div className="h4 text-info mb-1">{sourceStats.headend}</div>
                        <small className="text-muted">Cabecera</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tercera fila: Alertas recientes y tendencias */}
          <div className="row">
            {/* Alertas recientes */}
            <div className="col-lg-8 mb-3">
              <div className="card shadow-sm h-100">
                <div className="card-header bg-light d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0 d-flex align-items-center">
                    <Clock className="me-2" size={20} />
                    Alertas Recientes
                  </h5>
                  <span className="badge bg-primary">{recentTickets.length}</span>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Ticket</th>
                          <th>Asunto</th>
                          <th>Plataforma</th>
                          <th>Estado</th>
                          <th>Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentTickets.map((ticket, index) => (
                          <tr key={ticket.id} className="cursor-pointer">
                            <td>
                              <small className="text-muted">#{ticket["Ticket Number"]}</small>
                            </td>
                            <td>
                              <div className="d-flex align-items-center">
                                {getSourceIcon(ticket.Source)}
                                <span className="text-truncate" style={{ maxWidth: '200px' }} title={ticket["Ticket Subject"]}>
                                  {ticket["Ticket Subject"]}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${getPlatformBadge(ticket.Platform)}`}>
                                {getPlatformName(ticket.Platform)}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${getStatusBadge(ticket["Ticket Status"])}`}>
                                {ticket["Ticket Status"]}
                              </span>
                            </td>
                            <td>
                              <small className="text-muted">{formatDate(ticket["Ticket Date"])}</small>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Tendencias y métricas */}
            <div className="col-lg-4 mb-3">
              <div className="card shadow-sm h-100">
                <div className="card-header bg-light d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0 d-flex align-items-center">
                    <TrendingUp className="me-2" size={20} />
                    Métricas Clave
                  </h5>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <small className="text-muted">Tiempo promedio de resolución</small>
                      <span className="badge bg-info">{formatTime(timeStats.total)}</span>
                    </div>
                    <div className="progress" style={{ height: '6px' }}>
                      <div 
                        className="progress-bar bg-info" 
                        style={{ width: `${Math.min((timeStats.total / 480) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <small className="text-muted">Tasa de finalización</small>
                      <span className="badge bg-success">{totalStats.total > 0 ? ((totalStats.closed + totalStats.resolved) / totalStats.total * 100).toFixed(1) : 0}%</span>
                    </div>
                    <div className="progress" style={{ height: '6px' }}>
                      <div 
                        className="progress-bar bg-success" 
                        style={{ width: `${totalStats.total > 0 ? ((totalStats.closed + totalStats.resolved) / totalStats.total * 100) : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <small className="text-muted">Alertas pendientes</small>
                      <span className="badge bg-danger">{totalStats.open}</span>
                    </div>
                    <div className="progress" style={{ height: '6px' }}>
                      <div 
                        className="progress-bar bg-danger" 
                        style={{ width: `${totalStats.total > 0 ? (totalStats.open / totalStats.total * 100) : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-light rounded">
                    <h6 className="d-flex align-items-center">
                      <Calendar className="me-2" size={16} />
                      Resumen del día
                    </h6>
                    <div className="row text-center">
                      <div className="col-4">
                        <div className="h6 text-success mb-0">{totalStats.closed + totalStats.resolved}</div>
                        <small className="text-muted">Completadas</small>
                      </div>
                      <div className="col-4">
                        <div className="h6 text-warning mb-0">{totalStats.inProgress}</div>
                        <small className="text-muted">En curso</small>
                      </div>
                      <div className="col-4">
                        <div className="h6 text-danger mb-0">{totalStats.open}</div>
                        <small className="text-muted">Pendientes</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal para mostrar tickets filtrados */}
      {showModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{modalTitle}</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Ticket</th>
                        <th>Tipo</th>
                        <th>Asunto</th>
                        <th>Plataforma</th>
                        <th>Fuente</th>
                        <th>Estado</th>
                        <th>Fecha</th>
                        <th>Tiempo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalTickets.map(ticket => (
                        <tr key={ticket.id}>
                          <td>#{ticket["Ticket Number"]}</td>
                          <td>
                            <span className="badge bg-secondary">{ticket["Request type"]}</span>
                          </td>
                          <td>{ticket["Ticket Subject"]}</td>
                          <td>
                            <span className={`badge ${getPlatformBadge(ticket.Platform)}`}>
                              {getPlatformName(ticket.Platform)}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${getSourceBadge(ticket.Source)}`}>
                              {getSourceName(ticket.Source)}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${getStatusBadge(ticket["Ticket Status"])}`}>
                              {ticket["Ticket Status"]}
                            </span>
                          </td>
                          <td>
                            <small>{formatDate(ticket["Ticket Date"])}</small>
                          </td>
                          <td>
                            <small className="text-muted">{formatTime(ticket["Resolution Time"])}</small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {modalTickets.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-muted">No hay alertas que mostrar</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowModal(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;