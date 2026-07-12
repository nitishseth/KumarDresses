import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../utils/api';

export default function Billing() {
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState('');
  const [stock, setStock] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/stores').then(r => { setStores(r.data); if (r.data.length) setStoreId(String(r.data[0].id)); });
  }, []);

  useEffect(() => {
    if (storeId) {
      const params = { store_id: storeId };
      if (search) params.search = search;
      api.get('/stock/overview', { params }).then(r => setStock(r.data));
    }
  }, [storeId, search]);

  const addToCart = (item) => {
    const existing = cart.find(c => c.variant_id === item.variant_id);
    if (existing) {
      if (existing.quantity >= item.available) { toast.warning('Not enough stock'); return; }
      setCart(cart.map(c => c.variant_id === item.variant_id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      if (item.available <= 0) { toast.warning('Out of stock'); return; }
      setCart([...cart, { variant_id: item.variant_id, product_name: item.product_name, sku: item.sku_variant, size: item.size, color: item.color, fit: item.fit, price: item.selling_price, quantity: 1, available: item.available }]);
    }
  };

  const updateCartQty = (variantId, qty) => {
    if (qty <= 0) { setCart(cart.filter(c => c.variant_id !== variantId)); return; }
    const item = cart.find(c => c.variant_id === variantId);
    if (qty > item.available) { toast.warning('Not enough stock'); return; }
    setCart(cart.map(c => c.variant_id === variantId ? { ...c, quantity: qty } : c));
  };

  const subtotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const total = subtotal - Number(discount);

  const handleSubmit = async () => {
    if (!cart.length) return toast.warning('Add items to cart');
    setLoading(true);
    try {
      const { data } = await api.post('/billing', {
        store_id: storeId,
        customer_name: customer.name,
        customer_phone: customer.phone,
        items: cart.map(c => ({ variant_id: c.variant_id, quantity: c.quantity })),
        discount: Number(discount),
        payment_method: paymentMethod,
        paid_amount: paidAmount ? Number(paidAmount) : undefined,
        notes
      });
      toast.success(`Bill ${data.billNumber} created!`);
      if (data.alerts?.length) data.alerts.forEach(a => toast.warning(`Low stock: ${a.variant} — ${a.quantity} left`));
      navigate(`/bills/${data.billId}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error creating bill');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>New Bill</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
        <div>
          <div className="card">
            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <select className="form-control" value={storeId} onChange={e => setStoreId(e.target.value)}>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ flex: 2 }}>
                <input className="form-control" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="table-container" style={{ maxHeight: 400, overflowY: 'auto' }}>
              <table>
                <thead><tr><th>Product</th><th>Size</th><th>Color</th><th>Price</th><th>Avail</th><th></th></tr></thead>
                <tbody>
                  {stock.filter(s => s.available > 0).map((s, i) => (
                    <tr key={i}>
                      <td>{s.product_name}</td>
                      <td><span className="badge badge-info">{s.size}</span></td>
                      <td>{s.color || '—'}</td>
                      <td>₹{s.selling_price}</td>
                      <td>{s.available}</td>
                      <td><button className="btn btn-sm btn-primary" onClick={() => addToCart(s)}>Add</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>Cart ({cart.length} items)</h3>
            {cart.length === 0 ? <p className="text-muted">No items added</p> : (
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {cart.map(c => (
                  <div key={c.variant_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{c.product_name}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{c.size} {c.color} — ₹{c.price}</div>
                    </div>
                    <div className="flex gap-1" style={{ alignItems: 'center' }}>
                      <button className="btn btn-sm btn-outline" onClick={() => updateCartQty(c.variant_id, c.quantity - 1)}>−</button>
                      <span style={{ minWidth: 24, textAlign: 'center' }}>{c.quantity}</span>
                      <button className="btn btn-sm btn-outline" onClick={() => updateCartQty(c.variant_id, c.quantity + 1)}>+</button>
                      <span style={{ minWidth: 60, textAlign: 'right', fontWeight: 500 }}>₹{(c.price * c.quantity).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="form-row">
              <div className="form-group"><label>Customer Name</label><input className="form-control" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} /></div>
              <div className="form-group"><label>Phone</label><input className="form-control" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} /></div>
            </div>

            <div className="bill-summary">
              <div className="line"><span>Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div>
              <div className="line">
                <span>Discount</span>
                <input style={{ width: 80, textAlign: 'right', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px' }} type="number" value={discount} onChange={e => setDiscount(e.target.value)} />
              </div>
              <div className="line total"><span>Total</span><span>₹{total.toLocaleString()}</span></div>
            </div>

            <div className="form-row mt-1">
              <div className="form-group"><label>Payment</label>
                <select className="form-control" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                  <option value="cash">Cash</option><option value="card">Card</option><option value="upi">UPI</option>
                </select>
              </div>
              <div className="form-group"><label>Paid Amount</label>
                <input className="form-control" type="number" step="0.01" placeholder={`₹${total}`} value={paidAmount} onChange={e => setPaidAmount(e.target.value)} />
              </div>
            </div>
            <div className="form-group"><label>Notes</label><input className="form-control" value={notes} onChange={e => setNotes(e.target.value)} /></div>

            <button className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} onClick={handleSubmit} disabled={loading || !cart.length}>
              {loading ? 'Processing...' : `Generate Bill — ₹${total.toLocaleString()}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
