const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

// List stores
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM stores WHERE active = 1 ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single store with stock summary
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM stores WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Store not found' });
    const store = rows[0];

    const summary = await db.query(`
      SELECT COUNT(DISTINCT pv.product_id) as product_count,
             COUNT(vs.id) as variant_count,
             COALESCE(SUM(vs.quantity),0) as total_stock,
             COALESCE(SUM(vs.reserved_quantity),0) as total_reserved
      FROM variant_stock vs
      JOIN product_variants pv ON vs.variant_id = pv.id
      WHERE vs.store_id = $1 AND pv.active = 1
    `, [store.id]);
    store.stock_summary = summary.rows[0];
    res.json(store);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create store (admin)
router.post('/', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { name, code, address, phone, is_warehouse } = req.body;
    if (!name || !code) return res.status(400).json({ error: 'Name and code are required' });

    const { rows: existing } = await db.query('SELECT id FROM stores WHERE code = $1', [code]);
    if (existing[0]) return res.status(400).json({ error: 'Store code already exists' });

    const { rows } = await db.query(
      'INSERT INTO stores (name, code, address, phone, is_warehouse) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [name, code.toUpperCase(), address || '', phone || '', is_warehouse ? 1 : 0]
    );
    const storeId = rows[0].id;

    // Create stock entries for all existing active variants
    const { rows: variants } = await db.query('SELECT id FROM product_variants WHERE active = 1');
    for (const v of variants) {
      await db.query(
        'INSERT INTO variant_stock (variant_id, store_id, quantity, reorder_point) VALUES ($1,$2,0,5) ON CONFLICT(variant_id, store_id) DO NOTHING',
        [v.id, storeId]
      );
    }

    res.status(201).json({ id: storeId, message: 'Store created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update store (admin)
router.put('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { name, address, phone, is_warehouse } = req.body;
    await db.query(
      'UPDATE stores SET name=COALESCE($1,name), address=COALESCE($2,address), phone=COALESCE($3,phone), is_warehouse=COALESCE($4,is_warehouse) WHERE id=$5',
      [name, address, phone, is_warehouse !== undefined ? (is_warehouse ? 1 : 0) : null, req.params.id]
    );
    res.json({ message: 'Store updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete store (admin) — soft delete
router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT COUNT(*) as c FROM stores WHERE active = 1');
    if (parseInt(rows[0].c) <= 1) return res.status(400).json({ error: 'Cannot delete the last store' });
    await db.query('UPDATE stores SET active = 0 WHERE id = $1', [req.params.id]);
    res.json({ message: 'Store deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
