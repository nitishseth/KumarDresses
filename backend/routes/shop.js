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
router.get('/', authenticate, (req, res) => {
  const config = db.prepare('SELECT * FROM shop_config LIMIT 1').get();
  res.json(config || {});
});

// Update shop config (admin only, one-time setup or update)
router.put('/', authenticate, authorizeAdmin, upload.single('logo'), (req, res) => {
  const { shop_name, address, phone, email, gst_number, tagline } = req.body;
  if (!shop_name) {
    return res.status(400).json({ error: 'Shop name is required' });
  }

  const existing = db.prepare('SELECT * FROM shop_config LIMIT 1').get();
  const logo = req.file ? `/uploads/${req.file.filename}` : (existing ? existing.logo : null);

  if (existing) {
    db.prepare(`
      UPDATE shop_config SET shop_name = ?, address = ?, phone = ?, email = ?, 
      gst_number = ?, tagline = ?, logo = ?, configured = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(shop_name, address || '', phone || '', email || '', gst_number || '', tagline || '', logo, existing.id);
  } else {
    db.prepare(`
      INSERT INTO shop_config (shop_name, address, phone, email, gst_number, tagline, logo, configured) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(shop_name, address || '', phone || '', email || '', gst_number || '', tagline || '', logo);
  }

  const config = db.prepare('SELECT * FROM shop_config LIMIT 1').get();
  res.json({ message: 'Shop configuration saved', config });
});

module.exports = router;
