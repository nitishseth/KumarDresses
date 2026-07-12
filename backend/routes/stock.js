const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, authorizeAdmin, authorizeStaffOrAdmin } = require('../middleware/auth');

// Get stock overview (all variants across all stores)
router.get('/overview', authenticate, (req, res) => {
  const { store_id, product_id, low_stock, search } = req.query;
  let where = ['pv.active = 1', 'p.active = 1'];
  let params = [];

  if (store_id) { where.push('vs.store_id = ?'); params.push(store_id); }
  if (product_id) { where.push('pv.product_id = ?'); params.push(product_id); }
  if (search) { where.push('(p.name LIKE ? OR p.sku LIKE ? OR pv.sku_variant LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

  let having = '';
  if (low_stock === '1') { having = 'HAVING total_qty <= vs.reorder_point'; }

  const rows = db.prepare(`
    SELECT pv.id as variant_id, pv.sku_variant, pv.size, pv.color, pv.fit, pv.barcode as variant_barcode,
           p.id as product_id, p.name as product_name, p.sku, p.barcode as product_barcode, p.image,
           p.mrp, p.selling_price, p.brand, p.season,
           vs.store_id, s.name as store_name, s.code as store_code,
           vs.quantity, vs.reserved_quantity, vs.reorder_point,
           (vs.quantity - vs.reserved_quantity) as available,
           vs.quantity as total_qty
    FROM variant_stock vs
    JOIN product_variants pv ON vs.variant_id = pv.id
    JOIN products p ON pv.product_id = p.id
    JOIN stores s ON vs.store_id = s.id AND s.active = 1
    WHERE ${where.join(' AND ')}
    ${having}
    ORDER BY p.name, pv.size, s.name
  `).all(...params);

  res.json(rows);
});

// Get low-stock alerts
router.get('/alerts', authenticate, (req, res) => {
  const { store_id } = req.query;
  let storeFilter = store_id ? 'AND vs.store_id = ?' : '';
  let params = store_id ? [store_id] : [];

  const alerts = db.prepare(`
    SELECT pv.id as variant_id, pv.sku_variant, pv.size, pv.color, pv.fit,
           p.name as product_name, p.sku, p.image,
           vs.store_id, s.name as store_name,
           vs.quantity, vs.reserved_quantity, vs.reorder_point,
           CASE WHEN vs.quantity = 0 THEN 'out_of_stock'
                WHEN vs.quantity <= vs.reorder_point THEN 'low_stock'
           END as alert_type
    FROM variant_stock vs
    JOIN product_variants pv ON vs.variant_id = pv.id AND pv.active = 1
    JOIN products p ON pv.product_id = p.id AND p.active = 1
    JOIN stores s ON vs.store_id = s.id AND s.active = 1
    WHERE vs.quantity <= vs.reorder_point ${storeFilter}
    ORDER BY vs.quantity ASC, p.name
  `).all(...params);

  res.json(alerts);
});

// Adjust stock (admin/staff)
router.post('/adjust', authenticate, authorizeStaffOrAdmin, (req, res) => {
  const { variant_id, store_id, quantity, type, notes, batch_number } = req.body;
  if (!variant_id || !store_id || quantity === undefined) {
    return res.status(400).json({ error: 'variant_id, store_id and quantity are required' });
  }

  const stock = db.prepare('SELECT * FROM variant_stock WHERE variant_id = ? AND store_id = ?').get(variant_id, store_id);
  if (!stock) return res.status(404).json({ error: 'Stock record not found' });

  const movementType = type || (Number(quantity) >= 0 ? 'IN' : 'OUT');
  const newQty = stock.quantity + Number(quantity);
  if (newQty < 0) return res.status(400).json({ error: 'Insufficient stock' });

  const tx = db.transaction(() => {
    db.prepare('UPDATE variant_stock SET quantity = ?, batch_number = COALESCE(?, batch_number), received_date = CURRENT_TIMESTAMP WHERE variant_id = ? AND store_id = ?')
      .run(newQty, batch_number || null, variant_id, store_id);

    db.prepare('INSERT INTO stock_movements (variant_id, store_id, movement_type, quantity, reference_type, batch_number, notes, created_by) VALUES (?,?,?,?,?,?,?,?)')
      .run(variant_id, store_id, movementType, Math.abs(Number(quantity)), 'adjustment', batch_number||null, notes||'', req.user.id);
  });
  tx();

  // Check threshold and return warning
  const updated = db.prepare('SELECT vs.*, pv.sku_variant, p.name as product_name FROM variant_stock vs JOIN product_variants pv ON vs.variant_id=pv.id JOIN products p ON pv.product_id=p.id WHERE vs.variant_id=? AND vs.store_id=?')
    .get(variant_id, store_id);

  const warning = updated.quantity <= updated.reorder_point
    ? { alert: true, message: `Low stock alert: ${updated.product_name} (${updated.sku_variant}) — only ${updated.quantity} left` }
    : null;

  res.json({ message: 'Stock adjusted', new_quantity: newQty, warning });
});

// Set reorder point
router.put('/reorder-point', authenticate, authorizeAdmin, (req, res) => {
  const { variant_id, store_id, reorder_point } = req.body;
  db.prepare('UPDATE variant_stock SET reorder_point = ? WHERE variant_id = ? AND store_id = ?')
    .run(Number(reorder_point), variant_id, store_id);
  res.json({ message: 'Reorder point updated' });
});

// Stock movement history
router.get('/movements', authenticate, (req, res) => {
  const { variant_id, store_id, type, from_date, to_date, limit = 100 } = req.query;
  let where = ['1=1'];
  let params = [];

  if (variant_id) { where.push('sm.variant_id = ?'); params.push(variant_id); }
  if (store_id) { where.push('sm.store_id = ?'); params.push(store_id); }
  if (type) { where.push('sm.movement_type = ?'); params.push(type); }
  if (from_date) { where.push('sm.created_at >= ?'); params.push(from_date); }
  if (to_date) { where.push('sm.created_at <= ?'); params.push(to_date + ' 23:59:59'); }

  const movements = db.prepare(`
    SELECT sm.*, pv.sku_variant, pv.size, pv.color, p.name as product_name, s.name as store_name, u.name as user_name
    FROM stock_movements sm
    JOIN product_variants pv ON sm.variant_id = pv.id
    JOIN products p ON pv.product_id = p.id
    JOIN stores s ON sm.store_id = s.id
    LEFT JOIN users u ON sm.created_by = u.id
    WHERE ${where.join(' AND ')}
    ORDER BY sm.created_at DESC
    LIMIT ?
  `).all(...params, Number(limit));

  res.json(movements);
});

module.exports = router;
