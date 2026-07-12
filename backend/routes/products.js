const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate, authorizeAdmin, authorizeStaffOrAdmin } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, 'prod_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

function generateSKU(name, category) {
  const prefix = (category || 'GEN').substring(0, 3).toUpperCase();
  const namePart = name.substring(0, 3).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${namePart}-${rand}`;
}

function generateBarcode() {
  return 'KD' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
}

// List products with filters
router.get('/', authenticate, (req, res) => {
  const { category_id, brand, season, search, active, page = 1, limit = 50 } = req.query;
  let where = ['1=1'];
  let params = [];

  if (active !== undefined) { where.push('p.active = ?'); params.push(Number(active)); }
  else { where.push('p.active = 1'); }
  if (category_id) { where.push('p.category_id = ?'); params.push(category_id); }
  if (brand) { where.push('p.brand LIKE ?'); params.push(`%${brand}%`); }
  if (season) { where.push('p.season = ?'); params.push(season); }
  if (search) { where.push('(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

  const offset = (Number(page) - 1) * Number(limit);
  const total = db.prepare(`SELECT COUNT(*) as count FROM products p WHERE ${where.join(' AND ')}`).get(...params).count;

  const products = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE ${where.join(' AND ')}
    ORDER BY p.updated_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), offset);

  // Attach variant count and total stock per product
  for (const prod of products) {
    const variantInfo = db.prepare(`
      SELECT COUNT(pv.id) as variant_count,
             COALESCE(SUM(vs.quantity), 0) as total_stock
      FROM product_variants pv
      LEFT JOIN variant_stock vs ON pv.id = vs.variant_id
      WHERE pv.product_id = ? AND pv.active = 1
    `).get(prod.id);
    prod.variant_count = variantInfo.variant_count;
    prod.total_stock = variantInfo.total_stock;
  }

  res.json({ products, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});

// Get single product with variants and stock
router.get('/:id', authenticate, (req, res) => {
  const product = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `).get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  product.variants = db.prepare('SELECT * FROM product_variants WHERE product_id = ? AND active = 1').all(product.id);

  for (const v of product.variants) {
    v.stock = db.prepare(`
      SELECT vs.*, s.name as store_name, s.code as store_code
      FROM variant_stock vs
      JOIN stores s ON vs.store_id = s.id
      WHERE vs.variant_id = ?
    `).all(v.id);
  }

  // Attach size chart if category has one
  if (product.category_id) {
    const cat = db.prepare('SELECT size_chart_id FROM categories WHERE id = ?').get(product.category_id);
    if (cat && cat.size_chart_id) {
      product.size_chart = db.prepare('SELECT * FROM size_charts WHERE id = ?').get(cat.size_chart_id);
      if (product.size_chart) {
        product.size_chart.entries = db.prepare('SELECT * FROM size_chart_entries WHERE size_chart_id = ? ORDER BY sort_order').all(product.size_chart.id);
      }
    }
  }

  res.json(product);
});

