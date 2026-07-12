import React, { useState, useEffect } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import api from '../utils/api';

export default function StockAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState('');

  useEffect(() => { api.get('/stores').then(r => setStores(r.data)); }, []);
  useEffect(() => {
    const params = storeId ? { store_id: storeId } : {};
    api.get('/stock/alerts', { params }).then(r => setAlerts(r.data));
  }, [storeId]);

  const outOfStock = alerts.filter(a => a.alert_type === 'out_of_stock');
  const lowStock = alerts.filter(a => a.alert_type === 'low_stock');

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <h1><FiAlertTriangle style={{ marginRight: 8 }} />Stock Alerts ({alerts.length})</h1>
        <select className="form-control" style={{ width: 200 }} value={storeId} onChange={e => setStoreId(e.target.value)}>
          <option value="">All Stores</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {outOfStock.length > 0 && (
        <div className="card" style={{ borderLeft: '4px solid var(--danger)' }}>
          <div className="card-header"><span className="card-title text-danger">Out of Stock ({outOfStock.length})</span></div>
          <table>
            <thead><tr><th>Product</th><th>SKU</th><th>Size</th><th>Color</th><th>Store</th><th>Reorder Point</th></tr></thead>
            <tbody>
              {outOfStock.map((a, i) => (
                <tr key={i}><td>{a.product_name}</td><td><code>{a.sku_variant}</code></td><td>{a.size}</td><td>{a.color||'—'}</td><td>{a.store_name}</td><td>{a.reorder_point}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {lowStock.length > 0 && (
        <div className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
          <div className="card-header"><span className="card-title text-warning">Low Stock ({lowStock.length})</span></div>
          <table>
            <thead><tr><th>Product</th><th>SKU</th><th>Size</th><th>Color</th><th>Store</th><th>Quantity</th><th>Reorder Point</th></tr></thead>
            <tbody>
              {lowStock.map((a, i) => (
                <tr key={i}><td>{a.product_name}</td><td><code>{a.sku_variant}</code></td><td>{a.size}</td><td>{a.color||'—'}</td><td>{a.store_name}</td><td><strong className="text-warning">{a.quantity}</strong></td><td>{a.reorder_point}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {alerts.length === 0 && <div className="card empty-state"><div className="icon">✅</div><p>All stock levels are healthy!</p></div>}
    </div>
  );
}
