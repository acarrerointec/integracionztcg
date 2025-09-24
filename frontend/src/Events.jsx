import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle, XCircle, Clock, BarChart3, Filter, Upload, Calendar, Search, TrendingUp, ChevronLeft, ChevronRight, FileText, AlertCircle, CheckSquare, X } from 'lucide-react';

const Events    = () => {
    const [tickets, setTickets] = useState([]);
    const [filteredTickets, setFilteredTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        start: { ok: 0, warning: 0, critical: 0 },
        platform: { ok: 0, warning: 0, critical: 0 },
        delivery: { ok: 0, warning: 0, critical: 0 }
    });
    const [timeStats, setTimeStats] = useState({
        start: 0,
        platform: 0,
        delivery: 0,
        total: 0
    });
    const [dailyStats, setDailyStats] = useState({});
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [requestTypeFilter, setRequestTypeFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('');
    const [timeFilter, setTimeFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [modalTickets, setModalTickets] = useState([]);
    const [modalPlatform, setModalPlatform] = useState('');
    const [modalStatus, setModalStatus] = useState('');
    const [error, setError] = useState(null);
    const ticketsPerPage = 15;

    // API Configuration
    const API_BASE_URL = 'http://localhost:3001/api';

    const ticketAPI = {
        getTickets: async (filters = {}) => {
            const queryParams = new URLSearchParams(filters).toString();
            const response = await fetch(`${API_BASE_URL}/tickets${queryParams ? '?' + queryParams : ''}`);
            if (!response.ok) throw new Error('Failed to fetch tickets');
            return response.json();
        },
        
        uploadTickets: async (formData) => {
            const response = await fetch(`${API_BASE_URL}/tickets/upload`, {
                method: 'POST',
                body: formData
            });
            if (!response.ok) throw new Error('Failed to upload tickets');
            return response.json();
        },
        
        getStats: async () => {
            const response = await fetch(`${API_BASE_URL}/tickets/stats`);
            if (!response.ok) throw new Error('Failed to fetch stats');
            return response.json();
        }
    };

    // Función para abrir el modal con los tickets filtrados
    const openModal = (platform, status = 'all') => {
        let filtered = tickets.filter(ticket => ticket.platform === platform);
        
        if (status !== 'all') {
            filtered = filtered.filter(ticket => ticket.status === status);
        }
        
        setModalTickets(filtered);
        setModalPlatform(platform);
        setModalStatus(status);
        setShowModal(true);
    };

    // Función para calcular estadísticas
    const calculateStats = (ticketList) => {
        const newStats = {
            start: { ok: 0, warning: 0, critical: 0 },
            platform: { ok: 0, warning: 0, critical: 0 },
            delivery: { ok: 0, warning: 0, critical: 0 }
        };

        ticketList.forEach(ticket => {
            if (newStats[ticket.platform]) {
                newStats[ticket.platform][ticket.status]++;
            }
        });

        setStats(newStats);
    };

    // Función para calcular estadísticas de tiempo
    const calculateTimeStats = (ticketList) => {
        const platformTimes = {
            start: [],
            platform: [],
            delivery: []
        };

        ticketList.forEach(ticket => {
            if (platformTimes[ticket.platform]) {
                platformTimes[ticket.platform].push(ticket.resolutionTime);
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

        newTimeStats.total = Math.round((newTimeStats.start + newTimeStats.platform + newTimeStats.delivery) / 3);
        setTimeStats(newTimeStats);
    };

    // Función para calcular estadísticas diarias
    const calculateDailyStats = (ticketList) => {
        const daily = {};
        
        ticketList.forEach(ticket => {
            const date = new Date(ticket.date).toDateString();
            if (!daily[date]) {
                daily[date] = { ok: 0, warning: 0, critical: 0, total: 0 };
            }
            daily[date][ticket.status]++;
            daily[date].total++;
        });

        setDailyStats(daily);
    };

    // Función para aplicar filtros
    const applyFilters = (ticketList, platformFilter, search, status, requestType, date, time) => {
        let filtered = [...ticketList];

        // Filtro por plataforma
        if (platformFilter !== 'all') {
            filtered = filtered.filter(ticket => ticket.platform === platformFilter);
        }

        // Filtro por término de búsqueda
        if (search) {
            filtered = filtered.filter(ticket =>
                ticket.subject.toLowerCase().includes(search.toLowerCase()) ||
                ticket.number.toLowerCase().includes(search.toLowerCase()) ||
                ticket.submitter.toLowerCase().includes(search.toLowerCase())
            );
        }

        // Filtro por estado
        if (status !== 'all') {
            filtered = filtered.filter(ticket => ticket.status === status);
        }

        // Filtro por tipo de request
        if (requestType !== 'all') {
            filtered = filtered.filter(ticket => ticket.type === requestType);
        }

        // Filtro por fecha
        if (date) {
            filtered = filtered.filter(ticket => {
                const ticketDate = new Date(ticket.date).toDateString();
                const filterDate = new Date(date).toDateString();
                return ticketDate === filterDate;
            });
        }

        // Filtro por tiempo
        if (time) {
            const [hours, minutes] = time.split(':').map(Number);
            const filterMinutes = hours * 60 + minutes;
            
            filtered = filtered.filter(ticket => {
                const ticketTime = new Date(ticket.date);
                const ticketMinutes = ticketTime.getHours() * 60 + ticketTime.getMinutes();
                return Math.abs(ticketMinutes - filterMinutes) <= 60; // ±1 hora
            });
        }

        setFilteredTickets(filtered);
    };

    // Cargar datos desde la API
    useEffect(() => {
        const loadTicketData = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await ticketAPI.getTickets();
                
                if (response.success && Array.isArray(response.data)) {
                    setTickets(response.data);
                    setFilteredTickets(response.data);
                    calculateStats(response.data);
                    calculateTimeStats(response.data);
                    calculateDailyStats(response.data);
                } else {
                    throw new Error('Invalid response format');
                }
                
                setLoading(false);
            } catch (error) {
                console.error('Error loading ticket data:', error);
                setError('Error al cargar los datos. Verifica que el backend esté ejecutándose en http://localhost:3001');
                setLoading(false);
                
                // Datos de ejemplo como fallback
                const fallbackData = [
                    {
                        id: 1,
                        number: '382911',
                        type: 'Problem',
                        subject: 'Caida de servicio en cabecera',
                        platform: 'start',
                        status: 'critical',
                        originalStatus: 'Open',
                        date: '2025-09-08T11:21:38',
                        resolutionTime: 120,
                        submitter: 'Javier Ferrigno',
                        lastUpdate: '2025-09-08T08:10:10'
                    },
                    {
                        id: 2,
                        number: '382912',
                        type: 'Incident',
                        subject: 'Error en distribución de contenido',
                        platform: 'delivery',
                        status: 'warning',
                        originalStatus: 'In Progress',
                        date: '2025-09-08T09:15:22',
                        resolutionTime: 85,
                        submitter: 'Ana García',
                        lastUpdate: '2025-09-08T10:30:15'
                    },
                    {
                        id: 3,
                        number: '382913',
                        type: 'Request',
                        subject: 'Mantenimiento programado plataforma',
                        platform: 'platform',
                        status: 'ok',
                        originalStatus: 'Resolved',
                        date: '2025-09-07T14:20:10',
                        resolutionTime: 45,
                        submitter: 'Carlos López',
                        lastUpdate: '2025-09-07T15:05:30'
                    }
                ];
                setTickets(fallbackData);
                setFilteredTickets(fallbackData);
                calculateStats(fallbackData);
                calculateTimeStats(fallbackData);
                calculateDailyStats(fallbackData);
            }
        };

        loadTicketData();
    }, []);

    // Aplicar filtros cuando cambien
    useEffect(() => {
        applyFilters(tickets, filter, searchTerm, statusFilter, requestTypeFilter, dateFilter, timeFilter);
    }, [tickets, filter, searchTerm, statusFilter, requestTypeFilter, dateFilter, timeFilter]);

    // Función para manejar la carga de archivos JSON
    const handleFileUpload = async (event) => {
        const files = event.target.files;
        if (!files.length) return;

        setLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            for (let i = 0; i < files.length; i++) {
                formData.append('files', files[i]);
            }

            const response = await ticketAPI.uploadTickets(formData);

            if (response.success && response.data.length > 0) {
                // Recargar todos los tickets desde la base de datos
                const ticketsResponse = await ticketAPI.getTickets();
                if (ticketsResponse.success) {
                    setTickets(ticketsResponse.data);
                    calculateStats(ticketsResponse.data);
                    calculateTimeStats(ticketsResponse.data);
                    calculateDailyStats(ticketsResponse.data);
                }

                alert(`Se cargaron ${response.count} tickets exitosamente.`);
            } else {
                alert('No se encontraron tickets válidos en los archivos cargados.');
            }
        } catch (error) {
            console.error('Error uploading files:', error);
            setError('Error al subir los archivos. Verifica el formato y que el backend esté funcionando.');
        } finally {
            setLoading(false);
            event.target.value = '';
        }
    };

    // Función para formatear tiempo
    const formatTime = (minutes) => {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    };

    // Función para obtener color del estado
    const getStatusColor = (status) => {
        switch (status) {
            case 'ok': return 'text-success';
            case 'warning': return 'text-warning';
            case 'critical': return 'text-danger';
            default: return 'text-secondary';
        }
    };

    // Función para obtener icono del estado
    const getStatusIcon = (status) => {
        switch (status) {
            case 'ok': return <CheckCircle size={16} />;
            case 'warning': return <AlertTriangle size={16} />;
            case 'critical': return <XCircle size={16} />;
            default: return <Clock size={16} />;
        }
    };

    // Paginación
    const indexOfLastTicket = currentPage * ticketsPerPage;
    const indexOfFirstTicket = indexOfLastTicket - ticketsPerPage;
    const currentTickets = filteredTickets.slice(indexOfFirstTicket, indexOfLastTicket);
    const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage);

    const getPlatformName = (platform) => {
        switch (platform) {
            case 'start': return 'Cabecera';
            case 'platform': return 'Plataforma';
            case 'delivery': return 'Distribución';
            default: return platform;
        }
    };

    return (
        <div className="container-fluid py-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            {/* Header */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center">
                        <h1 className="h3 mb-0 d-flex align-items-center">
                            <Activity className="me-2" />
                            Eventos de Tickets por Plataforma
                        </h1>
                        <div className="d-flex gap-2 align-items-center">
                            <label htmlFor="file-upload" className="btn btn-sm btn-outline-primary mb-0">
                                <Upload size={16} className="me-1" />
                                Cargar JSON
                            </label>
                            <input
                                id="file-upload"
                                type="file"
                                accept=".json"
                                multiple
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                            />
                            <small className="text-muted">
                                Total: {tickets.length} tickets
                            </small>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mostrar error si existe */}
            {error && (
                <div className="row mb-4">
                    <div className="col-12">
                        <div className="alert alert-warning d-flex align-items-center" role="alert">
                            <AlertTriangle className="me-2" />
                            <div>{error}</div>
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
                        <p className="mt-2 text-muted">Procesando datos de tickets...</p>
                    </div>
                </div>
            )}

            {!loading && (
                <>

                    {/* Filtros */}
                    <div className="row mb-4">
                        <div className="col-12">
                            <div className="card shadow-sm">
                                <div className="card-header d-flex align-items-center">
                                    <Filter className="me-2" size={20} />
                                    <h6 className="mb-0">Filtros</h6>
                                </div>
                                <div className="card-body">
                                    <div className="row g-3">
                                        <div className="col-md-3">
                                            <label className="form-label">Plataforma:</label>
                                            <select 
                                                className="form-select" 
                                                value={filter} 
                                                onChange={(e) => setFilter(e.target.value)}
                                            >
                                                <option value="all">Todas</option>
                                                <option value="start">Cabecera</option>
                                                <option value="platform">Plataforma</option>
                                                <option value="delivery">Distribución</option>
                                            </select>
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label">Estado:</label>
                                            <select 
                                                className="form-select" 
                                                value={statusFilter} 
                                                onChange={(e) => setStatusFilter(e.target.value)}
                                            >
                                                <option value="all">Todos</option>
                                                <option value="ok">OK</option>
                                                <option value="warning">Warning</option>
                                                <option value="critical">Critical</option>
                                            </select>
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label">Fecha:</label>
                                            <input 
                                                type="date" 
                                                className="form-control" 
                                                value={dateFilter} 
                                                onChange={(e) => setDateFilter(e.target.value)}
                                            />
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label">Búsqueda:</label>
                                            <div className="input-group">
                                                <span className="input-group-text">
                                                    <Search size={16} />
                                                </span>
                                                <input 
                                                    type="text" 
                                                    className="form-control" 
                                                    placeholder="Buscar tickets..."
                                                    value={searchTerm} 
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabla de tickets */}
                    <div className="row">
                        <div className="col-12">
                            <div className="card shadow-sm">
                                <div className="card-header d-flex justify-content-between align-items-center">
                                    <h6 className="mb-0">
                                        <FileText className="me-2" size={20} />
                                        Tickets ({filteredTickets.length})
                                    </h6>
                                    {filteredTickets.length > 0 && (
                                        <span className="badge bg-secondary">
                                            Página {currentPage} de {totalPages}
                                        </span>
                                    )}
                                </div>
                                <div className="card-body p-0">
                                    <div className="table-responsive">
                                        <table className="table table-hover mb-0">
                                            <thead className="table-light">
                                                <tr>
                                                    <th>Ticket #</th>
                                                    <th>Asunto</th>
                                                    <th>Plataforma</th>
                                                    <th>Estado</th>
                                                    <th>Tipo</th>
                                                    <th>Creado por</th>
                                                    <th>Fecha</th>
                                                    <th>Tiempo Resolución</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {currentTickets.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="8" className="text-center py-4 text-muted">
                                                            No se encontraron tickets con los filtros aplicados
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    currentTickets.map(ticket => (
                                                        <tr key={ticket.id}>
                                                            <td>
                                                                <code className="text-primary">{ticket.number}</code>
                                                            </td>
                                                            <td>
                                                                <div className="text-truncate" style={{ maxWidth: '200px' }} title={ticket.subject}>
                                                                    {ticket.subject}
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <span className={`badge ${
                                                                    ticket.platform === 'start' ? 'bg-primary' :
                                                                    ticket.platform === 'platform' ? 'bg-info' : 'bg-success'
                                                                }`}>
                                                                    {getPlatformName(ticket.platform)}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <div className={`d-flex align-items-center ${getStatusColor(ticket.status)}`}>
                                                                    {getStatusIcon(ticket.status)}
                                                                    <span className="ms-1">{ticket.originalStatus}</span>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <small className="text-muted">{ticket.type}</small>
                                                            </td>
                                                            <td>
                                                                <small>{ticket.submitter}</small>
                                                            </td>
                                                            <td>
                                                                <small className="text-muted">
                                                                    {new Date(ticket.date).toLocaleString('es-ES', {
                                                                        day: '2-digit',
                                                                        month: '2-digit',
                                                                        year: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </small>
                                                            </td>
                                                            <td>
                                                                <span className="badge bg-secondary">
                                                                    {formatTime(ticket.resolutionTime)}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                {totalPages > 1 && (
                                    <div className="card-footer">
                                        <nav>
                                            <ul className="pagination pagination-sm mb-0 justify-content-center">
                                                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                                    <button 
                                                        className="page-link"
                                                        onClick={() => setCurrentPage(currentPage - 1)}
                                                        disabled={currentPage === 1}
                                                    >
                                                        <ChevronLeft size={16} />
                                                    </button>
                                                </li>
                                                
                                                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                                    let pageNum;
                                                    if (totalPages <= 5) {
                                                        pageNum = i + 1;
                                                    } else if (currentPage <= 3) {
                                                        pageNum = i + 1;
                                                    } else if (currentPage >= totalPages - 2) {
                                                        pageNum = totalPages - 4 + i;
                                                    } else {
                                                        pageNum = currentPage - 2 + i;
                                                    }
                                                    
                                                    return (
                                                        <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                                                            <button 
                                                                className="page-link"
                                                                onClick={() => setCurrentPage(pageNum)}
                                                            >
                                                                {pageNum}
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                                
                                                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                                    <button 
                                                        className="page-link"
                                                        onClick={() => setCurrentPage(currentPage + 1)}
                                                        disabled={currentPage === totalPages}
                                                    >
                                                        <ChevronRight size={16} />
                                                    </button>
                                                </li>
                                            </ul>
                                        </nav>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Modal para mostrar tickets filtrados */}
            {showModal && (
                <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                    <div className="modal-dialog modal-lg modal-dialog-scrollable">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    {getPlatformName(modalPlatform)} - {modalStatus === 'all' ? 'Todos los tickets' : modalStatus}
                                </h5>
                                <button 
                                    type="button" 
                                    className="btn-close" 
                                    onClick={() => setShowModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="table-responsive">
                                    <table className="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>Ticket #</th>
                                                <th>Asunto</th>
                                                <th>Estado</th>
                                                <th>Fecha</th>
                                                <th>Tiempo</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {modalTickets.map(ticket => (
                                                <tr key={ticket.id}>
                                                    <td><code>{ticket.number}</code></td>
                                                    <td>{ticket.subject}</td>
                                                    <td>
                                                        <div className={`d-flex align-items-center ${getStatusColor(ticket.status)}`}>
                                                            {getStatusIcon(ticket.status)}
                                                            <span className="ms-1">{ticket.originalStatus}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <small>
                                                            {new Date(ticket.date).toLocaleString('es-ES', {
                                                                day: '2-digit',
                                                                month: '2-digit',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </small>
                                                    </td>
                                                    <td>
                                                        <span className="badge bg-secondary">
                                                            {formatTime(ticket.resolutionTime)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
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

            {/* Overlay del modal */}
            {showModal && <div className="modal-backdrop fade show"></div>}
        </div>
    );
};

export default Events;