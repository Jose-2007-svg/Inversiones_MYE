// backend/config/db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Permite la conexión segura SSL hacia la nube de Supabase
  }
});

pool.on('connect', () => {
  console.log('✔ Base de datos PostgreSQL conectada con éxito.');
});

module.exports = pool;