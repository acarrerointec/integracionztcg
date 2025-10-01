import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area, ReferenceLine
} from 'recharts';

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
  const [selectorType, setSelectorType] = useState('status'); // 'status' or 'graph'

  const GRAFANA_API_URL = '/api/grafana';
  const DASHBOARD_UID = 'E-rnklrHk';

  const COLOR_PALETTE = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b',
    '#e377c2', '#7f7f7f', '#bcbd22', '#17becf', '#aec7e8', '#ffbb78'
  ];

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
        return value.toFixed(2);
    }
  };

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

            // Separar por tipo de panel
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

      // Seleccionar los primeros 8 de cada tipo
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
          
          // Obtener el nombre del campo con mejor lógica
          let fieldName = frame.schema?.fields?.[1]?.name || refId;
          
          // Aplicar overrides de displayName si existen
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

  const renderStatPanel = (panelData) => {
    if (!panelData.data || panelData.data.length === 0) {
      return (
        <div className="text-center py-3">
          <i className="bi bi-dash-circle text-muted" style={{ fontSize: '2rem' }}></i>
          <div className="text-muted mt-2">No data</div>
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
          
          // Determinar color según thresholds
          let color = '#6b7280';
          for (let i = thresholds.length - 1; i >= 0; i--) {
            const threshold = thresholds[i];
            if (threshold.value === null || value >= threshold.value) {
              if (threshold.color === 'dark-green') color = '#22c55e';
              else if (threshold.color === 'dark-red') color = '#ef4444';
              else if (threshold.color === 'dark-yellow') color = '#f59e0b';
              break;
            }
          }

          return (
            <div key={key} className="col-12">
              <div style={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '6px',
                padding: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{
                  color: '#9ca3af',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {key}
                </div>
                <div style={{
                  color: color,
                  fontSize: '24px',
                  fontWeight: '700'
                }}>
                  {Math.round(value)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderChart = (panelData, height = 240) => {
    if (!panelData.data || panelData.data.length === 0) {
      return (
        <div className="d-flex flex-column justify-content-center align-items-center" style={{ height: height }}>
          <i className="bi bi-graph-up text-muted" style={{ fontSize: '2rem' }}></i>
          <small className="text-muted mt-2">Sin datos</small>
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
          <div style={{
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            color: 'white',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
          }}>
            <div style={{ marginBottom: '6px', fontWeight: '600' }}>{label}</div>
            {payload.map((entry, index) => (
              <div key={index} style={{ color: entry.color, marginBottom: '2px' }}>
                {entry.name}: <strong>{formatValue(entry.value, unit)}</strong>
              </div>
            ))}
          </div>
        );
      }
      return null;
    };

    const customStyle = fieldConfig.custom || {};
    const lineWidth = customStyle.lineWidth || 2;
    const fillOpacity = (customStyle.fillOpacity || 0) / 100;
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
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#9ca3af" hide />
          <YAxis 
            stroke="#9ca3af" 
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

  const PanelSelector = ({ type, panels, selected, setSelected }) => (
    <div style={{
      backgroundColor: '#1f2937',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '16px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <h6 style={{ margin: 0, color: 'white' }}>
          {type === 'status' ? 'Noise Peak Status' : 'Noise Peak Graph'}
        </h6>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setSelected([])}
            style={{ color: '#9ca3af', border: '1px solid #374151' }}
          >
            Limpiar
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setSelected(panels.map(p => p.id))}
            style={{ color: '#9ca3af', border: '1px solid #374151' }}
          >
            Todos
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
        {panels.map(panel => {
          const isSelected = selected.includes(panel.id);
          
          return (
            <div
              key={panel.id}
              onClick={() => {
                if (isSelected) {
                  setSelected(prev => prev.filter(id => id !== panel.id));
                } else {
                  setSelected(prev => [...prev, panel.id]);
                }
              }}
              style={{
                backgroundColor: isSelected ? '#374151' : '#111827',
                border: `2px solid ${isSelected ? '#3b82f6' : '#374151'}`,
                borderRadius: '6px',
                padding: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <div style={{
                width: '18px',
                height: '18px',
                borderRadius: '4px',
                border: `2px solid ${isSelected ? '#3b82f6' : '#6b7280'}`,
                backgroundColor: isSelected ? '#3b82f6' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {isSelected && (
                  <i className="bi bi-check" style={{ color: 'white', fontSize: '12px', fontWeight: '700' }}></i>
                )}
              </div>
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: '500',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }} title={panel.title}>
                  {panel.title}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '12px', color: '#9ca3af', fontSize: '12px' }}>
        {selected.length} de {panels.length} seleccionados
      </div>
    </div>
  );

  const SelectorModal = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      zIndex: 1000,
      display: showSelector ? 'flex' : 'none',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#1f2937',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #374151',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h5 style={{ color: 'white', margin: 0, marginBottom: '4px' }}>
              Seleccionar Paneles
            </h5>
            <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>
              Elige los paneles que deseas visualizar
            </p>
          </div>
          <button
            onClick={() => setShowSelector(false)}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              fontSize: '28px',
              cursor: 'pointer',
              padding: '0 10px',
              lineHeight: '1'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
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

        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #374151',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px'
        }}>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setShowSelector(false)}
            style={{ color: '#9ca3af', border: '1px solid #374151' }}
          >
            Cancelar
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => {
              setShowSelector(false);
              fetchAllPanelsData();
            }}
            style={{ backgroundColor: '#3b82f6', border: 'none' }}
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    fetchAllPanelsData();
    const interval = setInterval(fetchAllPanelsData, refreshInterval);
    return () => clearInterval(interval);
  }, [timeRange, selectedStatusPanels, selectedGraphPanels, refreshInterval]);

  if (loading && !dashboardInfo) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#111827',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Cargando...</span>
          </div>
          <h5 style={{ color: 'white' }}>Cargando Dashboard...</h5>
          <p style={{ color: '#9ca3af' }}>Conectando con Grafana</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#111827', color: 'white' }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#1f2937',
        borderBottom: '1px solid #374151',
        padding: '16px 20px',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <h4 style={{ margin: 0, marginBottom: '4px' }}>
              {dashboardInfo?.title || 'Noise Peak Monitor'}
            </h4>
            <div style={{ color: '#9ca3af', fontSize: '13px' }}>
              <i className="bi bi-circle-fill me-1" style={{
                color: loading ? '#f59e0b' : '#22c55e',
                fontSize: '8px'
              }}></i>
              {loading ? 'Actualizando...' : 'Conectado'} • 
              {lastUpdate ? ` ${lastUpdate.toLocaleTimeString('es-AR')}` : ' Sin datos'}
            </div>
          </div>

          <div className="d-flex gap-2 flex-wrap">
            <div className="btn-group btn-group-sm">
              {['15m', '1h', '6h', '24h', '7d'].map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  disabled={loading}
                  style={{
                    backgroundColor: timeRange === range ? '#3b82f6' : 'transparent',
                    color: timeRange === range ? 'white' : '#9ca3af',
                    border: '1px solid #374151',
                    padding: '4px 12px',
                    cursor: 'pointer'
                  }}
                >
                  {range}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowSelector(true)}
              style={{
                backgroundColor: '#3b82f6',
                border: 'none',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <i className="bi bi-sliders me-1"></i>
              Paneles
            </button>

            <button
              onClick={fetchAllPanelsData}
              disabled={loading}
              style={{
                backgroundColor: '#22c55e',
                border: 'none',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <i className="bi bi-arrow-clockwise"></i>
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {error && (
          <div className="alert alert-danger mb-4">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error.message}
          </div>
        )}

        {/* Noise Peak Status Section */}
        {selectedStatusPanels.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '2px solid #374151'
            }}>
              <div style={{
                width: '4px',
                height: '24px',
                backgroundColor: '#3b82f6',
                marginRight: '12px',
                borderRadius: '2px'
              }} />
              <h5 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: '600' }}>
                Noise Peak Status
              </h5>
              <span style={{ color: '#9ca3af', fontSize: '14px', marginLeft: '12px' }}>
                ({selectedStatusPanels.length} paneles)
              </span>
            </div>

            <div className="row g-3">
              {selectedStatusPanels.map(panelId => {
                const panel = dashboardInfo?.statusPanels.find(p => p.id === panelId);
                const panelData = panelsData[panelId];
                if (!panel || !panelData) return null;

                return (
                  <div key={panelId} className="col-6 col-sm-4 col-md-3 col-lg-2">
                    <div style={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      height: '100%'
                    }}>
                      <div style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid #374151',
                        backgroundColor: '#111827'
                      }}>
                        <div style={{
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: '600',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }} title={panel.title}>
                          {panel.title}
                        </div>
                      </div>

                      <div style={{ padding: '12px' }}>
                        {panelData.error ? (
                          <div style={{
                            backgroundColor: '#7c2d12',
                            border: '1px solid #991b1b',
                            borderRadius: '6px',
                            padding: '8px',
                            color: '#fca5a5',
                            fontSize: '11px',
                            textAlign: 'center'
                          }}>
                            Error
                          </div>
                        ) : (
                          renderStatPanel(panelData)
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Noise Peak Graph Section */}
        {selectedGraphPanels.length > 0 && (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '2px solid #374151'
            }}>
              <div style={{
                width: '4px',
                height: '24px',
                backgroundColor: '#22c55e',
                marginRight: '12px',
                borderRadius: '2px'
              }} />
              <h5 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: '600' }}>
                Noise Peak Graph
              </h5>
              <span style={{ color: '#9ca3af', fontSize: '14px', marginLeft: '12px' }}>
                ({selectedGraphPanels.length} gráficos)
              </span>
            </div>

            <div className="row g-3">
              {selectedGraphPanels.map(panelId => {
                const panel = dashboardInfo?.graphPanels.find(p => p.id === panelId);
                const panelData = panelsData[panelId];
                if (!panel || !panelData) return null;

                return (
                  <div key={panelId} className="col-12 col-xl-6">
                    <div style={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #374151',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <h6 style={{
                            margin: 0,
                            fontSize: '14px',
                            fontWeight: '600',
                            color: 'white',
                            marginBottom: '2px'
                          }}>
                            {panel.title}
                          </h6>
                          {panel.parentTitle && (
                            <div style={{
                              color: '#9ca3af',
                              fontSize: '11px'
                            }}>
                              {panel.parentTitle}
                            </div>
                          )}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {panel.alert && (
                            <div style={{
                              backgroundColor: '#7c2d12',
                              color: '#fca5a5',
                              fontSize: '9px',
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontWeight: '600'
                            }}>
                              ALERT
                            </div>
                          )}
                          <div
                            style={{
                              backgroundColor: panelData.success ? '#22c55e' : '#f59e0b',
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%'
                            }}
                            title={panelData.success ? 'Datos OK' : 'Error'}
                          />
                        </div>
                      </div>

                      <div style={{ padding: '16px' }}>
                        {panelData.error ? (
                          <div style={{
                            backgroundColor: '#7c2d12',
                            border: '1px solid #991b1b',
                            borderRadius: '6px',
                            padding: '12px',
                            color: '#fca5a5',
                            textAlign: 'center'
                          }}>
                            <i className="bi bi-exclamation-triangle me-2"></i>
                            Error al cargar datos
                          </div>
                        ) : (
                          <>
                            {renderChart(panelData, 280)}
                            
                            {/* Stats Summary */}
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                              gap: '8px',
                              marginTop: '12px'
                            }}>
                              {panelData.data && panelData.data.length > 0 && 
                                Object.keys(panelData.data[0])
                                  .filter(key => !['timestamp', 'time', 'datetime'].includes(key))
                                  .slice(0, 3)
                                  .map(key => {
                                    const values = panelData.data.map(d => d[key]).filter(v => v != null);
                                    if (values.length === 0) return null;
                                    
                                    const last = values[values.length - 1] || 0;
                                    const avg = values.reduce((a, b) => a + b, 0) / values.length || 0;
                                    const max = Math.max(...values) || 0;
                                    const unit = panelData.fieldConfig?.defaults?.unit || '';
                                    
                                    return (
                                      <div
                                        key={key}
                                        style={{
                                          backgroundColor: '#111827',
                                          borderRadius: '6px',
                                          padding: '10px',
                                          border: '1px solid #374151'
                                        }}
                                      >
                                        <div style={{
                                          color: '#9ca3af',
                                          fontSize: '10px',
                                          marginBottom: '6px',
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis'
                                        }} title={key}>
                                          {key}
                                        </div>
                                        <div style={{
                                          color: 'white',
                                          fontSize: '16px',
                                          fontWeight: '600',
                                          marginBottom: '4px'
                                        }}>
                                          {formatValue(last, unit)}
                                        </div>
                                        <div style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          fontSize: '10px',
                                          color: '#9ca3af'
                                        }}>
                                          <span>Avg: {formatValue(avg, unit)}</span>
                                          <span>Max: {formatValue(max, unit)}</span>
                                        </div>
                                      </div>
                                    );
                                  })
                              }
                            </div>
                          </>
                        )}
                      </div>

                      <div style={{
                        padding: '8px 16px',
                        borderTop: '1px solid #374151',
                        fontSize: '11px',
                        color: '#6b7280',
                        display: 'flex',
                        justifyContent: 'space-between'
                      }}>
                        <span>
                          <i className="bi bi-diagram-3 me-1"></i>
                          {panelData.data?.length || 0} puntos
                        </span>
                        <span>{timeRange}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {selectedStatusPanels.length === 0 && selectedGraphPanels.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '80px 20px',
            color: '#9ca3af'
          }}>
            <i className="bi bi-grid-3x3-gap" style={{ fontSize: '4rem', marginBottom: '20px', opacity: 0.5 }}></i>
            <h5 style={{ color: 'white', marginBottom: '12px' }}>No hay paneles seleccionados</h5>
            <p>Haz clic en "Paneles" para seleccionar las métricas que deseas visualizar</p>
            <button
              className="btn btn-primary mt-3"
              onClick={() => setShowSelector(true)}
              style={{
                backgroundColor: '#3b82f6',
                border: 'none',
                padding: '10px 24px'
              }}
            >
              <i className="bi bi-sliders me-2"></i>
              Seleccionar Paneles
            </button>
          </div>
        )}
      </div>

      <SelectorModal />

      {/* Loading Indicator */}
      {loading && dashboardInfo && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '8px',
          padding: '12px 16px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 100
        }}>
          <div className="spinner-border spinner-border-sm text-primary"></div>
          <span style={{ color: 'white', fontSize: '13px' }}>Actualizando...</span>
        </div>
      )}
    </div>
  );
};

export default GrafanaDataViewer;