const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, authorizeStaffOrAdmin } = require('../middleware/auth');

// List reservations
router.get('/', authenticate, (req, res) => {
  const { status, store_id } = req.query;
  let where = ['1=1'];
  let params = [];
  if (status) { where.push('sr.status = ?'); params.push(status); }
  if (store_id) { where.push('sr.store_id = ?'); params.push(store_id); }

  const reservations = db.prepare(`
    SELECT sr.*, pv.sku_variant, pv.size, pv.color, p.name as product_name,
           s.name as store_name, u.name as created_by_name
    FROM stock_reservations sr
    JOIN product_variants pv ON sr.variant_id = pv.id
    JOIN products p ON pv.product_id = p.id
    JOIN stores s ON sr.store_id = s.id
    LEFT JOIN users u ON sr.created_by = u.id
    WHERE ${where.join(' AND ')}
    ORDER BY sr.created_at DESC
  `).all(...params);
  res.json(reservations);
});

// Create reservation
router.post('/', authenticate, authorizeStaffOrAdmin, (req, res) => {
  const { variant_id, store_id, quantity, reason, reference_number, customer_name, customer_phone, expires_at } = req.body;
  if (!variant_id || !store_id || !quantity) {
    return res.status(400).json({ error: 'variant_id, store_id and quantity are required' });
  }

  const stock = db.prepare('SELECT * FROM variant_stock WHERE variant_id=? AND store_id=?').get(variant_id, store_id);
  if (!stock) return res.status(404).json({ error: 'Stock not found' });
  const available = stock.quantity - stock.reserved_quantity;
  if (available < Number(quantity)) return res.status(400).json({ error: `Only ${available} available` });

  const tx = db.transaction(() => {
    const result = db.prepare(
      'INSERT INTO stock_reservations (variant_id,store_id,quantity,reason,reference_number,customer_name,customer_phone,expires_at,created_by) VALUES (?,?,?,?,?,?,?,?,?)'
    ).run(variant_id, store_id, Number(quantity), reason||'hold', reference_number||'', customer_name||'', customer_phone||'', expires_at||null, req.user.id);

    db.prepare('UPDATE variant_stock SET reserved_quantity = reserved_quantity + ? WHERE variant_id=? AND store_id=?')
      .run(Number(quantity), variant_id, store_id);

    db.prepare('INSERT INTO stock_movements (variant_id,store_id,movement_type,quantity,reference_type,reference_id,created_by) VALUES (?,?,?,?,?,?,?)')
      .run(variant_id, store_id, 'RESERVED', Number(quantity), 'reservation', result.lastInsertRowid, req.user.id);

    return result.lastInsertRowid;
  });

  const id = tx();
  res.status(201).json({ id, message: 'Stock reserved' });
});

// Fulfil / cancel reservation
router.put('/:id', authenticate, authorizeStaffOrAdmin, (req, res) => {
  const { status } = req.body; // fulfilled or cancelled
  const reservation = db.prepare('SELECT * FROM stock_reservations WHERE id = ?').get(req.params.id);
  if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
  if (reservation.status !== 'active') return res.status(400).json({ error: 'Reservation is not active' });

  const tx = db.transaction(() => {
    db.prepare('UPDATE stock_reservations SET status = ? WHERE id = ?').run(status, req.params.id);
    db.prepare('UPDATE variant_stock SET reserved_quantity = MAX(0, reserved_quantity - ?) WHERE variant_id=? AND store_id=?')
      .run(reservation.quantity, reservation.variant_id, reservation.store_id);

    if (status === 'fulfilled') {
      // Deduct actual stock
      db.prepare('UPDATE variant_stock SET quantity = quantity - ? WHERE variant_id=? AND store_id=?')
        .run(reservation.quantity, reservation.variant_id, reservation.store_id);
    }

    db.prepare('INSERT INTO stock_movements (variant_id,store_id,movement_type,quantity,reference_type,reference_id,created_by) VALUES (?,?,?,?,?,?,?)')
      .run(reservation.variant_id, reservation.store_id, 'UNRESERVED', reservation.quantity, 'reservation', req.params.id, req.user.id);
  });
  tx();

  res.json({ message: `Reservation ${status}` });
});

module.exports = router;
