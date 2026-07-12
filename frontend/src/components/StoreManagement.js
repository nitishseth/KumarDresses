import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../utils/api';

export default function StoreManagement() {
  const [stores, setStores] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', address: '', phone: '', is_warehouse: false });
  const [editing, setEditing] = useState(null);

  const load = () => { api.get('/stores').then(r => setStores(r.data)); };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/stores/${editing}`, form);
        toast.success('Store updated');
      } else {
        await api.post('/stores', form);
        toast.success('Store created');
      }
      setShowModal(false); setEditing(null); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this store?')) return;
    try { await api.delete(`/stores/${id}`); toast.success('Deleted'); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <h1>Store / Location Management</h1>
        <button className="btn btn-primary" onClick={() => { setForm({ name: '', code: '', address: '', phone: '', is_warehouse: false }); setEditing(null); setShowModal(true); }}>+ Add Store</button>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Code</th><th>Address</th><th>Phone</th><th>Type</th><th>Actions</th></tr></thead>
          <tbody>
            {stores.map(s => (
              <tr key={s.id}>
                <td><strong>{s.name}</strong></td>
                <td><code>{s.code}</code></td>
                <td>{s.address || '—'}</td>
                <td>{s.phone || '—'}</td>
                <td><span className={`badge ${s.is_warehouse ? 'badge-info' : 'badge-success'}`}>{s.is_warehouse ? 'Warehouse' : 'Store'}</span></td>
                <td>
                  <button className="btn btn-sm btn-outline" style={{ marginRight: 6 }} onClick={() => { setForm({ name: s.name, code: s.code, address: s.address, phone: s.phone, is_warehouse: s.is_warehouse }); setEditing(s.id); setShowModal(true); }}>Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editing ? 'Edit Store' : 'Add Store'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group"><label>Name *</label><input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="form-group"><label>Code *</label><input className="form-control" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required disabled={!!editing} /></div>
              </div>
              <div className="form-group"><label>Address</label><input className="form-control" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
              <div className="form-row">
                <div className="form-group"><label>Phone</label><input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="form-group"><label>Type</label>
                  <select className="form-control" value={form.is_warehouse ? '1' : '0'} onChange={e => setForm({ ...form, is_warehouse: e.target.value === '1' })}>
                    <option value="0">Retail Store</option><option value="1">Warehouse</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
