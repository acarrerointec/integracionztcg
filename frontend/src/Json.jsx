import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X, Download, Eye } from 'lucide-react';

const JSONUploader = ({ onUploadSuccess }) => {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [sourceAssignments, setSourceAssignments] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Mapeo automático de fuentes basado en patrones
  const detectSource = (ticket) => {
    // Si el ticket tiene información específica de Zabbix
    if (ticket['Submitter Name']?.toLowerCase().includes('zabbix') ||
        ticket['Ticket Subject']?.toLowerCase().includes('zabbix') ||
        ticket['Source'] === 'zabbix') {
      return 'zabbix';
    }
    
    // Si viene de sistema de cabecera
    if (ticket['Platform'] === 'start' || 
        ticket['Ticket Subject']?.toLowerCase().includes('cabecera') ||
        ticket['Source'] === 'headend') {
      return 'headend';
    }
    
    // Si tiene número de ticket específico del sistema
    if (ticket['Ticket Number'] && ticket['Source'] === 'ticket-system') {
      return 'ticket-system';
    }
    
    // Por defecto, pendiente de clasificar
    return 'pending';
  };

  // Transformar datos del JSON a formato interno
  const transformTicketData = (jsonTicket, assignedSource) => {
    return {
      "Ticket Number": jsonTicket["Ticket Number"]?.toString() || jsonTicket["Ticket ID"]?.toString() || '',
      "Request type": jsonTicket["Request type"] || 'Problem',
      "Ticket Subject": jsonTicket["Ticket Subject"] || jsonTicket["Subject"] || 'Sin asunto',
      "Platform": jsonTicket["Platform"] || 'start',
      "Ticket Status": jsonTicket["Ticket Status"] || jsonTicket["Status"] || 'Open',
      "Original Status": jsonTicket["Original Status"] || jsonTicket["Ticket Status"] || jsonTicket["Status"] || 'Open',
      "Ticket Date": jsonTicket["Ticket Date"] || jsonTicket["Created"] || new Date().toISOString().slice(0, 19).replace('T', ' '),
      "Last Update": jsonTicket["Last Update"] || jsonTicket["Updated"] || new Date().toISOString().slice(0, 19).replace('T', ' '),
      "Last Reply": jsonTicket["Last Reply"] || jsonTicket["Last Update"] || jsonTicket["Updated"] || new Date().toISOString().slice(0, 19).replace('T', ' '),
      "Resolution Time": parseInt(jsonTicket["Resolution Time"]) || 0,
      "Submitter Name": jsonTicket["Submitter Name"] || jsonTicket["Submitter"] || jsonTicket["Created By"] || 'Sistema',
      "Source": assignedSource || detectSource(jsonTicket)
    };
  };

  // Obtener nombre de fuente
  const getSourceName = (source) => {
    switch (source) {
      case 'ticket-system': return 'Sistema de Tickets';
      case 'zabbix': return 'Zabbix';
      case 'headend': return 'Cabecera';
      case 'pending': return 'Pendiente de Clasificar';
      default: return source;
    }
  };

  // Obtener color de badge para fuente
  const getSourceBadge = (source) => {
    switch (source) {
      case 'ticket-system': return 'bg-primary text-white';
      case 'zabbix': return 'bg-warning text-dark';
      case 'headend': return 'bg-info text-white';
      case 'pending': return 'bg-secondary text-white';
      default: return 'bg-secondary text-white';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const handleFiles = async (files) => {
    const jsonFiles = files.filter(file => 
      file.type === 'application/json' || 
      file.name.toLowerCase().endsWith('.json')
    );

    if (jsonFiles.length === 0) {
      setError('Por favor selecciona archivos JSON válidos');
      return;
    }

    try {
      setError(null);
      setUploading(true);
      
      let allTickets = [];
      
      for (const file of jsonFiles) {
        const text = await file.text();
        const data = JSON.parse(text);
        
        // Convertir a array si es un objeto único
        const tickets = Array.isArray(data) ? data : [data];
        
        // Transformar tickets y detectar fuentes
        const transformedTickets = tickets.map(ticket => {
          const transformed = transformTicketData(ticket);
          return {
            ...transformed,
            originalData: ticket, // Mantener datos originales para referencia
            fileName: file.name
          };
        });
        
        allTickets = [...allTickets, ...transformedTickets];
      }
      
      // Crear asignaciones de fuente iniciales
      const initialAssignments = {};
      allTickets.forEach((ticket, index) => {
        initialAssignments[index] = ticket.Source;
      });
      
      setPreviewData(allTickets);
      setSourceAssignments(initialAssignments);
      setShowPreview(true);
      
    } catch (error) {
      console.error('Error procesando archivos:', error);
      setError(`Error procesando archivos: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSourceChange = (ticketIndex, newSource) => {
    setSourceAssignments(prev => ({
      ...prev,
      [ticketIndex]: newSource
    }));
  };

  const handleConfirmUpload = async () => {
    try {
      setUploading(true);
      setError(null);
      
      // Aplicar asignaciones de fuente a los datos
      const finalTickets = previewData.map((ticket, index) => ({
        ...ticket,
        Source: sourceAssignments[index]
      }));
      
      // Enviar datos a la API
      const response = await fetch('http://localhost:3001/api/tickets/upload-json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tickets: finalTickets
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar tickets');
      }
      
      if (result.success) {
        setSuccess(`Se cargaron ${result.count} tickets exitosamente`);
        setPreviewData(null);
        setShowPreview(false);
        setSourceAssignments({});
        
        // Notificar al componente padre
        if (onUploadSuccess) {
          onUploadSuccess(result);
        }
      }
      
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
    } finally {
      setUploading(false);
    }
  };

  const resetUploader = () => {
    setPreviewData(null);
    setShowPreview(false);
    setSourceAssignments({});
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="card shadow-sm">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h6 className="mb-0 d-flex align-items-center">
          <Upload className="me-2" size={20} />
          Cargar Tickets desde JSON
        </h6>
        {showPreview && (
          <button 
            className="btn btn-sm btn-outline-secondary"
            onClick={resetUploader}
          >
            <X size={14} className="me-1" />
            Cancelar
          </button>
        )}
      </div>
      
      <div className="card-body">
        {/* Mensajes de estado */}
        {error && (
          <div className="alert alert-danger d-flex align-items-center mb-3" role="alert">
            <AlertCircle className="me-2" size={16} />
            {error}
          </div>
        )}
        
        {success && (
          <div className="alert alert-success d-flex align-items-center mb-3" role="alert">
            <CheckCircle className="me-2" size={16} />
            {success}
          </div>
        )}

        {!showPreview ? (
          /* Zona de carga */
          <div
            className={`border-2 border-dashed rounded-3 p-4 text-center ${
              dragOver ? 'border-primary bg-light' : 'border-secondary'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="mb-3">
              <FileText size={48} className="text-muted" />
            </div>
            <h6>Arrastra archivos JSON aquí</h6>
            <p className="text-muted mb-3">
              o haz clic para seleccionar archivos
            </p>
            <input
              type="file"
              multiple
              accept=".json,application/json"
              onChange={handleFileInput}
              className="d-none"
              id="json-file-input"
            />
            <label 
              htmlFor="json-file-input" 
              className="btn btn-outline-primary"
              style={{ cursor: 'pointer' }}
            >
              Seleccionar Archivos JSON
            </label>
            <div className="mt-3">
              <small className="text-muted">
                Formatos soportados: .json | Tamaño máximo por archivo: 10MB
              </small>
            </div>
          </div>
        ) : (
          /* Vista previa y asignación de fuentes */
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">
                Vista Previa - {previewData.length} tickets encontrados
              </h6>
              <button
                className="btn btn-success"
                onClick={handleConfirmUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" />
                    Cargando...
                  </>
                ) : (
                  'Confirmar Carga'
                )}
              </button>
            </div>
            
            <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="table table-sm table-hover">
                <thead className="table-light sticky-top">
                  <tr>
                    <th>Ticket #</th>
                    <th>Asunto</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Creado por</th>
                    <th>Fuente</th>
                    <th>Archivo</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((ticket, index) => (
                    <tr key={index}>
                      <td>
                        <code className="text-primary">{ticket["Ticket Number"]}</code>
                      </td>
                      <td>
                        <div 
                          className="text-truncate" 
                          style={{ maxWidth: '200px' }}
                          title={ticket["Ticket Subject"]}
                        >
                          {ticket["Ticket Subject"]}
                        </div>
                      </td>
                      <td>
                        <small className="text-muted">{ticket["Request type"]}</small>
                      </td>
                      <td>
                        <small className="text-muted">{ticket["Ticket Status"]}</small>
                      </td>
                      <td>
                        <small>{ticket["Submitter Name"]}</small>
                      </td>
                      <td>
                        <select
                          className="form-select form-select-sm"
                          value={sourceAssignments[index]}
                          onChange={(e) => handleSourceChange(index, e.target.value)}
                        >
                          <option value="ticket-system">Sistema de Tickets</option>
                          <option value="zabbix">Zabbix</option>
                          <option value="headend">Cabecera</option>
                          <option value="pending">Pendiente de Clasificar</option>
                        </select>
                      </td>
                      <td>
                        <small className="text-muted">{ticket.fileName}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Resumen de fuentes */}
            <div className="mt-3">
              <h6 className="mb-2">Resumen por Fuente:</h6>
              <div className="d-flex flex-wrap gap-2">
                {Object.entries(
                  Object.values(sourceAssignments).reduce((acc, source) => {
                    acc[source] = (acc[source] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([source, count]) => (
                  <span key={source} className={`badge ${getSourceBadge(source)}`}>
                    {getSourceName(source)}: {count}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {uploading && (
          <div className="text-center mt-3">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
            <p className="mt-2 text-muted">Procesando archivos...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default JSONUploader;