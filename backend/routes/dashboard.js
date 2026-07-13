const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// Main dashboard stats
router.get('/', authenticate, async (req, res) => {
  try {
    const { store_id } = req.query;
    let storeFilter = '';
    let stockStoreFilter = '';
    let sp = [];
    let paramIndex = 1;

    if (store_id) {
      storeFilter = `AND b.store_id = $${paramIndex}`;
      stockStoreFilter = `AND vs.store_id = $${paramIndex}`;
      sp = [store_id];
      paramIndex++;
    }

    // Product counts
    const totalProductsR = await db.query('SELECT COUNT(*) as c FROM products WHERE active = 1');
    const totalProducts = parseInt(totalProductsR.rows[0].c);
    const totalVariantsR = await db.query('SELECT COUNT(*) as c FROM product_variants WHERE active = 1');
    const totalVariants = parseInt(totalVariantsR.rows[0].c);

    // Stock summary
    const stockSummaryR = await db.query(`
      SELECT COALESCE(SUM(vs.quantity),0) as total_stock,
             COALESCE(SUM(vs.reserved_quantity),0) as total_reserved,
             COUNT(CASE WHEN vs.quantity = 0 THEN 1 END) as out_of_stock_count,
             COUNT(CASE WHEN vs.quantity > 0 AND vs.quantity <= vs.reorder_point THEN 1 END) as low_stock_count
      FROM variant_stock vs
      JOIN product_variants pv ON vs.variant_id = pv.id AND pv.active = 1
      WHERE 1=1 ${stockStoreFilter}
    `, sp);
    const stockSummary = stockSummaryR.rows[0];

    // Today's sales
    const todaySalesR = await db.query(`
      SELECT COUNT(*) as bill_count, COALESCE(SUM(total_amount),0) as revenue, COALESCE(SUM(paid_amount),0) as collected
      FROM bills b WHERE created_at::date = CURRENT_DATE ${storeFilter}
    `, sp);
    const todaySales = todaySalesR.rows[0];

    // This month's sales
    const monthSalesR = await db.query(`
      SELECT COUNT(*) as bill_count, COALESCE(SUM(total_amount),0) as revenue, COALESCE(SUM(paid_amount),0) as collected
      FROM bills b WHERE to_char(created_at, 'YYYY-MM') = to_char(NOW(), 'YYYY-MM') ${storeFilter}
    `, sp);
    const monthSales = monthSalesR.rows[0];

    // Overdue partial payments
    const overdueCountR = await db.query(`
      SELECT COUNT(*) as c, COALESCE(SUM(total_amount - paid_amount),0) as total_due
      FROM bills b WHERE payment_status = 'partial' AND EXTRACT(DAY FROM NOW() - created_at) > 30 ${storeFilter}
    `, sp);
    const overdueCount = overdueCountR.rows[0];

    // Recent bills (last 10)
    const recentBillsR = await db.query(`
      SELECT b.id, b.bill_number, b.customer_name, b.total_amount, b.paid_amount, b.payment_status, b.created_at
      FROM bills b WHERE 1=1 ${storeFilter}
      ORDER BY b.created_at DESC LIMIT 10
    `, sp);
    const recentBills = recentBillsR.rows;

    // Top selling products this month
    const topProductsR = await db.query(`
      SELECT bi.product_name, bi.sku, SUM(bi.quantity) as total_qty, SUM(bi.total) as total_revenue
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      WHERE to_char(b.created_at, 'YYYY-MM') = to_char(NOW(), 'YYYY-MM') ${storeFilter}
      GROUP BY bi.variant_id, bi.product_name, bi.sku
      ORDER BY total_qty DESC LIMIT 10
    `, sp);
    const topProducts = topProductsR.rows;

    // Revenue by day (last 30 days)
    const dailyRevenueR = await db.query(`
      SELECT created_at::date as date, SUM(total_amount) as revenue, COUNT(*) as bills
      FROM bills b
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days' ${storeFilter}
      GROUP BY created_at::date
      ORDER BY date
    `, sp);
    const dailyRevenue = dailyRevenueR.rows;

    // Store count
    const storeCountR = await db.query('SELECT COUNT(*) as c FROM stores WHERE active = 1');
    const storeCount = parseInt(storeCountR.rows[0].c);

    // Category count
    const categoryCountR = await db.query('SELECT COUNT(*) as c FROM categories WHERE active = 1');
    const categoryCount = parseInt(categoryCountR.rows[0].c);

    res.json({
      totalProducts, totalVariants, stockSummary,
      todaySales, monthSales, overdueCount,
      recentBills, topProducts, dailyRevenue,
      storeCount, categoryCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sales chart data (monthly for the year)
router.get('/sales-chart', authenticate, async (req, res) => {
  try {
    const { year, store_id } = req.query;
    const y = year || new Date().getFullYear();
    let storeFilter = '';
    let params = [String(y)];
    if (store_id) { storeFilter = 'AND store_id = $2'; params.push(store_id); }

    const { rows: monthly } = await db.query(`
      SELECT to_char(created_at, 'MM') as month, SUM(total_amount) as revenue, COUNT(*) as bills, SUM(paid_amount) as collected
      FROM bills
      WHERE to_char(created_at, 'YYYY') = $1 ${storeFilter}
      GROUP BY to_char(created_at, 'MM')
      ORDER BY month
    `, params);

    res.json(monthly);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Predictions
router.get('/predictions', authenticate, async (req, res) => {
  try {
    const { month } = req.query;
    const m = (month || (new Date().getMonth() + 1)).toString().padStart(2, '0');

    const { rows: predictions } = await db.query(`
      SELECT bi.product_name, bi.sku, bi.size, bi.color,
             SUM(bi.quantity) as total_sold,
             COUNT(DISTINCT to_char(b.created_at, 'YYYY')) as years_with_data,
             ROUND(SUM(bi.quantity) * 1.0 / COUNT(DISTINCT to_char(b.created_at, 'YYYY')), 1) as avg_per_year
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      WHERE to_char(b.created_at, 'MM') = $1
      GROUP BY bi.variant_id, bi.product_name, bi.sku, bi.size, bi.color
      ORDER BY avg_per_year DESC
      LIMIT 20
    `, [m]);

    res.json({ month: Number(m), predictions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Profit dashboard data (password-protected on frontend)
router.get('/profit', authenticate, async (req, res) => {
  try {
    const { store_id, year } = req.query;
    const y = year || new Date().getFullYear();
    let storeFilter = '';
    let billStoreFilter = '';
    let params = [String(y)];
    let paramIndex = 2;

    if (store_id) {
      storeFilter = `AND b.store_id = $${paramIndex}`;
      billStoreFilter = `AND b.store_id = $${paramIndex}`;
      params.push(store_id);
      paramIndex++;
    }

    // Overall profit: revenue - cost
    const overallR = await db.query(`
      SELECT
        COALESCE(SUM(bi.total), 0) as total_revenue,
        COALESCE(SUM(bi.quantity * p.cost_price), 0) as total_cost,
        COALESCE(SUM(bi.total) - SUM(bi.quantity * p.cost_price), 0) as total_profit,
        COUNT(DISTINCT b.id) as total_bills
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      JOIN product_variants pv ON bi.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      WHERE to_char(b.created_at, 'YYYY') = $1 ${billStoreFilter}
    `, params);
    const overall = overallR.rows[0];

    // Monthly profit breakdown
    const monthlyR = await db.query(`
      SELECT to_char(b.created_at, 'MM') as month,
             SUM(bi.total) as revenue,
             SUM(bi.quantity * p.cost_price) as cost,
             SUM(bi.total) - SUM(bi.quantity * p.cost_price) as profit,
             COUNT(DISTINCT b.id) as bills
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      JOIN product_variants pv ON bi.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      WHERE to_char(b.created_at, 'YYYY') = $1 ${billStoreFilter}
      GROUP BY to_char(b.created_at, 'MM')
      ORDER BY month
    `, params);

    // Today's profit
    const todayR = await db.query(`
      SELECT
        COALESCE(SUM(bi.total), 0) as revenue,
        COALESCE(SUM(bi.quantity * p.cost_price), 0) as cost,
        COALESCE(SUM(bi.total) - SUM(bi.quantity * p.cost_price), 0) as profit
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      JOIN product_variants pv ON bi.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      WHERE b.created_at::date = CURRENT_DATE ${billStoreFilter.replace('$2', store_id ? '$2' : '')}
    `, store_id ? [store_id] : []);

    // This month's profit
    const thisMonthR = await db.query(`
      SELECT
        COALESCE(SUM(bi.total), 0) as revenue,
        COALESCE(SUM(bi.quantity * p.cost_price), 0) as cost,
        COALESCE(SUM(bi.total) - SUM(bi.quantity * p.cost_price), 0) as profit
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      JOIN product_variants pv ON bi.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      WHERE to_char(b.created_at, 'YYYY-MM') = to_char(NOW(), 'YYYY-MM') ${billStoreFilter.replace('$2', store_id ? '$2' : '')}
    `, store_id ? [store_id] : []);

    // Top profit products this year
    const topProfitR = await db.query(`
      SELECT bi.product_name, bi.sku,
             SUM(bi.total) as revenue,
             SUM(bi.quantity * p.cost_price) as cost,
             SUM(bi.total) - SUM(bi.quantity * p.cost_price) as profit,
             SUM(bi.quantity) as qty_sold
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      JOIN product_variants pv ON bi.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      WHERE to_char(b.created_at, 'YYYY') = $1 ${billStoreFilter}
      GROUP BY bi.product_name, bi.sku
      ORDER BY profit DESC
      LIMIT 15
    `, params);

    // Daily profit last 30 days
    const dailyProfitR = await db.query(`
      SELECT b.created_at::date as date,
             SUM(bi.total) as revenue,
             SUM(bi.quantity * p.cost_price) as cost,
             SUM(bi.total) - SUM(bi.quantity * p.cost_price) as profit
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      JOIN product_variants pv ON bi.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      WHERE b.created_at >= CURRENT_DATE - INTERVAL '30 days' ${billStoreFilter.replace('$2', store_id ? '$2' : '')}
      GROUP BY b.created_at::date
      ORDER BY date
    `, store_id ? [store_id] : []);

    // Category-wise profit
    const categoryProfitR = await db.query(`
      SELECT c.name as category_name,
             SUM(bi.total) as revenue,
             SUM(bi.quantity * p.cost_price) as cost,
             SUM(bi.total) - SUM(bi.quantity * p.cost_price) as profit
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      JOIN product_variants pv ON bi.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE to_char(b.created_at, 'YYYY') = $1 ${billStoreFilter}
      GROUP BY c.name
      ORDER BY profit DESC
    `, params);

    res.json({
      overall,
      monthly: monthlyR.rows,
      today: todayR.rows[0],
      thisMonth: thisMonthR.rows[0],
      topProducts: topProfitR.rows,
      dailyProfit: dailyProfitR.rows,
      categoryProfit: categoryProfitR.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
