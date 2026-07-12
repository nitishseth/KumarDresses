const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

// List stores
router.get('/', authenticate, (req, res) => {
  const stores = db.prepare('SELECT * FROM stores WHERE active = 1 ORDER BY name').all();
  res.json(stores);
});

// Get single store with stock summary
router.get('/:id', authenticate, (req, res) => {
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
  if (!store) return res.status(404).json({ error: 'Store not found' });

  store.stock_summary = db.prepare(`
    SELECT COUNT(DISTINCT pv.product_id) as product_count,
           COUNT(vs.id) as variant_count,
           COALESCE(SUM(vs.quantity),0) as total_stock,
           COALESCE(SUM(vs.reserved_quantity),0) as total_reserved
    FROM variant_stock vs
    JOIN product_variants pv ON vs.variant_id = pv.id
    WHERE vs.store_id = ? AND pv.active = 1
  `).get(store.id);
  res.json(store);
});

// Create store (admin)
router.post('/', authenticate, authorizeAdmin, (req, res) => {
  const { name, code, address, phone, is_warehouse } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'Name and code are required' });

  const exists = db.prepare('SELECT id FROM stores WHERE code = ?').get(code);
  if (exists) return res.status(400).json({ error: 'Store code already exists' });

  const result = db.prepare('INSERT INTO stores (name, code, address, phone, is_warehouse) VALUES (?,?,?,?,?)')
    .run(name, code.toUpperCase(), address||'', phone||'', is_warehouse ? 1 : 0);

  // Create stock entries for all existing active variants
  const variants = db.prepare('SELECT id FROM product_variants WHERE active = 1').all();
  const insertStock = db.prepare('INSERT OR IGNORE INTO variant_stock (variant_id, store_id, quantity, reorder_point) VALUES (?,?,0,5)');
  for (const v of variants) { insertStock.run(v.id, result.lastInsertRowid); }

  res.status(201).json({ id: result.lastInsertRowid, message: 'Store created' });
});

// Update store (admin)
router.put('/:id', authenticate, authorizeAdmin, (req, res) => {
  const { name, address, phone, is_warehouse } = req.body;
  db.prepare('UPDATE stores SET name=COALESCE(?,name), address=COALESCE(?,address), phone=COALESCE(?,phone), is_warehouse=COALESCE(?,is_warehouse) WHERE id=?')
    .run(name, address, phone, is_warehouse !== undefined ? (is_warehouse ? 1 : 0) : null, req.params.id);
  res.json({ message: 'Store updated' });
});

// Delete store (admin) — soft delete
router.delete('/:id', authenticate, authorizeAdmin, (req, res) => {
  const storeCount = db.prepare('SELECT COUNT(*) as c FROM stores WHERE active = 1').get().c;
  if (storeCount <= 1) return res.status(400).json({ error: 'Cannot delete the last store' });
  db.prepare('UPDATE stores SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Store deleted' });
});

module.exports = router;
