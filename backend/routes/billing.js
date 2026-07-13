const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, authorizeStaffOrAdmin } = require('../middleware/auth');

async function generateBillNumber() {
  const d = new Date();
  const dateStr = d.getFullYear().toString() + (d.getMonth() + 1).toString().padStart(2, '0') + d.getDate().toString().padStart(2, '0');
  const { rows } = await db.query("SELECT COUNT(*) as c FROM bills WHERE created_at >= CURRENT_DATE");
  const seq = (parseInt(rows[0].c) + 1).toString().padStart(4, '0');
  return `INV-${dateStr}-${seq}`;
}

// Get partial payment overdue (>30 days) — MUST be before /:id to avoid route conflict
router.get('/partial/overdue', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT b.*, s.name as store_name,
             (b.total_amount - b.paid_amount) as remaining,
             EXTRACT(DAY FROM NOW() - b.created_at)::INTEGER as days_overdue
      FROM bills b
      LEFT JOIN stores s ON b.store_id = s.id
      WHERE b.payment_status = 'partial'
        AND EXTRACT(DAY FROM NOW() - b.created_at) > 30
      ORDER BY b.created_at ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sold items report — MUST be before /:id to avoid route conflict
router.get('/sold/report', authenticate, async (req, res) => {
  try {
    const { from_date, to_date, store_id } = req.query;
    let where = ['1=1'];
    let params = [];
    let paramIndex = 1;
    if (from_date) { where.push(`b.created_at >= $${paramIndex++}`); params.push(from_date); }
    if (to_date) { where.push(`b.created_at <= $${paramIndex++}`); params.push(to_date + ' 23:59:59'); }
    if (store_id) { where.push(`b.store_id = $${paramIndex++}`); params.push(store_id); }

    const { rows } = await db.query(`
      SELECT bi.product_name, bi.sku, bi.size, bi.color, bi.fit,
             SUM(bi.quantity) as total_qty, SUM(bi.total) as total_revenue,
             COUNT(DISTINCT bi.bill_id) as bill_count
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      WHERE ${where.join(' AND ')}
      GROUP BY bi.variant_id, bi.product_name, bi.sku, bi.size, bi.color, bi.fit
      ORDER BY total_qty DESC
    `, params);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List bills
router.get('/', authenticate, async (req, res) => {
  try {
    const { store_id, payment_status, from_date, to_date, search, page = 1, limit = 50 } = req.query;
    let where = ['1=1'];
    let params = [];
    let paramIndex = 1;

    if (store_id) { where.push(`b.store_id = $${paramIndex++}`); params.push(store_id); }
    if (payment_status) { where.push(`b.payment_status = $${paramIndex++}`); params.push(payment_status); }
    if (from_date) { where.push(`b.created_at >= $${paramIndex++}`); params.push(from_date); }
    if (to_date) { where.push(`b.created_at <= $${paramIndex++}`); params.push(to_date + ' 23:59:59'); }
    if (search) { where.push(`(b.bill_number ILIKE $${paramIndex} OR b.customer_name ILIKE $${paramIndex + 1} OR b.customer_phone ILIKE $${paramIndex + 2})`); params.push(`%${search}%`, `%${search}%`, `%${search}%`); paramIndex += 3; }

    const offset = (Number(page) - 1) * Number(limit);
    const whereClause = where.join(' AND ');

    const countResult = await db.query(`SELECT COUNT(*) as c FROM bills b WHERE ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].c);

    const { rows: bills } = await db.query(`
      SELECT b.*, s.name as store_name, u.name as billed_by
      FROM bills b
      LEFT JOIN stores s ON b.store_id = s.id
      LEFT JOIN users u ON b.created_by = u.id
      WHERE ${whereClause}
      ORDER BY b.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `, [...params, Number(limit), offset]);

    res.json({ bills, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single bill with items
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT b.*, s.name as store_name, u.name as billed_by
      FROM bills b LEFT JOIN stores s ON b.store_id=s.id LEFT JOIN users u ON b.created_by=u.id
      WHERE b.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Bill not found' });
    const bill = rows[0];

    const items = await db.query('SELECT * FROM bill_items WHERE bill_id = $1', [bill.id]);
    bill.items = items.rows;
    const payments = await db.query('SELECT * FROM payment_history WHERE bill_id = $1 ORDER BY payment_date', [bill.id]);
    bill.payments = payments.rows;
    res.json(bill);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create bill
router.post('/', authenticate, authorizeStaffOrAdmin, async (req, res) => {
  const client = await db.getClient();
  try {
    const { store_id, customer_name, customer_phone, items, discount, payment_method, paid_amount, notes } = req.body;
    if (!items || !items.length) { client.release(); return res.status(400).json({ error: 'At least one item is required' }); }

    let storeId = store_id;
    if (!storeId) {
      const storeResult = await client.query('SELECT id FROM stores WHERE active=1 LIMIT 1');
      storeId = storeResult.rows[0].id;
    }

    const billNumber = await generateBillNumber();

    await client.query('BEGIN');

    let subtotal = 0;
    let totalTax = 0;

    // Validate stock and compute totals
    for (const item of items) {
      const variantResult = await client.query(`
        SELECT pv.*, p.selling_price, p.tax_percent, p.name as product_name, p.sku
        FROM product_variants pv JOIN products p ON pv.product_id = p.id
        WHERE pv.id = $1
      `, [item.variant_id]);
      const variant = variantResult.rows[0];
      if (!variant) throw new Error(`Variant ${item.variant_id} not found`);

      const stockResult = await client.query('SELECT quantity, reserved_quantity FROM variant_stock WHERE variant_id=$1 AND store_id=$2', [item.variant_id, storeId]);
      const stock = stockResult.rows[0];
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

    const billResult = await client.query(`
      INSERT INTO bills (bill_number,store_id,customer_name,customer_phone,subtotal,discount,tax,total_amount,paid_amount,payment_status,payment_method,notes,created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id
    `, [billNumber, storeId, customer_name || '', customer_phone || '', subtotal, disc, totalTax, totalAmount, paidAmt, paymentStatus, payment_method || 'cash', notes || '', req.user.id]);
    const billId = billResult.rows[0].id;

    // Insert bill items, deduct stock
    for (const item of items) {
      await client.query(
        'INSERT INTO bill_items (bill_id,variant_id,product_name,sku,size,color,fit,quantity,price,discount,tax,total) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
        [billId, item.variant_id, item._product_name, item._sku, item._size, item._color, item._fit, item.quantity, item._price, 0, item._tax, item._total]
      );

      await client.query('UPDATE variant_stock SET quantity = quantity - $1 WHERE variant_id=$2 AND store_id=$3',
        [item.quantity, item.variant_id, storeId]);

      await client.query(
        'INSERT INTO stock_movements (variant_id,store_id,movement_type,quantity,reference_type,reference_id,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [item.variant_id, storeId, 'SALE', item.quantity, 'bill', billId, req.user.id]
      );
    }

    // Record payment
    if (paidAmt > 0) {
      await client.query('INSERT INTO payment_history (bill_id, amount, payment_method) VALUES ($1,$2,$3)', [billId, paidAmt, payment_method || 'cash']);
    }

    await client.query('COMMIT');

    // Check for low stock alerts after sale
    const alerts = [];
    for (const item of items) {
      const stockCheck = await db.query(
        'SELECT vs.*, pv.sku_variant FROM variant_stock vs JOIN product_variants pv ON vs.variant_id=pv.id WHERE vs.variant_id=$1 AND vs.store_id=$2',
        [item.variant_id, storeId]
      );
      const stock = stockCheck.rows[0];
      if (stock && stock.quantity <= stock.reorder_point) {
        alerts.push({ variant: stock.sku_variant, quantity: stock.quantity, reorder_point: stock.reorder_point });
      }
    }

    res.status(201).json({ billId, billNumber, totalAmount, paidAmt, paymentStatus, alerts, message: 'Bill created' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Add payment to partial bill
router.post('/:id/payment', authenticate, authorizeStaffOrAdmin, async (req, res) => {
  try {
    const { amount, payment_method, notes } = req.body;
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'Valid amount is required' });

    const { rows } = await db.query('SELECT * FROM bills WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Bill not found' });
    const bill = rows[0];

    const newPaid = bill.paid_amount + Number(amount);
    const newStatus = newPaid >= bill.total_amount ? 'full' : 'partial';

    await db.query('UPDATE bills SET paid_amount=$1, payment_status=$2 WHERE id=$3', [newPaid, newStatus, req.params.id]);
    await db.query('INSERT INTO payment_history (bill_id, amount, payment_method, notes) VALUES ($1,$2,$3,$4)',
      [req.params.id, Number(amount), payment_method || 'cash', notes || '']);

    res.json({ message: 'Payment recorded', paid_amount: newPaid, remaining: bill.total_amount - newPaid, payment_status: newStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
