const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /storefront/config — shop branding
router.get('/config', (req, res) => {
  const config = db.prepare('SELECT shop_name, tagline, logo FROM shop_config LIMIT 1').get();
  res.json(config || { shop_name: 'Kumar Dresses', tagline: '', logo: '' });
});

// GET /storefront/categories — active categories tree
router.get('/categories', (req, res) => {
  const cats = db.prepare('SELECT id, name, parent_id, level FROM categories WHERE active=1 ORDER BY name').all();
  res.json(cats);
});

// GET /storefront/products — public product listing with filters
router.get('/products', (req, res) => {
  const { category_id, gender, brand, size, color, min_price, max_price, sort, search, page = 1, limit = 24 } = req.query;
  const offset = (page - 1) * limit;
  let where = ['p.active = 1'];
  let params = [];

  if (category_id) { where.push('p.category_id = ?'); params.push(category_id); }
  if (gender) { where.push('p.gender = ?'); params.push(gender); }
  if (brand) { where.push('p.brand = ?'); params.push(brand); }
  if (min_price) { where.push('p.selling_price >= ?'); params.push(Number(min_price)); }
  if (max_price) { where.push('p.selling_price <= ?'); params.push(Number(max_price)); }
  if (search) { where.push("(p.name LIKE ? OR p.brand LIKE ? OR p.description LIKE ?)"); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

  // size and color filter via variant join
  let variantJoin = '';
  if (size || color) {
    variantJoin = 'JOIN product_variants pv2 ON pv2.product_id = p.id AND pv2.active = 1';
    if (size) { variantJoin += ' AND pv2.size = ?'; params.push(size); }
    if (color) { variantJoin += ' AND pv2.color = ?'; params.push(color); }
  }

  let orderBy = 'p.created_at DESC';
  if (sort === 'price_low') orderBy = 'p.selling_price ASC';
  else if (sort === 'price_high') orderBy = 'p.selling_price DESC';
  else if (sort === 'name_asc') orderBy = 'p.name ASC';
  else if (sort === 'name_desc') orderBy = 'p.name DESC';
  else if (sort === 'discount') orderBy = '(p.mrp - p.selling_price) DESC';

  const whereClause = where.join(' AND ');

  const countQuery = `SELECT COUNT(DISTINCT p.id) as total FROM products p ${variantJoin} WHERE ${whereClause}`;
  const total = db.prepare(countQuery).get(...params).total;

  const query = `
    SELECT DISTINCT p.id, p.name, p.sku, p.brand, p.mrp, p.selling_price, p.image, p.gender, p.season,
           c.name as category_name,
           COALESCE(SUM(vs.quantity), 0) as total_stock
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ${variantJoin}
    LEFT JOIN product_variants pv ON pv.product_id = p.id AND pv.active = 1
    LEFT JOIN variant_stock vs ON vs.variant_id = pv.id
    WHERE ${whereClause}
    GROUP BY p.id
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

  const products = db.prepare(query).all(...params, Number(limit), Number(offset));
  res.json({ products, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// GET /storefront/products/:id — single product detail
router.get('/products/:id', (req, res) => {
  const product = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ? AND p.active = 1
  `).get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  product.variants = db.prepare(`
    SELECT pv.id, pv.size, pv.color, pv.fit, pv.image, pv.additional_price,
           COALESCE(SUM(vs.quantity - vs.reserved_quantity), 0) as available
    FROM product_variants pv
    LEFT JOIN variant_stock vs ON vs.variant_id = pv.id
    WHERE pv.product_id = ? AND pv.active = 1
    GROUP BY pv.id
  `).all(product.id);

  // Size chart
  if (product.category_id) {
    const cat = db.prepare('SELECT size_chart_id FROM categories WHERE id=?').get(product.category_id);
    if (cat && cat.size_chart_id) {
      product.size_chart = db.prepare('SELECT * FROM size_chart_entries WHERE size_chart_id=? ORDER BY sort_order').all(cat.size_chart_id);
    }
  }

  res.json(product);
});

// GET /storefront/filters — available filter options
router.get('/filters', (req, res) => {
  const brands = db.prepare("SELECT DISTINCT brand FROM products WHERE active=1 AND brand IS NOT NULL AND brand != '' ORDER BY brand").all().map(r => r.brand);
  const genders = db.prepare("SELECT DISTINCT gender FROM products WHERE active=1 AND gender IS NOT NULL AND gender != '' ORDER BY gender").all().map(r => r.gender);
  const sizes = db.prepare("SELECT DISTINCT size FROM product_variants WHERE active=1 ORDER BY size").all().map(r => r.size);
  const colors = db.prepare("SELECT DISTINCT color FROM product_variants WHERE active=1 AND color IS NOT NULL AND color != '' ORDER BY color").all().map(r => r.color);
  const priceRange = db.prepare("SELECT MIN(selling_price) as min_price, MAX(selling_price) as max_price FROM products WHERE active=1").get();
  res.json({ brands, genders, sizes, colors, priceRange });
});

// GET /storefront/new-arrivals
router.get('/new-arrivals', (req, res) => {
  const products = db.prepare(`
    SELECT p.id, p.name, p.brand, p.mrp, p.selling_price, p.image, p.gender,
           c.name as category_name
    FROM products p LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.active = 1
    ORDER BY p.created_at DESC LIMIT 12
  `).all();
  res.json(products);
});

// GET /storefront/offers — products with discount
router.get('/offers', (req, res) => {
  const products = db.prepare(`
    SELECT p.id, p.name, p.brand, p.mrp, p.selling_price, p.image, p.gender,
           c.name as category_name,
           ROUND(((p.mrp - p.selling_price) * 100.0 / p.mrp), 0) as discount_pct
    FROM products p LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.active = 1 AND p.mrp > p.selling_price
    ORDER BY discount_pct DESC LIMIT 12
  `).all();
  res.json(products);
});

// ===== WISHLIST (requires token or session) =====
const { authenticate } = require('../middleware/auth');

router.get('/wishlist', authenticate, (req, res) => {
  const items = db.prepare(`
    SELECT w.id, w.product_id, w.created_at, p.name, p.brand, p.mrp, p.selling_price, p.image, p.gender,
           c.name as category_name
    FROM wishlists w
    JOIN products p ON w.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE w.user_id = ? AND p.active = 1
    ORDER BY w.created_at DESC
  `).all(req.user.id);
  res.json(items);
});

router.post('/wishlist/:productId', authenticate, (req, res) => {
  const productId = req.params.productId;
  const exists = db.prepare('SELECT id FROM products WHERE id=? AND active=1').get(productId);
  if (!exists) return res.status(404).json({ error: 'Product not found' });
  try {
    db.prepare('INSERT OR IGNORE INTO wishlists (user_id, product_id) VALUES (?,?)').run(req.user.id, productId);
    res.json({ message: 'Added to wishlist' });
  } catch (err) { res.status(500).json({ error: 'Error adding to wishlist' }); }
});

router.delete('/wishlist/:productId', authenticate, (req, res) => {
  db.prepare('DELETE FROM wishlists WHERE user_id=? AND product_id=?').run(req.user.id, req.params.productId);
  res.json({ message: 'Removed from wishlist' });
});

router.get('/wishlist/ids', authenticate, (req, res) => {
  const ids = db.prepare('SELECT product_id FROM wishlists WHERE user_id=?').all(req.user.id).map(r => r.product_id);
  res.json(ids);
});

module.exports = router;
