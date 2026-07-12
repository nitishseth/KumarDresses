import React, { useState, useEffect } from 'react';
import api from '../utils/api';

export default function DeadStockReport() {
  const [data, setData] = useState([]);
  const [stores, setStores] = useState([]);
  const [days, setDays] = useState(90);
  const [storeId, setStoreId] = useState('');

  useEffect(() => { api.get('/stores').then(r => setStores(r.data)); }, []);
  useEffect(() => {
    const params = { days };
    if (storeId) params.store_id = storeId;
    api.get('/reports/dead-stock', { params }).then(r => setData(r.data));
  }, [days, storeId]);

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Dead Stock / Slow Moving Report</h1>

      <div className="filter-bar">
        <div className="form-group">
          <label>No sale in last</label>
          <select className="form-control" value={days} onChange={e => setDays(e.target.value)}>
            <option value="30">30 days</option><option value="60">60 days</option><option value="90">90 days</option>
            <option value="180">180 days</option><option value="365">1 year</option>
          </select>
        </div>
        <div className="form-group">
          <label>Store</label>
          <select className="form-control" value={storeId} onChange={e => setStoreId(e.target.value)}>
            <option value="">All Stores</option>{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {data.length > 0 && (
        <div className="alert alert-warning">
          {data.length} item(s) with no sales in {days}+ days. Total units sitting: {data.reduce((s, d) => s + d.quantity, 0).toLocaleString()}
        </div>
      )}

      <div className="card">
        <table>
          <thead><tr><th>Product</th><th>SKU</th><th>Size</th><th>Color</th><th>Brand</th><th>Season</th><th>Store</th><th>Qty</th><th>Last Sold</th><th>Days Since Sale</th><th>Total Ever Sold</th></tr></thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={i}>
                <td>{d.name}</td>
                <td><code style={{ fontSize: '0.73rem' }}>{d.sku_variant}</code></td>
                <td>{d.size}</td>
                <td>{d.color || '—'}</td>
                <td>{d.brand || '—'}</td>
                <td>{d.season || '—'}</td>
                <td>{d.store_name}</td>
                <td><strong>{d.quantity}</strong></td>
                <td>{d.last_sold === 'Never' ? <span className="badge badge-danger">Never</span> : new Date(d.last_sold).toLocaleDateString()}</td>
                <td><span className={`badge ${d.days_since_last_sale > 180 ? 'badge-danger' : 'badge-warning'}`}>{d.days_since_last_sale}d</span></td>
                <td>{d.total_ever_sold}</td>
              </tr>
            ))}
            {!data.length && <tr><td colSpan={11} className="text-center text-muted" style={{ padding: 40 }}>No dead stock found — great!</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
