import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Save, X, AlertCircle, 
  CheckCircle, Activity, FileText, Server, Monitor, Ticket,
  Filter, Search, Calendar, Clock
} from 'lucide-react';

const TicketManager = () => {
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

 // 🔥 NUEVO: Estado para paginación
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });


  // API Configuration - Conectando a tu MySQL
  const API_BASE_URL = 'http://localhost:3005/api';


  // Form data adaptado a tu estructura de BD
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    created_at: new Date().toISOString().slice(0, 16).replace('T', ' ')
  });



// 🔥 MODIFICADO: Cargar tickets con paginación
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${API_BASE_URL}/tickets?page=${pagination.page}&limit=${pagination.limit}`
        );
        
        if (!response.ok) {
          throw new Error('Error al cargar los tickets');
        }
        
        const data = await response.json();
        
        if (data.success) {
          setTickets(data.data);
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
        
        // Datos de ejemplo como fallback
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
        setFilteredTickets(fallbackData);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [pagination.page, pagination.limit]); // 🔥 Recargar cuando cambie la página


  // 🔥 NUEVO: Funciones de paginación
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

// 🔥 MODIFICADO: Aplicar filtros solo a los datos actuales
  useEffect(() => {
    let filtered = [...tickets];
    
    if (searchTerm) {
      filtered = filtered.filter(ticket =>
        ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.message?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(ticket => {
        const message = ticket.message?.toLowerCase() || '';
        if (typeFilter === 'resolved') {
          return message.includes('resolved');
        } else if (typeFilter === 'started') {
          return message.includes('started');
        }
        return true;
      });
    }
    
    setFilteredTickets(filtered);
  }, [tickets, searchTerm, typeFilter]);


  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      subject: '',
      message: '',
      created_at: new Date().toISOString().slice(0, 16).replace('T', ' ')
    });
    setEditingTicket(null);
    setShowForm(false);
  };

  // Crear nuevo ticket
  const handleCreateTicket = () => {
    resetForm();
    setShowForm(true);
  };

  // Editar ticket existente
  const handleEditTicket = (ticket) => {
    setFormData({
      subject: ticket.subject,
      message: ticket.message,
      created_at: ticket.created_at.replace(' ', 'T').slice(0, 16)
    });
    setEditingTicket(ticket.id);
    setShowForm(true);
  };

  // Enviar formulario (crear o actualizar)
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
        // Recargar tickets después de guardar
        const ticketsResponse = await fetch(`${API_BASE_URL}/tickets`);
        const ticketsData = await ticketsResponse.json();
        
        if (ticketsData.success) {
          setTickets(ticketsData.data);
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

  // Eliminar ticket
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

  // Analizar el estado basado en el mensaje
  const getStatusFromMessage = (message) => {
    if (!message) return 'Unknown';
    if (message.toLowerCase().includes('resolved')) return 'Resolved';
    if (message.toLowerCase().includes('started')) return 'In Progress';
    return 'Open';
  };

  // Obtener clase CSS para estado
  const getStatusClass = (status) => {
    switch (status) {
      case 'Resolved': return 'text-success';
      case 'In Progress': return 'text-warning';
      case 'Open': return 'text-danger';
      default: return 'text-secondary';
    }
  };

  // Extraer plataforma del subject
  const getPlatformFromSubject = (subject) => {
    if (!subject) return 'Unknown';
    if (subject.includes('GPU')) return 'Platform';
    if (subject.includes('latency')) return 'Delivery';
    if (subject.includes('service')) return 'Start';
    return 'General';
  };

  // Obtener badge color para plataforma
  const getPlatformBadge = (platform) => {
    switch (platform) {
      case 'Start': return 'bg-primary';
      case 'Platform': return 'bg-info';
      case 'Delivery': return 'bg-success';
      default: return 'bg-secondary';
    }
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Extraer información del mensaje
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

  // 🔥 NUEVO: Componente de paginación

const PaginationControls = () => {
    const maxPagesToShow = 5;
    const startPage = Math.max(1, pagination.page - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(pagination.totalPages, startPage + maxPagesToShow - 1);
    
    const pageNumbers = [];
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="d-flex justify-content-between align-items-center mt-3">
        <div>
          <small className="text-muted">
            Mostrando {(pagination.page - 1) * pagination.limit + 1} -{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
            {pagination.total.toLocaleString()} tickets
          </small>
        </div>
        
        <div className="d-flex gap-1">
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={prevPage}
            disabled={pagination.page === 1 || loading}
          >
            <ChevronLeft size={16} />
          </button>
          
          {pageNumbers.map(page => (
            <button
              key={page}
              className={`btn btn-sm ${pagination.page === page ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => goToPage(page)}
              disabled={loading}
            >
              {page}
            </button>
          ))}
          
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={nextPage}
            disabled={pagination.page === pagination.totalPages || loading}
          >
            <ChevronRight size={16} />
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
            <option value="20">20 por página</option>
            <option value="50">50 por página</option>
            <option value="100">100 por página</option>
            <option value="200">200 por página</option>
          </select>
        </div>
      </div>
    );
  };

 return (
    <div className="container-fluid py-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="h3 mb-0 d-flex align-items-center">
              <Activity className="me-2" />
              Gestión de Alertas/Tickets
              {pagination.total > 0 && (
                <span className="badge bg-secondary ms-2">
                  {pagination.total.toLocaleString()} total
                </span>
              )}
            </h1>
            <button 
              className="btn btn-primary d-flex align-items-center"
              onClick={handleCreateTicket}
              disabled={loading}
            >
              <Plus size={16} className="me-1" />
              Nueva Alerta
            </button>
          </div>
        </div>
      </div>

      {/* Mostrar error si existe */}
      {error && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="alert alert-danger d-flex align-items-center" role="alert">
              <AlertCircle className="me-2" />
              <div>{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros simplificados */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-header d-flex align-items-center">
              <Filter className="me-2" size={20} />
              <h6 className="mb-0">Filtros</h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Búsqueda:</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <Search size={16} />
                    </span>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Buscar en subject o message..."
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Tipo de Evento:</label>
                  <select 
                    className="form-select" 
                    value={typeFilter} 
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <option value="all">Todos</option>
                    <option value="resolved">Resueltos</option>
                    <option value="started">Iniciados</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario de creación/edición */}
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

      {/* Lista de tickets/alertas */}
      <div className="row">
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h6 className="mb-0">
                <FileText className="me-2" size={20} />
                Alertas ({filteredTickets.length})
              </h6>
              <small className="text-muted">
                Mostrando {filteredTickets.length} de {tickets.length} alertas
              </small>
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
                <p className="text-muted">No hay alertas que coincidan con los filtros.</p>
                <button 
                  className="btn btn-primary mt-2"
                  onClick={handleCreateTicket}
                >
                  <Plus size={16} className="me-1" />
                  Crear Nueva Alerta
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
                        <th>Fecha Creación</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTickets.map(ticket => {
                        const status = getStatusFromMessage(ticket.message);
                        const platform = getPlatformFromSubject(ticket.subject);
                        const messageInfo = extractMessageInfo(ticket.message);
                        
                        return (
                          <tr key={ticket.id}>
                            <td>
                              <code className="text-primary">#{ticket.id}</code>
                            </td>
                            <td>
                              <div className="text-truncate" style={{ maxWidth: '200px' }} title={ticket.subject}>
                                {ticket.subject}
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${getPlatformBadge(platform)}`}>
                                {platform}
                              </span>
                            </td>
                            <td>
                              <div className={`d-flex align-items-center ${getStatusClass(status)}`}>
                                <CheckCircle size={16} className="me-1" />
                                <span>{status}</span>
                              </div>
                            </td>
                            <td>
                              <small className="text-muted">{messageInfo.type}</small>
                              {messageInfo.time && (
                                <small className="d-block text-muted">Hora: {messageInfo.time}</small>
                              )}
                            </td>
                            <td>
                              <div className="text-truncate" style={{ maxWidth: '250px' }} title={ticket.message}>
                                {ticket.message}
                              </div>
                            </td>
                            <td>
                              <small className="text-muted">
                                {formatDate(ticket.created_at)}
                              </small>
                            </td>
                            <td>
                              <div className="d-flex gap-2">
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => handleEditTicket(ticket)}
                                  disabled={loading}
                                  title="Editar alerta"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => setDeleteConfirm(ticket.id)}
                                  disabled={loading}
                                  title="Eliminar alerta"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de confirmación para eliminar */}
      {deleteConfirm && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
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