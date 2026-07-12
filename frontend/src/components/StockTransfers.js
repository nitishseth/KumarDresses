import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../utils/api';

export default function StockTransfers() {
  const [transfers, setTransfers] = useState([]);
  const [stores, setStores] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ from_store_id: '', to_store_id: '', notes: '' });
  const [items, setItems] = useState([{ variant_id: '', quantity: '' }]);
  const [stock, setStock] = useState([]);
  const [viewTransfer, setViewTransfer] = useState(null);

  const load = () => api.get('/transfers').then(r => setTransfers(r.data));
  useEffect(() => {
    load();
    api.get('/stores').then(r => setStores(r.data));
  }, []);

  useEffect(() => {
    if (form.from_store_id) {
      api.get('/stock/overview', { params: { store_id: form.from_store_id } }).then(r => setStock(r.data));
    }
  }, [form.from_store_id]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/transfers', { ...form, items: items.filter(i => i.variant_id && i.quantity) });
      toast.success(`Transfer ${data.transfer_number} created`);
      setShowCreate(false); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/transfers/${id}/status`, { status });
      toast.success(`Transfer ${status}`);
      load();
      if (viewTransfer) { const { data } = await api.get(`/transfers/${id}`); setViewTransfer(data); }
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const viewDetails = async (id) => {
    const { data } = await api.get(`/transfers/${id}`);
    setViewTransfer(data);
  };

  const statusColors = { pending: 'badge-warning', in_transit: 'badge-info', completed: 'badge-success', cancelled: 'badge-secondary' };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <h1>Stock Transfers</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Transfer</button>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Transfer #</th><th>From</th><th>To</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>
            {transfers.map(t => (
              <tr key={t.id}>
                <td><strong>{t.transfer_number}</strong></td>
                <td>{t.from_store_name}</td>
                <td>{t.to_store_name}</td>
                <td><span className={`badge ${statusColors[t.status]}`}>{t.status}</span></td>
                <td>{new Date(t.created_at).toLocaleDateString()}</td>
                <td>
                  <button className="btn btn-sm btn-outline" onClick={() => viewDetails(t.id)} style={{ marginRight: 4 }}>View</button>
                  {t.status === 'pending' && <><button className="btn btn-sm btn-primary" onClick={() => updateStatus(t.id, 'in_transit')} style={{ marginRight: 4 }}>Ship</button><button className="btn btn-sm btn-danger" onClick={() => updateStatus(t.id, 'cancelled')}>Cancel</button></>}
                  {t.status === 'in_transit' && <button className="btn btn-sm btn-success" onClick={() => updateStatus(t.id, 'completed')}>Complete</button>}
                </td>
              </tr>
            ))}
            {!transfers.length && <tr><td colSpan={6} className="text-center text-muted">No transfers</td></tr>}
          </tbody>
        </table>
      </div>

      {viewTransfer && (
        <div className="modal-overlay" onClick={() => setViewTransfer(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <h2>Transfer: {viewTransfer.transfer_number}</h2>
            <div className="form-row mb-2">
              <div><strong>From:</strong> {viewTransfer.from_store_name}</div>
              <div><strong>To:</strong> {viewTransfer.to_store_name}</div>
              <div><strong>Status:</strong> <span className={`badge ${statusColors[viewTransfer.status]}`}>{viewTransfer.status}</span></div>
            </div>
            <table>
              <thead><tr><th>Product</th><th>SKU</th><th>Size</th><th>Color</th><th>Qty</th><th>Received</th></tr></thead>
              <tbody>
                {viewTransfer.items?.map((item, i) => (
                  <tr key={i}><td>{item.product_name}</td><td><code>{item.sku_variant}</code></td><td>{item.size}</td><td>{item.color||'—'}</td><td>{item.quantity}</td><td>{item.received_quantity}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="modal-actions"><button className="btn btn-outline" onClick={() => setViewTransfer(null)}>Close</button></div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <h2>New Stock Transfer</h2>
            <form onSubmit={handleCreate}>
              <div className="form-row">
                <div className="form-group"><label>From Store *</label>
                  <select className="form-control" value={form.from_store_id} onChange={e => setForm({ ...form, from_store_id: e.target.value })} required>
                    <option value="">Select</option>{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>To Store *</label>
                  <select className="form-control" value={form.to_store_id} onChange={e => setForm({ ...form, to_store_id: e.target.value })} required>
                    <option value="">Select</option>{stores.filter(s => String(s.id) !== form.from_store_id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <h3 style={{ fontSize: '0.95rem', margin: '12px 0 8px' }}>Items</h3>
              {items.map((item, i) => (
                <div key={i} className="form-row" style={{ marginBottom: 8 }}>
                  <div className="form-group" style={{ flex: 3 }}>
                    <select className="form-control" value={item.variant_id} onChange={e => { const n = [...items]; n[i].variant_id = e.target.value; setItems(n); }}>
                      <option value="">Select variant</option>
                      {stock.filter(s => s.available > 0).map(s => <option key={s.variant_id} value={s.variant_id}>{s.product_name} — {s.size} {s.color} (Avail: {s.available})</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <input className="form-control" type="number" min="1" placeholder="Qty" value={item.quantity} onChange={e => { const n = [...items]; n[i].quantity = e.target.value; setItems(n); }} />
                  </div>
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => setItems(items.filter((_, idx) => idx !== i))}>×</button>
                </div>
              ))}
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setItems([...items, { variant_id: '', quantity: '' }])}>+ Add Item</button>
              <div className="form-group mt-1"><label>Notes</label><input className="form-control" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create Transfer</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
