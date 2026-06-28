const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const resultado = await pool.query("SELECT * FROM separaciones ORDER BY created_at DESC");
    res.status(200).json(resultado.rows);
  } catch (error) { res.status(500).json({ error: 'Error al obtener' }); }
});

router.post('/', async (req, res) => {
  const { cliente, productos, adelanto, total, vendedor } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN'); 

    for (let p of productos) {
      const resZap = await client.query("SELECT tallas FROM zapatillas WHERE id = $1", [p.id]);
      if (resZap.rowCount === 0) throw new Error(`El modelo ${p.nombre} ya no existe.`);

      let tallas = resZap.rows[0].tallas || [];
      let stockSuficiente = false;

      tallas = tallas.map(t => {
        if (String(t.talla) === String(p.talla)) {
          if (parseInt(t.cantidad) >= parseInt(p.cantidad)) {
            stockSuficiente = true;
            return { ...t, cantidad: parseInt(t.cantidad) - parseInt(p.cantidad) };
          }
        }
        return t;
      });

      if (!stockSuficiente) throw new Error(`No hay stock de Talla ${p.talla} para ${p.nombre}.`);
      await client.query("UPDATE zapatillas SET tallas = $1::jsonb WHERE id = $2", [JSON.stringify(tallas), p.id]);
    }

    const insertSep = `INSERT INTO separaciones (cliente, productos, adelanto, total, vendedor, estado) VALUES ($1, $2::jsonb, $3, $4, $5, 'Separado') RETURNING *;`;
    const resultSep = await client.query(insertSep, [cliente, JSON.stringify(productos), adelanto, total, vendedor]);
    
    await client.query('INSERT INTO historial (usuario, accion, detalle) VALUES ($1, $2, $3)', [vendedor, 'SEPARÓ', `Creó un pedido para ${cliente} (S/ ${total}) con ${productos.length} items.`]);
    
    await client.query('COMMIT'); 
    req.app.get('socketio').emit('inventario_cambio');
    res.status(201).json(resultSep.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK'); 
    res.status(400).json({ error: error.message || 'Error al procesar.' });
  } finally { client.release(); }
});

// ALTERNAR ESTADO (SEPARADO <-> ENTREGADO)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params; const { estado } = req.body;
    await pool.query("UPDATE separaciones SET estado = $1 WHERE id = $2", [estado, id]);
    req.app.get('socketio').emit('inventario_cambio');
    res.status(200).json({ mensaje: 'Estado actualizado' });
  } catch (error) { res.status(500).json({ error: 'Error' }); }
});

router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params; const { usuario } = req.body;

    const pedRes = await client.query("SELECT * FROM separaciones WHERE id = $1", [id]);
    if (pedRes.rowCount === 0) throw new Error('Pedido no encontrado');
    const pedido = pedRes.rows[0];

    const productos = typeof pedido.productos === 'string' ? JSON.parse(pedido.productos) : pedido.productos;
    for (let p of productos) {
      const resZap = await client.query("SELECT tallas FROM zapatillas WHERE id = $1", [p.id]);
      if (resZap.rowCount > 0) {
        let tallas = resZap.rows[0].tallas || [];
        tallas = tallas.map(t => {
          if (String(t.talla) === String(p.talla)) return { ...t, cantidad: parseInt(t.cantidad) + parseInt(p.cantidad) };
          return t;
        });
        await client.query("UPDATE zapatillas SET tallas = $1::jsonb WHERE id = $2", [JSON.stringify(tallas), p.id]);
      }
    }

    await client.query("DELETE FROM separaciones WHERE id = $1", [id]);
    await client.query('INSERT INTO historial (usuario, accion, detalle) VALUES ($1, $2, $3)', [usuario || 'ADMIN', 'ELIMINÓ', `Borró el pedido de ${pedido.cliente} y devolvió los pares al stock.`]);

    await client.query('COMMIT');
    req.app.get('socketio').emit('inventario_cambio');
    res.status(200).json({ mensaje: 'Pedido eliminado' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error al eliminar' });
  } finally { client.release(); }
});

module.exports = router;