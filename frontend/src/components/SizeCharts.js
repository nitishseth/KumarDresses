import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../utils/api';

const EMPTY_ENTRY = { size_label: '', chest: '', waist: '', hip: '', length: '', shoulder: '', sleeve: '', inseam: '' };

export default function SizeCharts() {
  const [charts, setCharts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', category_type: '', garment_type: '' });
  const [entries, setEntries] = useState([{ ...EMPTY_ENTRY }]);
  const [editing, setEditing] = useState(null);
  const [viewChart, setViewChart] = useState(null);

  const load = () => { api.get('/size-charts').then(r => setCharts(r.data)); };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, entries: entries.filter(e => e.size_label) };
    try {
      if (editing) {
        await api.put(`/size-charts/${editing}`, payload);
        toast.success('Size chart updated');
      } else {
        await api.post('/size-charts', payload);
        toast.success('Size chart created');
      }
      setShowModal(false); setEditing(null); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const openEdit = async (id) => {
    const { data } = await api.get(`/size-charts/${id}`);
    setForm({ name: data.name, category_type: data.category_type || '', garment_type: data.garment_type || '' });
    setEntries(data.entries.length ? data.entries : [{ ...EMPTY_ENTRY }]);
    setEditing(id);
    setShowModal(true);
  };

  const openView = async (id) => {
    const { data } = await api.get(`/size-charts/${id}`);
    setViewChart(data);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this size chart?')) return;
    await api.delete(`/size-charts/${id}`);
    toast.success('Deleted'); load();
  };

  const addEntry = () => setEntries([...entries, { ...EMPTY_ENTRY }]);
  const removeEntry = (i) => setEntries(entries.filter((_, idx) => idx !== i));
  const updateEntry = (i, field, val) => { const e = [...entries]; e[i] = { ...e[i], [field]: val }; setEntries(e); };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <h1>Size Charts</h1>
        <button className="btn btn-primary" onClick={() => { setForm({ name: '', category_type: '', garment_type: '' }); setEntries([{ ...EMPTY_ENTRY }]); setEditing(null); setShowModal(true); }}>+ Add Size Chart</button>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Category Type</th><th>Garment Type</th><th>Actions</th></tr></thead>
          <tbody>
            {charts.map(c => (
              <tr key={c.id}>
                <td><strong>{c.name}</strong></td>
                <td>{c.category_type || '—'}</td>
                <td>{c.garment_type || '—'}</td>
                <td>
                  <button className="btn btn-sm btn-outline" onClick={() => openView(c.id)} style={{ marginRight: 6 }}>View</button>
                  <button className="btn btn-sm btn-outline" onClick={() => openEdit(c.id)} style={{ marginRight: 6 }}>Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {!charts.length && <tr><td colSpan={4} className="text-center text-muted">No size charts</td></tr>}
          </tbody>
        </table>
      </div>

      {viewChart && (
        <div className="modal-overlay" onClick={() => setViewChart(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <h2>{viewChart.name}</h2>
            <p className="text-muted mb-2">{viewChart.category_type} — {viewChart.garment_type}</p>
            <div className="table-container">
              <table>
                <thead><tr><th>Size</th><th>Chest</th><th>Waist</th><th>Hip</th><th>Length</th><th>Shoulder</th><th>Sleeve</th><th>Inseam</th></tr></thead>
                <tbody>
                  {viewChart.entries.map((e, i) => (
                    <tr key={i}><td><strong>{e.size_label}</strong></td><td>{e.chest||'—'}</td><td>{e.waist||'—'}</td><td>{e.hip||'—'}</td><td>{e.length||'—'}</td><td>{e.shoulder||'—'}</td><td>{e.sleeve||'—'}</td><td>{e.inseam||'—'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-actions"><button className="btn btn-outline" onClick={() => setViewChart(null)}>Close</button></div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <h2>{editing ? 'Edit Size Chart' : 'Add Size Chart'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group"><label>Name *</label><input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="form-group"><label>Category Type</label>
                  <select className="form-control" value={form.category_type} onChange={e => setForm({ ...form, category_type: e.target.value })}>
                    <option value="">Select</option><option>Men</option><option>Women</option><option>Kids</option><option>Unisex</option>
                  </select>
                </div>
                <div className="form-group"><label>Garment Type</label><input className="form-control" value={form.garment_type} onChange={e => setForm({ ...form, garment_type: e.target.value })} placeholder="Shirts, Trousers..." /></div>
              </div>
              <h3 style={{ margin: '16px 0 10px', fontSize: '0.95rem' }}>Size Entries</h3>
              <div className="table-container">
                <table>
                  <thead><tr><th>Size*</th><th>Chest</th><th>Waist</th><th>Hip</th><th>Length</th><th>Shoulder</th><th>Sleeve</th><th>Inseam</th><th></th></tr></thead>
                  <tbody>
                    {entries.map((entry, i) => (
                      <tr key={i}>
                        {Object.keys(EMPTY_ENTRY).map(field => (
                          <td key={field}><input className="form-control" style={{ minWidth: field === 'size_label' ? 60 : 50, padding: '4px 6px', fontSize: '0.8rem' }} value={entry[field]} onChange={e => updateEntry(i, field, e.target.value)} /></td>
                        ))}
                        <td><button type="button" className="btn btn-sm btn-danger" onClick={() => removeEntry(i)}>×</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="btn btn-sm btn-outline mt-1" onClick={addEntry}>+ Add Size</button>
              <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
