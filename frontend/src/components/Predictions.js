import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../utils/api';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function Predictions() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [predictions, setPredictions] = useState([]);

  useEffect(() => {
    api.get('/dashboard/predictions', { params: { month } }).then(r => setPredictions(r.data.predictions));
  }, [month]);

  const chartData = predictions.slice(0, 10).map(p => ({ name: p.product_name?.substring(0, 15), qty: p.avg_per_year }));

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <h1>Sales Predictions</h1>
        <div className="form-group">
          <select className="form-control" value={month} onChange={e => setMonth(e.target.value)}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="alert alert-info">
        Based on historical sales data, these items are predicted to sell well in <strong>{MONTHS[month - 1]}</strong>. Stock up accordingly!
      </div>

      {chartData.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><span className="card-title">Predicted Top Sellers — {MONTHS[month - 1]}</span></div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
              <Tooltip />
              <Bar dataKey="qty" fill="#4f46e5" radius={[0,4,4,0]} name="Avg Qty/Year" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card">
        <table>
          <thead><tr><th>#</th><th>Product</th><th>SKU</th><th>Size</th><th>Color</th><th>Total Sold (All Time)</th><th>Years of Data</th><th>Avg Sold / Year</th></tr></thead>
          <tbody>
            {predictions.map((p, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td><strong>{p.product_name}</strong></td>
                <td><code style={{ fontSize: '0.73rem' }}>{p.sku}</code></td>
                <td>{p.size || '—'}</td>
                <td>{p.color || '—'}</td>
                <td>{p.total_sold}</td>
                <td>{p.years_with_data}</td>
                <td><span className="badge badge-info">{p.avg_per_year}</span></td>
              </tr>
            ))}
            {!predictions.length && <tr><td colSpan={8} className="text-center text-muted" style={{ padding: 40 }}>No historical data for this month yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
