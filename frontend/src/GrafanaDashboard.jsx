import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
   ReferenceLine
} from 'recharts';
import {
  Activity, Server, Database, AlertTriangle, CheckCircle, 
  Clock, Filter, Search, BarChart3, PieChart, TrendingUp,
  MapPin, Users, Zap, Calendar, Eye, Download, RefreshCw,
  MessageSquare, PlayCircle, StopCircle, Hash, User, Tag,
  Cpu, HardDrive, Wifi, Shield, Settings, Monitor, X,
  Info, BarChart, AlertCircle, Layers, Database as DatabaseIcon,
  ChevronDown, ChevronUp, List, Grid
} from 'lucide-react';

const GrafanaDataViewer = () => {
  const [panelsData, setPanelsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('1h');
  const [dashboardInfo, setDashboardInfo] = useState(null);
  const [selectedStatusPanels, setSelectedStatusPanels] = useState([]);
  const [selectedGraphPanels, setSelectedGraphPanels] = useState([]);
  const [refreshInterval, setRefreshInterval] = useState(30000);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [showSelector, setShowSelector] = useState(false);
  const [selectorType, setSelectorType] = useState('status');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hostFilter, setHostFilter] = useState('all');
  const [applicationFilter, setApplicationFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedStat, setSelectedStat] = useState(null);
  
  // 🔥 NUEVOS ESTADOS PARA ACORDEONES Y VISTA
  const [expandedSections, setExpandedSections] = useState({
    statusPanels: true,
    graphPanels: true
  });

  const [viewMode, setViewMode] = useState('grid'); // 'grid' o 'list'

  const GRAFANA_API_URL = '/api/grafana';
  const DASHBOARD_UID = 'E-rnklrHk';

  const COLOR_PALETTE = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b',
    '#e377c2', '#7f7f7f', '#bcbd22', '#17becf', '#aec7e8', '#ffbb78'
  ];

  // 🔥 SECTORES PARA ORGANIZACIÓN VISUAL
  const SECTORS = {
    network: { name: 'Red/Ancho de Banda', color: 'primary', icon: Wifi },
    system: { name: 'Sistema/CPU', color: 'info', icon: Cpu },
    storage: { name: 'Almacenamiento', color: 'warning', icon: HardDrive },
    service: { name: 'Servicios', color: 'success', icon: Server },
    monitoring: { name: 'Monitoreo', color: 'secondary', icon: Monitor },
    security: { name: 'Seguridad', color: 'danger', icon: Shield }
  };

  // 🔥 FUNCIÓN CORREGIDA PARA EXTRAER METADATA SIN RECURSIÓN
  const getPanelMetadata = (panel) => {
    const metadata = {
      host: null,
      application: null,
      item: null,
      group: null,
      interface: null,
      metrics: [],
      alertInfo: null,
      thresholds: [],
      datasource: null,
      queryType: null
    };

    // Extraer información de targets
    if (panel.targets && panel.targets.length > 0) {
      const visibleTargets = panel.targets.filter(target => !target.hide);
      if (visibleTargets.length > 0) {
        const target = visibleTargets[0];
        metadata.host = target.host?.filter || 'N/A';
        metadata.application = target.application?.filter || 'N/A';
        metadata.item = target.item?.filter || 'N/A';
        metadata.group = target.group?.filter || 'N/A';
        metadata.datasource = target.datasource?.type || 'N/A';
        metadata.queryType = target.queryType || 'N/A';
        
        // Detectar interfaz de red
        if (metadata.item.includes('Interface')) {
          const interfaceMatch = metadata.item.match(/Interface ([^:]+)/);
          metadata.interface = interfaceMatch ? interfaceMatch[1] : null;
        }
      }
    }

    // Extraer métricas disponibles
    const panelData = panelsData[panel.id];
    if (panelData?.data?.length > 0) {
      const firstDataPoint = panelData.data[0];
      metadata.metrics = Object.keys(firstDataPoint).filter(key => 
        !['timestamp', 'time', 'datetime'].includes(key)
      );
    }

    // Información de alertas
    if (panel.alert) {
      metadata.alertInfo = {
        name: panel.alert.name,
        message: panel.alert.message,
        conditions: panel.alert.conditions?.length || 0,
        frequency: panel.alert.frequency,
        for: panel.alert.for,
        isActive: false // Se calculará por separado
      };
    }

    // Información de thresholds
    if (panel.fieldConfig?.defaults?.thresholds?.steps) {
      metadata.thresholds = panel.fieldConfig.defaults.thresholds.steps
        .filter(step => step.value !== null)
        .map(step => ({
          value: step.value,
          color: step.color,
          label: formatValue(step.value, panel.fieldConfig?.defaults?.unit)
        }));
    }

    return metadata;
  };

  // 🔥 FUNCIÓN SEPARADA PARA CALCULAR ESTADO DE ALERTA
  const calculateAlertStatus = (panel, panelData) => {
    if (!panelData?.data || panelData.data.length === 0) return false;
    
    // Extraer thresholds directamente del panel sin llamar a getPanelMetadata
    const thresholds = panel.fieldConfig?.defaults?.thresholds?.steps || [];
    const criticalThresholds = thresholds
      .filter(step => step.value !== null)
      .filter(step => step.color.includes('red') || step.color.includes('dark-red'))
      .map(step => step.value);
    
    if (criticalThresholds.length === 0) return false;

    const lastDataPoint = panelData.data[panelData.data.length - 1];
    const dataKeys = Object.keys(lastDataPoint).filter(key => 
      !['timestamp', 'time', 'datetime'].includes(key)
    );

    // Verificar contra thresholds críticos
    return dataKeys.some(key => {
      const value = lastDataPoint[key];
      return criticalThresholds.some(threshold => value >= threshold);
    });
  };

  // 🔥 FUNCIÓN PARA OBTENER METADATA COMPLETA CON ALERT STATUS
  const getEnhancedPanelMetadata = (panel) => {
    const metadata = getPanelMetadata(panel);
    const panelData = panelsData[panel.id];
    
    // Calcular estado de alerta solo si hay datos
    if (metadata.alertInfo && panelData) {
      metadata.alertInfo.isActive = calculateAlertStatus(panel, panelData);
    }
    
    return metadata;
  };

  const formatValue = (value, unit) => {
    if (value == null) return 'N/A';
    
    switch (unit) {
      case 'Mbits':
      case 'bps':
        if (value >= 1000000) return `${(value / 1000000).toFixed(2)} Mbps`;
        if (value >= 1000) return `${(value / 1000).toFixed(2)} Kbps`;
        return `${value.toFixed(2)} bps`;
      case 'bits':
        if (value >= 1000000000) return `${(value / 1000000000).toFixed(2)} Gbits`;
        if (value >= 1000000) return `${(value / 1000000).toFixed(2)} Mbits`;
        if (value >= 1000) return `${(value / 1000).toFixed(2)} Kbits`;
        return `${value.toFixed(2)} bits`;
      default:
        return typeof value === 'number' ? value.toFixed(2) : value;
    }
  };


 // 🔥 COMPONENTE ACORDEÓN MEJORADO
 const AccordionSection = ({ 
    title, 
    icon, 
    count, 
    isExpanded, 
    onToggle, 
    children, 
    badgeColor = 'primary',
    description 
  }) => (
    <div className="card shadow-sm mb-4">
      <div 
        className="card-header bg-white d-flex justify-content-between align-items-center cursor-pointer"
        onClick={onToggle}
        style={{ cursor: 'pointer' }}
      >
        <div className="d-flex align-items-center">
          {icon}
          <h5 className="mb-0 ms-2">{title}</h5>
          {description && (
            <span className="text-muted ms-2 small">{description}</span>
          )}
        </div>
        <div className="d-flex align-items-center">
          <span className={`badge bg-${badgeColor} me-3`}>{count}</span>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>
      {isExpanded && (
        <div className="card-body">
          {children}
        </div>
      )}
    </div>
  );

  // 🔥 COMPONENTE DE VISTA DE LISTA PARA PANELES DE ESTADO
  const StatusPanelListView = ({ panels }) => (
    <div className="table-responsive">
      <table className="table table-hover">
        <thead>
          <tr>
            <th>Panel</th>
            <th>Host</th>
            <th>Aplicación</th>
            <th>Métricas</th>
            <th>Último Valor</th>
            <th>Estado</th>
            <th>Alertas</th>
            
          </tr>
        </thead>
        <tbody>
          {panels.map(panelId => {
            const panel = dashboardInfo?.statusPanels.find(p => p.id === panelId);
            const panelData = panelsData[panelId];
            if (!panel || !panelData) return null;

            const metadata = getEnhancedPanelMetadata(panel);
            const lastDataPoint = panelData.data?.[panelData.data.length - 1];
            const dataKeys = lastDataPoint ? Object.keys(lastDataPoint).filter(key => 
              !['timestamp', 'time', 'datetime'].includes(key)
            ) : [];

            return (
              <tr key={panelId}>
                <td>
                  <div>
                    <strong>{panel.title}</strong>
                    {panel.parentTitle && (
                      <div className="small text-muted">{panel.parentTitle}</div>
                    )}
                  </div>
                </td>
                <td>
                  <div className="text-truncate" style={{ maxWidth: '150px' }} title={metadata.host}>
                    {metadata.host}
                  </div>
                </td>
                <td>
                  <div className="text-truncate" style={{ maxWidth: '150px' }} title={metadata.application}>
                    {metadata.application}
                  </div>
                </td>
                <td>
                  <div className="d-flex flex-wrap gap-1">
                    {dataKeys.slice(0, 2).map(key => (
                      <span key={key} className="badge bg-light text-dark small">
                        {key}
                      </span>
                    ))}
                    {dataKeys.length > 2 && (
                      <span className="badge bg-secondary small">
                        +{dataKeys.length - 2}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  {lastDataPoint ? (
                    <div>
                      {dataKeys.map(key => (
                        <div key={key} className="small">
                          <strong>{key}:</strong> {lastDataPoint[key]}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted">Sin datos</span>
                  )}
                </td>
                <td>
                  <span className={`badge bg-${panelData.success ? 'success' : 'danger'}`}>
                    {panelData.success ? 'OK' : 'ERROR'}
                  </span>
                </td>
                <td>
                  {metadata.alertInfo && (
                    <span className={`badge bg-${metadata.alertInfo.isActive ? 'danger' : 'success'}`}>
                      {metadata.alertInfo.isActive ? 'ACTIVA' : 'NORMAL'}
                    </span>
                  )}
                </td>
                
             
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // 🔥 COMPONENTE DE VISTA DE LISTA PARA PANELES DE GRÁFICOS
  const GraphPanelListView = ({ panels }) => (
    <div className="table-responsive">
      <table className="table table-hover">
        <thead>
          <tr>
            <th>Panel</th>
            <th>Host</th>
            <th>Aplicación</th>
            <th>Puntos de Datos</th>
            <th>Rango de Tiempo</th>
            <th>Métricas</th>
            <th>Estado</th>
            <th>Alertas</th>
        
          </tr>
        </thead>
        <tbody>
          {panels.map(panelId => {
            const panel = dashboardInfo?.graphPanels.find(p => p.id === panelId);
            const panelData = panelsData[panelId];
            if (!panel || !panelData) return null;

            const metadata = getEnhancedPanelMetadata(panel);
            const dataKeys = panelData.data?.[0] ? Object.keys(panelData.data[0]).filter(key => 
              !['timestamp', 'time', 'datetime'].includes(key)
            ) : [];

            return (
              <tr key={panelId}>
                <td>
                  <div>
                    <strong>{panel.title}</strong>
                    {panel.parentTitle && (
                      <div className="small text-muted">{panel.parentTitle}</div>
                    )}
                  </div>
                </td>
                <td>
                  <div className="text-truncate" style={{ maxWidth: '150px' }} title={metadata.host}>
                    {metadata.host}
                  </div>
                </td>
                <td>
                  <div className="text-truncate" style={{ maxWidth: '150px' }} title={metadata.application}>
                    {metadata.application}
                  </div>
                </td>
                <td>
                  <span className="badge bg-info">
                    {panelData.data?.length || 0}
                  </span>
                </td>
                <td>
                  <span className="badge bg-secondary">{timeRange}</span>
                </td>
                <td>
                  <div className="d-flex flex-wrap gap-1">
                    {dataKeys.slice(0, 3).map(key => (
                      <span key={key} className="badge bg-light text-dark small">
                        {key}
                      </span>
                    ))}
                    {dataKeys.length > 3 && (
                      <span className="badge bg-secondary small">
                        +{dataKeys.length - 3}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <span className={`badge bg-${panelData.success ? 'success' : 'danger'}`}>
                    {panelData.success ? 'OK' : 'ERROR'}
                  </span>
                </td>
                <td>
                  {metadata.alertInfo && (
                    <span className={`badge bg-${metadata.alertInfo.isActive ? 'danger' : 'success'}`}>
                      {metadata.alertInfo.isActive ? 'ACTIVA' : 'NORMAL'}
                    </span>
                  )}
                </td>
             
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );


  const getTimeRange = (range) => {
    const now = Date.now();
    const ranges = {
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };
    return {
      from: now - ranges[range],
      to: now
    };
  };

  const fetchDashboardInfo = async () => {
    try {
      const response = await fetch(`${GRAFANA_API_URL}/api/dashboards/uid/${DASHBOARD_UID}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const dashboardData = await response.json();
      const statusPanels = [];
      const graphPanels = [];
      
      const findZabbixPanels = (panels, parentTitle = '') => {
        panels.forEach(panel => {
          if (panel.type === 'row') {
            if (panel.panels) {
              findZabbixPanels(panel.panels, panel.title);
            }
          } else if (
            panel.targets && 
            panel.targets.length > 0 && 
            panel.targets.some(t => t.datasource?.type === 'alexanderzobnin-zabbix-datasource')
          ) {
            const panelWithMeta = {
              ...panel,
              parentTitle: parentTitle
            };

            if (panel.type === 'stat') {
              statusPanels.push(panelWithMeta);
            } else if (panel.type === 'timeseries' || panel.type === 'graph') {
              graphPanels.push(panelWithMeta);
            }
          }
        });
      };

      findZabbixPanels(dashboardData.dashboard.panels);

      if (statusPanels.length === 0 && graphPanels.length === 0) {
        throw new Error('No se encontraron paneles con datasource de Zabbix en el dashboard');
      }

      setDashboardInfo({
        title: dashboardData.dashboard.title,
        statusPanels: statusPanels,
        graphPanels: graphPanels
      });

      setSelectedStatusPanels(statusPanels.slice(0, 8).map(panel => panel.id));
      setSelectedGraphPanels(graphPanels.slice(0, 4).map(panel => panel.id));
      
      return { statusPanels, graphPanels };

    } catch (err) {
      throw new Error(`No se pudo cargar el dashboard: ${err.message}`);
    }
  };

  const fetchPanelData = async (panel) => {
    try {
      const { from, to } = getTimeRange(timeRange);

      const visibleTargets = panel.targets.filter(target => !target.hide);
      
      if (visibleTargets.length === 0) {
        return {
          panelId: panel.id,
          title: panel.title,
          parentTitle: panel.parentTitle,
          type: panel.type || 'timeseries',
          data: [],
          fieldConfig: panel.fieldConfig,
          thresholds: panel.thresholds || [],
          alert: panel.alert,
          success: true
        };
      }

      const queries = visibleTargets.map((target, index) => ({
        refId: target.refId || `A${index}`,
        datasource: {
          type: 'alexanderzobnin-zabbix-datasource',
          uid: target.datasource?.uid
        },
        group: target.group,
        host: target.host,
        application: target.application,
        item: target.item,
        functions: target.functions || [],
        options: target.options || {},
        queryType: target.queryType || '0',
        resultFormat: 'time_series',
        hide: target.hide || false
      }));

      const queryPayload = {
        queries: queries,
        from: from.toString(),
        to: to.toString(),
        timezone: 'browser'
      };

      const queryResponse = await fetch(`${GRAFANA_API_URL}/api/ds/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(queryPayload)
      });

      if (!queryResponse.ok) {
        const errorText = await queryResponse.text();
        throw new Error(`Error ${queryResponse.status}: ${errorText}`);
      }

      const queryData = await queryResponse.json();
      const processedData = processPanelData(queryData, panel);
      
      return {
        panelId: panel.id,
        title: panel.title,
        parentTitle: panel.parentTitle,
        type: panel.type || 'timeseries',
        data: processedData,
        targets: visibleTargets,
        fieldConfig: panel.fieldConfig,
        thresholds: panel.thresholds || [],
        alert: panel.alert,
        options: panel.options,
        success: true
      };

    } catch (err) {
      return {
        panelId: panel.id,
        title: panel.title,
        parentTitle: panel.parentTitle,
        type: panel.type,
        error: err.message,
        data: [],
        success: false
      };
    }
  };

  const processPanelData = (queryData, panel) => {
    try {
      const dataByTime = {};

      Object.keys(queryData.results || {}).forEach(refId => {
        const result = queryData.results[refId];
        
        if (!result.frames || result.frames.length === 0) {
          return;
        }

        result.frames.forEach(frame => {
          if (!frame.data || !frame.data.values || frame.data.values.length < 2) {
            return;
          }

          const timeValues = frame.data.values[0];
          const dataValues = frame.data.values[1];
          
          let fieldName = frame.schema?.fields?.[1]?.name || refId;
          
          const overrides = panel.fieldConfig?.overrides || [];
          overrides.forEach(override => {
            if (override.matcher?.options === fieldName) {
              const displayNameProp = override.properties?.find(p => p.id === 'displayName');
              if (displayNameProp) {
                fieldName = displayNameProp.value;
              }
            }
          });

          timeValues.forEach((timestamp, index) => {
            const value = dataValues[index];
            if (value !== null && value !== undefined) {
              const timeKey = timestamp;
              
              if (!dataByTime[timeKey]) {
                dataByTime[timeKey] = {
                  timestamp: timeKey,
                  time: new Date(timestamp).toLocaleTimeString('es-AR', { 
                    hour: '2-digit', 
                    minute: '2-digit'
                  }),
                  datetime: new Date(timestamp).toLocaleString('es-AR')
                };
              }
              
              dataByTime[timeKey][fieldName] = Number(value);
            }
          });
        });
      });

      const chartData = Object.values(dataByTime)
        .sort((a, b) => a.timestamp - b.timestamp);

      return chartData;

    } catch (err) {
      return [];
    }
  };

  const fetchAllPanelsData = async () => {
    setLoading(true);
    setError(null);

    try {
      let statusPanels = dashboardInfo?.statusPanels;
      let graphPanels = dashboardInfo?.graphPanels;
      
      if (!statusPanels || !graphPanels) {
        const result = await fetchDashboardInfo();
        statusPanels = result.statusPanels;
        graphPanels = result.graphPanels;
      }

      const panelsToFetch = [
        ...statusPanels.filter(panel => selectedStatusPanels.includes(panel.id)),
        ...graphPanels.filter(panel => selectedGraphPanels.includes(panel.id))
      ];
      
      const panelPromises = panelsToFetch.map(panel => fetchPanelData(panel));
      const results = await Promise.all(panelPromises);

      const newPanelsData = {};
      results.forEach(result => {
        newPanelsData[result.panelId] = result;
      });

      setPanelsData(newPanelsData);
      setLastUpdate(new Date());

    } catch (err) {
      setError({
        message: err.message,
        type: 'critical',
        details: 'No se pudo cargar la información del dashboard'
      });
    } finally {
      setLoading(false);
    }
  };

  // 🔥 ESTADÍSTICAS GENERALES MEJORADAS
  const calculateGeneralStats = () => {
    const activePanels = Object.values(panelsData).filter(panel => panel.success);
    const totalDataPoints = activePanels.reduce((sum, panel) => sum + (panel.data?.length || 0), 0);
    const errorPanels = Object.values(panelsData).filter(panel => !panel.success).length;
    
    // Calcular alertas activas usando calculateAlertStatus directamente
    const alertPanels = Object.values(panelsData).filter(panelData => {
      const panel = [...(dashboardInfo?.statusPanels || []), ...(dashboardInfo?.graphPanels || [])]
        .find(p => p.id === panelData.panelId);
      return panel && calculateAlertStatus(panel, panelData);
    }).length;

    // Calcular datos por tipo de panel
    const statusPanelsData = selectedStatusPanels.map(id => panelsData[id]).filter(Boolean);
    const graphPanelsData = selectedGraphPanels.map(id => panelsData[id]).filter(Boolean);

    return {
      totalPanels: activePanels.length,
      totalDataPoints,
      errorPanels,
      alertPanels,
      statusPanels: selectedStatusPanels.length,
      graphPanels: selectedGraphPanels.length,
      statusPanelsData,
      graphPanelsData,
      activePanels
    };
  };

  const generalStats = calculateGeneralStats();

  // 🔥 COMPONENTE DE METADATA MEJORADO
  const PanelMetadata = ({ panel, panelData }) => {
    const metadata = getEnhancedPanelMetadata(panel);
    
    return (
      <div className="card bg-light border-0 mt-3">
        <div className="card-body py-2">
          <div className="row small text-muted">
            {/* Información del Host */}
            <div className="col-md-6 mb-2">
              <div className="d-flex align-items-center">
                <Server size={12} className="me-1" />
                <strong>Host:</strong>
                <span className="ms-1 text-truncate">{metadata.host}</span>
              </div>
            </div>
            
            {/* Aplicación */}
            <div className="col-md-6 mb-2">
              <div className="d-flex align-items-center">
                <Settings size={12} className="me-1" />
                <strong>App:</strong>
                <span className="ms-1 text-truncate">{metadata.application}</span>
              </div>
            </div>
            
            {/* Grupo */}
            <div className="col-md-6 mb-2">
              <div className="d-flex align-items-center">
                <Users size={12} className="me-1" />
                <strong>Grupo:</strong>
                <span className="ms-1">{metadata.group}</span>
              </div>
            </div>
            
            {/* Métricas */}
            <div className="col-md-6 mb-2">
              <div className="d-flex align-items-center">
                <BarChart3 size={12} className="me-1" />
                <strong>Métricas:</strong>
                <span className="ms-1">{metadata.metrics.length}</span>
              </div>
            </div>
            
            {/* Datasource */}
            <div className="col-md-6 mb-2">
              <div className="d-flex align-items-center">
                <DatabaseIcon size={12} className="me-1" />
                <strong>Datasource:</strong>
                <span className="ms-1 text-truncate">{metadata.datasource}</span>
              </div>
            </div>
            
            {/* Alertas */}
            {metadata.alertInfo && (
              <div className="col-12 mb-2">
                <div className="d-flex align-items-center">
                  <AlertTriangle size={12} className="me-1 text-warning" />
                  <strong>Alerta:</strong>
                  <span className="ms-1 text-truncate">{metadata.alertInfo.name}</span>
                  <span className={`badge bg-${metadata.alertInfo.isActive ? 'danger' : 'success'} ms-1`}>
                    {metadata.alertInfo.isActive ? 'ACTIVA' : 'NORMAL'}
                  </span>
                </div>
              </div>
            )}
            
            {/* Thresholds */}
            {metadata.thresholds.length > 0 && (
              <div className="col-12">
                <div className="d-flex align-items-center flex-wrap">
                  <strong className="me-2">Límites:</strong>
                  {metadata.thresholds.map((threshold, idx) => (
                    <span 
                      key={idx}
                      className={`badge bg-${getThresholdColor(threshold.color)} me-1 mb-1`}
                      style={{ fontSize: '10px' }}
                    >
                      {threshold.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getThresholdColor = (color) => {
    const colorMap = {
      'dark-green': 'success',
      'dark-yellow': 'warning', 
      'dark-red': 'danger',
      'green': 'success',
      'yellow': 'warning',
      'red': 'danger'
    };
    return colorMap[color] || 'secondary';
  };

  // 🔥 COMPONENTE DE ESTADÍSTICAS AVANZADAS
  const AdvancedPanelStats = ({ panelData, unit }) => {
    if (!panelData.data || panelData.data.length === 0) return null;

    const dataKeys = Object.keys(panelData.data[0]).filter(key => 
      !['timestamp', 'time', 'datetime'].includes(key)
    );

    return (
      <div className="row mt-3">
        {dataKeys.map(key => {
          const values = panelData.data.map(d => d[key]).filter(v => v != null);
          if (values.length === 0) return null;
          
          const current = values[values.length - 1];
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          const max = Math.max(...values);
          const min = Math.min(...values);
          const trend = values.length > 1 ? current - values[values.length - 2] : 0;
          
          return (
            <div key={key} className="col-md-6 col-lg-3 mb-2">
              <div className="card bg-white border-0 h-100">
                <div className="card-body p-2">
                  <div className="small text-muted text-truncate" title={key}>
                    {key}
                  </div>
                  <div className="fw-bold text-primary">{formatValue(current, unit)}</div>
                  <div className="d-flex justify-content-between small text-muted">
                    <span>Avg: {formatValue(avg, unit)}</span>
                    <span className={`${trend > 0 ? 'text-success' : trend < 0 ? 'text-danger' : 'text-muted'}`}>
                      {trend > 0 ? '↗' : trend < 0 ? '↘' : '→'}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between small text-muted">
                    <span>Min: {formatValue(min, unit)}</span>
                    <span>Max: {formatValue(max, unit)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 🔥 COMPONENTE DE ALERTAS INTELIGENTE
  const AlertStatus = ({ panel, panelData }) => {
    const metadata = getEnhancedPanelMetadata(panel);
    
    if (!metadata.alertInfo) return null;

    return (
      <div className={`alert ${metadata.alertInfo.isActive ? 'alert-danger' : 'alert-success'} py-2 mb-3`}>
        <div className="d-flex align-items-center">
          <AlertTriangle size={16} className="me-2" />
          <div className="flex-grow-1">
            <strong>{metadata.alertInfo.name}</strong>
            <div className="small">{metadata.alertInfo.message}</div>
            <div className="small text-muted">
              Condiciones: {metadata.alertInfo.conditions} • Frecuencia: {metadata.alertInfo.frequency} • For: {metadata.alertInfo.for}
            </div>
          </div>
          <span className={`badge ${metadata.alertInfo.isActive ? 'bg-danger' : 'bg-success'}`}>
            {metadata.alertInfo.isActive ? 'ACTIVA' : 'NORMAL'}
          </span>
        </div>
      </div>
    );
  };

    // ... (el resto del código se mantiene igual, incluyendo renderStatPanel, renderChart, etc.)

  // Solo muestro las partes críticas corregidas para evitar redundancia
  // El resto del componente (modales, selectores, etc.) permanece igual
// 🔥 COMPONENTE DE ALERTAS INTELIGENTE


  const renderStatPanel = (panelData) => {
    if (!panelData.data || panelData.data.length === 0) {
      return (
        <div className="text-center py-3">
          <Database className="text-muted mb-2" size={24} />
          <div className="text-muted small">No data available</div>
        </div>
      );
    }

    const lastDataPoint = panelData.data[panelData.data.length - 1];
    const dataKeys = Object.keys(lastDataPoint).filter(key => 
      !['timestamp', 'time', 'datetime'].includes(key)
    );

    const thresholds = panelData.fieldConfig?.defaults?.thresholds?.steps || [];

    return (
      <div className="row g-2">
        {dataKeys.map(key => {
          const value = lastDataPoint[key];
          
          let color = 'secondary';
          for (let i = thresholds.length - 1; i >= 0; i--) {
            const threshold = thresholds[i];
            if (threshold.value === null || value >= threshold.value) {
              if (threshold.color === 'dark-green') color = 'success';
              else if (threshold.color === 'dark-red') color = 'danger';
              else if (threshold.color === 'dark-yellow') color = 'warning';
              break;
            }
          }

          return (
            <div key={key} className="col-12">
              <div className="card bg-light border-0 h-100">
                <div className="card-body p-3 text-center">
                  <div className="text-muted small text-truncate mb-1" title={key}>
                    {key}
                  </div>
                  <div className={`h4 mb-0 text-${color} fw-bold`}>
                    {Math.round(value)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 🔥 COMPONENTE DE VISTA EN CUADRÍCULA (EXISTENTE)


const StatusPanelGridView = ({ panels }) => (
    <div className="row g-3">
      {panels.map(panelId => {
        const panel = dashboardInfo?.statusPanels.find(p => p.id === panelId);
        const panelData = panelsData[panelId];
        if (!panel || !panelData) return null;

        return (
          <div key={panelId} className="col-xl-4 col-lg-6 col-md-6">
            <EnhancedStatPanel panel={panel} panelData={panelData} />
          </div>
        );
      })}
    </div>
  );

  const GraphPanelGridView = ({ panels }) => (
    <div className="row g-4">
      {panels.map(panelId => {
        const panel = dashboardInfo?.graphPanels.find(p => p.id === panelId);
        const panelData = panelsData[panelId];
        if (!panel || !panelData) return null;

        return (
          <div key={panelId} className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-light d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="mb-0">{panel.title}</h6>
                  {panel.parentTitle && (
                    <small className="text-muted">{panel.parentTitle}</small>
                  )}
                </div>
                <div className="d-flex align-items-center gap-2">
                  {panelData.alert && (
                    <span className="badge bg-danger">ALERT</span>
                  )}
                  <div 
                    className={`badge bg-${panelData.success ? 'success' : 'warning'}`}
                    title={panelData.success ? 'Datos OK' : 'Error en datos'}
                  >
                    {panelData.success ? 'OK' : 'ERROR'}
                  </div>
                </div>
              </div>
              <div className="card-body">
                {panelData.error ? (
                  <div className="alert alert-danger text-center py-4">
                    <AlertTriangle size={24} className="mb-2" />
                    <div>Error al cargar datos del gráfico</div>
                    <small>{panelData.error}</small>
                  </div>
                ) : (
                  <>
                    <AlertStatus panel={panel} panelData={panelData} />
                    {renderChart(panelData, 300)}
                    <PanelMetadata panel={panel} panelData={panelData} />
                    <AdvancedPanelStats 
                      panelData={panelData} 
                      unit={panel.fieldConfig?.defaults?.unit}
                    />
                  </>
                )}
              </div>
              <div className="card-footer bg-transparent">
                <div className="d-flex justify-content-between align-items-center">
                  <small className="text-muted">
                    <Clock size={12} className="me-1" />
                    {panelData.data?.length || 0} puntos • {timeRange}
                  </small>
                  <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-outline-primary">
                      <Eye size={12} />
                    </button>
                    <button className="btn btn-sm btn-outline-success">
                      <Download size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );


// 🔥 VISTA MEJORADA DE PANEL DE ESTADO
  const EnhancedStatPanel = ({ panel, panelData }) => {
    const metadata = getPanelMetadata(panel);
    
    return (
      <div className="card border-0 shadow-sm h-100">
        <div className="card-header bg-light d-flex justify-content-between align-items-center">
          <h6 className="mb-0 text-truncate" title={panel.title}>
            {panel.title}
          </h6>
          <div className="d-flex align-items-center gap-1">
            {panelData.alert && (
              <span className="badge bg-danger">ALERT</span>
            )}
            <div className={`badge bg-${panelData.success ? 'success' : 'warning'}`}>
              {panelData.success ? 'OK' : 'ERROR'}
            </div>
          </div>
        </div>
        
        <div className="card-body">
          {/* Alert Status */}
          <AlertStatus panel={panel} panelData={panelData} />
          
          {/* Main Stat Display */}
          {panelData.error ? (
            <div className="alert alert-danger py-2 mb-0 text-center">
              <AlertTriangle size={16} className="me-1" />
              Error de datos
            </div>
          ) : (
            <>
              {renderStatPanel(panelData)}
              
              {/* Metadata */}
              <PanelMetadata panel={panel} panelData={panelData} />
              
              {/* Advanced Stats */}
              <AdvancedPanelStats 
                panelData={panelData} 
                unit={panel.fieldConfig?.defaults?.unit}
              />
            </>
          )}
        </div>
        
        <div className="card-footer bg-transparent">
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">
              <Clock size={12} className="me-1" />
              {panelData.data?.length || 0} puntos • {timeRange}
            </small>
            <div className="d-flex gap-1">
              <button className="btn btn-sm btn-outline-primary" title="Ver detalles">
                <Eye size={12} />
              </button>
              <button className="btn btn-sm btn-outline-success" title="Descargar datos">
                <Download size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderChart = (panelData, height = 240) => {
    if (!panelData.data || panelData.data.length === 0) {
      return (
        <div className="d-flex flex-column justify-content-center align-items-center text-muted" style={{ height: height }}>
          <BarChart3 size={32} className="mb-2" />
          <small>Sin datos disponibles</small>
        </div>
      );
    }

    const dataKeys = Object.keys(panelData.data[0]).filter(key => 
      !['timestamp', 'time', 'datetime'].includes(key)
    );

    const fieldConfig = panelData.fieldConfig?.defaults || {};
    const unit = fieldConfig.unit || '';
    const minValue = fieldConfig.min;
    const maxValue = fieldConfig.max;

    const commonProps = {
      data: panelData.data,
      margin: { top: 10, right: 20, left: 10, bottom: 5 }
    };

    const CustomTooltip = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-dark text-white p-3 rounded shadow-sm border-0">
            <div className="fw-bold mb-2">{label}</div>
            {payload.map((entry, index) => (
              <div key={index} className="d-flex justify-content-between align-items-center">
                <span style={{ color: entry.color }}>{entry.name}:</span>
                <strong className="ms-2">{formatValue(entry.value, unit)}</strong>
              </div>
            ))}
          </div>
        );
      }
      return null;
    };

    const customStyle = fieldConfig.custom || {};
    const lineWidth = customStyle.lineWidth || 2;
    const lineInterpolation = customStyle.lineInterpolation || 'linear';

    const renderThresholds = () => {
      if (!panelData.thresholds || panelData.thresholds.length === 0) return null;
      
      return panelData.thresholds.map((threshold, index) => {
        if (!threshold.visible || threshold.value == null) return null;
        
        let color = '#ef4444';
        if (threshold.colorMode === 'critical') color = '#ef4444';
        
        return (
          <ReferenceLine
            key={`threshold-${index}`}
            y={threshold.value}
            stroke={color}
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{ 
              value: formatValue(threshold.value, unit), 
              position: 'right',
              fill: color,
              fontSize: 11
            }}
          />
        );
      });
    };

    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
          <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#6c757d" hide />
          <YAxis 
            stroke="#6c757d" 
            tick={{ fontSize: 10 }} 
            width={50}
            domain={[minValue || 'auto', maxValue || 'auto']}
            tickFormatter={(value) => {
              if (unit === 'Mbits' || unit === 'bps') {
                if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
                if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
              }
              return value.toFixed(0);
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          {renderThresholds()}
          {dataKeys.map((key, index) => (
            <Line 
              key={key}
              type={lineInterpolation === 'smooth' ? 'monotone' : 'linear'}
              dataKey={key}
              stroke={COLOR_PALETTE[index % COLOR_PALETTE.length]}
              strokeWidth={lineWidth}
              dot={false}
              animationDuration={300}
              name={key}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };


// 🔥 MODAL DE ESTADÍSTICAS DETALLADAS
  const StatsModal = () => {
    if (!selectedStat) return null;

    const getStatDetails = () => {
      switch (selectedStat) {
        case 'totalPanels':
          return {
            title: 'Paneles Activos',
            icon: <Layers className="text-primary" size={24} />,
            description: 'Resumen de todos los paneles activos en el dashboard',
            details: generalStats.activePanels.map(panel => ({
              name: panel.title,
              type: panel.type,
              dataPoints: panel.data?.length || 0,
              status: panel.success ? 'OK' : 'ERROR'
            }))
          };
        case 'statusPanels':
          return {
            title: 'Paneles de Estado',
            icon: <Activity className="text-success" size={24} />,
            description: 'Paneles que muestran estados y valores actuales',
            details: generalStats.statusPanelsData.map(panelData => ({
              name: panelData.title,
              metrics: panelData.data && panelData.data.length > 0 ? 
                Object.keys(panelData.data[0]).filter(key => !['timestamp', 'time', 'datetime'].includes(key)) : [],
              lastUpdate: panelData.data && panelData.data.length > 0 ? 
                new Date(panelData.data[panelData.data.length - 1].timestamp).toLocaleString() : 'N/A'
            }))
          };
        case 'graphPanels':
          return {
            title: 'Paneles Gráficos',
            icon: <BarChart className="text-info" size={24} />,
            description: 'Paneles que muestran tendencias y datos históricos',
            details: generalStats.graphPanelsData.map(panelData => ({
              name: panelData.title,
              dataPoints: panelData.data?.length || 0,
              timeRange: timeRange,
              metrics: panelData.data && panelData.data.length > 0 ? 
                Object.keys(panelData.data[0]).filter(key => !['timestamp', 'time', 'datetime'].includes(key)) : []
            }))
          };
        case 'totalDataPoints':
          return {
            title: 'Puntos de Datos',
            icon: <DatabaseIcon className="text-warning" size={24} />,
            description: 'Total de puntos de datos recolectados',
            details: generalStats.activePanels.map(panel => ({
              name: panel.title,
              dataPoints: panel.data?.length || 0,
              dataSize: panel.data ? `${(JSON.stringify(panel.data).length / 1024).toFixed(2)} KB` : '0 KB',
              updateTime: lastUpdate?.toLocaleTimeString() || 'N/A'
            }))
          };
        case 'errorPanels':
          return {
            title: 'Paneles con Errores',
            icon: <AlertCircle className="text-danger" size={24} />,
            description: 'Paneles que presentan errores de carga o datos',
            details: Object.values(panelsData)
              .filter(panel => !panel.success)
              .map(panel => ({
                name: panel.title,
                error: panel.error,
                type: panel.type,
                lastAttempt: lastUpdate?.toLocaleTimeString() || 'N/A'
              }))
          };
        case 'alertPanels':
          return {
            title: 'Alertas Activas',
            icon: <AlertTriangle className="text-warning" size={24} />,
            description: 'Paneles que tienen alertas activas actualmente',
            details: Object.values(panelsData)
              .filter(panelData => {
                const panel = [...(dashboardInfo?.statusPanels || []), ...(dashboardInfo?.graphPanels || [])]
                  .find(p => p.id === panelData.panelId);
                return panel && calculateAlertStatus(panel, panelData);
              })
              .map(panelData => {
                const panel = [...(dashboardInfo?.statusPanels || []), ...(dashboardInfo?.graphPanels || [])]
                  .find(p => p.id === panelData.panelId);
                const metadata = getPanelMetadata(panel);
                return {
                  name: panelData.title,
                  alertName: metadata.alertInfo?.name || 'N/A',
                  triggerTime: lastUpdate?.toLocaleTimeString() || 'N/A',
                  conditions: metadata.alertInfo?.conditions || 0
                };
              })
          };
        default:
          return null;
      }
    };

    const statDetails = getStatDetails();
    if (!statDetails) return null;

    return (
      <div className={`modal fade ${showStatsModal ? 'show' : ''}`} 
           style={{ display: showStatsModal ? 'block' : 'none', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title d-flex align-items-center">
                {statDetails.icon}
                <span className="ms-2">{statDetails.title}</span>
              </h5>
              <button type="button" className="btn-close" onClick={() => setShowStatsModal(false)}></button>
            </div>
            <div className="modal-body">
              <p className="text-muted">{statDetails.description}</p>
              
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      {Object.keys(statDetails.details[0] || {}).map(key => (
                        <th key={key} className="text-capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {statDetails.details.map((detail, index) => (
                      <tr key={index}>
                        {Object.values(detail).map((value, idx) => (
                          <td key={idx}>
                            {Array.isArray(value) ? (
                              <div className="d-flex flex-wrap gap-1">
                                {value.map((item, i) => (
                                  <span key={i} className="badge bg-secondary">{item}</span>
                                ))}
                              </div>
                            ) : (
                              value
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowStatsModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 🔥 COMPONENTE DE SELECTOR DE PANELES
  const PanelSelector = ({ type, panels, selected, setSelected }) => (
    <div className="card border-0 shadow-sm mb-3">
      <div className="card-header bg-white d-flex justify-content-between align-items-center">
        <h6 className="mb-0 d-flex align-items-center">
          {type === 'status' ? <Activity className="me-2" size={18} /> : <BarChart3 className="me-2" size={18} />}
          {type === 'status' ? 'Paneles de Estado' : 'Paneles de Gráficos'}
        </h6>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => setSelected([])}
          >
            Limpiar
          </button>
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={() => setSelected(panels.map(p => p.id))}
          >
            Todos
          </button>
        </div>
      </div>
      <div className="card-body">
        <div className="row g-2">
          {panels.map(panel => {
            const isSelected = selected.includes(panel.id);
            
            return (
              <div key={panel.id} className="col-md-6 col-lg-4">
                <div
                  className={`card border ${isSelected ? 'border-primary' : 'border-light'} h-100 cursor-pointer`}
                  onClick={() => {
                    if (isSelected) {
                      setSelected(prev => prev.filter(id => id !== panel.id));
                    } else {
                      setSelected(prev => [...prev, panel.id]);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="card-body p-3">
                    <div className="d-flex align-items-center">
                      <div className={`me-3 ${isSelected ? 'text-primary' : 'text-muted'}`}>
                        {isSelected ? (
                          <CheckCircle size={20} />
                        ) : (
                          <div style={{ width: 20, height: 20, border: '2px solid #6c757d', borderRadius: 4 }} />
                        )}
                      </div>
                      <div className="flex-grow-1">
                        <div className="fw-medium text-truncate" title={panel.title}>
                          {panel.title}
                        </div>
                        {panel.parentTitle && (
                          <small className="text-muted text-truncate d-block" title={panel.parentTitle}>
                            {panel.parentTitle}
                          </small>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-muted small">
          {selected.length} de {panels.length} seleccionados
        </div>
      </div>
    </div>
  );

  const SelectorModal = () => (
    <div className={`modal fade ${showSelector ? 'show' : ''}`} style={{ display: showSelector ? 'block' : 'none', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title d-flex align-items-center">
              <Settings className="me-2" />
              Seleccionar Paneles
            </h5>
            <button type="button" className="btn-close" onClick={() => setShowSelector(false)}></button>
          </div>
          <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {dashboardInfo && (
              <>
                <PanelSelector
                  type="status"
                  panels={dashboardInfo.statusPanels}
                  selected={selectedStatusPanels}
                  setSelected={setSelectedStatusPanels}
                />
                <PanelSelector
                  type="graph"
                  panels={dashboardInfo.graphPanels}
                  selected={selectedGraphPanels}
                  setSelected={setSelectedGraphPanels}
                />
              </>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setShowSelector(false)}>
              Cancelar
            </button>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={() => {
                setShowSelector(false);
                fetchAllPanelsData();
              }}
            >
              Aplicar Selección
            </button>
          </div>
        </div>
      </div>
    </div>
  );


   // 🔥 OPCIONES DE FILTRO
  const getFilterOptions = () => {
    const hosts = new Set();
    const applications = new Set(); 
    const groups = new Set();

    Object.values(panelsData).forEach(panelData => {
      const panel = [...(dashboardInfo?.statusPanels || []), ...(dashboardInfo?.graphPanels || [])]
        .find(p => p.id === panelData.panelId);
      if (panel) {
        const metadata = getPanelMetadata(panel);
        if (metadata.host && metadata.host !== 'N/A') hosts.add(metadata.host);
        if (metadata.application && metadata.application !== 'N/A') applications.add(metadata.application);
        if (metadata.group && metadata.group !== 'N/A') groups.add(metadata.group);
      }
    });

    return {
      hosts: Array.from(hosts).sort(),
      applications: Array.from(applications).sort(),
      groups: Array.from(groups).sort()
    };
  };

  const filterOptions = getFilterOptions();

  useEffect(() => {
    fetchAllPanelsData();
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchAllPanelsData, refreshInterval);
    }
    return () => clearInterval(interval);
  }, [timeRange, selectedStatusPanels, selectedGraphPanels, refreshInterval, autoRefresh]);

  if (loading && !dashboardInfo) {
    return (
      <div className="container-fluid py-4 d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Cargando...</span>
          </div>
          <h5 className="text-dark">Cargando Dashboard...</h5>
          <p className="text-muted">Conectando con Grafana</p>
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
                    {dashboardInfo?.title || 'Noise Peak Monitor'}
                  </h1>
                  <p className="text-muted mb-0">
                    {generalStats.totalPanels} paneles activos • {generalStats.totalDataPoints} puntos de datos • 
                    Última actualización: {lastUpdate ? lastUpdate.toLocaleTimeString('es-AR') : 'N/A'}
                  </p>
                </div>
                <div className="d-flex align-items-center gap-3">
                  {/* 🔥 BOTÓN DE CAMBIO DE VISTA */}
                  <div className="btn-group">
                    <button
                      className={`btn btn-outline-primary ${viewMode === 'grid' ? 'active' : ''}`}
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid size={16} />
                    </button>
                    <button
                      className={`btn btn-outline-primary ${viewMode === 'list' ? 'active' : ''}`}
                      onClick={() => setViewMode('list')}
                    >
                      <List size={16} />
                    </button>
                  </div>
                  
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
                  <button className="btn btn-primary" onClick={fetchAllPanelsData} disabled={loading}>
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
                    disabled={loading}
                  >
                    <option value="15m">Últimos 15 minutos</option>
                    <option value="1h">Última hora</option>
                    <option value="6h">Últimas 6 horas</option>
                    <option value="24h">Últimas 24 horas</option>
                    <option value="7d">Últimos 7 días</option>
                  </select>
                </div>
                
                <div className="col-md-2">
                  <label className="form-label">Host</label>
                  <select 
                    className="form-select"
                    value={hostFilter}
                    onChange={(e) => setHostFilter(e.target.value)}
                  >
                    <option value="all">Todos los hosts</option>
                    {filterOptions.hosts.map(host => (
                      <option key={host} value={host}>{host}</option>
                    ))}
                  </select>
                </div>
                
                <div className="col-md-2">
                  <label className="form-label">Aplicación</label>
                  <select 
                    className="form-select"
                    value={applicationFilter}
                    onChange={(e) => setApplicationFilter(e.target.value)}
                  >
                    <option value="all">Todas las apps</option>
                    {filterOptions.applications.map(app => (
                      <option key={app} value={app}>{app}</option>
                    ))}
                  </select>
                </div>
                
                <div className="col-md-2">
                  <label className="form-label">Grupo</label>
                  <select 
                    className="form-select"
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.target.value)}
                  >
                    <option value="all">Todos los grupos</option>
                    {filterOptions.groups.map(group => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </div>
                
                <div className="col-md-3">
                  <label className="form-label">Buscar Paneles</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <Search size={16} />
                    </span>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Buscar panel..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <div className="row mt-3">
                <div className="col-12">
                  <button 
                    className="btn btn-outline-primary"
                    onClick={() => setShowSelector(true)}
                  >
                    <Settings size={16} className="me-1" />
                    Gestionar Paneles
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ESTADÍSTICAS GENERALES MEJORADAS */}
      <div className="row mb-4">
        <div className="col-md-2">
          <div 
            className="card bg-primary text-white cursor-pointer"
            onClick={() => {
              setSelectedStat('totalPanels');
              setShowStatsModal(true);
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className="card-body text-center py-3">
              <div className="h4 mb-0">{generalStats.totalPanels}</div>
              <small>Paneles Activos</small>
              <Info size={14} className="ms-1" />
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div 
            className="card bg-success text-white cursor-pointer"
            onClick={() => {
              setSelectedStat('statusPanels');
              setShowStatsModal(true);
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className="card-body text-center py-3">
              <div className="h4 mb-0">{generalStats.statusPanels}</div>
              <small>Paneles Estado</small>
              <Info size={14} className="ms-1" />
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div 
            className="card bg-info text-white cursor-pointer"
            onClick={() => {
              setSelectedStat('graphPanels');
              setShowStatsModal(true);
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className="card-body text-center py-3">
              <div className="h4 mb-0">{generalStats.graphPanels}</div>
              <small>Paneles Gráficos</small>
              <Info size={14} className="ms-1" />
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div 
            className="card bg-warning text-white cursor-pointer"
            onClick={() => {
              setSelectedStat('totalDataPoints');
              setShowStatsModal(true);
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className="card-body text-center py-3">
              <div className="h4 mb-0">{generalStats.totalDataPoints}</div>
              <small>Puntos de Datos</small>
              <Info size={14} className="ms-1" />
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div 
            className="card bg-danger text-white cursor-pointer"
            onClick={() => {
              setSelectedStat('errorPanels');
              setShowStatsModal(true);
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className="card-body text-center py-3">
              <div className="h4 mb-0">{generalStats.errorPanels}</div>
              <small>Errores</small>
              <Info size={14} className="ms-1" />
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div 
            className="card bg-secondary text-white cursor-pointer"
            onClick={() => {
              setSelectedStat('alertPanels');
              setShowStatsModal(true);
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className="card-body text-center py-3">
              <div className="h4 mb-0">{generalStats.alertPanels}</div>
              <small>Alertas</small>
              <Info size={14} className="ms-1" />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mb-4 d-flex align-items-center">
          <AlertTriangle className="me-2" size={20} />
          <div>
            <strong>Error:</strong> {error.message}
          </div>
        </div>
      )}

  {selectedStatusPanels.length > 0 && (
        <AccordionSection
          title="Paneles de Estado"
          icon={<Activity className="text-primary" size={20} />}
          count={selectedStatusPanels.length}
          isExpanded={expandedSections.statusPanels}
          onToggle={() => setExpandedSections(prev => ({
            ...prev,
            statusPanels: !prev.statusPanels
          }))}
          badgeColor="success"
          description="Métricas en tiempo real y estados actuales"
        >
          {viewMode === 'grid' ? (
            <StatusPanelGridView panels={selectedStatusPanels} />
          ) : (
            <StatusPanelListView panels={selectedStatusPanels} />
          )}
        </AccordionSection>
      )}

      {/* 🔥 SECCIÓN DE PANELES DE GRÁFICOS CON ACORDEÓN */}
      {selectedGraphPanels.length > 0 && (
        <AccordionSection
          title="Paneles de Gráficos"
          icon={<BarChart3 className="text-info" size={20} />}
          count={selectedGraphPanels.length}
          isExpanded={expandedSections.graphPanels}
          onToggle={() => setExpandedSections(prev => ({
            ...prev,
            graphPanels: !prev.graphPanels
          }))}
          badgeColor="info"
          description="Tendencias y datos históricos"
        >
          {viewMode === 'grid' ? (
            <GraphPanelGridView panels={selectedGraphPanels} />
          ) : (
            <GraphPanelListView panels={selectedGraphPanels} />
          )}
        </AccordionSection>
      )}

      {/* ESTADO VACÍO (se mantiene igual) */}
      {selectedStatusPanels.length === 0 && selectedGraphPanels.length === 0 && (
        <div className="text-center py-5">
          <BarChart3 size={48} className="text-muted mb-3" />
          <h5 className="text-muted">No hay paneles seleccionados</h5>
          <p className="text-muted mb-3">Selecciona algunos paneles para comenzar a visualizar datos</p>
          <button 
            className="btn btn-primary"
            onClick={() => setShowSelector(true)}
          >
            <Settings className="me-2" size={16} />
            Seleccionar Paneles
          </button>
        </div>
      )}



      <SelectorModal />
      <StatsModal />
    </div>
  );
};

export default GrafanaDataViewer;