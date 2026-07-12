const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, authorizeStaffOrAdmin } = require('../middleware/auth');

function generateTransferNumber() {
  return 'TRF-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

// List transfers
router.get('/', authenticate, (req, res) => {
  const { status, from_store, to_store } = req.query;
  let where = ['1=1'];
  let params = [];
  if (status) { where.push('st.status = ?'); params.push(status); }
  if (from_store) { where.push('st.from_store_id = ?'); params.push(from_store); }
  if (to_store) { where.push('st.to_store_id = ?'); params.push(to_store); }

  const transfers = db.prepare(`
    SELECT st.*, fs.name as from_store_name, ts.name as to_store_name, u.name as created_by_name
    FROM stock_transfers st
    JOIN stores fs ON st.from_store_id = fs.id
    JOIN stores ts ON st.to_store_id = ts.id
    LEFT JOIN users u ON st.created_by = u.id
    WHERE ${where.join(' AND ')}
    ORDER BY st.created_at DESC
  `).all(...params);

  res.json(transfers);
});

// Get single transfer with items
router.get('/:id', authenticate, (req, res) => {
  const transfer = db.prepare(`
    SELECT st.*, fs.name as from_store_name, ts.name as to_store_name
    FROM stock_transfers st
    JOIN stores fs ON st.from_store_id = fs.id
    JOIN stores ts ON st.to_store_id = ts.id
    WHERE st.id = ?
  `).get(req.params.id);
  if (!transfer) return res.status(404).json({ error: 'Transfer not found' });

  transfer.items = db.prepare(`
    SELECT sti.*, pv.sku_variant, pv.size, pv.color, p.name as product_name
    FROM stock_transfer_items sti
    JOIN product_variants pv ON sti.variant_id = pv.id
    JOIN products p ON pv.product_id = p.id
    WHERE sti.transfer_id = ?
  `).all(transfer.id);

  res.json(transfer);
});

// Create transfer
router.post('/', authenticate, authorizeStaffOrAdmin, (req, res) => {
  const { from_store_id, to_store_id, items, notes } = req.body;
  if (!from_store_id || !to_store_id || !items || !items.length) {
    return res.status(400).json({ error: 'from_store_id, to_store_id and items are required' });
  }
  if (from_store_id === to_store_id) return res.status(400).json({ error: 'Cannot transfer to the same store' });

  const transferNumber = generateTransferNumber();

  const tx = db.transaction(() => {
    const result = db.prepare('INSERT INTO stock_transfers (transfer_number, from_store_id, to_store_id, notes, created_by) VALUES (?,?,?,?,?)')
      .run(transferNumber, from_store_id, to_store_id, notes||'', req.user.id);

    const insertItem = db.prepare('INSERT INTO stock_transfer_items (transfer_id, variant_id, quantity) VALUES (?,?,?)');
    for (const item of items) {
      // Check source stock
      const srcStock = db.prepare('SELECT quantity, reserved_quantity FROM variant_stock WHERE variant_id=? AND store_id=?').get(item.variant_id, from_store_id);
      if (!srcStock || (srcStock.quantity - srcStock.reserved_quantity) < item.quantity) {
        throw new Error(`Insufficient available stock for variant ${item.variant_id}`);
      }
      insertItem.run(result.lastInsertRowid, item.variant_id, item.quantity);
    }

    return result.lastInsertRowid;
  });

  try {
    const id = tx();
    res.status(201).json({ id, transfer_number: transferNumber, message: 'Transfer created' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update transfer status
router.put('/:id/status', authenticate, authorizeStaffOrAdmin, (req, res) => {
  const { status } = req.body;
  const transfer = db.prepare('SELECT * FROM stock_transfers WHERE id = ?').get(req.params.id);
  if (!transfer) return res.status(404).json({ error: 'Transfer not found' });

  if (status === 'in_transit' && transfer.status === 'pending') {
    // Deduct from source
    const items = db.prepare('SELECT * FROM stock_transfer_items WHERE transfer_id = ?').all(transfer.id);
    const tx = db.transaction(() => {
      for (const item of items) {
        db.prepare('UPDATE variant_stock SET quantity = quantity - ? WHERE variant_id = ? AND store_id = ?')
          .run(item.quantity, item.variant_id, transfer.from_store_id);
        db.prepare('INSERT INTO stock_movements (variant_id,store_id,movement_type,quantity,reference_type,reference_id,created_by) VALUES (?,?,?,?,?,?,?)')
          .run(item.variant_id, transfer.from_store_id, 'TRANSFER_OUT', item.quantity, 'transfer', transfer.id, req.user.id);
      }
      db.prepare('UPDATE stock_transfers SET status = ? WHERE id = ?').run('in_transit', transfer.id);
    });
    tx();
  } else if (status === 'completed' && transfer.status === 'in_transit') {
    // Add to destination
    const items = db.prepare('SELECT * FROM stock_transfer_items WHERE transfer_id = ?').all(transfer.id);
    const tx = db.transaction(() => {
      for (const item of items) {
        db.prepare('UPDATE variant_stock SET quantity = quantity + ? WHERE variant_id = ? AND store_id = ?')
          .run(item.quantity, item.variant_id, transfer.to_store_id);
        db.prepare('UPDATE stock_transfer_items SET received_quantity = ? WHERE id = ?').run(item.quantity, item.id);
        db.prepare('INSERT INTO stock_movements (variant_id,store_id,movement_type,quantity,reference_type,reference_id,created_by) VALUES (?,?,?,?,?,?,?)')
          .run(item.variant_id, transfer.to_store_id, 'TRANSFER_IN', item.quantity, 'transfer', transfer.id, req.user.id);
      }
      db.prepare('UPDATE stock_transfers SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?').run('completed', transfer.id);
    });
    tx();
  } else if (status === 'cancelled' && transfer.status === 'pending') {
    db.prepare('UPDATE stock_transfers SET status = ? WHERE id = ?').run('cancelled', transfer.id);
  } else {
    return res.status(400).json({ error: `Cannot transition from ${transfer.status} to ${status}` });
  }

  res.json({ message: `Transfer ${status}` });
});

module.exports = router;
