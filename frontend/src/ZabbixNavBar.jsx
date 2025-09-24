import React, { useState } from 'react';
import {
  Navbar,
  Nav,
  Container,
  Dropdown,
  Button,
  Offcanvas,
  Badge
} from 'react-bootstrap';
import {
  Speedometer2,
  GraphUp,
  Server,
  Gear,
  List,
  Bell,
  PersonCircle,
  BoxArrowRight,
  ClipboardCheck,
  Diagram3,
  InfoCircle,
  InfoCircleFill
} from 'react-bootstrap-icons';
import './ZabbixNavBar.css';
const ZabbixNavBar = ({ onSelectComponent, activeComponent, eventCount }) => {
  const [showOffcanvas, setShowOffcanvas] = useState(false);

  const handleSelect = (component) => {
    onSelectComponent(component);
    setShowOffcanvas(false);
  };

  const menuItems = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: <Speedometer2 className="me-2" />,
      description: 'Vista general del sistema'
    },
    {
      id: 'events',
      title: 'Eventos',
      icon: <Bell className="me-2" />,
      badge: eventCount,
      description: 'Eventos y alertas del sistema'
    },

    {
      id: 'services',
      title: 'Servicios',
      icon: <Server className="me-2" />,
      description: 'Administración de servicios'
    },
    
    {
      id: 'metricas',
      title: 'Métricas',
      icon: <InfoCircleFill className="me-2" />,
      description: 'Metricas del sistema'
    },


    {
      id: 'monitoring',
      title: 'Monitoreo',
      icon: <GraphUp className="me-2" />,
      description: 'Métricas y gráficos en tiempo real'
    },


    {
      id: 'documentation',
      title: 'Documentación',
      icon: <InfoCircle className="me-2" />,
      description: 'Documentación del sistema'
    },
    {
      id: 'architecture',
      title: 'Arquitectura',
      icon: <Diagram3 className="me-2" />,
      description: 'Diagrama de arquitectura del sistema'
    },
    {
      id: 'settings',
      title: 'Configuración',
      icon: <Gear className="me-2" />,
      description: 'Configuración del sistema'
    }
  ];

  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm">
        <Container fluid>
          <Navbar.Brand href="#" className="d-flex align-items-center">
            <ClipboardCheck className="me-2" size={28} />
            <span className="fw-bold">Zabbix Admin</span>
            <Badge bg="secondary" className="ms-2">v1.0</Badge>
          </Navbar.Brand>

          {/* Menú para desktop */}
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              {menuItems.slice(0, 4).map(item => (
                <Nav.Link
                  key={item.id}
                  active={activeComponent === item.id}
                  onClick={() => handleSelect(item.id)}
                  className="d-flex align-items-center"
                >
                  {item.icon}
                  {item.title}
                  {item.badge && (
                    <Badge bg="danger" pill className="ms-2">
                      {item.badge}
                    </Badge>
                  )}
                </Nav.Link>
              ))}

              <Dropdown as={Nav.Item}>
                <Dropdown.Toggle as={Nav.Link} className="d-flex align-items-center">
                  <Gear className="me-2" />
                  Más
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  {menuItems.slice(4).map(item => (
                    <Dropdown.Item
                      key={item.id}
                      active={activeComponent === item.id}
                      onClick={() => handleSelect(item.id)}
                      className="d-flex align-items-center"
                    >
                      {item.icon}
                      {item.title}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Nav>

            <Nav className="ms-auto">


              <Dropdown as={Nav.Item} align="end">
                <Dropdown.Toggle as={Nav.Link} className="d-flex align-items-center">
                  <PersonCircle className="me-1" />
                  <span>Administrador</span>
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item>
                    <PersonCircle className="me-2" />
                    Mi Perfil
                  </Dropdown.Item>
                  <Dropdown.Item>
                    <Gear className="me-2" />
                    Configuración
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item>
                    <BoxArrowRight className="me-2" />
                    Cerrar Sesión
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Nav>
          </Navbar.Collapse>

          {/* Botón para mobile */}
          <Button
            variant="outline-light"
            className="d-lg-none"
            onClick={() => setShowOffcanvas(true)}
          >
            <List />
          </Button>
        </Container>
      </Navbar>

      {/* Offcanvas para mobile */}
      <Offcanvas show={showOffcanvas} onHide={() => setShowOffcanvas(false)} placement="end">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>
            <ClipboardCheck className="me-2" />
            Zabbix Admin
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Nav className="flex-column">
            {menuItems.map(item => (
              <Nav.Link
                key={item.id}
                active={activeComponent === item.id}
                onClick={() => handleSelect(item.id)}
                className="d-flex align-items-center py-3"
              >
                {item.icon}
                <div>
                  <div>{item.title}</div>
                  <small className="text-muted">{item.description}</small>
                </div>
                {item.badge && (
                  <Badge bg="danger" pill className="ms-auto">
                    {item.badge}
                  </Badge>
                )}
              </Nav.Link>
            ))}

            <div className="mt-4 pt-3 border-top">
              <Nav.Link className="d-flex align-items-center py-2">
                <PersonCircle className="me-2" />
                Mi Perfil
              </Nav.Link>
              <Nav.Link className="d-flex align-items-center py-2">
                <Gear className="me-2" />
                Configuración
              </Nav.Link>
              <Nav.Link className="d-flex align-items-center py-2 text-danger">
                <BoxArrowRight className="me-2" />
                Cerrar Sesión
              </Nav.Link>
            </div>
          </Nav>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
};

export default ZabbixNavBar;