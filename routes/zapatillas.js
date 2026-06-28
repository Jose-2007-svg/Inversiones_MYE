const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// CREAR
router.post('/', async (req, res) => {
  const { codigo, nombre, categoria, tallas, colores, foto_principal, galeria, usuario } = req.body;
  if (!codigo || !nombre || !categoria) return res.status(400).json({ error: 'Faltan campos obligatorios.' });

  try {
    const consulta = `
      INSERT INTO zapatillas (codigo, nombre, categoria, tallas, colores, foto_principal, galeria)
      VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7::jsonb) RETURNING *;
    `;
    const valores = [codigo, nombre, categoria, JSON.stringify(tallas || []), JSON.stringify(colores || []), foto_principal, JSON.stringify(galeria || [])];
    const resultado = await pool.query(consulta, valores);

    if (usuario) await pool.query('INSERT INTO historial (usuario, accion, detalle) VALUES ($1, $2, $3)', [usuario, 'AGREGÓ', `Registró el modelo: ${nombre} (${codigo})`]);
    req.app.get('socketio').emit('inventario_cambio');
    res.status(201).json({ mensaje: 'Registrada', zapatilla: resultado.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'El código ya existe.' });
    res.status(500).json({ error: 'Error interno al guardar.' });
  }
});

// LEER
router.get('/', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM zapatillas ORDER BY created_at DESC;');
    res.status(200).json(resultado.rows);
  } catch (error) { res.status(500).json({ error: 'Error al obtener.' }); }
});

// ELIMINAR
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params; const { usuario, modelo } = req.body;
    const resultado = await pool.query('DELETE FROM zapatillas WHERE id = $1 RETURNING *;', [id]);
    if (resultado.rowCount === 0) return res.status(404).json({ error: 'No encontrada.' });

    if (usuario && modelo) await pool.query('INSERT INTO historial (usuario, accion, detalle) VALUES ($1, $2, $3)', [usuario, 'ELIMINÓ', `Eliminó permanentemente el modelo: ${modelo}`]);
    req.app.get('socketio').emit('inventario_cambio');
    res.status(200).json({ mensaje: 'Eliminada.' });
  } catch (error) { res.status(500).json({ error: 'Error al eliminar.' }); }
});

// ACTUALIZAR
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, nombre, categoria, tallas, colores, foto_principal, galeria, usuario } = req.body;

    const consulta = `
      UPDATE zapatillas SET codigo = $1, nombre = $2, categoria = $3, tallas = $4::jsonb, colores = $5::jsonb, foto_principal = $6, galeria = $7::jsonb
      WHERE id = $8 RETURNING *;
    `;
    const valores = [codigo, nombre, categoria, JSON.stringify(tallas || []), JSON.stringify(colores || []), foto_principal, JSON.stringify(galeria || []), id];
    const resultado = await pool.query(consulta, valores);

    if (resultado.rowCount === 0) return res.status(404).json({ error: 'No encontrada.' });
    if (usuario) await pool.query('INSERT INTO historial (usuario, accion, detalle) VALUES ($1, $2, $3)', [usuario, 'EDITÓ', `Modificó los datos del modelo: ${nombre}`]);
    
    req.app.get('socketio').emit('inventario_cambio');
    res.status(200).json({ mensaje: 'Actualizada' });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'El código ya existe.' });
    res.status(500).json({ error: 'Error al actualizar.' });
  }
});

module.exports = router;