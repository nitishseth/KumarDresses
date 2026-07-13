const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

// List all size charts
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM size_charts ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single chart with entries
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM size_charts WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Size chart not found' });
    const chart = rows[0];
    const entries = await db.query('SELECT * FROM size_chart_entries WHERE size_chart_id = $1 ORDER BY sort_order', [chart.id]);
    chart.entries = entries.rows;
    res.json(chart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create size chart (admin)
router.post('/', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { name, category_type, garment_type, entries } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const { rows } = await db.query(
      'INSERT INTO size_charts (name, category_type, garment_type) VALUES ($1,$2,$3) RETURNING id',
      [name, category_type || '', garment_type || '']
    );
    const chartId = rows[0].id;

    if (entries && entries.length) {
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        await db.query(
          'INSERT INTO size_chart_entries (size_chart_id, size_label, chest, waist, hip, length, shoulder, sleeve, inseam, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
          [chartId, e.size_label, e.chest || null, e.waist || null, e.hip || null, e.length || null, e.shoulder || null, e.sleeve || null, e.inseam || null, i]
        );
      }
    }
    res.status(201).json({ id: chartId, message: 'Size chart created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update size chart (admin)
router.put('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { name, category_type, garment_type, entries } = req.body;
    await db.query(
      'UPDATE size_charts SET name=COALESCE($1,name), category_type=COALESCE($2,category_type), garment_type=COALESCE($3,garment_type) WHERE id=$4',
      [name, category_type, garment_type, req.params.id]
    );

    if (entries) {
      await db.query('DELETE FROM size_chart_entries WHERE size_chart_id = $1', [req.params.id]);
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        await db.query(
          'INSERT INTO size_chart_entries (size_chart_id, size_label, chest, waist, hip, length, shoulder, sleeve, inseam, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
          [req.params.id, e.size_label, e.chest || null, e.waist || null, e.hip || null, e.length || null, e.shoulder || null, e.sleeve || null, e.inseam || null, i]
        );
      }
    }
    res.json({ message: 'Size chart updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete size chart (admin)
router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM size_chart_entries WHERE size_chart_id = $1', [req.params.id]);
    await db.query('DELETE FROM size_charts WHERE id = $1', [req.params.id]);
    res.json({ message: 'Size chart deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
