const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const client = require('prom-client');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'appdb',
  user: process.env.DB_USER || 'appuser',
  password: process.env.DB_PASSWORD || 'apppass123',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Prometheus metrics setup
const register = new client.Registry();

// Default metrics (CPU, Memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const dbConnectionsActive = new client.Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections'
});

const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5]
});

const dbOperationsTotal = new client.Counter({
  name: 'db_operations_total',
  help: 'Total number of database operations',
  labelNames: ['operation', 'status']
});

// Register custom metrics
register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDuration);
register.registerMetric(dbConnectionsActive);
register.registerMetric(dbQueryDuration);
register.registerMetric(dbOperationsTotal);

// Middleware to collect HTTP metrics
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    
    httpRequestsTotal.inc({
      method: req.method,
      route: route,
      status_code: res.statusCode
    });
    
    httpRequestDuration.observe({
      method: req.method,
      route: route,
      status_code: res.statusCode
    }, duration);
  });
  
  next();
});

// Update DB connection metrics periodically
setInterval(() => {
  dbConnectionsActive.set(pool.totalCount);
}, 5000);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      db_time: result.rows[0].now
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Insert data endpoint
app.post('/data', async (req, res) => {
  const startTime = Date.now();
  let client;
  
  try {
    const { name, email, message } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    
    client = await pool.connect();
    const query = 'INSERT INTO user_data (name, email, message, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *';
    const values = [name, email, message || ''];
    
    const result = await client.query(query, values);
    
    // Record successful DB operation
    const duration = (Date.now() - startTime) / 1000;
    dbQueryDuration.observe({ operation: 'insert' }, duration);
    dbOperationsTotal.inc({ operation: 'insert', status: 'success' });
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    // Record failed DB operation
    const duration = (Date.now() - startTime) / 1000;
    dbQueryDuration.observe({ operation: 'insert' }, duration);
    dbOperationsTotal.inc({ operation: 'insert', status: 'error' });
    
    console.error('Database error:', error);
    res.status(500).json({ 
      error: 'Failed to insert data',
      message: error.message 
    });
  } finally {
    if (client) client.release();
  }
});

// Get data endpoint
app.get('/data', async (req, res) => {
  const startTime = Date.now();
  let client;
  
  try {
    client = await pool.connect();
    const query = 'SELECT * FROM user_data ORDER BY created_at DESC LIMIT 100';
    
    const result = await client.query(query);
    
    // Record successful DB operation
    const duration = (Date.now() - startTime) / 1000;
    dbQueryDuration.observe({ operation: 'select' }, duration);
    dbOperationsTotal.inc({ operation: 'select', status: 'success' });
    
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
    
  } catch (error) {
    // Record failed DB operation
    const duration = (Date.now() - startTime) / 1000;
    dbQueryDuration.observe({ operation: 'select' }, duration);
    dbOperationsTotal.inc({ operation: 'select', status: 'error' });
    
    console.error('Database error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve data',
      message: error.message 
    });
  } finally {
    if (client) client.release();
  }
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error);
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Metrics available at http://localhost:${PORT}/metrics`);
  console.log(`🏥 Health check at http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});