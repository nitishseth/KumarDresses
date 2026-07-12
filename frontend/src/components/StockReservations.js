import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../utils/api';

export default function StockReservations() {
  const [reservations, setReservations] = useState([]);
  const [stores, setStores] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [stock, setStock] = useState([]);
  const [form, setForm] = useState({ variant_id: '', store_id: '', quantity: '', reason: 'hold', customer_name: '', customer_phone: '', expires_at: '' });

  const load = () => api.get('/reservations', { params: { status: 'active' } }).then(r => setReservations(r.data));
  useEffect(() => { load(); api.get('/stores').then(r => setStores(r.data)); }, []);

  useEffect(() => {
    if (form.store_id) api.get('/stock/overview', { params: { store_id: form.store_id } }).then(r => setStock(r.data));
  }, [form.store_id]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/reservations', form);
      toast.success('Stock reserved');
      setShowCreate(false); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const updateStatus = async (id, status) => {
    try { await api.put(`/reservations/${id}`, { status }); toast.success(`Reservation ${status}`); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <h1>Stock Reservations</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Reserve Stock</button>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Product</th><th>Size</th><th>Color</th><th>Store</th><th>Qty</th><th>Reason</th><th>Customer</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>
            {reservations.map(r => (
              <tr key={r.id}>
                <td>{r.product_name}</td>
                <td><span className="badge badge-info">{r.size}</span></td>
                <td>{r.color || '—'}</td>
                <td>{r.store_name}</td>
                <td>{r.quantity}</td>
                <td>{r.reason}</td>
                <td>{r.customer_name || '—'}</td>
                <td>{new Date(r.created_at).toLocaleDateString()}</td>
                <td>
                  <button className="btn btn-sm btn-success" onClick={() => updateStatus(r.id, 'fulfilled')} style={{ marginRight: 4 }}>Fulfil</button>
                  <button className="btn btn-sm btn-danger" onClick={() => updateStatus(r.id, 'cancelled')}>Cancel</button>
                </td>
              </tr>
            ))}
            {!reservations.length && <tr><td colSpan={9} className="text-center text-muted">No active reservations</td></tr>}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Reserve Stock</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group"><label>Store *</label>
                <select className="form-control" value={form.store_id} onChange={e => setForm({ ...form, store_id: e.target.value })} required>
                  <option value="">Select store</option>{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Product Variant *</label>
                <select className="form-control" value={form.variant_id} onChange={e => setForm({ ...form, variant_id: e.target.value })} required>
                  <option value="">Select variant</option>
                  {stock.filter(s => s.available > 0).map(s => <option key={s.variant_id} value={s.variant_id}>{s.product_name} — {s.size} {s.color} (Avail: {s.available})</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Quantity *</label><input className="form-control" type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required /></div>
                <div className="form-group"><label>Reason</label>
                  <select className="form-control" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}>
                    <option value="hold">Hold</option><option value="online_order">Online Order</option><option value="layaway">Layaway</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Customer Name</label><input className="form-control" value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} /></div>
                <div className="form-group"><label>Customer Phone</label><input className="form-control" value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })} /></div>
              </div>
              <div className="form-group"><label>Expires At</label><input className="form-control" type="date" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} /></div>
              <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button><button type="submit" className="btn btn-primary">Reserve</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
