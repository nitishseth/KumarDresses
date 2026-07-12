const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, authorizeStaffOrAdmin } = require('../middleware/auth');

function generateBatchNumber() {
  return 'BAT-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

// List batches
router.get('/', authenticate, (req, res) => {
  const batches = db.prepare(`
    SELECT b.*, s.name as store_name, u.name as created_by_name
    FROM batches b
    LEFT JOIN stores s ON b.store_id = s.id
    LEFT JOIN users u ON b.created_by = u.id
    ORDER BY b.created_at DESC
  `).all();
  res.json(batches);
});

// Get batch with items
router.get('/:id', authenticate, (req, res) => {
  const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(req.params.id);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });

  batch.items = db.prepare(`
    SELECT bi.*, pv.sku_variant, pv.size, pv.color, p.name as product_name
    FROM batch_items bi
    JOIN product_variants pv ON bi.variant_id = pv.id
    JOIN products p ON pv.product_id = p.id
    WHERE bi.batch_id = ?
  `).all(batch.id);
  res.json(batch);
});

// Create batch (receive stock)
router.post('/', authenticate, authorizeStaffOrAdmin, (req, res) => {
  const { supplier, store_id, items, notes, received_date } = req.body;
  if (!store_id || !items || !items.length) {
    return res.status(400).json({ error: 'store_id and items are required' });
  }

  const batchNumber = generateBatchNumber();
  const tx = db.transaction(() => {
    const result = db.prepare('INSERT INTO batches (batch_number,supplier,store_id,notes,received_date,created_by) VALUES (?,?,?,?,?,?)')
      .run(batchNumber, supplier||'', store_id, notes||'', received_date || new Date().toISOString(), req.user.id);

    const insertItem = db.prepare('INSERT INTO batch_items (batch_id,variant_id,quantity,cost_price) VALUES (?,?,?,?)');

    for (const item of items) {
      insertItem.run(result.lastInsertRowid, item.variant_id, item.quantity, item.cost_price || 0);

      // Add stock
      db.prepare(`
        INSERT INTO variant_stock (variant_id, store_id, quantity, batch_number, received_date)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(variant_id, store_id) DO UPDATE SET
          quantity = quantity + ?,
          batch_number = ?,
          received_date = CURRENT_TIMESTAMP
      `).run(item.variant_id, store_id, item.quantity, batchNumber, item.quantity, batchNumber);

      // Record movement
      db.prepare('INSERT INTO stock_movements (variant_id,store_id,movement_type,quantity,reference_type,reference_id,batch_number,created_by) VALUES (?,?,?,?,?,?,?,?)')
        .run(item.variant_id, store_id, 'IN', item.quantity, 'batch', result.lastInsertRowid, batchNumber, req.user.id);
    }

    return result.lastInsertRowid;
  });

  const id = tx();
  res.status(201).json({ id, batch_number: batchNumber, message: 'Batch received' });
});

module.exports = router;
