const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// Main dashboard stats
router.get('/', authenticate, (req, res) => {
  const { store_id } = req.query;
  const storeFilter = store_id ? 'AND b.store_id = ?' : '';
  const stockStoreFilter = store_id ? 'AND vs.store_id = ?' : '';
  const sp = store_id ? [store_id] : [];

  // Product counts
  const totalProducts = db.prepare('SELECT COUNT(*) as c FROM products WHERE active = 1').get().c;
  const totalVariants = db.prepare('SELECT COUNT(*) as c FROM product_variants WHERE active = 1').get().c;

  // Stock summary
  const stockSummary = db.prepare(`
    SELECT COALESCE(SUM(vs.quantity),0) as total_stock,
           COALESCE(SUM(vs.reserved_quantity),0) as total_reserved,
           COUNT(CASE WHEN vs.quantity = 0 THEN 1 END) as out_of_stock_count,
           COUNT(CASE WHEN vs.quantity > 0 AND vs.quantity <= vs.reorder_point THEN 1 END) as low_stock_count
    FROM variant_stock vs
    JOIN product_variants pv ON vs.variant_id = pv.id AND pv.active = 1
    WHERE 1=1 ${stockStoreFilter}
  `).get(...sp);

  // Today's sales
  const todaySales = db.prepare(`
    SELECT COUNT(*) as bill_count, COALESCE(SUM(total_amount),0) as revenue, COALESCE(SUM(paid_amount),0) as collected
    FROM bills WHERE date(created_at) = date('now') ${storeFilter}
  `).get(...sp);

  // This month's sales
  const monthSales = db.prepare(`
    SELECT COUNT(*) as bill_count, COALESCE(SUM(total_amount),0) as revenue, COALESCE(SUM(paid_amount),0) as collected
    FROM bills WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now') ${storeFilter}
  `).get(...sp);

  // Overdue partial payments
  const overdueCount = db.prepare(`
    SELECT COUNT(*) as c, COALESCE(SUM(total_amount - paid_amount),0) as total_due
    FROM bills WHERE payment_status = 'partial' AND julianday('now') - julianday(created_at) > 30 ${storeFilter}
  `).get(...sp);

  // Recent bills (last 10)
  const recentBills = db.prepare(`
    SELECT b.id, b.bill_number, b.customer_name, b.total_amount, b.paid_amount, b.payment_status, b.created_at
    FROM bills b WHERE 1=1 ${storeFilter}
    ORDER BY b.created_at DESC LIMIT 10
  `).all(...sp);

  // Top selling products this month
  const topProducts = db.prepare(`
    SELECT bi.product_name, bi.sku, SUM(bi.quantity) as total_qty, SUM(bi.total) as total_revenue
    FROM bill_items bi
    JOIN bills b ON bi.bill_id = b.id
    WHERE strftime('%Y-%m', b.created_at) = strftime('%Y-%m', 'now') ${storeFilter}
    GROUP BY bi.variant_id
    ORDER BY total_qty DESC LIMIT 10
  `).all(...sp);

  // Revenue by day (last 30 days)
  const dailyRevenue = db.prepare(`
    SELECT date(created_at) as date, SUM(total_amount) as revenue, COUNT(*) as bills
    FROM bills
    WHERE created_at >= date('now', '-30 days') ${storeFilter}
    GROUP BY date(created_at)
    ORDER BY date
  `).all(...sp);

  // Store count
  const storeCount = db.prepare('SELECT COUNT(*) as c FROM stores WHERE active = 1').get().c;

  // Category count
  const categoryCount = db.prepare('SELECT COUNT(*) as c FROM categories WHERE active = 1').get().c;

  res.json({
    totalProducts, totalVariants, stockSummary,
    todaySales, monthSales, overdueCount,
    recentBills, topProducts, dailyRevenue,
    storeCount, categoryCount
  });
});

// Sales chart data (monthly for the year)
router.get('/sales-chart', authenticate, (req, res) => {
  const { year, store_id } = req.query;
  const y = year || new Date().getFullYear();
  const storeFilter = store_id ? 'AND store_id = ?' : '';
  const sp = store_id ? [store_id] : [];

  const monthly = db.prepare(`
    SELECT strftime('%m', created_at) as month, SUM(total_amount) as revenue, COUNT(*) as bills, SUM(paid_amount) as collected
    FROM bills
    WHERE strftime('%Y', created_at) = ? ${storeFilter}
    GROUP BY strftime('%m', created_at)
    ORDER BY month
  `).all(String(y), ...sp);

  res.json(monthly);
});

// Predictions - items likely to sell more in a given month based on history
router.get('/predictions', authenticate, (req, res) => {
  const { month } = req.query; // 1-12
  const m = (month || (new Date().getMonth() + 1)).toString().padStart(2, '0');

  const predictions = db.prepare(`
    SELECT bi.product_name, bi.sku, bi.size, bi.color,
           SUM(bi.quantity) as total_sold,
           COUNT(DISTINCT strftime('%Y', b.created_at)) as years_with_data,
           ROUND(SUM(bi.quantity) * 1.0 / COUNT(DISTINCT strftime('%Y', b.created_at)), 1) as avg_per_year
    FROM bill_items bi
    JOIN bills b ON bi.bill_id = b.id
    WHERE strftime('%m', b.created_at) = ?
    GROUP BY bi.variant_id
    ORDER BY avg_per_year DESC
    LIMIT 20
  `).all(m);

  res.json({ month: Number(m), predictions });
});

module.exports = router;
