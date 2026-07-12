import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../utils/api';

export default function BatchManagement() {
  const [batches, setBatches] = useState([]);
  const [stores, setStores] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ supplier: '', store_id: '', notes: '', received_date: '' });
  const [items, setItems] = useState([{ variant_id: '', quantity: '', cost_price: '' }]);
  const [stock, setStock] = useState([]);
  const [viewBatch, setViewBatch] = useState(null);

  const load = () => api.get('/batches').then(r => setBatches(r.data));
  useEffect(() => { load(); api.get('/stores').then(r => setStores(r.data)); }, []);

  useEffect(() => {
    if (form.store_id) api.get('/stock/overview', { params: { store_id: form.store_id } }).then(r => setStock(r.data));
  }, [form.store_id]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/batches', { ...form, items: items.filter(i => i.variant_id && i.quantity) });
      toast.success(`Batch ${data.batch_number} received`);
      setShowCreate(false); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const viewDetails = async (id) => {
    const { data } = await api.get(`/batches/${id}`);
    setViewBatch(data);
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <h1>Batch / Lot Management</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Receive Batch</button>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Batch #</th><th>Supplier</th><th>Store</th><th>Received</th><th>Created By</th><th>Actions</th></tr></thead>
          <tbody>
            {batches.map(b => (
              <tr key={b.id}>
                <td><strong>{b.batch_number}</strong></td>
                <td>{b.supplier || '—'}</td>
                <td>{b.store_name || '—'}</td>
                <td>{new Date(b.received_date).toLocaleDateString()}</td>
                <td>{b.created_by_name}</td>
                <td><button className="btn btn-sm btn-outline" onClick={() => viewDetails(b.id)}>View</button></td>
              </tr>
            ))}
            {!batches.length && <tr><td colSpan={6} className="text-center text-muted">No batches received</td></tr>}
          </tbody>
        </table>
      </div>

      {viewBatch && (
        <div className="modal-overlay" onClick={() => setViewBatch(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <h2>Batch: {viewBatch.batch_number}</h2>
            <p className="text-muted mb-2">Supplier: {viewBatch.supplier || '—'} | Received: {new Date(viewBatch.received_date).toLocaleDateString()}</p>
            <table>
              <thead><tr><th>Product</th><th>SKU</th><th>Size</th><th>Color</th><th>Qty</th><th>Cost Price</th></tr></thead>
              <tbody>
                {viewBatch.items?.map((item, i) => (
                  <tr key={i}><td>{item.product_name}</td><td><code>{item.sku_variant}</code></td><td>{item.size}</td><td>{item.color||'—'}</td><td>{item.quantity}</td><td>₹{item.cost_price}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="modal-actions"><button className="btn btn-outline" onClick={() => setViewBatch(null)}>Close</button></div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <h2>Receive New Batch</h2>
            <form onSubmit={handleCreate}>
              <div className="form-row">
                <div className="form-group"><label>Store *</label>
                  <select className="form-control" value={form.store_id} onChange={e => setForm({ ...form, store_id: e.target.value })} required>
                    <option value="">Select store</option>{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Supplier</label><input className="form-control" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} /></div>
                <div className="form-group"><label>Received Date</label><input className="form-control" type="date" value={form.received_date} onChange={e => setForm({ ...form, received_date: e.target.value })} /></div>
              </div>
              <h3 style={{ fontSize: '0.95rem', margin: '12px 0 8px' }}>Items</h3>
              {items.map((item, i) => (
                <div key={i} className="form-row" style={{ marginBottom: 8 }}>
                  <div className="form-group" style={{ flex: 3 }}>
                    <select className="form-control" value={item.variant_id} onChange={e => { const n = [...items]; n[i].variant_id = e.target.value; setItems(n); }}>
                      <option value="">Select variant</option>
                      {stock.map(s => <option key={s.variant_id} value={s.variant_id}>{s.product_name} — {s.size} {s.color}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><input className="form-control" type="number" min="1" placeholder="Qty" value={item.quantity} onChange={e => { const n = [...items]; n[i].quantity = e.target.value; setItems(n); }} /></div>
                  <div className="form-group"><input className="form-control" type="number" step="0.01" placeholder="Cost ₹" value={item.cost_price} onChange={e => { const n = [...items]; n[i].cost_price = e.target.value; setItems(n); }} /></div>
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => setItems(items.filter((_, idx) => idx !== i))}>×</button>
                </div>
              ))}
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setItems([...items, { variant_id: '', quantity: '', cost_price: '' }])}>+ Add Item</button>
              <div className="form-group mt-1"><label>Notes</label><input className="form-control" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button><button type="submit" className="btn btn-primary">Receive Batch</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
