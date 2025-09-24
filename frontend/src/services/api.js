import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const ticketAPI = {
  // Obtener tickets con filtros
  getTickets: (filters = {}) => 
    api.get('/tickets', { params: filters }),

  // Subir archivo JSON
  uploadTickets: (formData) =>
    api.post('/tickets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  // Crear nuevo ticket
  createTicket: (ticketData) =>
    api.post('/tickets', ticketData),

  // Actualizar ticket
  updateTicket: (id, updates) =>
    api.put(`/tickets/${id}`, updates),

  // Obtener estadísticas
  getStats: () =>
    api.get('/tickets/stats'),
};

export default api;