// Create product (admin)
router.post('/', authenticate, authorizeAdmin, upload.single('image'), (req, res) => {
  const { name, category_id, brand, fabric, material, season, gender, collection, mrp, cost_price, selling_price, hsn_code, tax_percent, description } = req.body;
  if (!name || !mrp || !selling_price) return res.status(400).json({ error: 'Name, MRP and selling price are required' });

  const catName = category_id ? (db.prepare('SELECT name FROM categories WHERE id=?').get(category_id) || {}).name : '';
  const sku = generateSKU(name, catName);
  const barcode = generateBarcode();
  const image = req.file ? `/uploads/${req.file.filename}` : null;

  const result = db.prepare(`
    INSERT INTO products (sku,name,category_id,brand,fabric,material,season,gender,collection,mrp,cost_price,selling_price,hsn_code,tax_percent,description,image,barcode)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(sku, name, category_id||null, brand||'', fabric||'', material||'', season||'', gender||'', collection||'', Number(mrp), Number(cost_price)||0, Number(selling_price), hsn_code||'', Number(tax_percent)||0, description||'', image, barcode);

  res.status(201).json({ id: result.lastInsertRowid, sku, barcode, message: 'Product created' });
});

// Update product (admin)
router.put('/:id', authenticate, authorizeAdmin, upload.single('image'), (req, res) => {
  const { name, category_id, brand, fabric, material, season, gender, collection, mrp, cost_price, selling_price, hsn_code, tax_percent, description } = req.body;
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  const image = req.file ? `/uploads/${req.file.filename}` : existing.image;

  db.prepare(`
    UPDATE products SET name=?,category_id=?,brand=?,fabric=?,material=?,season=?,gender=?,collection=?,mrp=?,cost_price=?,selling_price=?,hsn_code=?,tax_percent=?,description=?,image=?,updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(
    name||existing.name, category_id||existing.category_id, brand||existing.brand, fabric||existing.fabric,
    material||existing.material, season||existing.season, gender!==undefined?gender:existing.gender, collection||existing.collection,
    Number(mrp)||existing.mrp, Number(cost_price)||existing.cost_price, Number(selling_price)||existing.selling_price,
    hsn_code||existing.hsn_code, Number(tax_percent)||existing.tax_percent, description||existing.description,
    image, req.params.id
  );
  res.json({ message: 'Product updated' });
});

// Delete product (admin) — soft delete
router.delete('/:id', authenticate, authorizeAdmin, (req, res) => {
  db.prepare('UPDATE products SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.json({ message: 'Product deleted' });
});

// === VARIANT ENDPOINTS (nested under products) ===

// Add variant to product
router.post('/:id/variants', authenticate, authorizeAdmin, upload.single('image'), (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const { size, color, fit, additional_price } = req.body;
  if (!size) return res.status(400).json({ error: 'Size is required' });

  const skuVariant = `${product.sku}-${size}${color ? '-' + color.substring(0, 3).toUpperCase() : ''}${fit ? '-' + fit.substring(0, 3).toUpperCase() : ''}`;
  const barcode = generateBarcode();
  const image = req.file ? `/uploads/${req.file.filename}` : null;

  // Check duplicate
  const dup = db.prepare('SELECT id FROM product_variants WHERE product_id=? AND size=? AND color=? AND fit=?')
    .get(req.params.id, size, color||'', fit||'');
  if (dup) return res.status(400).json({ error: 'This variant already exists' });

  const result = db.prepare(
    'INSERT INTO product_variants (product_id,sku_variant,size,color,fit,barcode,image,additional_price) VALUES (?,?,?,?,?,?,?,?)'
  ).run(req.params.id, skuVariant, size, color||'', fit||'', barcode, image, Number(additional_price)||0);

  // Auto-create stock entries for all stores
  const stores = db.prepare('SELECT id FROM stores WHERE active = 1').all();
  const insertStock = db.prepare('INSERT OR IGNORE INTO variant_stock (variant_id, store_id, quantity, reorder_point) VALUES (?,?,0,5)');
  for (const store of stores) {
    insertStock.run(result.lastInsertRowid, store.id);
  }

  res.status(201).json({ id: result.lastInsertRowid, sku_variant: skuVariant, barcode, message: 'Variant added' });
});

// Bulk add variants
router.post('/:id/variants/bulk', authenticate, authorizeAdmin, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const { variants } = req.body; // [{ size, color, fit, additional_price }]
  if (!variants || !variants.length) return res.status(400).json({ error: 'Variants array is required' });

  const stores = db.prepare('SELECT id FROM stores WHERE active = 1').all();
  const insertVariant = db.prepare('INSERT INTO product_variants (product_id,sku_variant,size,color,fit,barcode,additional_price) VALUES (?,?,?,?,?,?,?)');
  const insertStock = db.prepare('INSERT OR IGNORE INTO variant_stock (variant_id, store_id, quantity, reorder_point) VALUES (?,?,0,5)');
  const created = [];

  const tx = db.transaction(() => {
    for (const v of variants) {
      if (!v.size) continue;
      const dup = db.prepare('SELECT id FROM product_variants WHERE product_id=? AND size=? AND color=? AND fit=?')
        .get(product.id, v.size, v.color||'', v.fit||'');
      if (dup) continue;

      const skuVariant = `${product.sku}-${v.size}${v.color ? '-' + v.color.substring(0, 3).toUpperCase() : ''}${v.fit ? '-' + v.fit.substring(0, 3).toUpperCase() : ''}`;
      const barcode = generateBarcode();
      const result = insertVariant.run(product.id, skuVariant, v.size, v.color||'', v.fit||'', barcode, Number(v.additional_price)||0);
      for (const store of stores) { insertStock.run(result.lastInsertRowid, store.id); }
      created.push({ id: result.lastInsertRowid, sku_variant: skuVariant, barcode, size: v.size, color: v.color||'', fit: v.fit||'' });
    }
  });
  tx();

  res.status(201).json({ created, message: `${created.length} variants added` });
});

// Update variant
router.put('/:productId/variants/:variantId', authenticate, authorizeAdmin, upload.single('image'), (req, res) => {
  const { additional_price } = req.body;
  const existing = db.prepare('SELECT * FROM product_variants WHERE id = ? AND product_id = ?').get(req.params.variantId, req.params.productId);
  if (!existing) return res.status(404).json({ error: 'Variant not found' });

  const image = req.file ? `/uploads/${req.file.filename}` : existing.image;
  db.prepare('UPDATE product_variants SET image=?, additional_price=? WHERE id=?')
    .run(image, Number(additional_price)||existing.additional_price, req.params.variantId);
  res.json({ message: 'Variant updated' });
});

// Delete variant (soft)
router.delete('/:productId/variants/:variantId', authenticate, authorizeAdmin, (req, res) => {
  db.prepare('UPDATE product_variants SET active = 0 WHERE id = ? AND product_id = ?').run(req.params.variantId, req.params.productId);
  res.json({ message: 'Variant deleted' });
});

module.exports = router;
