import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Save, X, AlertCircle, 
  CheckCircle, Activity, FileText, Server, Monitor, Ticket,
  Filter, Search, Calendar, Clock, ChevronLeft, ChevronRight,
  Calendar as CalendarIcon, Table, Grid
} from 'lucide-react';

const TicketManager = () => {
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [allTickets, setAllTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });

  const API_BASE_URL = 'http://localhost:3005/api';

  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    created_at: new Date().toISOString().slice(0, 16).replace('T', ' ')
  });

  // 🔥 FUNCIONES AUXILIARES MEJORADAS
  const formatDateToInput = (date) => {
    return date.toISOString().split('T')[0];
  };

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
      case 'all':
      default:
        return { start: null, end: null };
    }
  };

  const applyDateFilter = (ticketList) => {
    if (dateFilter === 'all') {
      return ticketList;
    }

    const dateRange = getDateRange();
    if (!dateRange.start) return ticketList;

    return ticketList.filter(ticket => {
      const ticketDate = new Date(ticket.created_at);
      return ticketDate >= dateRange.start && ticketDate < dateRange.end;
    });
  };

  const getDateFilterText = () => {
    const dateRange = getDateRange();
    
    switch (dateFilter) {
      case 'today': return `Hoy (${formatDateToInput(dateRange.start)})`;
      case 'yesterday': return `Ayer (${formatDateToInput(dateRange.start)})`;
      case 'thisWeek': return 'Esta semana';
      case 'lastWeek': return 'Semana pasada';
      case 'thisMonth': return 'Este mes';
      case 'lastMonth': return 'Mes pasado';
      case 'custom':
        if (customStartDate && customEndDate) {
          return `Personalizado (${customStartDate} a ${customEndDate})`;
        }
        return 'Personalizado';
      case 'all': return 'Todos los tiempos';
      default: return 'Seleccionar fecha';
    }
  };

  const applyAllFilters = () => {
    let filtered = [...allTickets];
    
    filtered = applyDateFilter(filtered);
    
    if (searchTerm) {
      filtered = filtered.filter(ticket =>
        ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.id?.toString().includes(searchTerm)
      );
    }
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(ticket => {
        const message = ticket.message?.toLowerCase() || '';
        if (typeFilter === 'resolved') return message.includes('resolved');
        if (typeFilter === 'started') return message.includes('started');
        return true;
      });
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => {
        const status = getStatusFromMessage(ticket.message);
        if (statusFilter === 'open') return status === 'Open';
        if (statusFilter === 'progress') return status === 'In Progress';
        if (statusFilter === 'resolved') return status === 'Resolved';
        return true;
      });
    }
    
    setFilteredTickets(filtered);
  };

  // 🔥 EFFECTS MEJORADOS
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${API_BASE_URL}/tickets?page=${pagination.page}&limit=${pagination.limit}`
        );
        
        if (!response.ok) throw new Error('Error al cargar los tickets');
        
        const data = await response.json();
        
        if (data.success) {
          setTickets(data.data);
          setAllTickets(data.data);
          setFilteredTickets(data.data);
          setPagination(prev => ({
            ...prev,
            total: data.pagination.total,
            totalPages: data.pagination.totalPages
          }));
        } else {
          throw new Error(data.error || 'Error en la respuesta del servidor');
        }
      } catch (error) {
        console.error('Error:', error);
        setError(error.message);
        
        const fallbackData = [
          {
            id: 1,
            subject: 'Delivery latency is too high (over 100ms for 5m)',
            message: 'Problem has been resolved at 12:15:47 on 2025.09.15',
            created_at: '2025-09-15 15:15:50'
          },
          {
            id: 2,
            subject: 'GPU >= 95% por más de 45 minutos',
            message: 'Problem started at 12:42:53 on 2025.09.15',
            created_at: '2025-09-15 15:42:57'
          }
        ];
        setTickets(fallbackData);
        setAllTickets(fallbackData);
        setFilteredTickets(fallbackData);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    applyAllFilters();
  }, [allTickets, searchTerm, typeFilter, statusFilter, dateFilter, customStartDate, customEndDate]);

  useEffect(() => {
    const today = formatDateToInput(new Date());
    setCustomStartDate(today);
    setCustomEndDate(today);
  }, []);

  useEffect(() => {
    if (filteredTickets.length > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [pagination.page]);

  useEffect(() => {
    const filters = { searchTerm, typeFilter, statusFilter, dateFilter };
    localStorage.setItem('ticketManagerFilters', JSON.stringify(filters));
  }, [searchTerm, typeFilter, statusFilter, dateFilter]);

  useEffect(() => {
    const savedFilters = localStorage.getItem('ticketManagerFilters');
    if (savedFilters) {
      const filters = JSON.parse(savedFilters);
      setSearchTerm(filters.searchTerm || '');
      setTypeFilter(filters.typeFilter || 'all');
      setStatusFilter(filters.statusFilter || 'all');
      setDateFilter(filters.dateFilter || 'all');
    }
  }, []);

  // 🔥 FUNCIONES PRINCIPALES
  const nextPage = () => {
    if (pagination.page < pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: prev.page + 1 }));
    }
  };

  const prevPage = () => {
    if (pagination.page > 1) {
      setPagination(prev => ({ ...prev, page: prev.page - 1 }));
    }
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      subject: '',
      message: '',
      created_at: new Date().toISOString().slice(0, 16).replace('T', ' ')
    });
    setEditingTicket(null);
    setShowForm(false);
  };

  const handleCreateTicket = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEditTicket = (ticket) => {
    setFormData({
      subject: ticket.subject,
      message: ticket.message,
      created_at: ticket.created_at.replace(' ', 'T').slice(0, 16)
    });
    setEditingTicket(ticket.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const url = editingTicket 
        ? `${API_BASE_URL}/tickets/${editingTicket}`
        : `${API_BASE_URL}/tickets`;
      
      const method = editingTicket ? 'PUT' : 'POST';
      
      const submissionData = {
        ...formData,
        created_at: formData.created_at.replace('T', ' ')
      };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al guardar el ticket');
      }
      
      if (result.success) {
        const ticketsResponse = await fetch(`${API_BASE_URL}/tickets`);
        const ticketsData = await ticketsResponse.json();
        
        if (ticketsData.success) {
          setTickets(ticketsData.data);
          setAllTickets(ticketsData.data);
        }
        
        resetForm();
        alert(editingTicket ? 'Ticket actualizado correctamente' : 'Ticket creado correctamente');
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTicket = async (id) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/tickets/${id}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al eliminar el ticket');
      }
      
      if (result.success) {
        setTickets(prev => prev.filter(ticket => ticket.id !== id));
        setAllTickets(prev => prev.filter(ticket => ticket.id !== id));
        setDeleteConfirm(null);
        alert('Ticket eliminado correctamente');
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 FUNCIONES DE PRESENTACIÓN MEJORADAS
  const getStatusFromMessage = (message) => {
    if (!message) return 'Unknown';
    if (message.toLowerCase().includes('resolved')) return 'Resolved';
    if (message.toLowerCase().includes('started')) return 'In Progress';
    return 'Open';
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Resolved': return 'text-success';
      case 'In Progress': return 'text-warning';
      case 'Open': return 'text-danger';
      default: return 'text-secondary';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Resolved': return 'bg-success';
      case 'In Progress': return 'bg-warning';
      case 'Open': return 'bg-danger';
      default: return 'bg-secondary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Resolved': return '✅';
      case 'In Progress': return '🔄';
      case 'Open': return '⚠️';
      default: return '📋';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Resolved': return 'success';
      case 'In Progress': return 'warning';
      case 'Open': return 'danger';
      default: return 'secondary';
    }
  };

  const getPlatformFromSubject = (subject) => {
    if (!subject) return 'Unknown';
    if (subject.includes('GPU')) return 'Platform';
    if (subject.includes('latency')) return 'Delivery';
    if (subject.includes('service')) return 'Start';
    return 'General';
  };

  const getPlatformBadge = (platform) => {
    switch (platform) {
      case 'Start': return 'bg-primary';
      case 'Platform': return 'bg-info';
      case 'Delivery': return 'bg-success';
      default: return 'bg-secondary';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const extractMessageInfo = (message) => {
    if (!message) return { type: 'Unknown', time: '' };
    
    if (message.includes('resolved')) {
      return { type: 'Resolved', time: message.match(/\d{2}:\d{2}:\d{2}/)?.[0] || '' };
    }
    if (message.includes('started')) {
      return { type: 'Incident', time: message.match(/\d{2}:\d{2}:\d{2}/)?.[0] || '' };
    }
    
    return { type: 'Problem', time: '' };
  };

  // 🔥 COMPONENTE DE PAGINACIÓN MEJORADO
  const PaginationControls = () => {
    const maxPagesToShow = 5;
    const startPage = Math.max(1, pagination.page - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(pagination.totalPages, startPage + maxPagesToShow - 1);
    
    const pageNumbers = [];
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
        <div>
          <small className="text-muted">
            📊 Mostrando <strong>{(pagination.page - 1) * pagination.limit + 1}</strong> -{' '}
            <strong>{Math.min(pagination.page * pagination.limit, pagination.total)}</strong> de{' '}
            <strong>{pagination.total.toLocaleString()}</strong> tickets
          </small>
        </div>
        
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-outline-primary btn-sm rounded-pill"
            onClick={prevPage}
            disabled={pagination.page === 1 || loading}
          >
            <ChevronLeft size={14} />
            Anterior
          </button>
          
          <div className="d-flex gap-1">
            {pageNumbers.map(page => (
              <button
                key={page}
                className={`btn btn-sm rounded-pill ${
                  pagination.page === page ? 'btn-primary' : 'btn-outline-primary'
                }`}
                onClick={() => goToPage(page)}
                disabled={loading}
              >
                {page}
              </button>
            ))}
          </div>
          
          <button
            className="btn btn-outline-primary btn-sm rounded-pill"
            onClick={nextPage}
            disabled={pagination.page === pagination.totalPages || loading}
          >
            Siguiente
            <ChevronRight size={14} />
          </button>
        </div>
        
        <div>
          <select 
            className="form-select form-select-sm"
            value={pagination.limit}
            onChange={(e) => setPagination(prev => ({ 
              ...prev, 
              limit: parseInt(e.target.value),
              page: 1 
            }))}
          >
            <option value="10">10 por página</option>
            <option value="20">20 por página</option>
            <option value="50">50 por página</option>
            <option value="100">100 por página</option>
          </select>
        </div>
      </div>
    );
  };

  return (
    <div className="container-fluid py-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {/* 🔥 HEADER MEJORADO */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card shadow-sm border-0">
            <div className="card-body py-3">
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  <div className="bg-primary rounded-circle p-2 me-3">
                    <Activity size={24} className="text-white" />
                  </div>
                  <div>
                    <h1 className="h4 mb-0">Gestión de Alertas/Tickets</h1>
                    <p className="text-muted mb-0 small">
                      Sistema de monitoreo en tiempo real
                      {loading && <span className="ms-2 badge bg-warning">Sincronizando...</span>}
                    </p>
                  </div>
                </div>
                
                <div className="d-flex align-items-center gap-3">
                  <div className="text-end">
                    <div className="d-flex align-items-center gap-2">
                      <div className={`badge bg-${loading ? 'warning' : 'success'} rounded-pill`}>
                        <div className={`spinner-border spinner-border-sm me-1 ${loading ? '' : 'd-none'}`}></div>
                        {loading ? 'Conectando...' : 'En línea'}
                      </div>
                      <small className="text-muted">
                        {filteredTickets.length} de {allTickets.length} alertas
                      </small>
                    </div>
                    <small className="text-muted">
                      Actualizado: {new Date().toLocaleTimeString('es-ES')}
                    </small>
                  </div>
                  
                  <button 
                    className="btn btn-primary d-flex align-items-center shadow"
                    onClick={handleCreateTicket}
                    disabled={loading}
                  >
                    <Plus size={16} className="me-1" />
                    Nueva Alerta
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🔥 FILTROS MEJORADOS */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center py-3">
              <h6 className="mb-0 d-flex align-items-center">
                <Filter className="me-2" size={20} />
                Filtros y Búsqueda
              </h6>
              <div className="d-flex align-items-center gap-2">
                <button 
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => {
                    setSearchTerm('');
                    setTypeFilter('all');
                    setStatusFilter('all');
                    setDateFilter('all');
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }}
                >
                  Limpiar Filtros
                </button>
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => setShowDateFilter(!showDateFilter)}
                >
                  <CalendarIcon size={14} className="me-1" />
                  {showDateFilter ? 'Ocultar' : 'Fechas'}
                </button>
              </div>
            </div>
            
            <div className="card-body">
              {/* Búsqueda rápida */}
              <div className="row mb-3">
                <div className="col-12">
                  <label className="form-label d-flex align-items-center">
                    <Search size={16} className="me-2" />
                    Búsqueda rápida
                  </label>
                  <div className="input-group input-group-lg">
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Buscar en subject, mensaje o ID..."
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button 
                        className="btn btn-outline-secondary" 
                        type="button"
                        onClick={() => setSearchTerm('')}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Filtros en línea */}
              <div className="row g-3">
                <div className="col-md-3">
                  <label className="form-label">Tipo de Evento</label>
                  <select 
                    className="form-select" 
                    value={typeFilter} 
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <option value="all">📋 Todos los eventos</option>
                    <option value="resolved">✅ Resueltos</option>
                    <option value="started">🔄 En progreso</option>
                  </select>
                </div>
                
                <div className="col-md-3">
                  <label className="form-label">Estado</label>
                  <select 
                    className="form-select" 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">📊 Todos los estados</option>
                    <option value="open">🔴 Abiertos</option>
                    <option value="progress">🟡 En progreso</option>
                    <option value="resolved">🟢 Resueltos</option>
                  </select>
                </div>
                
                <div className="col-md-3">
                  <label className="form-label">Ordenar por</label>
                  <select className="form-select">
                    <option value="newest">📅 Más recientes primero</option>
                    <option value="oldest">📅 Más antiguos primero</option>
                    <option value="priority">⚠️ Por prioridad</option>
                  </select>
                </div>

                <div className="col-md-3">
                  <label className="form-label">Items por página</label>
                  <select 
                    className="form-select"
                    value={pagination.limit}
                    onChange={(e) => setPagination(prev => ({ 
                      ...prev, 
                      limit: parseInt(e.target.value),
                      page: 1 
                    }))}
                  >
                    <option value="10">10 items</option>
                    <option value="20">20 items</option>
                    <option value="50">50 items</option>
                    <option value="100">100 items</option>
                  </select>
                </div>
              </div>

              {/* Filtros de fecha expandibles */}
              {showDateFilter && (
                <div className="mt-4 p-3 bg-light rounded">
                  <h6 className="d-flex align-items-center mb-3">
                    <CalendarIcon className="me-2" size={16} />
                    Filtro por Fecha
                  </h6>
                  
                  <div className="row g-3 align-items-end">
                    <div className="col-md-3">
                      <label className="form-label">Rango predefinido</label>
                      <select 
                        className="form-select"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                      >
                        <option value="all">🗓️ Todos los tiempos</option>
                        <option value="today">📅 Hoy</option>
                        <option value="yesterday">📅 Ayer</option>
                        <option value="thisWeek">📅 Esta semana</option>
                        <option value="lastWeek">📅 Semana pasada</option>
                        <option value="thisMonth">📅 Este mes</option>
                        <option value="lastMonth">📅 Mes pasado</option>
                        <option value="custom">⏰ Personalizado</option>
                      </select>
                    </div>

                    {dateFilter === 'custom' && (
                      <>
                        <div className="col-md-3">
                          <label className="form-label">Fecha inicio</label>
                          <input
                            type="date"
                            className="form-control"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                          />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label">Fecha fin</label>
                          <input
                            type="date"
                            className="form-control"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                          />
                        </div>
                      </>
                    )}

                    <div className="col-md-3">
                      <div className="d-grid">
                        <button className="btn btn-primary" onClick={applyAllFilters}>
                          <Filter size={14} className="me-1" />
                          Aplicar Filtros
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Resumen de filtros activos */}
                  <div className="mt-3">
                    <div className="d-flex flex-wrap gap-2">
                      {searchTerm && (
                        <span className="badge bg-primary">
                          Búsqueda: "{searchTerm}" 
                          <X size={12} className="ms-1 cursor-pointer" onClick={() => setSearchTerm('')} />
                        </span>
                      )}
                      {typeFilter !== 'all' && (
                        <span className="badge bg-info">
                          Tipo: {typeFilter === 'resolved' ? 'Resueltos' : 'Iniciados'}
                          <X size={12} className="ms-1 cursor-pointer" onClick={() => setTypeFilter('all')} />
                        </span>
                      )}
                      {statusFilter !== 'all' && (
                        <span className="badge bg-warning">
                          Estado: {statusFilter === 'open' ? 'Abiertos' : statusFilter === 'progress' ? 'En progreso' : 'Resueltos'}
                          <X size={12} className="ms-1 cursor-pointer" onClick={() => setStatusFilter('all')} />
                        </span>
                      )}
                      {dateFilter !== 'all' && (
                        <span className="badge bg-success">
                          Fecha: {getDateFilterText()}
                          <X size={12} className="ms-1 cursor-pointer" onClick={() => setDateFilter('all')} />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 🔥 FORMULARIO (se mantiene igual) */}
      {showForm && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  {editingTicket ? 'Editar Alerta' : 'Crear Nueva Alerta'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={resetForm}
                  disabled={loading}
                ></button>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="row g-3">
                    <div className="col-12">
                      <label htmlFor="subject" className="form-label">Subject *</label>
                      <input
                        type="text"
                        className="form-control"
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        required
                        placeholder="Ej: Delivery latency is too high (over 100ms for 5m)"
                      />
                    </div>
                    
                    <div className="col-12">
                      <label htmlFor="message" className="form-label">Message *</label>
                      <textarea
                        className="form-control"
                        id="message"
                        name="message"
                        rows="3"
                        value={formData.message}
                        onChange={handleInputChange}
                        required
                        placeholder="Ej: Problem has been resolved at 12:15:47 on 2025.09.15"
                      />
                    </div>
                    
                    <div className="col-md-6">
                      <label htmlFor="created_at" className="form-label">Fecha Creación</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        id="created_at"
                        name="created_at"
                        value={formData.created_at}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div className="col-12">
                      <div className="d-flex gap-2 justify-content-end">
                        <button 
                          type="button" 
                          className="btn btn-secondary"
                          onClick={resetForm}
                          disabled={loading}
                        >
                          <X size={16} className="me-1" />
                          Cancelar
                        </button>
                        <button 
                          type="submit" 
                          className="btn btn-primary"
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-1" />
                              Guardando...
                            </>
                          ) : (
                            <>
                              <Save size={16} className="me-1" />
                              {editingTicket ? 'Actualizar' : 'Crear'} Alerta
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 TABLA MEJORADA */}
      <div className="row">
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-header d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <FileText className="me-2" size={20} />
                <h6 className="mb-0">Lista de Alertas</h6>
                <span className="badge bg-primary ms-2">{filteredTickets.length}</span>
              </div>
              
              <div className="d-flex align-items-center gap-2">
                <div className="btn-group btn-group-sm" role="group">
                  <button type="button" className="btn btn-outline-primary active">
                    <Table size={14} className="me-1" />
                    Tabla
                  </button>
                  <button type="button" className="btn btn-outline-primary">
                    <Grid size={14} className="me-1" />
                    Tarjetas
                  </button>
                </div>
                
                <small className="text-muted">
                  Mostrando {filteredTickets.length} de {allTickets.length} alertas
                </small>
              </div>
            </div>
            
            {loading && !showForm ? (
              <div className="card-body text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Cargando...</span>
                </div>
                <p className="mt-2 text-muted">Cargando alertas...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="card-body text-center py-5">
                <div className="text-muted mb-3">
                  <Search size={48} className="opacity-25" />
                  <h5 className="mt-2">No se encontraron alertas</h5>
                  <p>No hay alertas que coincidan con los criterios de búsqueda actuales.</p>
                </div>
                <button 
                  className="btn btn-primary mt-2"
                  onClick={handleCreateTicket}
                >
                  <Plus size={16} className="me-1" />
                  Crear Nueva Alerta
                </button>
                <button 
                  className="btn btn-outline-secondary mt-2 ms-2"
                  onClick={() => {
                    setSearchTerm('');
                    setTypeFilter('all');
                    setStatusFilter('all');
                    setDateFilter('all');
                  }}
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>ID</th>
                        <th>Subject</th>
                        <th>Plataforma</th>
                        <th>Estado</th>
                        <th>Tipo</th>
                        <th>Mensaje</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTickets.map(ticket => {
                        const status = getStatusFromMessage(ticket.message);
                        const platform = getPlatformFromSubject(ticket.subject);
                        const messageInfo = extractMessageInfo(ticket.message);
                        
                        return (
                          <tr key={ticket.id} className="align-middle">
                            <td>
                              <div className="d-flex align-items-center">
                                <div className={`bg-${getStatusColor(status)} rounded-circle p-1 me-2`}>
                                  {getStatusIcon(status)}
                                </div>
                                <code className="text-primary fw-bold">#{ticket.id}</code>
                              </div>
                            </td>
                            
                            <td>
                              <div className="d-flex flex-column">
                                <span className="fw-semibold text-truncate" style={{ maxWidth: '250px' }} 
                                      title={ticket.subject}>
                                  {ticket.subject}
                                </span>
                                <small className="text-muted">
                                  {formatDate(ticket.created_at)}
                                </small>
                              </div>
                            </td>
                            
                            <td>
                              <span className={`badge ${getPlatformBadge(platform)} rounded-pill`}>
                                {platform === 'Start' ? '🏠 ' : platform === 'Platform' ? '🖥️ ' : '🚚 '}
                                {platform}
                              </span>
                            </td>
                            
                            <td>
                              <div className={`d-flex align-items-center ${getStatusClass(status)}`}>
                                <span className={`badge ${getStatusBadgeClass(status)} rounded-pill me-2`}>
                                  {status === 'Resolved' ? '✅' : status === 'In Progress' ? '🔄' : '⚠️'}
                                </span>
                                <small className="fw-semibold">{status}</small>
                              </div>
                            </td>
                            
                            <td>
                              <div className="d-flex flex-column">
                                <span className="badge bg-secondary rounded-pill mb-1">{messageInfo.type}</span>
                                {messageInfo.time && (
                                  <small className="text-muted">
                                    <Clock size={10} className="me-1" />
                                    {messageInfo.time}
                                  </small>
                                )}
                              </div>
                            </td>
                            
                            <td>
                              <div className="text-truncate" style={{ maxWidth: '200px' }} 
                                  title={ticket.message}>
                                <small>{ticket.message}</small>
                              </div>
                            </td>
                            
                            <td>
                              <div className="d-flex gap-1">
                                <button
                                  className="btn btn-sm btn-outline-primary rounded-pill"
                                  onClick={() => handleEditTicket(ticket)}
                                  disabled={loading}
                                  title="Editar alerta"
                                >
                                  <Edit size={12} />
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger rounded-pill"
                                  onClick={() => setDeleteConfirm(ticket.id)}
                                  disabled={loading}
                                  title="Eliminar alerta"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Paginación */}
                <div className="p-3">
                  <PaginationControls />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de confirmación para eliminar */}
      {deleteConfirm && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirmar Eliminación</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setDeleteConfirm(null)}
                  disabled={loading}
                ></button>
              </div>
              <div className="modal-body">
                <p>¿Estás seguro de que deseas eliminar esta alerta? Esta acción no se puede deshacer.</p>
                <p className="mb-0">
                  Alerta ID: <strong>#{deleteConfirm}</strong>
                </p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setDeleteConfirm(null)}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={() => handleDeleteTicket(deleteConfirm)}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" />
                      Eliminando...
                    </>
                  ) : (
                    'Eliminar Alerta'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketManager;