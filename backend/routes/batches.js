const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, authorizeStaffOrAdmin } = require('../middleware/auth');

function generateBatchNumber() {
  return 'BAT-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

// List batches
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT b.*, s.name as store_name, u.name as created_by_name
      FROM batches b
      LEFT JOIN stores s ON b.store_id = s.id
      LEFT JOIN users u ON b.created_by = u.id
      ORDER BY b.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get batch with items
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM batches WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Batch not found' });
    const batch = rows[0];

    const items = await db.query(`
      SELECT bi.*, pv.sku_variant, pv.size, pv.color, p.name as product_name
      FROM batch_items bi
      JOIN product_variants pv ON bi.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      WHERE bi.batch_id = $1
    `, [batch.id]);
    batch.items = items.rows;
    res.json(batch);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create batch (receive stock)
router.post('/', authenticate, authorizeStaffOrAdmin, async (req, res) => {
  const client = await db.getClient();
  try {
    const { supplier, store_id, items, notes, received_date } = req.body;
    if (!store_id || !items || !items.length) {
      client.release();
      return res.status(400).json({ error: 'store_id and items are required' });
    }

    const batchNumber = generateBatchNumber();
    await client.query('BEGIN');

    const result = await client.query(
      'INSERT INTO batches (batch_number,supplier,store_id,notes,received_date,created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [batchNumber, supplier || '', store_id, notes || '', received_date || new Date().toISOString(), req.user.id]
    );
    const batchId = result.rows[0].id;

    for (const item of items) {
      await client.query(
        'INSERT INTO batch_items (batch_id,variant_id,quantity,cost_price) VALUES ($1,$2,$3,$4)',
        [batchId, item.variant_id, item.quantity, item.cost_price || 0]
      );

      // Add stock (upsert)
      await client.query(`
        INSERT INTO variant_stock (variant_id, store_id, quantity, batch_number, received_date)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT(variant_id, store_id) DO UPDATE SET
          quantity = variant_stock.quantity + $3,
          batch_number = $4,
          received_date = CURRENT_TIMESTAMP
      `, [item.variant_id, store_id, item.quantity, batchNumber]);

      // Record movement
      await client.query(
        'INSERT INTO stock_movements (variant_id,store_id,movement_type,quantity,reference_type,reference_id,batch_number,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [item.variant_id, store_id, 'IN', item.quantity, 'batch', batchId, batchNumber, req.user.id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ id: batchId, batch_number: batchNumber, message: 'Batch received' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
