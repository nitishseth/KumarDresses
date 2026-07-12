import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

export default function BillHistory() {
  const [bills, setBills] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: '', payment_status: '', from_date: '', to_date: '' });

  const load = () => {
    const params = { page, limit: 30, ...filters };
    Object.keys(params).forEach(k => !params[k] && delete params[k]);
    api.get('/billing', { params }).then(r => { setBills(r.data.bills); setTotal(r.data.total); });
  };
  useEffect(() => { load(); }, [page, filters]);

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Bill History ({total})</h1>
      <div className="filter-bar">
        <div className="form-group" style={{ flex: 2 }}>
          <input className="form-control" placeholder="Search bill #, customer..." value={filters.search} onChange={e => { setFilters({ ...filters, search: e.target.value }); setPage(1); }} />
        </div>
        <div className="form-group"><label>Status</label>
          <select className="form-control" value={filters.payment_status} onChange={e => { setFilters({ ...filters, payment_status: e.target.value }); setPage(1); }}>
            <option value="">All</option><option value="full">Full Paid</option><option value="partial">Partial</option>
          </select>
        </div>
        <div className="form-group"><label>From</label><input className="form-control" type="date" value={filters.from_date} onChange={e => { setFilters({ ...filters, from_date: e.target.value }); setPage(1); }} /></div>
        <div className="form-group"><label>To</label><input className="form-control" type="date" value={filters.to_date} onChange={e => { setFilters({ ...filters, to_date: e.target.value }); setPage(1); }} /></div>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Bill #</th><th>Customer</th><th>Phone</th><th>Store</th><th>Total</th><th>Paid</th><th>Status</th><th>Date</th><th>By</th><th></th></tr></thead>
          <tbody>
            {bills.map(b => (
              <tr key={b.id}>
                <td><Link to={`/bills/${b.id}`} style={{ color: 'var(--primary)', fontWeight: 500 }}>{b.bill_number}</Link></td>
                <td>{b.customer_name || '—'}</td>
                <td>{b.customer_phone || '—'}</td>
                <td>{b.store_name || '—'}</td>
                <td>₹{b.total_amount.toLocaleString()}</td>
                <td>₹{b.paid_amount.toLocaleString()}</td>
                <td><span className={`badge ${b.payment_status === 'full' ? 'badge-success' : 'badge-warning'}`}>{b.payment_status}</span></td>
                <td>{new Date(b.created_at).toLocaleDateString()}</td>
                <td>{b.billed_by}</td>
                <td><Link to={`/bills/${b.id}`} className="btn btn-sm btn-outline">View</Link></td>
              </tr>
            ))}
            {!bills.length && <tr><td colSpan={10} className="text-center text-muted" style={{ padding: 40 }}>No bills found</td></tr>}
          </tbody>
        </table>
        {total > 30 && (
          <div className="flex-between mt-2">
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>Page {page} of {Math.ceil(total / 30)}</span>
            <div className="flex gap-1">
              <button className="btn btn-sm btn-outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <button className="btn btn-sm btn-outline" disabled={page * 30 >= total} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
