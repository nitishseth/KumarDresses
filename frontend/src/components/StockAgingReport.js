import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../utils/api';

export default function StockAgingReport() {
  const [data, setData] = useState({ items: [], summary: {} });
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState('');

  useEffect(() => { api.get('/stores').then(r => setStores(r.data)); }, []);
  useEffect(() => {
    const params = storeId ? { store_id: storeId } : {};
    api.get('/reports/stock-aging', { params }).then(r => setData(r.data));
  }, [storeId]);

  const chartData = Object.entries(data.summary).map(([bucket, vals]) => ({ name: bucket, count: vals.count, quantity: vals.total_qty }));
  const COLORS = { '0-30 days': '#10b981', '31-60 days': '#3b82f6', '61-90 days': '#f59e0b', '91-180 days': '#ef4444', '180+ days': '#7c3aed' };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <h1>Stock Aging Report</h1>
        <select className="form-control" style={{ width: 200 }} value={storeId} onChange={e => setStoreId(e.target.value)}>
          <option value="">All Stores</option>{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="stats-grid">
        {Object.entries(data.summary).map(([bucket, vals]) => (
          <div className="stat-card" key={bucket}>
            <div className="stat-value">{vals.total_qty}</div>
            <div className="stat-label">{bucket}</div>
            <div className="stat-change text-muted">{vals.count} variants</div>
          </div>
        ))}
      </div>

      {chartData.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><span className="card-title">Stock Distribution by Age</span></div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="quantity" fill="#4f46e5" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card">
        <table>
          <thead><tr><th>Product</th><th>SKU</th><th>Size</th><th>Color</th><th>Season</th><th>Store</th><th>Qty</th><th>Days in Stock</th><th>Aging</th></tr></thead>
          <tbody>
            {data.items.slice(0, 100).map((d, i) => (
              <tr key={i}>
                <td>{d.name}</td>
                <td><code style={{ fontSize: '0.73rem' }}>{d.sku_variant}</code></td>
                <td>{d.size}</td>
                <td>{d.color || '—'}</td>
                <td>{d.season || '—'}</td>
                <td>{d.store_name}</td>
                <td>{d.quantity}</td>
                <td>{d.days_in_inventory}</td>
                <td><span className="badge" style={{ background: (COLORS[d.aging_bucket] || '#888') + '22', color: COLORS[d.aging_bucket] || '#888' }}>{d.aging_bucket}</span></td>
              </tr>
            ))}
            {!data.items.length && <tr><td colSpan={9} className="text-center text-muted" style={{ padding: 40 }}>No stock data</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
