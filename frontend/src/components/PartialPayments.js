import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiDollarSign } from 'react-icons/fi';
import api from '../utils/api';

export default function PartialPayments() {
  const [overdue, setOverdue] = useState([]);
  const [allPartial, setAllPartial] = useState([]);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    Promise.all([
      api.get('/billing/partial/overdue'),
      api.get('/billing', { params: { payment_status: 'partial', limit: 100 } })
    ]).then(([o, a]) => {
      setOverdue(o.data);
      setAllPartial(a.data.bills || []);
    }).catch(() => {});
  }, []);

  const displayList = tab === 'overdue' ? overdue : allPartial;

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}><FiDollarSign style={{ marginRight: 8 }} />Partial Payments</h1>

      {overdue.length > 0 && (
        <div className="alert alert-danger">
          ⚠️ {overdue.length} bill(s) with partial payment pending for more than 30 days. Total outstanding: ₹{overdue.reduce((s, o) => s + (o.remaining || (o.total_amount - o.paid_amount)), 0).toLocaleString()}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={`btn ${tab === 'all' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('all')}>
          All Partial ({allPartial.length})
        </button>
        <button className={`btn ${tab === 'overdue' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('overdue')}>
          Overdue 30+ Days ({overdue.length})
        </button>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Bill #</th><th>Customer</th><th>Phone</th><th>Total</th><th>Paid</th><th>Remaining</th>{tab === 'overdue' && <th>Days Overdue</th>}<th>Store</th><th></th></tr></thead>
          <tbody>
            {displayList.map(o => {
              const remaining = o.remaining || (o.total_amount - o.paid_amount);
              return (
                <tr key={o.id}>
                  <td><Link to={`/bills/${o.id}`} style={{ color: 'var(--primary)', fontWeight: 500 }}>{o.bill_number}</Link></td>
                  <td>{o.customer_name || '—'}</td>
                  <td>{o.customer_phone || '—'}</td>
                  <td>₹{o.total_amount?.toLocaleString()}</td>
                  <td>₹{o.paid_amount?.toLocaleString()}</td>
                  <td className="text-danger"><strong>₹{remaining?.toLocaleString()}</strong></td>
                  {tab === 'overdue' && <td><span className="badge badge-danger">{o.days_overdue} days</span></td>}
                  <td>{o.store_name || '—'}</td>
                  <td><Link to={`/bills/${o.id}`} className="btn btn-sm btn-primary">View / Pay</Link></td>
                </tr>
              );
            })}
            {!displayList.length && <tr><td colSpan={tab === 'overdue' ? 9 : 8} className="text-center text-muted" style={{ padding: 40 }}>{tab === 'overdue' ? 'No overdue payments — all clear!' : 'No partial payments found'}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
