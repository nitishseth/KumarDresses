const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, authorizeAdmin, authorizeStaffOrAdmin } = require('../middleware/auth');

// Get stock overview
router.get('/overview', authenticate, async (req, res) => {
  try {
    const { store_id, product_id, low_stock, search } = req.query;
    let where = ['pv.active = 1', 'p.active = 1'];
    let params = [];
    let paramIndex = 1;

    if (store_id) { where.push(`vs.store_id = $${paramIndex++}`); params.push(store_id); }
    if (product_id) { where.push(`pv.product_id = $${paramIndex++}`); params.push(product_id); }
    if (search) { where.push(`(p.name ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex + 1} OR pv.sku_variant ILIKE $${paramIndex + 2})`); params.push(`%${search}%`, `%${search}%`, `%${search}%`); paramIndex += 3; }

    let having = '';
    if (low_stock === '1') { having = 'HAVING SUM(vs.quantity) <= MAX(vs.reorder_point)'; }

    const { rows } = await db.query(`
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
      ORDER BY p.name, pv.size, s.name
    `, params);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get low-stock alerts
router.get('/alerts', authenticate, async (req, res) => {
  try {
    const { store_id } = req.query;
    let storeFilter = '';
    let params = [];
    if (store_id) { storeFilter = 'AND vs.store_id = $1'; params.push(store_id); }

    const { rows } = await db.query(`
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
    `, params);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Adjust stock (admin/staff)
router.post('/adjust', authenticate, authorizeStaffOrAdmin, async (req, res) => {
  const client = await db.getClient();
  try {
    const { variant_id, store_id, quantity, type, notes, batch_number } = req.body;
    if (!variant_id || !store_id || quantity === undefined) {
      client.release();
      return res.status(400).json({ error: 'variant_id, store_id and quantity are required' });
    }

    const { rows } = await client.query('SELECT * FROM variant_stock WHERE variant_id = $1 AND store_id = $2', [variant_id, store_id]);
    if (!rows[0]) { client.release(); return res.status(404).json({ error: 'Stock record not found' }); }
    const stock = rows[0];

    const movementType = type || (Number(quantity) >= 0 ? 'IN' : 'OUT');
    const newQty = stock.quantity + Number(quantity);
    if (newQty < 0) { client.release(); return res.status(400).json({ error: 'Insufficient stock' }); }

    await client.query('BEGIN');

    await client.query(
      'UPDATE variant_stock SET quantity = $1, batch_number = COALESCE($2, batch_number), received_date = CURRENT_TIMESTAMP WHERE variant_id = $3 AND store_id = $4',
      [newQty, batch_number || null, variant_id, store_id]
    );

    await client.query(
      'INSERT INTO stock_movements (variant_id, store_id, movement_type, quantity, reference_type, batch_number, notes, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [variant_id, store_id, movementType, Math.abs(Number(quantity)), 'adjustment', batch_number || null, notes || '', req.user.id]
    );

    await client.query('COMMIT');

    // Check threshold
    const updated = await db.query(
      'SELECT vs.*, pv.sku_variant, p.name as product_name FROM variant_stock vs JOIN product_variants pv ON vs.variant_id=pv.id JOIN products p ON pv.product_id=p.id WHERE vs.variant_id=$1 AND vs.store_id=$2',
      [variant_id, store_id]
    );
    const updatedRow = updated.rows[0];
    const warning = updatedRow && updatedRow.quantity <= updatedRow.reorder_point
      ? { alert: true, message: `Low stock alert: ${updatedRow.product_name} (${updatedRow.sku_variant}) — only ${updatedRow.quantity} left` }
      : null;

    res.json({ message: 'Stock adjusted', new_quantity: newQty, warning });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Set reorder point
router.put('/reorder-point', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { variant_id, store_id, reorder_point } = req.body;
    await db.query('UPDATE variant_stock SET reorder_point = $1 WHERE variant_id = $2 AND store_id = $3',
      [Number(reorder_point), variant_id, store_id]);
    res.json({ message: 'Reorder point updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stock movement history
router.get('/movements', authenticate, async (req, res) => {
  try {
    const { variant_id, store_id, type, from_date, to_date, limit = 100 } = req.query;
    let where = ['1=1'];
    let params = [];
    let paramIndex = 1;

    if (variant_id) { where.push(`sm.variant_id = $${paramIndex++}`); params.push(variant_id); }
    if (store_id) { where.push(`sm.store_id = $${paramIndex++}`); params.push(store_id); }
    if (type) { where.push(`sm.movement_type = $${paramIndex++}`); params.push(type); }
    if (from_date) { where.push(`sm.created_at >= $${paramIndex++}`); params.push(from_date); }
    if (to_date) { where.push(`sm.created_at <= $${paramIndex++}`); params.push(to_date + ' 23:59:59'); }

    const { rows } = await db.query(`
      SELECT sm.*, pv.sku_variant, pv.size, pv.color, p.name as product_name, s.name as store_name, u.name as user_name
      FROM stock_movements sm
      JOIN product_variants pv ON sm.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      JOIN stores s ON sm.store_id = s.id
      LEFT JOIN users u ON sm.created_by = u.id
      WHERE ${where.join(' AND ')}
      ORDER BY sm.created_at DESC
      LIMIT $${paramIndex}
    `, [...params, Number(limit)]);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
