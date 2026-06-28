// backend/routes/historial.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Ruta para pedir los últimos 50 movimientos
router.get('/', async (req, res) => {
  try {
    const consulta = 'SELECT * FROM historial ORDER BY created_at DESC LIMIT 50;';
    const resultado = await pool.query(consulta);
    res.status(200).json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el historial de movimientos.' });
  }
});

module.exports = router;