const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, 'staff_' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// List staff
router.get('/', authenticate, authorizeAdmin, (req, res) => {
  const staff = db.prepare('SELECT id,username,name,role,picture,phone,store_id,active,created_at FROM users WHERE id != 1 ORDER BY created_at DESC').all();
  res.json(staff);
});

// Create staff member
router.post('/', authenticate, authorizeAdmin, upload.single('picture'), (req, res) => {
  const { username, password, name, role, phone, store_id } = req.body;
  if (!username || !password || !name) return res.status(400).json({ error: 'Username, password and name are required' });

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return res.status(400).json({ error: 'Username already exists' });

  const hash = bcrypt.hashSync(password, 10);
  const picture = req.file ? `/uploads/${req.file.filename}` : null;
  const validRole = ['staff', 'user'].includes(role) ? role : 'user';

  const result = db.prepare('INSERT INTO users (username,password,name,role,picture,phone,store_id) VALUES (?,?,?,?,?,?,?)')
    .run(username, hash, name, validRole, picture, phone||'', store_id||null);

  res.status(201).json({ id: result.lastInsertRowid, message: 'Staff member created' });
});

// Update staff
router.put('/:id', authenticate, authorizeAdmin, upload.single('picture'), (req, res) => {
  const { name, role, phone, store_id, active, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const picture = req.file ? `/uploads/${req.file.filename}` : user.picture;
  const validRole = role && ['staff', 'user'].includes(role) ? role : user.role;

  db.prepare('UPDATE users SET name=?,role=?,phone=?,store_id=?,picture=?,active=? WHERE id=?')
    .run(name||user.name, validRole, phone||user.phone, store_id||user.store_id, picture, active !== undefined ? Number(active) : user.active, req.params.id);

  if (password) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET password=? WHERE id=?').run(hash, req.params.id);
  }

  res.json({ message: 'Staff member updated' });
});

// Delete staff (soft)
router.delete('/:id', authenticate, authorizeAdmin, (req, res) => {
  if (Number(req.params.id) === 1) return res.status(400).json({ error: 'Cannot delete default admin' });
  db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Staff member deactivated' });
});

module.exports = router;
