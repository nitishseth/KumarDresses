const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

// Get category tree
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows: cats } = await db.query('SELECT * FROM categories WHERE active = 1 ORDER BY level, name');
    const buildTree = (parentId = null) =>
      cats.filter(c => c.parent_id === parentId).map(c => ({ ...c, children: buildTree(c.id) }));
    res.json({ categories: cats, tree: buildTree(null) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single category
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM categories WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Category not found' });
    const { rows: children } = await db.query('SELECT * FROM categories WHERE parent_id = $1 AND active = 1', [rows[0].id]);
    res.json({ ...rows[0], children });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create category (admin)
router.post('/', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { name, parent_id, description, size_chart_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    let level = 0;
    if (parent_id) {
      const { rows } = await db.query('SELECT level FROM categories WHERE id = $1', [parent_id]);
      if (!rows[0]) return res.status(400).json({ error: 'Parent category not found' });
      level = rows[0].level + 1;
    }

    const { rows } = await db.query(
      'INSERT INTO categories (name, parent_id, level, description, size_chart_id) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [name, parent_id || null, level, description || '', size_chart_id || null]
    );
    res.status(201).json({ id: rows[0].id, message: 'Category created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update category (admin)
router.put('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { name, description, size_chart_id } = req.body;
    await db.query(
      'UPDATE categories SET name=COALESCE($1,name), description=COALESCE($2,description), size_chart_id=$3 WHERE id=$4',
      [name, description, size_chart_id || null, req.params.id]
    );
    res.json({ message: 'Category updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete category (admin) — soft delete
router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    await db.query('UPDATE categories SET active = 0 WHERE id = $1', [req.params.id]);
    await db.query('UPDATE categories SET active = 0 WHERE parent_id = $1', [req.params.id]);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
