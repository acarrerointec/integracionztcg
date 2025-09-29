import React from 'react';
import { Spinner, Container } from 'react-bootstrap';

const LoadingSpinner = () => (
  <Container fluid className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
    <div className="text-center">
      <Spinner animation="border" role="status" variant="primary" style={{ width: '3rem', height: '3rem' }}>
        <span className="visually-hidden">Cargando...</span>
      </Spinner>
      <p className="mt-3 text-muted">Cargando aplicación...</p>
    </div>
  </Container>
);

export default LoadingSpinner;