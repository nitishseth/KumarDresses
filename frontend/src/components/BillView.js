import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Barcode from 'react-barcode';
import { toast } from 'react-toastify';
import api, { getImageUrl } from '../utils/api';

export default function BillView() {
  const { id } = useParams();
  const [bill, setBill] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [shopConfig, setShopConfig] = useState({});

  useEffect(() => {
    api.get(`/billing/${id}`).then(r => setBill(r.data));
    api.get('/shop').then(r => setShopConfig(r.data));
  }, [id]);

  if (!bill) return <div className="text-center mt-2">Loading...</div>;

  const remaining = bill.total_amount - bill.paid_amount;

  const addPayment = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post(`/billing/${id}/payment`, { amount: Number(payAmount), payment_method: payMethod });
      toast.success(data.message);
      setShowPayment(false);
      api.get(`/billing/${id}`).then(r => setBill(r.data));
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  return (
    <div>
      <div className="flex-between no-print" style={{ marginBottom: 24 }}>
        <Link to="/bills" className="text-muted">← Back to Bills</Link>
        <div className="flex gap-1">
          {bill.payment_status === 'partial' && <button className="btn btn-success" onClick={() => setShowPayment(true)}>Add Payment</button>}
          <button className="btn btn-primary" onClick={() => window.print()}>Print Bill</button>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <img
            src={shopConfig.logo ? getImageUrl(shopConfig.logo) : '/logo.svg'}
            alt="Logo"
            style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', marginBottom: 8 }}
          />
          <h2>{shopConfig.shop_name || 'Kumar Dresses'}</h2>
          {shopConfig.tagline && <p className="text-muted">{shopConfig.tagline}</p>}
          {shopConfig.address && <p style={{ fontSize: '0.85rem' }}>{shopConfig.address}</p>}
          {shopConfig.phone && <p style={{ fontSize: '0.85rem' }}>Ph: {shopConfig.phone}</p>}
          {shopConfig.gst_number && <p style={{ fontSize: '0.8rem', color: '#888' }}>GSTIN: {shopConfig.gst_number}</p>}
          <hr style={{ margin: '12px 0' }} />
        </div>

        <div className="flex-between mb-2">
          <div><strong>Bill #:</strong> {bill.bill_number}</div>
          <div><strong>Date:</strong> {new Date(bill.created_at).toLocaleString()}</div>
        </div>
        <div className="flex-between mb-2">
          <div><strong>Customer:</strong> {bill.customer_name || 'Walk-in'}</div>
          <div>{bill.customer_phone && <><strong>Phone:</strong> {bill.customer_phone}</>}</div>
        </div>
        <div className="mb-2"><strong>Store:</strong> {bill.store_name} | <strong>Billed by:</strong> {bill.billed_by}</div>

        <table style={{ marginTop: 16 }}>
          <thead><tr><th>#</th><th>Item</th><th>Size</th><th>Color</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
          <tbody>
            {bill.items?.map((item, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{item.product_name}<br /><code style={{ fontSize: '0.7rem' }}>{item.sku}</code></td>
                <td>{item.size}</td>
                <td>{item.color || '—'}</td>
                <td>{item.quantity}</td>
                <td>₹{item.price.toLocaleString()}</td>
                <td>₹{item.total.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="bill-summary" style={{ marginTop: 16 }}>
          <div className="line"><span>Subtotal</span><span>₹{bill.subtotal.toLocaleString()}</span></div>
          {bill.discount > 0 && <div className="line"><span>Discount</span><span>-₹{bill.discount.toLocaleString()}</span></div>}
          {bill.tax > 0 && <div className="line"><span>Tax</span><span>₹{bill.tax.toLocaleString()}</span></div>}
          <div className="line total"><span>Total</span><span>₹{bill.total_amount.toLocaleString()}</span></div>
          <div className="line"><span>Paid</span><span>₹{bill.paid_amount.toLocaleString()}</span></div>
          {remaining > 0 && <div className="line text-danger"><span>Remaining</span><span>₹{remaining.toLocaleString()}</span></div>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <span className={`badge ${bill.payment_status === 'full' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.9rem', padding: '6px 14px' }}>
            {bill.payment_status === 'full' ? 'PAID' : 'PARTIAL PAYMENT'}
          </span>
          <div><Barcode value={bill.bill_number} width={1.5} height={40} fontSize={10} /></div>
        </div>

        {bill.payments?.length > 1 && (
          <div style={{ marginTop: 16 }}>
            <h4 style={{ fontSize: '0.9rem' }}>Payment History</h4>
            <table>
              <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Notes</th></tr></thead>
              <tbody>
                {bill.payments.map((p, i) => (
                  <tr key={i}><td>{new Date(p.payment_date).toLocaleString()}</td><td>₹{p.amount.toLocaleString()}</td><td>{p.payment_method}</td><td>{p.notes || '—'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: '0.8rem', color: '#888' }}>
          Thank you for shopping with us!
        </div>
      </div>

      {showPayment && (
        <div className="modal-overlay" onClick={() => setShowPayment(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Add Payment</h2>
            <p className="mb-2">Remaining: <strong>₹{remaining.toLocaleString()}</strong></p>
            <form onSubmit={addPayment}>
              <div className="form-row">
                <div className="form-group"><label>Amount *</label><input className="form-control" type="number" step="0.01" max={remaining} value={payAmount} onChange={e => setPayAmount(e.target.value)} required /></div>
                <div className="form-group"><label>Method</label>
                  <select className="form-control" value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                    <option value="cash">Cash</option><option value="card">Card</option><option value="upi">UPI</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={() => setShowPayment(false)}>Cancel</button><button type="submit" className="btn btn-success">Record Payment</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
