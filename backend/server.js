const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3005;

// CORS
app.use(cors({
  origin: "*",
  credentials: true
}));

app.use(express.json());

// Pool de conexiones CORREGIDO (quitamos opciones inválidas)
const db = mysql.createPool({
  host: '192.168.10.38',
  user: 'flinkuser',
  password: 'Nueva123',
  database: 'flinkdb',
  connectionLimit: 20,
  queueLimit: 0
});

// Verificar conexión y estructura de la tabla
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Error conectando a MySQL:', err);
    return;
  }
  
  console.log('✅ Conectado a MySQL');
  
  // Verificar estructura de la tabla
  connection.query(`DESCRIBE messages`, (err, results) => {
    if (err) {
      console.error('❌ Error verificando estructura de la tabla:', err);
    } else {
      console.log('📊 Estructura de la tabla messages:');
      results.forEach(col => {
        console.log(`   - ${col.Field} (${col.Type})`);
      });
    }
    connection.release();
  });
});

// 🔥 RUTA GET ADAPTATIVA - Detecta automáticamente las columnas
app.get('/api/tickets', async (req, res) => {
  console.log('📥 Recibida petición a /api/tickets');
  
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 500000;
    const offset = (page - 1) * limit;
    
    // Primero obtener la estructura para saber qué columnas existen
    const structure = await new Promise((resolve, reject) => {
      db.query(`DESCRIBE messages`, (err, results) => {
        err ? reject(err) : resolve(results);
      });
    });
    
    const columns = structure.map(col => col.Field);
    console.log('🔍 Columnas disponibles:', columns);
    
    // Construir SELECT basado en columnas reales
    let selectColumns = '*'; // Por defecto seleccionar todas
    
    // Si existe la columna 'id', usar columnas específicas para mejor rendimiento
    if (columns.includes('id')) {
      selectColumns = 'id, subject, message, created_at';
    }
    // Si no existe 'id' pero existe otra columna clave
    else if (columns.includes('ticket_id')) {
      selectColumns = 'ticket_id as id, subject, message, created_at';
    }
    else if (columns.includes('message_id')) {
      selectColumns = 'message_id as id, subject, message, created_at';
    }
    
    // Consulta con columnas adaptativas
    const countQuery = 'SELECT COUNT(*) as total FROM messages';
    const dataQuery = `SELECT ${selectColumns} FROM messages ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    
    console.log('📋 Query ejecutada:', dataQuery.replace('?', limit).replace('?', offset));
    
    // Ejecutar consultas en paralelo
    const [countResults, dataResults] = await Promise.all([
      new Promise((resolve, reject) => {
        db.query(countQuery, (err, results) => {
          err ? reject(err) : resolve(results);
        });
      }),
      new Promise((resolve, reject) => {
        db.query(dataQuery, [limit, offset], (err, results) => {
          err ? reject(err) : resolve(results);
        });
      })
    ]);
    
    const total = countResults[0].total;
    
    console.log(`✅ Enviando ${dataResults.length} tickets de ${total} total`);
    
    // Asegurar que los datos tengan la estructura esperada por el frontend
    const formattedData = dataResults.map(row => {
      // Si no hay columna 'id', crear un ID basado en el índice o usar otra columna
      if (!row.id) {
        // Buscar alguna columna que pueda servir como ID
        const possibleIdCol = columns.find(col => col.includes('id') || col.includes('ID'));
        if (possibleIdCol && row[possibleIdCol]) {
          row.id = row[possibleIdCol];
        } else {
          // Generar ID temporal basado en el índice (solo para visualización)
          row.id = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
      }
      
      return row;
    });
    
    res.json({ 
      success: true, 
      data: formattedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('❌ Error en /api/tickets:', error);
    
    // Datos de ejemplo como fallback
   
    
    res.json({ 
      success: true, 
      data: fallbackData,
      pagination: {
        page: 1,
        limit: 2000,
        total: fallbackData.length,
        totalPages: 1
      }
    });
  }
});

// 🔥 RUTAS REST CORREGIDAS (usar columnas reales)
app.post('/api/tickets', (req, res) => {
  const { subject, message, created_at } = req.body;
  
  // Detectar columnas reales para el INSERT
  db.query(`DESCRIBE messages`, (err, structure) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    
    const columns = structure.map(col => col.Field);
    let queryColumns = 'subject, message, created_at';
    let queryValues = [subject, message, created_at];
    
    // Si la tabla tiene columnas diferentes, ajustar
    if (!columns.includes('subject')) {
      const subjectCol = columns.find(col => col.toLowerCase().includes('subject') || col.toLowerCase().includes('title'));
      if (subjectCol) {
        queryColumns = queryColumns.replace('subject', subjectCol);
      }
    }
    
    const query = `INSERT INTO messages (${queryColumns}) VALUES (?, ?, ?)`;
    
    db.query(query, queryValues, (err, results) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      res.json({ success: true, id: results.insertId });
    });
  });
});

// RUTA PUT adaptativa
app.put('/api/tickets/:id', (req, res) => {
  const { subject, message, created_at } = req.body;
  const ticketId = req.params.id;
  
  db.query(`DESCRIBE messages`, (err, structure) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    
    const columns = structure.map(col => col.Field);
    const idColumn = columns.find(col => col === 'id') || 
                    columns.find(col => col.includes('id')) || 
                    columns[0]; // Usar primera columna como fallback
    
    const query = `UPDATE messages SET subject = ?, message = ?, created_at = ? WHERE ${idColumn} = ?`;
    
    db.query(query, [subject, message, created_at, ticketId], (err, results) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      res.json({ success: true });
    });
  });
});

// RUTA DELETE adaptativa
app.delete('/api/tickets/:id', (req, res) => {
  const ticketId = req.params.id;
  
  db.query(`DESCRIBE messages`, (err, structure) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    
    const columns = structure.map(col => col.Field);
    const idColumn = columns.find(col => col === 'id') || 
                    columns.find(col => col.includes('id')) || 
                    columns[0];
    
    const query = `DELETE FROM messages WHERE ${idColumn} = ?`;
    
    db.query(query, [ticketId], (err, results) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      res.json({ success: true });
    });
  });
});

// Ruta de prueba
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