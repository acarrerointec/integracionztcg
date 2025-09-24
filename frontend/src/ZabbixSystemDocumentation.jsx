import React, { useState } from 'react';
import { Container, Row, Col, Card, Accordion, Badge, ListGroup} from 'react-bootstrap';
import zabbix from './assets/zabbix.png';

const ZabbixSystemDocumentation = () => {
  const [activeKey, setActiveKey] = useState('0');

  return (
    <Container className="py-4">

      <h1 className="text-center mb-4">Sistema de Administración Zabbix</h1>
          <div className="text-center mb-4">
                          <img 
                            src={zabbix}
                            alt="Logo" 
                            className=" img-fluid"
                            style={{ width: '240', height: '200' }}
                          />
                         
                        </div>
      <Row className="mb-5">
        <Col>
          <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h3 className="mb-0">Diagrama de Arquitectura</h3>
            </Card.Header>
            <Card.Body>
              <div className="architecture-diagram p-3 bg-light rounded">
                <div className="text-center mb-3">
                  <div className="d-flex justify-content-center flex-wrap">
                    <div className="system-layer m-2 p-3 bg-info text-white rounded">
                      <h5>Frontend</h5>
                      <div>React/Vite</div>
                      <div>Bootstrap</div>
                    </div>
                    
                    <div className="system-layer m-2 p-3 bg-warning text-dark rounded">
                      <h5>Backend</h5>
                      <div>Node.js/Express</div>
                      <div>Middleware</div>
                    </div>
                    
                    <div className="system-layer m-2 p-3 bg-success text-white rounded">
                      <h5>Infraestructura</h5>
                      <div>Zabbix API</div>
                      <div>RabbitMQ</div>
                      <div>MySQL</div>
                      <div>Grafana</div>
                    </div>
                  </div>
                  
                  <div className="arrows my-3">
                    <div className="d-flex justify-content-around">
                      <div>↓</div>
                      <div>↓</div>
                      <div>↓</div>
                    </div>
                  </div>
                  
                  <div className="data-flow">
                    <Row>
                      <Col md={4}>
                        <div className="p-2 bg-light border rounded">
                          <strong>Consola Zabbix</strong>
                          <div className="small">Push de eventos</div>
                        </div>
                      </Col>
                      <Col md={4}>
                        <div className="p-2 bg-light border rounded">
                          <strong>Procesamiento</strong>
                          <div className="small">Middleware</div>
                        </div>
                      </Col>
                      <Col md={4}>
                        <div className="p-2 bg-light border rounded">
                          <strong>Visualización</strong>
                          <div className="small">Dashboard</div>
                        </div>
                      </Col>
                    </Row>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Accordion activeKey={activeKey} onSelect={(key) => setActiveKey(key)}>
        {/* Resumen del Sistema */}
        <Accordion.Item eventKey="0">
          <Accordion.Header>
            <h5 className="mb-0">Resumen del Sistema de Administración Zabbix</h5>
          </Accordion.Header>
          <Accordion.Body>
            <Row>
              <Col md={6}>
                <h6>Flujo de Datos</h6>
                <ListGroup variant="flush">
                  <ListGroup.Item>1. Recolección de eventos desde la consola de Zabbix</ListGroup.Item>
                  <ListGroup.Item>2. Procesamiento mediante middleware y RabbitMQ</ListGroup.Item>
                  <ListGroup.Item>3. Almacenamiento en base de datos MySQL</ListGroup.Item>
                  <ListGroup.Item>4. Visualización en dashboard React con Bootstrap</ListGroup.Item>
                  <ListGroup.Item>5. Análisis avanzado con Grafana</ListGroup.Item>
                </ListGroup>
              </Col>
              <Col md={6}>
                <h6>Tecnologías por Capa</h6>
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Capa</th>
                      <th>Tecnologías</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Frontend</td>
                      <td>React, Vite, Bootstrap, Axios</td>
                    </tr>
                    <tr>
                      <td>Backend</td>
                      <td>Node.js, Express, MySQL2</td>
                    </tr>
                    <tr>
                      <td>Almacenamiento</td>
                      <td>MySQL</td>
                    </tr>
                    <tr>
                      <td>Mensajería</td>
                      <td>RabbitMQ</td>
                    </tr>
                    <tr>
                      <td>Monitoreo</td>
                      <td>Zabbix API, Grafana</td>
                    </tr>
                  </tbody>
                </table>
              </Col>
            </Row>
          </Accordion.Body>
        </Accordion.Item>

        {/* Características Clave */}
        <Accordion.Item eventKey="1">
          <Accordion.Header>
            <h5 className="mb-0">Características Clave</h5>
          </Accordion.Header>
          <Accordion.Body>
            <Row>
              <Col md={4} className="mb-3">
                <Card className="h-100">
                  <Card.Body className="text-center">
                    <div className="display-4 text-primary mb-2">⏱</div>
                    <Card.Title>Interfaz en Tiempo Real</Card.Title>
                    <Card.Text>
                      Actualizaciones automáticas con WebSockets para monitoreo continuo
                    </Card.Text>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4} className="mb-3">
                <Card className="h-100">
                  <Card.Body className="text-center">
                    <div className="display-4 text-success mb-2">📊</div>
                    <Card.Title>Clasificación Inteligente</Card.Title>
                    <Card.Text>
                      Priorización automática de eventos (alto, medio, bajo) con semáforo visual
                    </Card.Text>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4} className="mb-3">
                <Card className="h-100">
                  <Card.Body className="text-center">
                    <div className="display-4 text-warning mb-2">💾</div>
                    <Card.Title>Almacenamiento Persistente</Card.Title>
                    <Card.Text>
                      Base de datos MySQL para análisis histórico y reporting
                    </Card.Text>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4} className="mb-3">
                <Card className="h-100">
                  <Card.Body className="text-center">
                    <div className="display-4 text-info mb-2">🚦</div>
                    <Card.Title>Indicadores Visuales</Card.Title>
                    <Card.Text>
                      Sistema de semáforo para estado de servicios con animaciones
                    </Card.Text>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4} className="mb-3">
                <Card className="h-100">
                  <Card.Body className="text-center">
                    <div className="display-4 text-danger mb-2">📈</div>
                    <Card.Title>Arquitectura Escalable</Card.Title>
                    <Card.Text>
                      Separación de responsabilidades y microservicios
                    </Card.Text>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4} className="mb-3">
                <Card className="h-100">
                  <Card.Body className="text-center">
                    <div className="display-4 text-secondary mb-2">🔌</div>
                    <Card.Title>Integración Grafana</Card.Title>
                    <Card.Text>
                      Dashboards avanzados para análisis detallado de métricas
                    </Card.Text>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Accordion.Body>
        </Accordion.Item>

        {/* Configuración Requerida */}
        <Accordion.Item eventKey="2">
          <Accordion.Header>
            <h5 className="mb-0">Configuración Requerida</h5>
          </Accordion.Header>
          <Accordion.Body>
            <Row>
              <Col md={6}>
                <h6>Variables de Entorno</h6>
                <ListGroup variant="flush">
                  <ListGroup.Item>
                    <Badge bg="primary" className="me-2">ZABBIX_API_URL</Badge>
                    URL del API de Zabbix
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <Badge bg="primary" className="me-2">ZABBIX_API_TOKEN</Badge>
                    Token de autenticación (c830f668...)
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <Badge bg="primary" className="me-2">RABBITMQ_URL</Badge>
                    URL de conexión a RabbitMQ
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <Badge bg="primary" className="me-2">DB_HOST</Badge>
                    Host de la base de datos MySQL
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <Badge bg="primary" className="me-2">DB_NAME</Badge>
                    Nombre de la base de datos
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <Badge bg="primary" className="me-2">DB_USER</Badge>
                    Usuario de MySQL
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <Badge bg="primary" className="me-2">DB_PASSWORD</Badge>
                    Contraseña de MySQL
                  </ListGroup.Item>
                </ListGroup>
              </Col>
              <Col md={6}>
                <h6>Servicios Externos</h6>
                <ListGroup variant="flush">
                  <ListGroup.Item>
                    <Badge bg="success" className="me-2">Zabbix Server</Badge>
                    Con API JSON-RPC habilitada
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <Badge bg="success" className="me-2">RabbitMQ</Badge>
                    Instancia ejecutándose en el puerto 5672
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <Badge bg="success" className="me-2">MySQL</Badge>
                    Base de datos con privilegios adecuados
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <Badge bg="success" className="me-2">Grafana</Badge>
                    Instancia configurada con MySQL como fuente
                  </ListGroup.Item>
                </ListGroup>
                
                <h6 className="mt-4">Estructura de Carpetas</h6>
                <div className="bg-light p-3 small rounded">
                  <div>zabbix-admin/</div>
                  <div className="ms-3">frontend/</div>
                  <div className="ms-5">src/</div>
                  <div className="ms-5">components/</div>
                  <div className="ms-5">hooks/</div>
                  <div className="ms-5">services/</div>
                  <div className="ms-3">backend/</div>
                  <div className="ms-5">config/</div>
                  <div className="ms-5">models/</div>
                  <div className="ms-5">routes/</div>
                  <div className="ms-3">docs/</div>
                </div>
              </Col>
            </Row>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    </Container>
  );
};

export default ZabbixSystemDocumentation;