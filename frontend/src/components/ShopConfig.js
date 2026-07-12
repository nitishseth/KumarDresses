import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import api from '../utils/api';

export default function ShopConfig() {
  const { refreshShop } = useAuth();
  const [form, setForm] = useState({ shop_name: '', address: '', phone: '', email: '', gst_number: '', tagline: '' });
  const [logo, setLogo] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/shop').then(r => {
      const d = r.data;
      setForm({ shop_name: d.shop_name || '', address: d.address || '', phone: d.phone || '', email: d.email || '', gst_number: d.gst_number || '', tagline: d.tagline || '' });
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (logo) fd.append('logo', logo);
      await api.put('/shop', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await refreshShop();
      toast.success('Shop configuration saved!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Shop Configuration</h1>
      <div className="card" style={{ maxWidth: 700 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Shop Name *</label>
            <input className="form-control" value={form.shop_name} onChange={e => setForm({ ...form, shop_name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Tagline</label>
            <input className="form-control" value={form.tagline} onChange={e => setForm({ ...form, tagline: e.target.value })} placeholder="e.g. Premium Readymade Garments" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Phone</label>
              <input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input className="form-control" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Address</label>
            <textarea className="form-control" rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>GST Number</label>
              <input className="form-control" value={form.gst_number} onChange={e => setForm({ ...form, gst_number: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Shop Logo</label>
              <input className="form-control" type="file" accept="image/*" onChange={e => setLogo(e.target.files[0])} />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Configuration'}</button>
        </form>
      </div>
    </div>
  );
}
