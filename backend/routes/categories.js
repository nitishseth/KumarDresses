const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

// Get category tree
router.get('/', authenticate, (req, res) => {
  const cats = db.prepare('SELECT * FROM categories WHERE active = 1 ORDER BY level, name').all();
  const buildTree = (parentId = null) =>
    cats.filter(c => c.parent_id === parentId).map(c => ({ ...c, children: buildTree(c.id) }));
  res.json({ categories: cats, tree: buildTree(null) });
});

// Get single category
router.get('/:id', authenticate, (req, res) => {
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  const children = db.prepare('SELECT * FROM categories WHERE parent_id = ? AND active = 1').all(cat.id);
  res.json({ ...cat, children });
});

// Create category (admin)
router.post('/', authenticate, authorizeAdmin, (req, res) => {
  const { name, parent_id, description, size_chart_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  let level = 0;
  if (parent_id) {
    const parent = db.prepare('SELECT level FROM categories WHERE id = ?').get(parent_id);
    if (!parent) return res.status(400).json({ error: 'Parent category not found' });
    level = parent.level + 1;
  }

  const result = db.prepare(
    'INSERT INTO categories (name, parent_id, level, description, size_chart_id) VALUES (?,?,?,?,?)'
  ).run(name, parent_id || null, level, description || '', size_chart_id || null);

  res.status(201).json({ id: result.lastInsertRowid, message: 'Category created' });
});

// Update category (admin)
router.put('/:id', authenticate, authorizeAdmin, (req, res) => {
  const { name, description, size_chart_id } = req.body;
  db.prepare('UPDATE categories SET name=COALESCE(?,name), description=COALESCE(?,description), size_chart_id=? WHERE id=?')
    .run(name, description, size_chart_id || null, req.params.id);
  res.json({ message: 'Category updated' });
});

// Delete category (admin) — soft delete
router.delete('/:id', authenticate, authorizeAdmin, (req, res) => {
  db.prepare('UPDATE categories SET active = 0 WHERE id = ?').run(req.params.id);
  db.prepare('UPDATE categories SET active = 0 WHERE parent_id = ?').run(req.params.id);
  res.json({ message: 'Category deleted' });
});

module.exports = router;
