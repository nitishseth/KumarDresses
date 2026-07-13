const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, authorizeStaffOrAdmin } = require('../middleware/auth');

function generateTransferNumber() {
  return 'TRF-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

// List transfers
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, from_store, to_store } = req.query;
    let where = ['1=1'];
    let params = [];
    let paramIndex = 1;
    if (status) { where.push(`st.status = $${paramIndex++}`); params.push(status); }
    if (from_store) { where.push(`st.from_store_id = $${paramIndex++}`); params.push(from_store); }
    if (to_store) { where.push(`st.to_store_id = $${paramIndex++}`); params.push(to_store); }

    const { rows } = await db.query(`
      SELECT st.*, fs.name as from_store_name, ts.name as to_store_name, u.name as created_by_name
      FROM stock_transfers st
      JOIN stores fs ON st.from_store_id = fs.id
      JOIN stores ts ON st.to_store_id = ts.id
      LEFT JOIN users u ON st.created_by = u.id
      WHERE ${where.join(' AND ')}
      ORDER BY st.created_at DESC
    `, params);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single transfer with items
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT st.*, fs.name as from_store_name, ts.name as to_store_name
      FROM stock_transfers st
      JOIN stores fs ON st.from_store_id = fs.id
      JOIN stores ts ON st.to_store_id = ts.id
      WHERE st.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Transfer not found' });
    const transfer = rows[0];

    const items = await db.query(`
      SELECT sti.*, pv.sku_variant, pv.size, pv.color, p.name as product_name
      FROM stock_transfer_items sti
      JOIN product_variants pv ON sti.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      WHERE sti.transfer_id = $1
    `, [transfer.id]);
    transfer.items = items.rows;

    res.json(transfer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create transfer
router.post('/', authenticate, authorizeStaffOrAdmin, async (req, res) => {
  const client = await db.getClient();
  try {
    const { from_store_id, to_store_id, items, notes } = req.body;
    if (!from_store_id || !to_store_id || !items || !items.length) {
      client.release();
      return res.status(400).json({ error: 'from_store_id, to_store_id and items are required' });
    }
    if (from_store_id === to_store_id) { client.release(); return res.status(400).json({ error: 'Cannot transfer to the same store' }); }

    const transferNumber = generateTransferNumber();

    await client.query('BEGIN');

    const result = await client.query(
      'INSERT INTO stock_transfers (transfer_number, from_store_id, to_store_id, notes, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [transferNumber, from_store_id, to_store_id, notes || '', req.user.id]
    );
    const transferId = result.rows[0].id;

    for (const item of items) {
      const srcStock = await client.query(
        'SELECT quantity, reserved_quantity FROM variant_stock WHERE variant_id=$1 AND store_id=$2',
        [item.variant_id, from_store_id]
      );
      if (!srcStock.rows[0] || (srcStock.rows[0].quantity - srcStock.rows[0].reserved_quantity) < item.quantity) {
        throw new Error(`Insufficient available stock for variant ${item.variant_id}`);
      }
      await client.query(
        'INSERT INTO stock_transfer_items (transfer_id, variant_id, quantity) VALUES ($1,$2,$3)',
        [transferId, item.variant_id, item.quantity]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ id: transferId, transfer_number: transferNumber, message: 'Transfer created' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Update transfer status
router.put('/:id/status', authenticate, authorizeStaffOrAdmin, async (req, res) => {
  const client = await db.getClient();
  try {
    const { status } = req.body;
    const { rows } = await client.query('SELECT * FROM stock_transfers WHERE id = $1', [req.params.id]);
    if (!rows[0]) { client.release(); return res.status(404).json({ error: 'Transfer not found' }); }
    const transfer = rows[0];

    await client.query('BEGIN');

    if (status === 'in_transit' && transfer.status === 'pending') {
      const items = await client.query('SELECT * FROM stock_transfer_items WHERE transfer_id = $1', [transfer.id]);
      for (const item of items.rows) {
        await client.query('UPDATE variant_stock SET quantity = quantity - $1 WHERE variant_id = $2 AND store_id = $3',
          [item.quantity, item.variant_id, transfer.from_store_id]);
        await client.query(
          'INSERT INTO stock_movements (variant_id,store_id,movement_type,quantity,reference_type,reference_id,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [item.variant_id, transfer.from_store_id, 'TRANSFER_OUT', item.quantity, 'transfer', transfer.id, req.user.id]
        );
      }
      await client.query('UPDATE stock_transfers SET status = $1 WHERE id = $2', ['in_transit', transfer.id]);
    } else if (status === 'completed' && transfer.status === 'in_transit') {
      const items = await client.query('SELECT * FROM stock_transfer_items WHERE transfer_id = $1', [transfer.id]);
      for (const item of items.rows) {
        await client.query('UPDATE variant_stock SET quantity = quantity + $1 WHERE variant_id = $2 AND store_id = $3',
          [item.quantity, item.variant_id, transfer.to_store_id]);
        await client.query('UPDATE stock_transfer_items SET received_quantity = $1 WHERE id = $2', [item.quantity, item.id]);
        await client.query(
          'INSERT INTO stock_movements (variant_id,store_id,movement_type,quantity,reference_type,reference_id,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [item.variant_id, transfer.to_store_id, 'TRANSFER_IN', item.quantity, 'transfer', transfer.id, req.user.id]
        );
      }
      await client.query('UPDATE stock_transfers SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2', ['completed', transfer.id]);
    } else if (status === 'cancelled' && transfer.status === 'pending') {
      await client.query('UPDATE stock_transfers SET status = $1 WHERE id = $2', ['cancelled', transfer.id]);
    } else {
      throw new Error(`Cannot transition from ${transfer.status} to ${status}`);
    }

    await client.query('COMMIT');
    res.json({ message: `Transfer ${status}` });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
