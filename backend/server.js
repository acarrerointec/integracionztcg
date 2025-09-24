const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3005;

// 🔥 CONFIGURACIÓN CORS CORRECTA 🔥
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json());

// Configuración de MySQL
const db = mysql.createConnection({
  host: '192.168.10.38',
  user: 'flinkuser',
  password: 'Nueva123',
  database: 'flinkdb'
});

// Conectar a MySQL
db.connect(err => {
  if (err) {
    console.error('❌ Error conectando a MySQL:', err);
    return;
  }
  console.log('✅ Conectado a MySQL en 192.168.10.38');
});

// 🔥 RUTA GET CORRECTA 🔥
// 🔥 RUTA GET CON PAGINACIÓN 🔥
app.get('/api/tickets', (req, res) => {
  console.log('📥 Recibida petición a /api/tickets');
  
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 200; // 🔥 Límite de 200 registros por página
  const offset = (page - 1) * limit;
  
  // Consulta con paginación
  const countQuery = 'SELECT COUNT(*) as total FROM messages';
  const dataQuery = 'SELECT * FROM messages ORDER BY created_at DESC LIMIT ? OFFSET ?';
  
  // Primero obtener el total
  db.query(countQuery, (err, countResults) => {
    if (err) {
      console.error('❌ Error en count query:', err);
      return res.status(500).json({ 
        success: false, 
        error: err.message 
      });
    }
    
    const total = countResults[0].total;
    
    // Luego obtener los datos paginados
    db.query(dataQuery, [limit, offset], (err, results) => {
      if (err) {
        console.error('❌ Error en data query:', err);
        return res.status(500).json({ 
          success: false, 
          error: err.message 
        });
      }
      
      console.log(`✅ Enviando ${results.length} tickets (página ${page})`);
      res.json({ 
        success: true, 
        data: results,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    });
  });
});

// 🔥 RUTA POST 🔥
app.post('/api/tickets', (req, res) => {
  const { subject, message, created_at } = req.body;
  const query = 'INSERT INTO messages (subject, message, created_at) VALUES (?, ?, ?)';
  
  db.query(query, [subject, message, created_at], (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, id: results.insertId });
  });
});

// 🔥 RUTA PUT 🔥
app.put('/api/tickets/:id', (req, res) => {
  const { subject, message, created_at } = req.body;
  const query = 'UPDATE messages SET subject = ?, message = ?, created_at = ? WHERE id = ?';
  
  db.query(query, [subject, message, created_at, req.params.id], (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true });
  });
});


// 🔥 RUTA DE BÚSQUEDA OPTIMIZADA
app.get('/api/tickets/search', (req, res) => {
  const { q, page = 1, limit = 50 } = req.query;
  
  if (!q) {
    return res.status(400).json({ success: false, error: 'Query parameter required' });
  }
  
  const offset = (page - 1) * limit;
  const searchTerm = `%${q}%`;
  
  const countQuery = 'SELECT COUNT(*) as total FROM messages WHERE subject LIKE ? OR message LIKE ?';
  const dataQuery = 'SELECT * FROM messages WHERE subject LIKE ? OR message LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
  
  db.query(countQuery, [searchTerm, searchTerm], (err, countResults) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    
    const total = countResults[0].total;
    
    db.query(dataQuery, [searchTerm, searchTerm, parseInt(limit), offset], (err, results) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      
      res.json({
        success: true,
        data: results,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    });
  });
});

// 🔥 RUTA DELETE 🔥
app.delete('/api/tickets/:id', (req, res) => {
  const query = 'DELETE FROM messages WHERE id = ?';
  
  db.query(query, [req.params.id], (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true });
  });
});






// 🔥 RUTA DE PRUEBA 🔥
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: '✅ API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`✅ Servidor API corriendo en http://localhost:${PORT}`);
  console.log(`🔗 Endpoints disponibles:`);
  console.log(`   - GET  http://localhost:${PORT}/api/tickets`);
  console.log(`   - POST http://localhost:${PORT}/api/tickets`);
  console.log(`   - PUT  http://localhost:${PORT}/api/tickets/:id`);
  console.log(`   - DELETE http://localhost:${PORT}/api/tickets/:id`);
  console.log(`   - TEST http://localhost:${PORT}/api/test`);
});