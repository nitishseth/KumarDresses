const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, authorizeStaffOrAdmin } = require('../middleware/auth');

// List reservations
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, store_id } = req.query;
    let where = ['1=1'];
    let params = [];
    let paramIndex = 1;
    if (status) { where.push(`sr.status = $${paramIndex++}`); params.push(status); }
    if (store_id) { where.push(`sr.store_id = $${paramIndex++}`); params.push(store_id); }

    const { rows } = await db.query(`
      SELECT sr.*, pv.sku_variant, pv.size, pv.color, p.name as product_name,
             s.name as store_name, u.name as created_by_name
      FROM stock_reservations sr
      JOIN product_variants pv ON sr.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      JOIN stores s ON sr.store_id = s.id
      LEFT JOIN users u ON sr.created_by = u.id
      WHERE ${where.join(' AND ')}
      ORDER BY sr.created_at DESC
    `, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create reservation
router.post('/', authenticate, authorizeStaffOrAdmin, async (req, res) => {
  const client = await db.getClient();
  try {
    const { variant_id, store_id, quantity, reason, reference_number, customer_name, customer_phone, expires_at } = req.body;
    if (!variant_id || !store_id || !quantity) {
      client.release();
      return res.status(400).json({ error: 'variant_id, store_id and quantity are required' });
    }

    const { rows } = await client.query('SELECT * FROM variant_stock WHERE variant_id=$1 AND store_id=$2', [variant_id, store_id]);
    if (!rows[0]) { client.release(); return res.status(404).json({ error: 'Stock not found' }); }
    const stock = rows[0];
    const available = stock.quantity - stock.reserved_quantity;
    if (available < Number(quantity)) { client.release(); return res.status(400).json({ error: `Only ${available} available` }); }

    await client.query('BEGIN');

    const result = await client.query(
      'INSERT INTO stock_reservations (variant_id,store_id,quantity,reason,reference_number,customer_name,customer_phone,expires_at,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
      [variant_id, store_id, Number(quantity), reason || 'hold', reference_number || '', customer_name || '', customer_phone || '', expires_at || null, req.user.id]
    );
    const reservationId = result.rows[0].id;

    await client.query('UPDATE variant_stock SET reserved_quantity = reserved_quantity + $1 WHERE variant_id=$2 AND store_id=$3',
      [Number(quantity), variant_id, store_id]);

    await client.query(
      'INSERT INTO stock_movements (variant_id,store_id,movement_type,quantity,reference_type,reference_id,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [variant_id, store_id, 'RESERVED', Number(quantity), 'reservation', reservationId, req.user.id]
    );

    await client.query('COMMIT');
    res.status(201).json({ id: reservationId, message: 'Stock reserved' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Fulfil / cancel reservation
router.put('/:id', authenticate, authorizeStaffOrAdmin, async (req, res) => {
  const client = await db.getClient();
  try {
    const { status } = req.body;
    const { rows } = await client.query('SELECT * FROM stock_reservations WHERE id = $1', [req.params.id]);
    if (!rows[0]) { client.release(); return res.status(404).json({ error: 'Reservation not found' }); }
    const reservation = rows[0];
    if (reservation.status !== 'active') { client.release(); return res.status(400).json({ error: 'Reservation is not active' }); }

    await client.query('BEGIN');

    await client.query('UPDATE stock_reservations SET status = $1 WHERE id = $2', [status, req.params.id]);
    await client.query('UPDATE variant_stock SET reserved_quantity = GREATEST(0, reserved_quantity - $1) WHERE variant_id=$2 AND store_id=$3',
      [reservation.quantity, reservation.variant_id, reservation.store_id]);

    if (status === 'fulfilled') {
      await client.query('UPDATE variant_stock SET quantity = quantity - $1 WHERE variant_id=$2 AND store_id=$3',
        [reservation.quantity, reservation.variant_id, reservation.store_id]);
    }

    await client.query(
      'INSERT INTO stock_movements (variant_id,store_id,movement_type,quantity,reference_type,reference_id,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [reservation.variant_id, reservation.store_id, 'UNRESERVED', reservation.quantity, 'reservation', req.params.id, req.user.id]
    );

    await client.query('COMMIT');
    res.json({ message: `Reservation ${status}` });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
