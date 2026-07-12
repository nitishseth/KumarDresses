const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, authorizeStaffOrAdmin } = require('../middleware/auth');

function generateBillNumber() {
  const d = new Date();
  const dateStr = d.getFullYear().toString() + (d.getMonth() + 1).toString().padStart(2, '0') + d.getDate().toString().padStart(2, '0');
  const seq = (db.prepare("SELECT COUNT(*) as c FROM bills WHERE created_at >= date('now')").get().c + 1).toString().padStart(4, '0');
  return `INV-${dateStr}-${seq}`;
}

// List bills
router.get('/', authenticate, (req, res) => {
  const { store_id, payment_status, from_date, to_date, search, page = 1, limit = 50 } = req.query;
  let where = ['1=1'];
  let params = [];

  if (store_id) { where.push('b.store_id = ?'); params.push(store_id); }
  if (payment_status) { where.push('b.payment_status = ?'); params.push(payment_status); }
  if (from_date) { where.push('b.created_at >= ?'); params.push(from_date); }
  if (to_date) { where.push('b.created_at <= ?'); params.push(to_date + ' 23:59:59'); }
  if (search) { where.push('(b.bill_number LIKE ? OR b.customer_name LIKE ? OR b.customer_phone LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

  const offset = (Number(page) - 1) * Number(limit);
  const total = db.prepare(`SELECT COUNT(*) as c FROM bills b WHERE ${where.join(' AND ')}`).get(...params).c;

  const bills = db.prepare(`
    SELECT b.*, s.name as store_name, u.name as billed_by
    FROM bills b
    LEFT JOIN stores s ON b.store_id = s.id
    LEFT JOIN users u ON b.created_by = u.id
    WHERE ${where.join(' AND ')}
    ORDER BY b.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), offset);

  res.json({ bills, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});

// Get single bill with items
router.get('/:id', authenticate, (req, res) => {
  const bill = db.prepare(`
    SELECT b.*, s.name as store_name, u.name as billed_by
    FROM bills b LEFT JOIN stores s ON b.store_id=s.id LEFT JOIN users u ON b.created_by=u.id
    WHERE b.id = ?
  `).get(req.params.id);
  if (!bill) return res.status(404).json({ error: 'Bill not found' });

  bill.items = db.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(bill.id);
  bill.payments = db.prepare('SELECT * FROM payment_history WHERE bill_id = ? ORDER BY payment_date').all(bill.id);
  res.json(bill);
});

// Create bill
router.post('/', authenticate, authorizeStaffOrAdmin, (req, res) => {
  const { store_id, customer_name, customer_phone, items, discount, payment_method, paid_amount, notes } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: 'At least one item is required' });

  const storeId = store_id || db.prepare('SELECT id FROM stores WHERE active=1 LIMIT 1').get().id;
  const billNumber = generateBillNumber();

  const tx = db.transaction(() => {
    let subtotal = 0;
    let totalTax = 0;

    // Validate stock and compute totals
    for (const item of items) {
      const variant = db.prepare(`
        SELECT pv.*, p.selling_price, p.tax_percent, p.name as product_name, p.sku
        FROM product_variants pv JOIN products p ON pv.product_id = p.id
        WHERE pv.id = ?
      `).get(item.variant_id);
      if (!variant) throw new Error(`Variant ${item.variant_id} not found`);

      const stock = db.prepare('SELECT quantity, reserved_quantity FROM variant_stock WHERE variant_id=? AND store_id=?').get(item.variant_id, storeId);
      const available = stock ? (stock.quantity - stock.reserved_quantity) : 0;
      if (available < item.quantity) throw new Error(`Insufficient stock for ${variant.product_name} (${variant.size}). Available: ${available}`);

      const price = variant.selling_price + variant.additional_price;
      const itemTotal = price * item.quantity;
      const itemTax = itemTotal * (variant.tax_percent / 100);
      subtotal += itemTotal;
      totalTax += itemTax;

      item._price = price;
      item._tax = itemTax;
      item._total = itemTotal;
      item._product_name = variant.product_name;
      item._sku = variant.sku;
      item._size = variant.size;
      item._color = variant.color;
      item._fit = variant.fit;
    }

    const disc = Number(discount) || 0;
    const totalAmount = subtotal + totalTax - disc;
    const paidAmt = Number(paid_amount) || totalAmount;
    const paymentStatus = paidAmt >= totalAmount ? 'full' : 'partial';

    const billResult = db.prepare(`
      INSERT INTO bills (bill_number,store_id,customer_name,customer_phone,subtotal,discount,tax,total_amount,paid_amount,payment_status,payment_method,notes,created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(billNumber, storeId, customer_name||'', customer_phone||'', subtotal, disc, totalTax, totalAmount, paidAmt, paymentStatus, payment_method||'cash', notes||'', req.user.id);

    const billId = billResult.lastInsertRowid;

    // Insert bill items, deduct stock
    for (const item of items) {
      db.prepare('INSERT INTO bill_items (bill_id,variant_id,product_name,sku,size,color,fit,quantity,price,discount,tax,total) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
        .run(billId, item.variant_id, item._product_name, item._sku, item._size, item._color, item._fit, item.quantity, item._price, 0, item._tax, item._total);

      // Deduct stock
      db.prepare('UPDATE variant_stock SET quantity = quantity - ? WHERE variant_id=? AND store_id=?')
        .run(item.quantity, item.variant_id, storeId);

      // Record movement
      db.prepare('INSERT INTO stock_movements (variant_id,store_id,movement_type,quantity,reference_type,reference_id,created_by) VALUES (?,?,?,?,?,?,?)')
        .run(item.variant_id, storeId, 'SALE', item.quantity, 'bill', billId, req.user.id);
    }

    // Record payment
    if (paidAmt > 0) {
      db.prepare('INSERT INTO payment_history (bill_id, amount, payment_method) VALUES (?,?,?)').run(billId, paidAmt, payment_method||'cash');
    }

    return { billId, billNumber, totalAmount, paidAmt, paymentStatus };
  });

  try {
    const result = tx();

    // Check for low stock alerts after sale
    const alerts = [];
    for (const item of items) {
      const stock = db.prepare('SELECT vs.*, pv.sku_variant FROM variant_stock vs JOIN product_variants pv ON vs.variant_id=pv.id WHERE vs.variant_id=? AND vs.store_id=?')
        .get(item.variant_id, storeId);
      if (stock && stock.quantity <= stock.reorder_point) {
        alerts.push({ variant: stock.sku_variant, quantity: stock.quantity, reorder_point: stock.reorder_point });
      }
    }

    res.status(201).json({ ...result, alerts, message: 'Bill created' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Add payment to partial bill
router.post('/:id/payment', authenticate, authorizeStaffOrAdmin, (req, res) => {
  const { amount, payment_method, notes } = req.body;
  if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'Valid amount is required' });

  const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id);
  if (!bill) return res.status(404).json({ error: 'Bill not found' });

  const newPaid = bill.paid_amount + Number(amount);
  const newStatus = newPaid >= bill.total_amount ? 'full' : 'partial';

  db.prepare('UPDATE bills SET paid_amount=?, payment_status=? WHERE id=?').run(newPaid, newStatus, req.params.id);
  db.prepare('INSERT INTO payment_history (bill_id, amount, payment_method, notes) VALUES (?,?,?,?)').run(req.params.id, Number(amount), payment_method||'cash', notes||'');

  res.json({ message: 'Payment recorded', paid_amount: newPaid, remaining: bill.total_amount - newPaid, payment_status: newStatus });
});

// Get partial payment overdue (>30 days)
router.get('/partial/overdue', authenticate, (req, res) => {
  const overdue = db.prepare(`
    SELECT b.*, s.name as store_name,
           (b.total_amount - b.paid_amount) as remaining,
           CAST(julianday('now') - julianday(b.created_at) AS INTEGER) as days_overdue
    FROM bills b
    LEFT JOIN stores s ON b.store_id = s.id
    WHERE b.payment_status = 'partial'
      AND julianday('now') - julianday(b.created_at) > 30
    ORDER BY b.created_at ASC
  `).all();
  res.json(overdue);
});

// Sold items report
router.get('/sold/report', authenticate, (req, res) => {
  const { from_date, to_date, store_id } = req.query;
  let where = ['1=1'];
  let params = [];
  if (from_date) { where.push('b.created_at >= ?'); params.push(from_date); }
  if (to_date) { where.push('b.created_at <= ?'); params.push(to_date + ' 23:59:59'); }
  if (store_id) { where.push('b.store_id = ?'); params.push(store_id); }

  const sold = db.prepare(`
    SELECT bi.product_name, bi.sku, bi.size, bi.color, bi.fit,
           SUM(bi.quantity) as total_qty, SUM(bi.total) as total_revenue,
           COUNT(DISTINCT bi.bill_id) as bill_count
    FROM bill_items bi
    JOIN bills b ON bi.bill_id = b.id
    WHERE ${where.join(' AND ')}
    GROUP BY bi.variant_id
    ORDER BY total_qty DESC
  `).all(...params);

  res.json(sold);
});

module.exports = router;
