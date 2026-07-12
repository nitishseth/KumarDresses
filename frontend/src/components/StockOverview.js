import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import api from '../utils/api';

export default function StockOverview() {
  const { isAdmin, isStaff } = useAuth();
  const [stock, setStock] = useState([]);
  const [stores, setStores] = useState([]);
  const [filters, setFilters] = useState({ store_id: '', search: '', low_stock: '' });
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustBatch, setAdjustBatch] = useState('');

  const load = () => {
    const params = { ...filters };
    Object.keys(params).forEach(k => !params[k] && delete params[k]);
    api.get('/stock/overview', { params }).then(r => setStock(r.data));
  };
  useEffect(() => { api.get('/stores').then(r => setStores(r.data)); }, []);
  useEffect(() => { load(); }, [filters]);

  const handleAdjust = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/stock/adjust', {
        variant_id: adjustModal.variant_id,
        store_id: adjustModal.store_id,
        quantity: Number(adjustQty),
        notes: adjustNotes,
        batch_number: adjustBatch
      });
      toast.success(data.message);
      if (data.warning?.alert) toast.warning(data.warning.message);
      setAdjustModal(null); setAdjustQty(''); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Stock Overview</h1>

      <div className="filter-bar">
        <div className="form-group" style={{ flex: 2 }}>
          <input className="form-control" placeholder="Search product, SKU..." value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} />
        </div>
        <div className="form-group">
          <select className="form-control" value={filters.store_id} onChange={e => setFilters({ ...filters, store_id: e.target.value })}>
            <option value="">All Stores</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <select className="form-control" value={filters.low_stock} onChange={e => setFilters({ ...filters, low_stock: e.target.value })}>
            <option value="">All Stock</option>
            <option value="1">Low Stock Only</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>Product</th><th>SKU Variant</th><th>Size</th><th>Color</th><th>Fit</th><th>Store</th><th>Qty</th><th>Reserved</th><th>Available</th><th>Reorder Pt</th><th>Status</th>{(isAdmin || isStaff) && <th>Actions</th>}</tr></thead>
            <tbody>
              {stock.map((s, i) => (
                <tr key={i}>
                  <td>{s.product_name}</td>
                  <td><code style={{ fontSize: '0.73rem' }}>{s.sku_variant}</code></td>
                  <td><span className="badge badge-info">{s.size}</span></td>
                  <td>{s.color || '—'}</td>
                  <td>{s.fit || '—'}</td>
                  <td>{s.store_name}</td>
                  <td><strong>{s.quantity}</strong></td>
                  <td>{s.reserved_quantity}</td>
                  <td>{s.available}</td>
                  <td>{s.reorder_point}</td>
                  <td>
                    {s.quantity === 0 ? <span className="badge badge-danger">Out of Stock</span> :
                     s.quantity <= s.reorder_point ? <span className="badge badge-warning">Low Stock</span> :
                     <span className="badge badge-success">In Stock</span>}
                  </td>
                  {(isAdmin || isStaff) && (
                    <td><button className="btn btn-sm btn-outline" onClick={() => { setAdjustModal(s); setAdjustQty(''); setAdjustNotes(''); setAdjustBatch(''); }}>Adjust</button></td>
                  )}
                </tr>
              ))}
              {!stock.length && <tr><td colSpan={12} className="text-center text-muted" style={{ padding: 40 }}>No stock data</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {adjustModal && (
        <div className="modal-overlay" onClick={() => setAdjustModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Adjust Stock</h2>
            <p className="mb-2"><strong>{adjustModal.product_name}</strong> — {adjustModal.size} {adjustModal.color} @ {adjustModal.store_name}</p>
            <p className="text-muted mb-2">Current: {adjustModal.quantity} units</p>
            <form onSubmit={handleAdjust}>
              <div className="form-group">
                <label>Quantity Change (positive to add, negative to remove)</label>
                <input className="form-control" type="number" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} required placeholder="e.g. 10 or -5" />
              </div>
              <div className="form-group">
                <label>Batch Number (optional)</label>
                <input className="form-control" value={adjustBatch} onChange={e => setAdjustBatch(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input className="form-control" value={adjustNotes} onChange={e => setAdjustNotes(e.target.value)} placeholder="Reason for adjustment" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setAdjustModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Adjust Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
