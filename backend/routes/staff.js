const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const db = require('../db');
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const { uploadToCloudinary } = require('../utils/cloudinary');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// List staff
router.get('/', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id,username,name,role,picture,phone,store_id,active,created_at FROM users WHERE id != 1 ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create staff member
router.post('/', authenticate, authorizeAdmin, upload.single('picture'), async (req, res) => {
  try {
    const { username, password, name, role, phone, store_id } = req.body;
    if (!username || !password || !name) return res.status(400).json({ error: 'Username, password and name are required' });

    const { rows: existing } = await db.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing[0]) return res.status(400).json({ error: 'Username already exists' });

    const hash = bcrypt.hashSync(password, 10);
    let picture = null;
    if (req.file) {
      picture = await uploadToCloudinary(req.file.buffer, 'kumar-dresses/staff');
    }
    const validRole = ['staff', 'user'].includes(role) ? role : 'user';

    const { rows } = await db.query(
      'INSERT INTO users (username,password,name,role,picture,phone,store_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [username, hash, name, validRole, picture, phone || '', store_id || null]
    );
    res.status(201).json({ id: rows[0].id, message: 'Staff member created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update staff
router.put('/:id', authenticate, authorizeAdmin, upload.single('picture'), async (req, res) => {
  try {
    const { name, role, phone, store_id, active, password } = req.body;
    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    const user = rows[0];

    let picture = user.picture;
    if (req.file) {
      picture = await uploadToCloudinary(req.file.buffer, 'kumar-dresses/staff');
    }
    const validRole = role && ['staff', 'user'].includes(role) ? role : user.role;

    await db.query('UPDATE users SET name=$1,role=$2,phone=$3,store_id=$4,picture=$5,active=$6 WHERE id=$7',
      [name || user.name, validRole, phone || user.phone, store_id || user.store_id, picture, active !== undefined ? Number(active) : user.active, req.params.id]);

    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      await db.query('UPDATE users SET password=$1 WHERE id=$2', [hash, req.params.id]);
    }

    res.json({ message: 'Staff member updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete staff (soft)
router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    if (Number(req.params.id) === 1) return res.status(400).json({ error: 'Cannot delete default admin' });
    await db.query('UPDATE users SET active = 0 WHERE id = $1', [req.params.id]);
    res.json({ message: 'Staff member deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
