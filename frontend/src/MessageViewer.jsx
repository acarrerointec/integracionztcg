import React, { useState, useEffect } from 'react';
import {
  Search, Filter, Calendar, Clock, MessageSquare,
  AlertTriangle, CheckCircle, XCircle, Eye, EyeOff,
  Download, RefreshCw, ChevronDown, ChevronUp,
  BarChart3, Grid, List, Zap, Server, Database,
  Copy, ExternalLink, Hash, User, Tag, PlayCircle, StopCircle
} from 'lucide-react';

// 🔥 CONVERSIÓN DE ZONA HORARIA
const convertToLocalTime = (utcDateString) => {
  const date = new Date(utcDateString);
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return {
    local: date.toLocaleString('es-ES', {
      timeZone: userTimezone,
      hour12: false
    }),
    date: date.toLocaleDateString('es-ES', { timeZone: userTimezone }),
    time: date.toLocaleTimeString('es-ES', {
      timeZone: userTimezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }),
    full: date.toLocaleString('es-ES', {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }),
    timezone: userTimezone,
    utc: date.toISOString()
  };
};

// 🔥 EXTRAER HORA DEL MENSAJE PARA COMPARACIÓN
const extractMessageTime = (message) => {
  const timeMatch = message.match(/(\d{2}:\d{2}:\d{2})/);
  const dateMatch = message.match(/(\d{4}\.\d{2}\.\d{2})/);

  if (timeMatch && dateMatch) {
    return {
      time: timeMatch[1],
      date: dateMatch[1].replace(/\./g, '-'),
      full: `${dateMatch[1]} ${timeMatch[1]}`
    };
  }
  return null;
};

// 🔥 CALCULAR DISCREPANCIA DE TIEMPO
const calculateTimeDiscrepancy = (messageTime, localTime, utcTime) => {
  if (!messageTime) return null;

  try {
    const messageDateStr = `${messageTime.date.replace(/\./g, '-')}T${messageTime.time}`;
    const messageDate = new Date(messageDateStr);
    const utcDate = new Date(utcTime);
    const diffHours = Math.abs(utcDate - messageDate) / (1000 * 60 * 60);

    return {
      hours: Math.round(diffHours * 100) / 100,
      messageDate: messageDate.toLocaleString('es-ES'),
      utcDate: utcDate.toLocaleString('es-ES')
    };
  } catch (error) {
    console.error('Error calculando discrepancia:', error);
    return null;
  }
};

