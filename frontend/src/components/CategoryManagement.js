import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../utils/api';

export default function CategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [tree, setTree] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', parent_id: '', description: '', size_chart_id: '' });
  const [editing, setEditing] = useState(null);
  const [sizeCharts, setSizeCharts] = useState([]);

  const load = () => {
    api.get('/categories').then(r => { setCategories(r.data.categories); setTree(r.data.tree); });
    api.get('/size-charts').then(r => setSizeCharts(r.data));
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/categories/${editing}`, form);
        toast.success('Category updated');
      } else {
        await api.post('/categories', form);
        toast.success('Category created');
      }
      setShowModal(false); setEditing(null); setForm({ name: '', parent_id: '', description: '', size_chart_id: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    await api.delete(`/categories/${id}`);
    toast.success('Category deleted');
    load();
  };

  const renderTree = (items, depth = 0) => items.map(cat => (
    <React.Fragment key={cat.id}>
      <tr>
        <td style={{ paddingLeft: 14 + depth * 24 }}>
          {depth > 0 && <span style={{ color: '#ccc' }}>{'└─ '}</span>}
          <strong>{cat.name}</strong>
        </td>
        <td><span className="badge badge-info">Level {cat.level}</span></td>
        <td>{cat.description || '—'}</td>
        <td>
          <button className="btn btn-sm btn-outline" onClick={() => { setForm({ name: cat.name, parent_id: cat.parent_id || '', description: cat.description || '', size_chart_id: cat.size_chart_id || '' }); setEditing(cat.id); setShowModal(true); }} style={{ marginRight: 6 }}>Edit</button>
          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(cat.id)}>Delete</button>
        </td>
      </tr>
      {cat.children && renderTree(cat.children, depth + 1)}
    </React.Fragment>
  ));

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <h1>Categories</h1>
        <button className="btn btn-primary" onClick={() => { setForm({ name: '', parent_id: '', description: '', size_chart_id: '' }); setEditing(null); setShowModal(true); }}>+ Add Category</button>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Level</th><th>Description</th><th>Actions</th></tr></thead>
          <tbody>{tree.length ? renderTree(tree) : <tr><td colSpan={4} className="text-center text-muted">No categories yet</td></tr>}</tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editing ? 'Edit Category' : 'Add Category'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name *</label>
                <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Parent Category</label>
                <select className="form-control" value={form.parent_id} onChange={e => setForm({ ...form, parent_id: e.target.value })}>
                  <option value="">— Root Category —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{'  '.repeat(c.level)}{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Size Chart</label>
                <select className="form-control" value={form.size_chart_id} onChange={e => setForm({ ...form, size_chart_id: e.target.value })}>
                  <option value="">— None —</option>
                  {sizeCharts.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="form-control" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
