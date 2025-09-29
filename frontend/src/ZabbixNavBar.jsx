import React, { useState, useEffect } from 'react';
import {
  Navbar,
  Nav,
  Container,
  Dropdown,
  Button,
  Offcanvas,
  Badge,
  Tooltip,
  OverlayTrigger
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
  BarChartLine
} from 'react-bootstrap-icons';
import { useAuth } from './AuthContext';
import PropTypes from 'prop-types';
import './ZabbixNavBar.css';

const ZabbixNavBar = ({ onSelectComponent, activeComponent, eventCount }) => {
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { currentUser, logout } = useAuth();

  // Efecto para detectar scroll
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      setScrolled(isScrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSelect = (component) => {
    onSelectComponent(component);
    setShowOffcanvas(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const getUserDisplayName = () => {
    if (!currentUser) return 'Usuario';
    return currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario';
  };

  const getUserInitials = () => {
    const displayName = getUserDisplayName();
    return displayName
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const menuItems = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: <Speedometer2 className="me-2" />,
      description: 'Vista general del sistema',
      category: 'main'
    },
    {
      id: 'events',
      title: 'Eventos',
      icon: <Bell className="me-2" />,
      description: 'Eventos y alertas del sistema',
      category: 'main',
      badge: eventCount
    },
    {
      id: 'services',
      title: 'Servicios',
      icon: <Server className="me-2" />,
      description: 'Administración de servicios',
      category: 'main'
    },
    {
      id: 'metricas',
      title: 'Métricas',
      icon: <BarChartLine className="me-2" />,
      description: 'Métricas del sistema',
      category: 'main'
    },
    {
      id: 'monitoring',
      title: 'Monitoreo',
      icon: <GraphUp className="me-2" />,
      description: 'Métricas y gráficos en tiempo real',
      category: 'secondary'
    },
    {
      id: 'documentation',
      title: 'Documentación',
      icon: <InfoCircle className="me-2" />,
      description: 'Documentación del sistema',
      category: 'secondary'
    },
    {
      id: 'architecture',
      title: 'Arquitectura',
      icon: <Diagram3 className="me-2" />,
      description: 'Diagrama de arquitectura del sistema',
      category: 'secondary'
    },
    {
      id: 'settings',
      title: 'Configuración',
      icon: <Gear className="me-2" />,
      description: 'Configuración del sistema',
      category: 'secondary'
    }
  ];

  const mainItems = menuItems.filter(item => item.category === 'main');
  const secondaryItems = menuItems.filter(item => item.category === 'secondary');

  const renderTooltip = (text) => (
    <Tooltip id={`tooltip-${text}`}>{text}</Tooltip>
  );

  return (
    <>
      <Navbar 
        bg="dark" 
        variant="dark" 
        expand="lg" 
        fixed="top"
        className={`zabbix-navbar ${scrolled ? 'scrolled' : ''}`}
      >
        <Container fluid>
          <Navbar.Brand href="#dashboard" className="d-flex align-items-center">
            <ClipboardCheck className="me-2" size={28} />
            <span className="fw-bold">Systems Integration</span>
            <Badge bg="primary" className="ms-2">v1</Badge>
          </Navbar.Brand>

          <Navbar.Toggle 
            aria-controls="basic-navbar-nav" 
            className="d-lg-none"
          >
            <List />
          </Navbar.Toggle>

          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              {mainItems.map(item => (
                <OverlayTrigger
                  key={item.id}
                  placement="bottom"
                  overlay={renderTooltip(item.description)}
                >
                  <Nav.Link
                    active={activeComponent === item.id}
                    onClick={() => handleSelect(item.id)}
                    className="d-flex align-items-center nav-link-custom"
                  >
                    {item.icon}
                    <span className="nav-link-text">{item.title}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <Badge bg="danger" pill className="ms-2">
                        {item.badge > 99 ? '99+' : item.badge}
                      </Badge>
                    )}
                  </Nav.Link>
                </OverlayTrigger>
              ))}

              <Dropdown as={Nav.Item}>
                <OverlayTrigger
                  placement="bottom"
                  overlay={renderTooltip('Más opciones')}
                >
                  <Dropdown.Toggle as={Nav.Link} className="d-flex align-items-center">
                    <Gear className="me-2" />
                    <span className="nav-link-text">Más</span>
                  </Dropdown.Toggle>
                </OverlayTrigger>
                <Dropdown.Menu className="dropdown-menu-dark">
                  {secondaryItems.map(item => (
                    <Dropdown.Item
                      key={item.id}
                      active={activeComponent === item.id}
                      onClick={() => handleSelect(item.id)}
                      className="d-flex align-items-center"
                    >
                      {item.icon}
                      <div>
                        <div>{item.title}</div>
                        <small className="text-muted">{item.description}</small>
                      </div>
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Nav>

            <Nav className="ms-auto">
              <Dropdown as={Nav.Item} align="end">
                <Dropdown.Toggle as={Nav.Link} className="d-flex align-items-center user-dropdown">
                  <div className="user-avatar me-2">
                    {getUserInitials()}
                  </div>
                  <span className="user-name">{getUserDisplayName()}</span>
                </Dropdown.Toggle>
                <Dropdown.Menu className="dropdown-menu-dark">
                  <Dropdown.Header>
                    <div className="d-flex align-items-center">
                      <div className="user-avatar me-2">
                        {getUserInitials()}
                      </div>
                      <div>
                        <div className="fw-bold">{getUserDisplayName()}</div>
                        <small className="text-muted">{currentUser?.email}</small>
                      </div>
                    </div>
                  </Dropdown.Header>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={() => handleSelect('profile')}>
                    <PersonCircle className="me-2" />
                    Mi Perfil
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => handleSelect('settings')}>
                    <Gear className="me-2" />
                    Configuración
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={handleLogout} className="text-danger">
                    <BoxArrowRight className="me-2" />
                    Cerrar Sesión
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Espacio para el navbar fixed */}
      <div style={{ height: '76px' }} />

      {/* Offcanvas para mobile */}
      <Offcanvas 
        show={showOffcanvas} 
        onHide={() => setShowOffcanvas(false)} 
        placement="end"
        className="offcanvas-dark"
      >
        <Offcanvas.Header closeButton className="border-bottom">
          <Offcanvas.Title className="d-flex align-items-center">
            <ClipboardCheck className="me-2" />
            <span className="fw-bold">System Integration</span>
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Nav className="flex-column">
            {menuItems.map(item => (
              <Nav.Link
                key={item.id}
                active={activeComponent === item.id}
                onClick={() => handleSelect(item.id)}
                className="d-flex align-items-center py-3 offcanvas-nav-link"
              >
                {item.icon}
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center">
                    <span>{item.title}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <Badge bg="danger" pill className="ms-2">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  <small className="text-muted">{item.description}</small>
                </div>
              </Nav.Link>
            ))}

            <div className="mt-4 pt-3 border-top">
              <div className="px-3 py-2 text-muted small">
                Conectado como: <strong>{getUserDisplayName()}</strong>
              </div>
              <Nav.Link 
                className="d-flex align-items-center py-2"
                onClick={() => handleSelect('profile')}
              >
                <PersonCircle className="me-2" />
                Mi Perfil
              </Nav.Link>
              <Nav.Link 
                className="d-flex align-items-center py-2"
                onClick={() => handleSelect('settings')}
              >
                <Gear className="me-2" />
                Configuración
              </Nav.Link>
              <Nav.Link 
                className="d-flex align-items-center py-2 text-danger" 
                onClick={handleLogout}
              >
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

ZabbixNavBar.propTypes = {
  onSelectComponent: PropTypes.func.isRequired,
  activeComponent: PropTypes.string,
  eventCount: PropTypes.number
};

ZabbixNavBar.defaultProps = {
  activeComponent: 'dashboard',
  eventCount: 0
};

export default ZabbixNavBar;