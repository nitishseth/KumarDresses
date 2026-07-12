const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

// List all size charts
router.get('/', authenticate, (req, res) => {
  const charts = db.prepare('SELECT * FROM size_charts ORDER BY name').all();
  res.json(charts);
});

// Get single chart with entries
router.get('/:id', authenticate, (req, res) => {
  const chart = db.prepare('SELECT * FROM size_charts WHERE id = ?').get(req.params.id);
  if (!chart) return res.status(404).json({ error: 'Size chart not found' });
  chart.entries = db.prepare('SELECT * FROM size_chart_entries WHERE size_chart_id = ? ORDER BY sort_order').all(chart.id);
  res.json(chart);
});

// Create size chart (admin)
router.post('/', authenticate, authorizeAdmin, (req, res) => {
  const { name, category_type, garment_type, entries } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const result = db.prepare('INSERT INTO size_charts (name, category_type, garment_type) VALUES (?,?,?)')
    .run(name, category_type || '', garment_type || '');
  const chartId = result.lastInsertRowid;

  if (entries && entries.length) {
    const insertEntry = db.prepare(`
      INSERT INTO size_chart_entries (size_chart_id, size_label, chest, waist, hip, length, shoulder, sleeve, inseam, sort_order)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `);
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      insertEntry.run(chartId, e.size_label, e.chest||null, e.waist||null, e.hip||null, e.length||null, e.shoulder||null, e.sleeve||null, e.inseam||null, i);
    }
  }
  res.status(201).json({ id: chartId, message: 'Size chart created' });
});

// Update size chart (admin)
router.put('/:id', authenticate, authorizeAdmin, (req, res) => {
  const { name, category_type, garment_type, entries } = req.body;
  db.prepare('UPDATE size_charts SET name=COALESCE(?,name), category_type=COALESCE(?,category_type), garment_type=COALESCE(?,garment_type) WHERE id=?')
    .run(name, category_type, garment_type, req.params.id);

  if (entries) {
    db.prepare('DELETE FROM size_chart_entries WHERE size_chart_id = ?').run(req.params.id);
    const insertEntry = db.prepare(`
      INSERT INTO size_chart_entries (size_chart_id, size_label, chest, waist, hip, length, shoulder, sleeve, inseam, sort_order)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `);
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      insertEntry.run(req.params.id, e.size_label, e.chest||null, e.waist||null, e.hip||null, e.length||null, e.shoulder||null, e.sleeve||null, e.inseam||null, i);
    }
  }
  res.json({ message: 'Size chart updated' });
});

// Delete size chart (admin)
router.delete('/:id', authenticate, authorizeAdmin, (req, res) => {
  db.prepare('DELETE FROM size_chart_entries WHERE size_chart_id = ?').run(req.params.id);
  db.prepare('DELETE FROM size_charts WHERE id = ?').run(req.params.id);
  res.json({ message: 'Size chart deleted' });
});

module.exports = router;
