import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiDollarSign } from 'react-icons/fi';
import api from '../utils/api';

export default function PartialPayments() {
  const [overdue, setOverdue] = useState([]);

  useEffect(() => {
    api.get('/billing/partial/overdue').then(r => setOverdue(r.data));
  }, []);

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}><FiDollarSign style={{ marginRight: 8 }} />Overdue Partial Payments</h1>

      {overdue.length > 0 && (
        <div className="alert alert-danger">
          ⚠️ {overdue.length} bill(s) with partial payment pending for more than 30 days. Total outstanding: ₹{overdue.reduce((s, o) => s + o.remaining, 0).toLocaleString()}
        </div>
      )}

      <div className="card">
        <table>
          <thead><tr><th>Bill #</th><th>Customer</th><th>Phone</th><th>Total</th><th>Paid</th><th>Remaining</th><th>Days Overdue</th><th>Store</th><th></th></tr></thead>
          <tbody>
            {overdue.map(o => (
              <tr key={o.id}>
                <td><Link to={`/bills/${o.id}`} style={{ color: 'var(--primary)', fontWeight: 500 }}>{o.bill_number}</Link></td>
                <td>{o.customer_name || '—'}</td>
                <td>{o.customer_phone || '—'}</td>
                <td>₹{o.total_amount.toLocaleString()}</td>
                <td>₹{o.paid_amount.toLocaleString()}</td>
                <td className="text-danger"><strong>₹{o.remaining.toLocaleString()}</strong></td>
                <td><span className="badge badge-danger">{o.days_overdue} days</span></td>
                <td>{o.store_name || '—'}</td>
                <td><Link to={`/bills/${o.id}`} className="btn btn-sm btn-primary">View / Pay</Link></td>
              </tr>
            ))}
            {!overdue.length && <tr><td colSpan={9} className="text-center text-muted" style={{ padding: 40 }}>No overdue payments — all clear!</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
