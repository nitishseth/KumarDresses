const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'shop_logo_' + Date.now() + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Get shop config
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM shop_config LIMIT 1');
    res.json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update shop config (admin only)
router.put('/', authenticate, authorizeAdmin, upload.single('logo'), async (req, res) => {
  try {
    const { shop_name, address, phone, email, gst_number, tagline } = req.body;
    if (!shop_name) {
      return res.status(400).json({ error: 'Shop name is required' });
    }

    const { rows } = await db.query('SELECT * FROM shop_config LIMIT 1');
    const existing = rows[0];
    const logo = req.file ? `/uploads/${req.file.filename}` : (existing ? existing.logo : null);

    if (existing) {
      await db.query(`
        UPDATE shop_config SET shop_name = $1, address = $2, phone = $3, email = $4, 
        gst_number = $5, tagline = $6, logo = $7, configured = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
      `, [shop_name, address || '', phone || '', email || '', gst_number || '', tagline || '', logo, existing.id]);
    } else {
      await db.query(`
        INSERT INTO shop_config (shop_name, address, phone, email, gst_number, tagline, logo, configured) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
      `, [shop_name, address || '', phone || '', email || '', gst_number || '', tagline || '', logo]);
    }

    const configResult = await db.query('SELECT * FROM shop_config LIMIT 1');
    res.json({ message: 'Shop configuration saved', config: configResult.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