const MessageViewer = () => {
  const [messages, setMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [groupedMessages, setGroupedMessages] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('today'); // ✅ Por defecto "today"
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('cards');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [groupByProblemId, setGroupByProblemId] = useState(true);
  const [selectedTimezone, setSelectedTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [customDate, setCustomDate] = useState(''); // ✅ Nueva opción para fecha específica
  const [statsModal, setStatsModal] = useState({ show: false, type: '', data: [] }); // ✅ Modal para estadísticas

  const API_BASE_URL = 'http://localhost:3005/api';

  const extractKeywords = (message, subject) => {
    const keywords = new Set();
    const text = (message + ' ' + subject).toLowerCase();

    const commonTerms = [
      'problem', 'resolved', 'started', 'latency', 'gpu', 'service', 'monitor',
      'high', 'low', 'nginx', 'icmp', 'ping', 'disk', 'space', 'memory', 'cpu',
      'database', 'connection', 'timeout', 'failed', 'error', 'warning', 'critical',
      'host', 'service', 'down', 'unavailable', 'restarted', 'health', 'yellow',
      'elasticsearch', 'cdn', 'zabbix', 'agent'
    ];

    commonTerms.forEach(term => {
      if (text.includes(term)) {
        keywords.add(term);
      }
    });

    return Array.from(keywords).slice(0, 5);
  };

  // 🔥 ANALIZAR EL CONTENIDO MEJORADO CON ZONA HORARIA
  const analyzeMessage = (message, subject, created_at) => {
    if (!message) return {
      type: 'unknown',
      status: 'unknown',
      priority: 'low',
      hasError: false
    };

    const lowerMessage = message.toLowerCase();
    const lowerSubject = subject.toLowerCase();

    // 🔥 EXTRAER PROBLEM ID
    const problemIdMatch = message.match(/Original problem ID:?\s*(\d+)/i) ||
      message.match(/Problem ID:?\s*(\d+)/i) ||
      message.match(/ID:?\s*(\d+)/i);
    const problemId = problemIdMatch ? problemIdMatch[1] : null;

    // 🔥 DETECTAR ESTADO MEJORADO
    let status = 'unknown';
    if (lowerMessage.includes('resolved') || lowerMessage.includes('resuelto')) {
      status = 'resolved';
    } else if (lowerMessage.includes('started') || lowerMessage.includes('iniciado') ||
      lowerMessage.includes('began') || lowerMessage.includes('comenzó')) {
      status = 'in-progress';
    } else if (lowerMessage.includes('problem') && !lowerMessage.includes('resolved')) {
      status = 'open';
    }

    // 🔥 DETECTAR TIPO MEJORADO
    let type = 'info';
    if (lowerMessage.includes('error') || lowerMessage.includes('failed') ||
      lowerMessage.includes('falló') || lowerMessage.includes('caído') ||
      lowerSubject.includes('error') || lowerSubject.includes('failed')) {
      type = 'error';
    } else if (lowerMessage.includes('warning') || lowerMessage.includes('alerta') ||
      lowerMessage.includes('alert') || lowerSubject.includes('warning')) {
      type = 'warning';
    } else if (lowerMessage.includes('success') || lowerMessage.includes('éxito') ||
      lowerMessage.includes('completed') || lowerSubject.includes('resolved')) {
      type = 'success';
    } else if (lowerMessage.includes('started') || lowerMessage.includes('iniciado')) {
      type = 'start';
    }

    // 🔥 DETECTAR PRIORIDAD MEJORADA
    let priority = 'low';
    if (lowerMessage.includes('critical') || lowerMessage.includes('critico') ||
      lowerMessage.includes('high') || lowerMessage.includes('alto') ||
      lowerMessage.includes('emergency') || lowerMessage.includes('emergencia') ||
      lowerSubject.includes('critical') || lowerSubject.includes('high')) {
      priority = 'high';
    } else if (lowerMessage.includes('important') || lowerMessage.includes('importante') ||
      lowerMessage.includes('medium') || lowerMessage.includes('medio') ||
      lowerMessage.includes('attention') || lowerMessage.includes('atención')) {
      priority = 'medium';
    }

    // 🔥 EXTRAER INFORMACIÓN ESPECÍFICA CON COMPARACIÓN DE TIEMPO
    const hasError = lowerMessage.includes('error') || lowerMessage.includes('fail');
    const messageTime = extractMessageTime(message);

    // 🔥 EXTRAER HOST NAME
    const hostMatch = message.match(/Host:?\s*([^\r\n]+)/i);
    const host = hostMatch ? hostMatch[1].trim() : null;

    // 🔥 EXTRAER PROBLEM NAME
    const problemNameMatch = message.match(/Problem name:?\s*([^\r\n]+)/i) ||
      subject.match(/Problem:\s*([^\r\n]+)/i);
    const problemName = problemNameMatch ? problemNameMatch[1].trim() : subject;

    // 🔥 CONVERTIR FECHA UTC A LOCAL
    const localTime = convertToLocalTime(created_at);

    return {
      type,
      status,
      priority,
      hasError,
      problemId,
      problemName,
      host,
      messageTime,
      localTime,
      timezone: localTime.timezone,
      timeDiscrepancy: calculateTimeDiscrepancy(messageTime, localTime, created_at),
      keywords: extractKeywords(message, subject)
    };
  };

  // 🔥 AGRUPAR MENSAJES POR PROBLEM ID
  const groupMessagesByProblemId = (messages) => {
    const groups = {};

    messages.forEach(message => {
      const problemId = message.analysis.problemId || `no-id-${message.id}`;

      if (!groups[problemId]) {
        groups[problemId] = {
          problemId,
          problemName: message.analysis.problemName,
          host: message.analysis.host,
          messages: [],
          firstOccurrence: message.created_at,
          lastUpdate: message.created_at,
          status: message.analysis.status,
          type: message.analysis.type,
          priority: message.analysis.priority
        };
      }

      groups[problemId].messages.push(message);

      // Actualizar última actualización
      if (new Date(message.created_at) > new Date(groups[problemId].lastUpdate)) {
        groups[problemId].lastUpdate = message.created_at;
        groups[problemId].status = message.analysis.status;
      }
    });

    return groups;
  };

  // 🔥 OBTENER ICONO Y COLOR
  const getStatusIcon = (status) => {
    switch (status) {
      case 'resolved': return <CheckCircle size={16} />;
      case 'in-progress': return <PlayCircle size={16} />;
      case 'open': return <AlertTriangle size={16} />;
      default: return <MessageSquare size={16} />;
    }
  };

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

  // 🔥 FORMATO DE FECHA Y TIEMPO CON ZONA HORARIA
  const formatDateTime = (dateString) => {
    return convertToLocalTime(dateString);
  };

  // 🔥 FUNCIÓN PARA MOSTRAR MODAL DE ESTADÍSTICAS
  const showStatsModal = (type) => {
    let filteredData = [];
    let title = '';

    switch (type) {
      case 'in-progress':
        filteredData = messages.filter(m => m.analysis.status === 'in-progress');
        title = 'Eventos en Progreso';
        break;
      case 'resolved':
        filteredData = messages.filter(m => m.analysis.status === 'resolved');
        title = 'Eventos Resueltos';
        break;
      case 'today':
        const today = new Date();
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const localToday = new Date(today.toLocaleString('en-US', { timeZone: userTimezone }));
        localToday.setHours(0, 0, 0, 0);

        filteredData = messages.filter(m => {
          const msgLocalDate = new Date(m.analysis.localTime.utc);
          return msgLocalDate >= localToday;
        });
        title = 'Eventos de Hoy';
        break;
      default:
        return;
    }

    setStatsModal({
      show: true,
      type: title,
      data: filteredData
    });
  };

  // 🔥 CARGAR MENSAJES CON ZONA HORARIA
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
            analysis: analyzeMessage(msg.message, msg.subject, msg.created_at),
            timestamp: new Date(msg.created_at)
          }));

          setMessages(messagesWithAnalysis);
        } else {
          throw new Error(data.error || 'Error en la respuesta');
        }
      } catch (error) {
        console.error('Error:', error);
        setError(error.message);

        // Datos de ejemplo actualizados
        const sampleData = [
          {
            id: 1,
            subject: 'Problem: TVF Alert',
            message: 'Problem started at 16:22:25 on 2025.09.26\nProblem name: TVF Alert\nHost: Elastalerts\nSeverity: Information\nOperational data: America TV caido\nOriginal problem ID: 11865054',
            created_at: '2025-09-26T22:22:31.000Z'
          },
          {
            id: 2,
            subject: 'Resolved in 1m: RCS-207-NWC1216 GPU >= 95% por más de 45 minutos',
            message: 'Problem has been resolved at 18:56:53 on 2025.09.26\nProblem name: RCS-207-NWC1216 GPU >= 95% por más de 45 minutos\nProblem duration: 1m\nHost: RCS-207-NWC1216\nSeverity: Information\nOriginal problem ID: 11865397',
            created_at: '2025-09-27T00:56:55.000Z'
          }
        ].map(msg => ({
          ...msg,
          analysis: analyzeMessage(msg.message, msg.subject, msg.created_at),
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

  // 🔥 FILTRAR Y AGRUPAR MENSAJES CON ZONA HORARIA CORRECTA - MEJORADO
  useEffect(() => {
    let filtered = [...messages];

    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(msg =>
        msg.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.analysis.keywords.some(kw => kw.includes(searchTerm.toLowerCase())) ||
        msg.analysis.problemId?.includes(searchTerm) ||
        msg.analysis.host?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(msg => {
        if (['in-progress', 'resolved', 'open'].includes(statusFilter)) {
          return msg.analysis.status === statusFilter;
        }
        return msg.analysis.type === statusFilter;
      });
    }

    // 🔥 FILTRO POR FECHA MEJORADO (incluye fecha específica)
    if (dateFilter !== 'all') {
      const now = new Date();
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Obtener fecha actual en zona horaria del usuario
      const localNow = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
      const startOfDay = new Date(localNow);
      startOfDay.setHours(0, 0, 0, 0);

      switch (dateFilter) {
        case 'today':
          filtered = filtered.filter(msg => {
            const msgLocalDate = new Date(msg.analysis.localTime.utc);
            return msgLocalDate >= startOfDay;
          });
          break;
        case 'yesterday':
          const yesterday = new Date(startOfDay);
          yesterday.setDate(yesterday.getDate() - 1);
          filtered = filtered.filter(msg => {
            const msgLocalDate = new Date(msg.analysis.localTime.utc);
            return msgLocalDate >= yesterday && msgLocalDate < startOfDay;
          });
          break;
        case 'week':
          const startOfWeek = new Date(startOfDay);
          startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
          filtered = filtered.filter(msg => {
            const msgLocalDate = new Date(msg.analysis.localTime.utc);
            return msgLocalDate >= startOfWeek;
          });
          break;
        case 'specific':
          if (customDate) {
            const selectedDate = new Date(customDate);
            selectedDate.setHours(0, 0, 0, 0);
            const nextDay = new Date(selectedDate);
            nextDay.setDate(nextDay.getDate() + 1);

            filtered = filtered.filter(msg => {
              const msgLocalDate = new Date(msg.analysis.localTime.utc);
              return msgLocalDate >= selectedDate && msgLocalDate < nextDay;
            });
          }
          break;
      }
    }

    setFilteredMessages(filtered);

    // Agrupar mensajes si está activado
    if (groupByProblemId) {
      setGroupedMessages(groupMessagesByProblemId(filtered));
    }
  }, [messages, searchTerm, statusFilter, dateFilter, groupByProblemId, customDate]);

  // 🔥 COMPONENTE DE TARJETA DE MENSAJE INDIVIDUAL ACTUALIZADO
  const MessageCard = ({ message }) => {
    const datetime = formatDateTime(message.created_at);

    return (
      <div className={`card h-100 shadow-sm border-start border-${getStatusColor(message.analysis.status)} border-4`}>
        <div className="card-header bg-transparent border-0 pb-0">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <div className="d-flex align-items-center">
              <span className={`text-${getStatusColor(message.analysis.status)} me-2`}>
                {getStatusIcon(message.analysis.status)}
              </span>
              <small className="text-warning">
                Fecha: {datetime.date}
                <br />
                Hora Local ARG: {message.analysis.messageTime?.time || 'N/A'}
              </small>
            </div>
            <div className="d-flex gap-1">
              {message.analysis.problemId && (
                <span className="badge bg-dark">
                  <Hash size={10} className="me-1" />
                  {message.analysis.problemId}
                </span>
              )}
              {message.analysis.priority !== 'low' && (
                <span className={`badge bg-${getPriorityColor(message.analysis.priority)}`}>
                  {message.analysis.priority}
                </span>
              )}
            </div>
          </div>

          <h6 className="card-title mb-2" title={message.subject}>
            {message.analysis.problemName || message.subject}
          </h6>

          {message.analysis.host && (
            <div className="mb-2">
              <small className="text-muted">
                <Server size={12} className="me-1" />
                {message.analysis.host}
              </small>
            </div>
          )}

          {/* 🔥 MOSTRAR COMPARACIÓN DE TIEMPO */}
          {message.analysis.timeDiscrepancy && (
            <div className="mb-2">
              <p>Hora Sistema (Local)</p>
              <small className="text-muted">{datetime.time}</small>
            </div>
          )}
        </div>

        <div className="card-body py-2">
          <p className="card-text small text-muted" title={message.message}>
            {message.message.length > 120 ? message.message.substring(0, 120) + '...' : message.message}
          </p>

          {message.analysis.keywords.length > 0 && (
            <div className="mt-2">
              {message.analysis.keywords.map((keyword, idx) => (
                <span key={idx} className="badge bg-light text-dark me-1 mb-1 small">
                  #{keyword}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="card-footer bg-transparent border-0 pt-0">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <small className="text-muted">
                {datetime.date} • {getStatusText(message.analysis.status)}
              </small>
              <br />
              <small className="text-muted" title={`Zona horaria: ${datetime.timezone}`}>
                📍 {datetime.timezone}
              </small>
            </div>
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => setSelectedMessage(message)}
            >
              <Eye size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 🔥 COMPONENTE DE GRUPO POR PROBLEM ID ACTUALIZADO
  const ProblemGroupCard = ({ group }) => {
    const lastMessage = group.messages[group.messages.length - 1];
    const datetime = formatDateTime(group.lastUpdate);
    const messageCount = group.messages.length;

    return (
      <div className={`card shadow-sm border-start border-${getStatusColor(group.status)} border-4`}>
        <div className="card-header bg-transparent border-0">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <div className="d-flex align-items-center">
              <span className={`text-${getStatusColor(group.status)} me-2`}>
                {getStatusIcon(group.status)}
              </span>
              <span className={`badge bg-${getStatusColor(group.status)} me-2`}>
                {getStatusText(group.status)}
              </span>
              <span className="badge bg-dark">
                <Hash size={10} className="me-1" />
                {group.problemId}
              </span>
            </div>
            <span className="badge bg-primary">
              {messageCount} evento{messageCount > 1 ? 's' : ''}
            </span>
          </div>

          <h6 className="card-title mb-1">{group.problemName}</h6>

          {group.host && (
            <div className="mb-2">
              <small className="text-muted">
                <Server size={12} className="me-1" />
                {group.host}
              </small>
            </div>
          )}
        </div>

        <div className="card-body">
          <div className="timeline-simple">
            {group.messages.slice(-3).map((message, index) => (
              <div key={message.id} className="timeline-item">
                <div className="timeline-marker"></div>
                <div className="timeline-content">
                  <small className="text-muted">
                    {formatDateTime(message.created_at).time} • {getStatusText(message.analysis.status)}
                  </small>
                  <p className="small mb-1">{message.message.substring(0, 80)}...</p>
                </div>
              </div>
            ))}
          </div>

          {group.messages.length > 3 && (
            <div className="text-center mt-2">
              <small className="text-muted">
                +{group.messages.length - 3} eventos más
              </small>
            </div>
          )}
        </div>

        <div className="card-footer bg-transparent border-0">
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">
              Última actualización: {datetime.full}
              <br />
              <small>Zona: {datetime.timezone}</small>
            </small>
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => setSelectedMessage(lastMessage)}
            >
              <Eye size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 🔥 ESTADÍSTICAS MEJORADAS
  const stats = {
    total: messages.length,
    uniqueProblems: Object.keys(groupMessagesByProblemId(messages)).length,
    inProgress: messages.filter(m => m.analysis.status === 'in-progress').length,
    resolved: messages.filter(m => m.analysis.status === 'resolved').length,
    open: messages.filter(m => m.analysis.status === 'resolved').length - messages.filter(m => m.analysis.status === 'in-progress').length,
    error: messages.filter(m => m.analysis.type === 'error').length,
    warning: messages.filter(m => m.analysis.type === 'warning').length,
    today: messages.filter(m => {
      const today = new Date();
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const localToday = new Date(today.toLocaleString('en-US', { timeZone: userTimezone }));
      localToday.setHours(0, 0, 0, 0);

      const msgLocalDate = new Date(m.analysis.localTime.utc);
      return msgLocalDate >= localToday;
    }).length
  };

  // 🔥 FUNCIÓN PARA COPIAR TEXTO
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Texto copiado al portapapeles');
    } catch (err) {
      console.error('Error al copiar: ', err);
    }
  };

  // 🔥 MODAL DE ESTADÍSTICAS
  const StatsModal = () => {
    if (!statsModal.show) return null;

    return (
      <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-xl">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                {statsModal.type} ({statsModal.data.length} eventos)
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setStatsModal({ show: false, type: '', data: [] })}
              ></button>
            </div>
            <div className="modal-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Problem ID</th>
                      <th>Estado</th>
                      <th>Problema</th>
                      <th>Host</th>
                      <th>Fecha</th>
                      <th>Hora Mensaje</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statsModal.data.map(message => {
                      const datetime = formatDateTime(message.created_at);
                      return (
                        <tr key={message.id}>
                          <td>
                            {message.analysis.problemId ? (
                              <span className="badge bg-dark">
                                <Hash size={10} className="me-1" />
                                {message.analysis.problemId}
                              </span>
                            ) : (
                              <span className="text-muted">N/A</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge bg-${getStatusColor(message.analysis.status)}`}>
                              {getStatusText(message.analysis.status)}
                            </span>
                          </td>
                          <td>
                            <div className="text-truncate" style={{ maxWidth: '200px' }}
                              title={message.analysis.problemName}>
                              {message.analysis.problemName}
                            </div>
                          </td>
                          <td>
                            <small>{message.analysis.host || 'N/A'}</small>
                          </td>
                          <td>
                            <small>{datetime.date}</small>
                          </td>
                          <td>
                            <small>{message.analysis.messageTime?.time || 'N/A'}</small>
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => setSelectedMessage(message)}
                            >
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-primary"
                onClick={() => setStatsModal({ show: false, type: '', data: [] })}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
                    <Database className="me-2 text-primary" />
                    Visualizador de Mensajes
                  </h1>
                  <p className="text-muted mb-0">
                    {groupByProblemId ?
                      `${Object.keys(groupedMessages).length} problemas únicos detectados` :
                      `${messages.length} mensajes del sistema`
                    }
                    <br />
                    <small>Zona horaria: {selectedTimezone}</small>
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
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={groupByProblemId}
                      onChange={(e) => setGroupByProblemId(e.target.checked)}
                    />
                    <label className="form-check-label small">Agrupar por Problem ID</label>
                  </div>
                  <button
                    className="btn btn-outline-primary"
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw size={16} className="me-1" />
                    Actualizar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ESTADÍSTICAS MEJORADAS CON CLICK */}
      <div className="row mb-4">
        <div className="col-md-2">
          <div 
            className="card bg-primary text-white clickable-card" 
            style={{ cursor: 'pointer' }}
            onClick={() => showStatsModal('unique-problems')}
          >
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h4>{stats.uniqueProblems}</h4>
                  <span>Problemas Únicos</span>
                </div>
                <Hash size={24} />
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div 
            className="card bg-warning text-white clickable-card" 
            style={{ cursor: 'pointer' }}
            onClick={() => showStatsModal('in-progress')}
          >
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h4>{stats.inProgress}</h4>
                  <span>En Progreso</span>
                </div>
                <PlayCircle size={24} />
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div 
            className="card bg-success text-white clickable-card" 
            style={{ cursor: 'pointer' }}
            onClick={() => showStatsModal('resolved')}
          >
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h4>{stats.resolved}</h4>
                  <span>Resueltos</span>
                </div>
                <CheckCircle size={24} />
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div 
            className="card bg-danger text-white clickable-card" 
            style={{ cursor: 'pointer' }}
            onClick={() => showStatsModal('open')}
          >
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h4>{stats.open}</h4>
                  <span>Abiertos</span>
                </div>
                <AlertTriangle size={24} />
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div 
            className="card bg-info text-white clickable-card" 
            style={{ cursor: 'pointer' }}
            onClick={() => showStatsModal('today')}
          >
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h4>{stats.today}</h4>
                  <span>Hoy</span>
                </div>
                <Calendar size={24} />
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div 
            className="card bg-secondary text-white clickable-card" 
            style={{ cursor: 'pointer' }}
            onClick={() => showStatsModal('all')}
          >
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h4>{stats.total}</h4>
                  <span>Total Eventos</span>
                </div>
                <Database size={24} />
              </div>
            </div>
            
          </div>
        </div>
      </div>

      {/* FILTROS Y CONTROLES MEJORADOS */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h6 className="mb-0">Filtros y Búsqueda</h6>
              <div className="d-flex gap-2">
                <div className="btn-group">
                  <button
                    className={`btn btn-sm ${viewMode === 'cards' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setViewMode('cards')}
                  >
                    <Grid size={14} />
                  </button>
                  <button
                    className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setViewMode('list')}
                  >
                    <List size={14} />
                  </button>
                </div>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter size={14} className="me-1" />
                  {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
            </div>

            <div className="card-body">
              {/* BÚSQUEDA PRINCIPAL */}
              <div className="row mb-3">
                <div className="col-md-6">
                  <div className="input-group">
                    <span className="input-group-text">
                      <Search size={16} />
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Buscar por problema, host, ID, mensaje..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-3">
                  <select
                    className="form-select"
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  >
                    <option value={10}>10 por página</option>
                    <option value={20}>20 por página</option>
                    <option value={50}>50 por página</option>
                    <option value={100}>100 por página</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <select
                    className="form-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">Todos los estados</option>
                    <option value="in-progress">En Progreso</option>
                    <option value="resolved">Resueltos</option>
                    <option value="open">Abiertos</option>
                    <option value="error">Errores</option>
                    <option value="warning">Advertencias</option>
                  </select>
                </div>
              </div>

              {/* FILTROS AVANZADOS */}
              {showFilters && (
                <div className="row">
                  <div className="col-md-4">
                    <label className="form-label small">Filtro por fecha</label>
                    <select
                      className="form-select"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                    >
                      <option value="today">Hoy</option>
                      <option value="yesterday">Ayer</option>
                      <option value="week">Esta semana</option>
                      <option value="specific">Fecha específica</option>
                      <option value="all">Todas las fechas</option>
                    </select>
                  </div>

                  {dateFilter === 'specific' && (
                    <div className="col-md-4">
                      <label className="form-label small">Seleccionar fecha</label>
                      <input
                        type="date"
                        className="form-control"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="col-md-4">
                    <label className="form-label small">Zona horaria</label>
                    <select
                      className="form-select"
                      value={selectedTimezone}
                      onChange={(e) => setSelectedTimezone(e.target.value)}
                    >
                      <option value="America/Argentina/Buenos_Aires">Argentina (Buenos Aires)</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">New York (EST)</option>
                      <option value="Europe/London">London (GMT)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RESULTADOS */}
      <div className="row">
        <div className="col-12">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
              <p className="mt-2 text-muted">Cargando mensajes...</p>
            </div>
          ) : error ? (
            <div className="alert alert-warning">
              <AlertTriangle className="me-2" />
              {error}
            </div>
          ) : (
            <>
              {/* VISTA DE TARJETAS */}
              {viewMode === 'cards' && (
                <div className="row g-3">
                  {groupByProblemId ? (
                    Object.values(groupedMessages).length > 0 ? (
                      Object.values(groupedMessages).slice(0, itemsPerPage).map(group => (
                        <div key={group.problemId} className="col-xl-4 col-lg-6 col-md-6">
                          <ProblemGroupCard group={group} />
                        </div>
                      ))
                    ) : (
                      <div className="col-12 text-center py-5">
                        <MessageSquare size={48} className="text-muted mb-3" />
                        <h5>No se encontraron problemas</h5>
                        <p className="text-muted">Intenta ajustar los filtros</p>
                      </div>
                    )
                  ) : filteredMessages.length > 0 ? (
                    filteredMessages.slice(0, itemsPerPage).map(message => (
                      <div key={message.id} className="col-xl-4 col-lg-6 col-md-6">
                        <MessageCard message={message} />
                      </div>
                    ))
                  ) : (
                    <div className="col-12 text-center py-5">
                      <MessageSquare size={48} className="text-muted mb-3" />
                      <h5>No se encontraron mensajes</h5>
                      <p className="text-muted">Intenta ajustar los filtros de búsqueda</p>
                    </div>
                  )}
                </div>
              )}

              {/* VISTA DE LISTA */}
              {viewMode === 'list' && (
                <div className="card shadow-sm">
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Estado</th>
                            <th>Problem ID</th>
                            <th>Problema</th>
                            <th>Host</th>
                            <th>Fecha</th>
                            <th>Hora Mensaje</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredMessages.slice(0, itemsPerPage).map(message => {
                            const datetime = formatDateTime(message.created_at);
                            return (
                              <tr key={message.id}>
                                <td>
                                  <span className={`badge bg-${getStatusColor(message.analysis.status)}`}>
                                    {getStatusText(message.analysis.status)}
                                  </span>
                                </td>
                                <td>
                                  {message.analysis.problemId ? (
                                    <span className="badge bg-dark">
                                      <Hash size={10} className="me-1" />
                                      {message.analysis.problemId}
                                    </span>
                                  ) : (
                                    <span className="text-muted">N/A</span>
                                  )}
                                </td>
                                <td>
                                  <div className="text-truncate" style={{ maxWidth: '200px' }}
                                    title={message.analysis.problemName}>
                                    {message.analysis.problemName}
                                  </div>
                                </td>
                                <td>
                                  <small>{message.analysis.host || 'N/A'}</small>
                                </td>
                                <td>
                                  <small>{datetime.date}</small>
                                </td>
                                <td>
                                  <small>{message.analysis.messageTime?.time || 'N/A'}</small>
                                </td>
                                <td>
                                  <button
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={() => setSelectedMessage(message)}
                                  >
                                    <Eye size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* PAGINACIÓN */}
              {filteredMessages.length > itemsPerPage && (
                <div className="row mt-4">
                  <div className="col-12">
                    <nav>
                      <ul className="pagination justify-content-center">
                        <li className="page-item disabled">
                          <span className="page-link">Anterior</span>
                        </li>
                        <li className="page-item active">
                          <span className="page-link">1</span>
                        </li>
                        <li className="page-item">
                          <span className="page-link">Siguiente</span>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* MODAL DE DETALLE */}
      {selectedMessage && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Detalle del Mensaje
                  {selectedMessage.analysis.problemId && (
                    <span className="badge bg-dark ms-2">
                      <Hash size={12} className="me-1" />
                      {selectedMessage.analysis.problemId}
                    </span>
                  )}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedMessage(null)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>Información Principal</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td><strong>Asunto:</strong></td>
                          <td>{selectedMessage.subject}</td>
                        </tr>
                        <tr>
                          <td><strong>Problema:</strong></td>
                          <td>{selectedMessage.analysis.problemName}</td>
                        </tr>
                        <tr>
                          <td><strong>Host:</strong></td>
                          <td>{selectedMessage.analysis.host || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>Estado:</strong></td>
                          <td>
                            <span className={`badge bg-${getStatusColor(selectedMessage.analysis.status)}`}>
                              {getStatusText(selectedMessage.analysis.status)}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Prioridad:</strong></td>
                          <td>
                            <span className={`badge bg-${getPriorityColor(selectedMessage.analysis.priority)}`}>
                              {selectedMessage.analysis.priority}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6>Información de Tiempo</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td><strong>Fecha UTC:</strong></td>
                          <td>{selectedMessage.created_at}</td>
                        </tr>
                        <tr>
                          <td><strong>Fecha Local:</strong></td>
                          <td>{formatDateTime(selectedMessage.created_at).full}</td>
                        </tr>
                        <tr>
                          <td><strong>Zona Horaria:</strong></td>
                          <td>{formatDateTime(selectedMessage.created_at).timezone}</td>
                        </tr>
                        {selectedMessage.analysis.messageTime && (
                          <tr>
                            <td><strong>Hora en Mensaje:</strong></td>
                            <td>{selectedMessage.analysis.messageTime.full}</td>
                          </tr>
                        )}
                        {selectedMessage.analysis.timeDiscrepancy && (
                          <tr>
                            <td><strong>Diferencia:</strong></td>
                            <td>
                              <span className="text-warning">
                                {selectedMessage.analysis.timeDiscrepancy.hours} horas
                              </span>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <h6 className="mt-4">Mensaje Completo</h6>
                <div className="card bg-light">
                  <div className="card-body">
                    <pre className="mb-0 small" style={{ whiteSpace: 'pre-wrap' }}>
                      {selectedMessage.message}
                    </pre>
                  </div>
                </div>

                {selectedMessage.analysis.keywords.length > 0 && (
                  <div className="mt-3">
                    <h6>Palabras Clave</h6>
                    <div>
                      {selectedMessage.analysis.keywords.map((keyword, idx) => (
                        <span key={idx} className="badge bg-light text-dark me-1">
                          #{keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => copyToClipboard(selectedMessage.message)}
                >
                  <Copy size={14} className="me-1" />
                  Copiar Mensaje
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => setSelectedMessage(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ESTADÍSTICAS */}
      <StatsModal />

      {/* FOOTER */}
      <div className="row mt-5">
        <div className="col-12 text-center">
          <p className="text-muted small">
            Sistema de Monitoreo • Zona horaria: {selectedTimezone} • 
            {autoRefresh && <span className="text-success ms-2"><Zap size={12} className="me-1" />Auto-refresh activo</span>}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MessageViewer;