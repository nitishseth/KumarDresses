const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /storefront/config — shop branding
router.get('/config', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT shop_name, tagline, logo FROM shop_config LIMIT 1');
    const config = rows[0] || { shop_name: 'Kumar Dresses', tagline: '', logo: '' };
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /storefront/categories — active categories tree
router.get('/categories', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, name, parent_id, level FROM categories WHERE active=1 ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /storefront/products — public product listing with filters
router.get('/products', async (req, res) => {
  try {
    const { category_id, gender, brand, size, color, min_price, max_price, sort, search, page = 1, limit = 24 } = req.query;
    const offset = (page - 1) * limit;
    let where = ['p.active = 1'];
    let params = [];
    let paramIndex = 1;

    if (category_id) { where.push(`p.category_id = $${paramIndex++}`); params.push(category_id); }
    if (gender) { where.push(`p.gender = $${paramIndex++}`); params.push(gender); }
    if (brand) { where.push(`p.brand = $${paramIndex++}`); params.push(brand); }
    if (min_price) { where.push(`p.selling_price >= $${paramIndex++}`); params.push(Number(min_price)); }
    if (max_price) { where.push(`p.selling_price <= $${paramIndex++}`); params.push(Number(max_price)); }
    if (search) { where.push(`(p.name ILIKE $${paramIndex} OR p.brand ILIKE $${paramIndex + 1} OR p.description ILIKE $${paramIndex + 2})`); params.push(`%${search}%`, `%${search}%`, `%${search}%`); paramIndex += 3; }

    // size and color filter via EXISTS subquery (avoids DISTINCT issues)
    if (size || color) {
      let variantWhere = ['pv2.product_id = p.id', 'pv2.active = 1'];
      if (size) { variantWhere.push(`pv2.size = $${paramIndex++}`); params.push(size); }
      if (color) { variantWhere.push(`pv2.color = $${paramIndex++}`); params.push(color); }
      where.push(`EXISTS (SELECT 1 FROM product_variants pv2 WHERE ${variantWhere.join(' AND ')})`);
    }

    let orderBy = 'p.created_at DESC';
    if (sort === 'price_low') orderBy = 'p.selling_price ASC';
    else if (sort === 'price_high') orderBy = 'p.selling_price DESC';
    else if (sort === 'name_asc') orderBy = 'p.name ASC';
    else if (sort === 'name_desc') orderBy = 'p.name DESC';
    else if (sort === 'discount') orderBy = '(p.mrp - p.selling_price) DESC';

    const whereClause = where.join(' AND ');

    const countResult = await db.query(`SELECT COUNT(*) as total FROM products p WHERE ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].total);

    const limitParam = paramIndex++;
    const offsetParam = paramIndex++;
    const query = `
      SELECT p.id, p.name, p.sku, p.brand, p.mrp, p.selling_price, p.image, p.gender, p.season,
             c.name as category_name,
             COALESCE(stock_agg.total_stock, 0) as total_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN (
        SELECT pv.product_id, SUM(vs.quantity) as total_stock
        FROM product_variants pv
        LEFT JOIN variant_stock vs ON vs.variant_id = pv.id
        WHERE pv.active = 1
        GROUP BY pv.product_id
      ) stock_agg ON stock_agg.product_id = p.id
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const products = await db.query(query, [...params, Number(limit), Number(offset)]);
    res.json({ products: products.rows, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /storefront/products/:id — single product detail
router.get('/products/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT p.*, c.name as category_name
      FROM products p LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1 AND p.active = 1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Product not found' });
    const product = rows[0];

    const variants = await db.query(`
      SELECT pv.id, pv.size, pv.color, pv.fit, pv.image, pv.additional_price,
             COALESCE(SUM(vs.quantity - vs.reserved_quantity), 0) as available
      FROM product_variants pv
      LEFT JOIN variant_stock vs ON vs.variant_id = pv.id
      WHERE pv.product_id = $1 AND pv.active = 1
      GROUP BY pv.id, pv.size, pv.color, pv.fit, pv.image, pv.additional_price
    `, [product.id]);
    product.variants = variants.rows;

    // Size chart
    if (product.category_id) {
      const catResult = await db.query('SELECT size_chart_id FROM categories WHERE id=$1', [product.category_id]);
      if (catResult.rows[0] && catResult.rows[0].size_chart_id) {
        const entries = await db.query('SELECT * FROM size_chart_entries WHERE size_chart_id=$1 ORDER BY sort_order', [catResult.rows[0].size_chart_id]);
        product.size_chart = entries.rows;
      }
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /storefront/filters — available filter options
router.get('/filters', async (req, res) => {
  try {
    const brands = await db.query("SELECT DISTINCT brand FROM products WHERE active=1 AND brand IS NOT NULL AND brand != '' ORDER BY brand");
    const genders = await db.query("SELECT DISTINCT gender FROM products WHERE active=1 AND gender IS NOT NULL AND gender != '' ORDER BY gender");
    const sizes = await db.query("SELECT DISTINCT size FROM product_variants WHERE active=1 ORDER BY size");
    const colors = await db.query("SELECT DISTINCT color FROM product_variants WHERE active=1 AND color IS NOT NULL AND color != '' ORDER BY color");
    const priceRange = await db.query("SELECT MIN(selling_price) as min_price, MAX(selling_price) as max_price FROM products WHERE active=1");
    res.json({
      brands: brands.rows.map(r => r.brand),
      genders: genders.rows.map(r => r.gender),
      sizes: sizes.rows.map(r => r.size),
      colors: colors.rows.map(r => r.color),
      priceRange: priceRange.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /storefront/new-arrivals
router.get('/new-arrivals', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT p.id, p.name, p.brand, p.mrp, p.selling_price, p.image, p.gender,
             c.name as category_name
      FROM products p LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.active = 1
      ORDER BY p.created_at DESC LIMIT 12
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /storefront/offers — products with discount
router.get('/offers', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT p.id, p.name, p.brand, p.mrp, p.selling_price, p.image, p.gender,
             c.name as category_name,
             CASE WHEN p.mrp > 0 THEN ROUND(((p.mrp - p.selling_price) * 100.0 / p.mrp), 0) ELSE 0 END as discount_pct
      FROM products p LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.active = 1 AND p.mrp > p.selling_price AND p.mrp > 0
      ORDER BY discount_pct DESC LIMIT 12
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== WISHLIST (requires token) =====
router.get('/wishlist', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT w.id, w.product_id, w.created_at, p.name, p.brand, p.mrp, p.selling_price, p.image, p.gender,
             c.name as category_name
      FROM wishlists w
      JOIN products p ON w.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE w.user_id = $1 AND p.active = 1
      ORDER BY w.created_at DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/wishlist/:productId', authenticate, async (req, res) => {
  try {
    const productId = req.params.productId;
    const { rows } = await db.query('SELECT id FROM products WHERE id=$1 AND active=1', [productId]);
    if (!rows[0]) return res.status(404).json({ error: 'Product not found' });
    await db.query('INSERT INTO wishlists (user_id, product_id) VALUES ($1,$2) ON CONFLICT(user_id, product_id) DO NOTHING', [req.user.id, productId]);
    res.json({ message: 'Added to wishlist' });
  } catch (err) {
    res.status(500).json({ error: 'Error adding to wishlist' });
  }
});

router.delete('/wishlist/:productId', authenticate, async (req, res) => {
  try {
    await db.query('DELETE FROM wishlists WHERE user_id=$1 AND product_id=$2', [req.user.id, req.params.productId]);
    res.json({ message: 'Removed from wishlist' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/wishlist/ids', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT product_id FROM wishlists WHERE user_id=$1', [req.user.id]);
    res.json(rows.map(r => r.product_id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
