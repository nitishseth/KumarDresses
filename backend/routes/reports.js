const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// Dead stock / slow-moving stock
router.get('/dead-stock', authenticate, async (req, res) => {
  try {
    const { days = 90, store_id } = req.query;
    let storeFilter = '';
    let params = [Number(days)];
    if (store_id) { storeFilter = 'AND vs.store_id = $2'; params.push(store_id); }

    const { rows } = await db.query(`
      SELECT p.id, p.name, p.sku, p.brand, p.season, p.image,
             pv.id as variant_id, pv.sku_variant, pv.size, pv.color, pv.fit,
             vs.store_id, s.name as store_name,
             vs.quantity, vs.received_date,
             COALESCE(last_sale.last_sold::text, 'Never') as last_sold,
             COALESCE(last_sale.total_sold, 0) as total_ever_sold,
             EXTRACT(DAY FROM NOW() - COALESCE(last_sale.last_sold, vs.received_date, pv.created_at))::INTEGER as days_since_last_sale
      FROM variant_stock vs
      JOIN product_variants pv ON vs.variant_id = pv.id AND pv.active = 1
      JOIN products p ON pv.product_id = p.id AND p.active = 1
      JOIN stores s ON vs.store_id = s.id AND s.active = 1
      LEFT JOIN (
        SELECT bi.variant_id, MAX(b.created_at) as last_sold, SUM(bi.quantity) as total_sold
        FROM bill_items bi JOIN bills b ON bi.bill_id = b.id
        GROUP BY bi.variant_id
      ) last_sale ON last_sale.variant_id = pv.id
      WHERE vs.quantity > 0
        AND (last_sale.last_sold IS NULL OR EXTRACT(DAY FROM NOW() - last_sale.last_sold) > $1)
        ${storeFilter}
      ORDER BY days_since_last_sale DESC
    `, params);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stock aging report
router.get('/stock-aging', authenticate, async (req, res) => {
  try {
    const { store_id } = req.query;
    let storeFilter = '';
    let params = [];
    if (store_id) { storeFilter = 'AND vs.store_id = $1'; params.push(store_id); }

    const { rows: aging } = await db.query(`
      SELECT p.name, p.sku, p.season, p.brand,
             pv.sku_variant, pv.size, pv.color,
             vs.quantity, vs.received_date, s.name as store_name,
             EXTRACT(DAY FROM NOW() - COALESCE(vs.received_date, pv.created_at))::INTEGER as days_in_inventory,
             CASE
               WHEN EXTRACT(DAY FROM NOW() - COALESCE(vs.received_date, pv.created_at)) <= 30 THEN '0-30 days'
               WHEN EXTRACT(DAY FROM NOW() - COALESCE(vs.received_date, pv.created_at)) <= 60 THEN '31-60 days'
               WHEN EXTRACT(DAY FROM NOW() - COALESCE(vs.received_date, pv.created_at)) <= 90 THEN '61-90 days'
               WHEN EXTRACT(DAY FROM NOW() - COALESCE(vs.received_date, pv.created_at)) <= 180 THEN '91-180 days'
               ELSE '180+ days'
             END as aging_bucket
      FROM variant_stock vs
      JOIN product_variants pv ON vs.variant_id = pv.id AND pv.active = 1
      JOIN products p ON pv.product_id = p.id AND p.active = 1
      JOIN stores s ON vs.store_id = s.id AND s.active = 1
      WHERE vs.quantity > 0 ${storeFilter}
      ORDER BY days_in_inventory DESC
    `, params);

    // Summary by bucket
    const buckets = {};
    for (const row of aging) {
      if (!buckets[row.aging_bucket]) buckets[row.aging_bucket] = { count: 0, total_qty: 0 };
      buckets[row.aging_bucket].count++;
      buckets[row.aging_bucket].total_qty += row.quantity;
    }

    res.json({ items: aging, summary: buckets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stock by season
router.get('/stock-by-season', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT p.season, COUNT(DISTINCT p.id) as products, SUM(vs.quantity) as total_stock,
             SUM(vs.quantity * p.cost_price) as stock_value
      FROM variant_stock vs
      JOIN product_variants pv ON vs.variant_id = pv.id AND pv.active = 1
      JOIN products p ON pv.product_id = p.id AND p.active = 1
      WHERE vs.quantity > 0
      GROUP BY p.season
      ORDER BY total_stock DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sales by category
router.get('/sales-by-category', authenticate, async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    let dateFilter = '';
    let params = [];
    let paramIndex = 1;
    if (from_date) { dateFilter += ` AND b.created_at >= $${paramIndex++}`; params.push(from_date); }
    if (to_date) { dateFilter += ` AND b.created_at <= $${paramIndex++}`; params.push(to_date + ' 23:59:59'); }

    const { rows } = await db.query(`
      SELECT c.name as category, SUM(bi.quantity) as total_qty, SUM(bi.total) as total_revenue
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      JOIN product_variants pv ON bi.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1 ${dateFilter}
      GROUP BY c.name
      ORDER BY total_revenue DESC
    `, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inventory valuation
router.get('/inventory-value', authenticate, async (req, res) => {
  try {
    const { store_id } = req.query;
    let storeFilter = '';
    let params = [];
    if (store_id) { storeFilter = 'AND vs.store_id = $1'; params.push(store_id); }

    const { rows } = await db.query(`
      SELECT s.name as store_name,
             COUNT(DISTINCT pv.product_id) as products,
             SUM(vs.quantity) as total_units,
             SUM(vs.quantity * p.cost_price) as cost_value,
             SUM(vs.quantity * p.selling_price) as retail_value
      FROM variant_stock vs
      JOIN product_variants pv ON vs.variant_id = pv.id AND pv.active = 1
      JOIN products p ON pv.product_id = p.id AND p.active = 1
      JOIN stores s ON vs.store_id = s.id AND s.active = 1
      WHERE vs.quantity > 0 ${storeFilter}
      GROUP BY vs.store_id, s.name
    `, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
