const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

require('dotenv').config();

// Create Express app
const app = express();

// Create MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: 'course_publishing_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Convert pool to use promises
const promisePool = pool.promise();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Unified API endpoint logging
app.use('/api', (req, res, next) => {
  console.log(`API Request: ${req.method} ${req.path}`);
  next();
});

