const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// Dead stock / slow-moving stock
router.get('/dead-stock', authenticate, (req, res) => {
  const { days = 90, store_id } = req.query;
  const storeFilter = store_id ? 'AND vs.store_id = ?' : '';
  const sp = store_id ? [store_id] : [];

  const deadStock = db.prepare(`
    SELECT p.id, p.name, p.sku, p.brand, p.season, p.image,
           pv.id as variant_id, pv.sku_variant, pv.size, pv.color, pv.fit,
           vs.store_id, s.name as store_name,
           vs.quantity, vs.received_date,
           COALESCE(last_sale.last_sold, 'Never') as last_sold,
           COALESCE(last_sale.total_sold, 0) as total_ever_sold,
           CAST(julianday('now') - julianday(COALESCE(last_sale.last_sold, vs.received_date, pv.created_at)) AS INTEGER) as days_since_last_sale
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
      AND (last_sale.last_sold IS NULL OR julianday('now') - julianday(last_sale.last_sold) > ?)
      ${storeFilter}
    ORDER BY days_since_last_sale DESC
  `).all(Number(days), ...sp);

  res.json(deadStock);
});

// Stock aging report
router.get('/stock-aging', authenticate, (req, res) => {
  const { store_id } = req.query;
  const storeFilter = store_id ? 'AND vs.store_id = ?' : '';
  const sp = store_id ? [store_id] : [];

  const aging = db.prepare(`
    SELECT p.name, p.sku, p.season, p.brand,
           pv.sku_variant, pv.size, pv.color,
           vs.quantity, vs.received_date, s.name as store_name,
           CAST(julianday('now') - julianday(COALESCE(vs.received_date, pv.created_at)) AS INTEGER) as days_in_inventory,
           CASE
             WHEN julianday('now') - julianday(COALESCE(vs.received_date, pv.created_at)) <= 30 THEN '0-30 days'
             WHEN julianday('now') - julianday(COALESCE(vs.received_date, pv.created_at)) <= 60 THEN '31-60 days'
             WHEN julianday('now') - julianday(COALESCE(vs.received_date, pv.created_at)) <= 90 THEN '61-90 days'
             WHEN julianday('now') - julianday(COALESCE(vs.received_date, pv.created_at)) <= 180 THEN '91-180 days'
             ELSE '180+ days'
           END as aging_bucket
    FROM variant_stock vs
    JOIN product_variants pv ON vs.variant_id = pv.id AND pv.active = 1
    JOIN products p ON pv.product_id = p.id AND p.active = 1
    JOIN stores s ON vs.store_id = s.id AND s.active = 1
    WHERE vs.quantity > 0 ${storeFilter}
    ORDER BY days_in_inventory DESC
  `).all(...sp);

  // Summary by bucket
  const buckets = {};
  for (const row of aging) {
    if (!buckets[row.aging_bucket]) buckets[row.aging_bucket] = { count: 0, total_qty: 0 };
    buckets[row.aging_bucket].count++;
    buckets[row.aging_bucket].total_qty += row.quantity;
  }

  res.json({ items: aging, summary: buckets });
});

// Stock by season
router.get('/stock-by-season', authenticate, (req, res) => {
  const data = db.prepare(`
    SELECT p.season, COUNT(DISTINCT p.id) as products, SUM(vs.quantity) as total_stock,
           SUM(vs.quantity * p.cost_price) as stock_value
    FROM variant_stock vs
    JOIN product_variants pv ON vs.variant_id = pv.id AND pv.active = 1
    JOIN products p ON pv.product_id = p.id AND p.active = 1
    WHERE vs.quantity > 0
    GROUP BY p.season
    ORDER BY total_stock DESC
  `).all();
  res.json(data);
});

// Sales by category
router.get('/sales-by-category', authenticate, (req, res) => {
  const { from_date, to_date } = req.query;
  let dateFilter = '';
  let params = [];
  if (from_date) { dateFilter += ' AND b.created_at >= ?'; params.push(from_date); }
  if (to_date) { dateFilter += ' AND b.created_at <= ?'; params.push(to_date + ' 23:59:59'); }

  const data = db.prepare(`
    SELECT c.name as category, SUM(bi.quantity) as total_qty, SUM(bi.total) as total_revenue
    FROM bill_items bi
    JOIN bills b ON bi.bill_id = b.id
    JOIN product_variants pv ON bi.variant_id = pv.id
    JOIN products p ON pv.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE 1=1 ${dateFilter}
    GROUP BY c.name
    ORDER BY total_revenue DESC
  `).all(...params);
  res.json(data);
});

// Inventory valuation
router.get('/inventory-value', authenticate, (req, res) => {
  const { store_id } = req.query;
  const storeFilter = store_id ? 'AND vs.store_id = ?' : '';
  const sp = store_id ? [store_id] : [];

  const valuation = db.prepare(`
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
    GROUP BY vs.store_id
  `).all(...sp);
  res.json(valuation);
});

module.exports = router;
