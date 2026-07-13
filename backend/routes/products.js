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
router.get('/', authenticate, async (req, res) => {
  try {
    const { category_id, brand, season, search, active, page = 1, limit = 50 } = req.query;
    let where = ['1=1'];
    let params = [];
    let paramIndex = 1;

    if (active !== undefined) { where.push(`p.active = $${paramIndex++}`); params.push(Number(active)); }
    else { where.push('p.active = 1'); }
    if (category_id) { where.push(`p.category_id = $${paramIndex++}`); params.push(category_id); }
    if (brand) { where.push(`p.brand ILIKE $${paramIndex++}`); params.push(`%${brand}%`); }
    if (season) { where.push(`p.season = $${paramIndex++}`); params.push(season); }
    if (search) { where.push(`(p.name ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex + 1} OR p.barcode ILIKE $${paramIndex + 2})`); params.push(`%${search}%`, `%${search}%`, `%${search}%`); paramIndex += 3; }

    const offset = (Number(page) - 1) * Number(limit);
    const whereClause = where.join(' AND ');

    const countResult = await db.query(`SELECT COUNT(*) as count FROM products p WHERE ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const products = await db.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ${whereClause}
      ORDER BY p.updated_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `, [...params, Number(limit), offset]);

    // Attach variant count and total stock per product
    for (const prod of products.rows) {
      const variantInfo = await db.query(`
        SELECT COUNT(pv.id) as variant_count,
               COALESCE(SUM(vs.quantity), 0) as total_stock
        FROM product_variants pv
        LEFT JOIN variant_stock vs ON pv.id = vs.variant_id
        WHERE pv.product_id = $1 AND pv.active = 1
      `, [prod.id]);
      prod.variant_count = parseInt(variantInfo.rows[0].variant_count);
      prod.total_stock = parseInt(variantInfo.rows[0].total_stock);
    }

    res.json({ products: products.rows, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single product with variants and stock
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT p.*, c.name as category_name
      FROM products p LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Product not found' });
    const product = rows[0];

    const variants = await db.query('SELECT * FROM product_variants WHERE product_id = $1 AND active = 1', [product.id]);
    product.variants = variants.rows;

    for (const v of product.variants) {
      const stockResult = await db.query(`
        SELECT vs.*, s.name as store_name, s.code as store_code
        FROM variant_stock vs
        JOIN stores s ON vs.store_id = s.id
        WHERE vs.variant_id = $1
      `, [v.id]);
      v.stock = stockResult.rows;
    }

    // Attach size chart if category has one
    if (product.category_id) {
      const catResult = await db.query('SELECT size_chart_id FROM categories WHERE id = $1', [product.category_id]);
      if (catResult.rows[0] && catResult.rows[0].size_chart_id) {
        const chartResult = await db.query('SELECT * FROM size_charts WHERE id = $1', [catResult.rows[0].size_chart_id]);
        if (chartResult.rows[0]) {
          product.size_chart = chartResult.rows[0];
          const entriesResult = await db.query('SELECT * FROM size_chart_entries WHERE size_chart_id = $1 ORDER BY sort_order', [product.size_chart.id]);
          product.size_chart.entries = entriesResult.rows;
        }
      }
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create product (admin)
router.post('/', authenticate, authorizeAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, category_id, brand, fabric, material, season, gender, collection, mrp, cost_price, selling_price, hsn_code, tax_percent, description } = req.body;
    if (!name || !mrp || !selling_price) return res.status(400).json({ error: 'Name, MRP and selling price are required' });

    let catName = '';
    if (category_id) {
      const catResult = await db.query('SELECT name FROM categories WHERE id=$1', [category_id]);
      catName = catResult.rows[0] ? catResult.rows[0].name : '';
    }
    const sku = generateSKU(name, catName);
    const barcode = generateBarcode();
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    const { rows } = await db.query(`
      INSERT INTO products (sku,name,category_id,brand,fabric,material,season,gender,collection,mrp,cost_price,selling_price,hsn_code,tax_percent,description,image,barcode)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id
    `, [sku, name, category_id || null, brand || '', fabric || '', material || '', season || '', gender || '', collection || '', Number(mrp), Number(cost_price) || 0, Number(selling_price), hsn_code || '', Number(tax_percent) || 0, description || '', image, barcode]);

    res.status(201).json({ id: rows[0].id, sku, barcode, message: 'Product created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update product (admin)
router.put('/:id', authenticate, authorizeAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, category_id, brand, fabric, material, season, gender, collection, mrp, cost_price, selling_price, hsn_code, tax_percent, description } = req.body;
    const { rows } = await db.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Product not found' });
    const existing = rows[0];

    const image = req.file ? `/uploads/${req.file.filename}` : existing.image;

    await db.query(`
      UPDATE products SET name=$1,category_id=$2,brand=$3,fabric=$4,material=$5,season=$6,gender=$7,collection=$8,mrp=$9,cost_price=$10,selling_price=$11,hsn_code=$12,tax_percent=$13,description=$14,image=$15,updated_at=CURRENT_TIMESTAMP
      WHERE id=$16
    `, [
      name || existing.name, category_id || existing.category_id, brand || existing.brand, fabric || existing.fabric,
      material || existing.material, season || existing.season, gender !== undefined ? gender : existing.gender, collection || existing.collection,
      Number(mrp) || existing.mrp, Number(cost_price) || existing.cost_price, Number(selling_price) || existing.selling_price,
      hsn_code || existing.hsn_code, Number(tax_percent) || existing.tax_percent, description || existing.description,
      image, req.params.id
    ]);
    res.json({ message: 'Product updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete product (admin) — soft delete
router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    await db.query('UPDATE products SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [req.params.id]);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === VARIANT ENDPOINTS ===

// Add variant to product
router.post('/:id/variants', authenticate, authorizeAdmin, upload.single('image'), async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Product not found' });
    const product = rows[0];

    const { size, color, fit, additional_price } = req.body;
    if (!size) return res.status(400).json({ error: 'Size is required' });

    const skuVariant = `${product.sku}-${size}${color ? '-' + color.substring(0, 3).toUpperCase() : ''}${fit ? '-' + fit.substring(0, 3).toUpperCase() : ''}`;
    const barcode = generateBarcode();
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    // Check duplicate
    const dupResult = await db.query(
      'SELECT id FROM product_variants WHERE product_id=$1 AND size=$2 AND color=$3 AND fit=$4',
      [req.params.id, size, color || '', fit || '']
    );
    if (dupResult.rows[0]) return res.status(400).json({ error: 'This variant already exists' });

    const insertResult = await db.query(
      'INSERT INTO product_variants (product_id,sku_variant,size,color,fit,barcode,image,additional_price) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
      [req.params.id, skuVariant, size, color || '', fit || '', barcode, image, Number(additional_price) || 0]
    );
    const variantId = insertResult.rows[0].id;

    // Auto-create stock entries for all stores
    const { rows: stores } = await db.query('SELECT id FROM stores WHERE active = 1');
    for (const store of stores) {
      await db.query(
        'INSERT INTO variant_stock (variant_id, store_id, quantity, reorder_point) VALUES ($1,$2,0,5) ON CONFLICT(variant_id, store_id) DO NOTHING',
        [variantId, store.id]
      );
    }

    res.status(201).json({ id: variantId, sku_variant: skuVariant, barcode, message: 'Variant added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk add variants
router.post('/:id/variants/bulk', authenticate, authorizeAdmin, async (req, res) => {
  const client = await db.getClient();
  try {
    const { rows } = await client.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (!rows[0]) { client.release(); return res.status(404).json({ error: 'Product not found' }); }
    const product = rows[0];

    const { variants } = req.body;
    if (!variants || !variants.length) { client.release(); return res.status(400).json({ error: 'Variants array is required' }); }

    const { rows: stores } = await client.query('SELECT id FROM stores WHERE active = 1');
    const created = [];

    await client.query('BEGIN');

    for (const v of variants) {
      if (!v.size) continue;
      const dupResult = await client.query(
        'SELECT id FROM product_variants WHERE product_id=$1 AND size=$2 AND color=$3 AND fit=$4',
        [product.id, v.size, v.color || '', v.fit || '']
      );
      if (dupResult.rows[0]) continue;

      const skuVariant = `${product.sku}-${v.size}${v.color ? '-' + v.color.substring(0, 3).toUpperCase() : ''}${v.fit ? '-' + v.fit.substring(0, 3).toUpperCase() : ''}`;
      const barcode = generateBarcode();
      const insertResult = await client.query(
        'INSERT INTO product_variants (product_id,sku_variant,size,color,fit,barcode,additional_price) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
        [product.id, skuVariant, v.size, v.color || '', v.fit || '', barcode, Number(v.additional_price) || 0]
      );
      const variantId = insertResult.rows[0].id;
      for (const store of stores) {
        await client.query(
          'INSERT INTO variant_stock (variant_id, store_id, quantity, reorder_point) VALUES ($1,$2,0,5) ON CONFLICT(variant_id, store_id) DO NOTHING',
          [variantId, store.id]
        );
      }
      created.push({ id: variantId, sku_variant: skuVariant, barcode, size: v.size, color: v.color || '', fit: v.fit || '' });
    }

    await client.query('COMMIT');
    res.status(201).json({ created, message: `${created.length} variants added` });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Update variant
router.put('/:productId/variants/:variantId', authenticate, authorizeAdmin, upload.single('image'), async (req, res) => {
  try {
    const { additional_price } = req.body;
    const { rows } = await db.query('SELECT * FROM product_variants WHERE id = $1 AND product_id = $2', [req.params.variantId, req.params.productId]);
    if (!rows[0]) return res.status(404).json({ error: 'Variant not found' });
    const existing = rows[0];

    const image = req.file ? `/uploads/${req.file.filename}` : existing.image;
    await db.query('UPDATE product_variants SET image=$1, additional_price=$2 WHERE id=$3',
      [image, Number(additional_price) || existing.additional_price, req.params.variantId]);
    res.json({ message: 'Variant updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete variant (soft)
router.delete('/:productId/variants/:variantId', authenticate, authorizeAdmin, async (req, res) => {
  try {
    await db.query('UPDATE product_variants SET active = 0 WHERE id = $1 AND product_id = $2', [req.params.variantId, req.params.productId]);
    res.json({ message: 'Variant deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
