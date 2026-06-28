// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Ruta para iniciar sesión (Login)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña obligatorios.' });
  }

  try {
    // Buscamos el usuario en la tabla
    const consulta = 'SELECT * FROM usuarios WHERE username = $1;';
    const resultado = await pool.query(consulta, [username]);

    // Si no encuentra al usuario
    if (resultado.rowCount === 0) {
      return res.status(401).json({ error: 'El usuario no existe.' });
    }

    const usuario = resultado.rows[0];

    // Validamos la contraseña (texto plano para el MVP académico)
    if (usuario.password !== password) {
      return res.status(401).json({ error: 'Contraseña incorrecta.' });
    }

    // Si todo coincide, respondemos con éxito y mandamos el rol
    res.status(200).json({
      mensaje: '¡Ingreso exitoso!',
      usuario: {
        id: usuario.id,
        username: usuario.username,
        rol: usuario.rol
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno en el servidor durante el login.' });
  }
});

module.exports = router;