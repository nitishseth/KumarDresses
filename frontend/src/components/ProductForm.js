import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../utils/api';

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', category_id: '', brand: '', fabric: '', material: '', season: '',
    collection: '', mrp: '', cost_price: '', selling_price: '', hsn_code: '',
    tax_percent: '', description: ''
  });

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data.categories));
    if (id) {
      api.get(`/products/${id}`).then(r => {
        const p = r.data;
        setForm({
          name: p.name, category_id: p.category_id || '', brand: p.brand || '', fabric: p.fabric || '',
          material: p.material || '', season: p.season || '', collection: p.collection || '',
          mrp: p.mrp, cost_price: p.cost_price || '', selling_price: p.selling_price,
          hsn_code: p.hsn_code || '', tax_percent: p.tax_percent || '', description: p.description || ''
        });
      });
    }
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (image) fd.append('image', image);

      if (id) {
        await api.put(`/products/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Product updated');
        navigate(`/products/${id}`);
      } else {
        const { data } = await api.post('/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success(`Product created! SKU: ${data.sku}, Barcode: ${data.barcode}`);
        navigate(`/products/${data.id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error saving product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>{id ? 'Edit Product' : 'Add New Product'}</h1>
      <div className="card" style={{ maxWidth: 800 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Product Name *</label>
            <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Blue Slim Fit Formal Shirt" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select className="form-control" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{'  '.repeat(c.level)}{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Brand</label>
              <input className="form-control" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Fabric</label>
              <input className="form-control" value={form.fabric} onChange={e => setForm({ ...form, fabric: e.target.value })} placeholder="Cotton, Polyester, Silk..." />
            </div>
            <div className="form-group">
              <label>Material</label>
              <input className="form-control" value={form.material} onChange={e => setForm({ ...form, material: e.target.value })} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Season</label>
              <select className="form-control" value={form.season} onChange={e => setForm({ ...form, season: e.target.value })}>
                <option value="">Select</option><option>Summer</option><option>Winter</option><option>Monsoon</option><option>All-Season</option>
              </select>
            </div>
            <div className="form-group">
              <label>Collection</label>
              <input className="form-control" value={form.collection} onChange={e => setForm({ ...form, collection: e.target.value })} placeholder="Summer 2026" />
            </div>
          </div>

          <div className="form-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="form-group">
              <label>MRP (₹) *</label>
              <input className="form-control" type="number" step="0.01" value={form.mrp} onChange={e => setForm({ ...form, mrp: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Cost Price (₹)</label>
              <input className="form-control" type="number" step="0.01" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Selling Price (₹) *</label>
              <input className="form-control" type="number" step="0.01" value={form.selling_price} onChange={e => setForm({ ...form, selling_price: e.target.value })} required />
            </div>
          </div>

          <div className="form-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="form-group">
              <label>HSN Code</label>
              <input className="form-control" value={form.hsn_code} onChange={e => setForm({ ...form, hsn_code: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Tax %</label>
              <input className="form-control" type="number" step="0.01" value={form.tax_percent} onChange={e => setForm({ ...form, tax_percent: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Product Image</label>
              <input className="form-control" type="file" accept="image/*" onChange={e => setImage(e.target.files[0])} />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea className="form-control" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="flex gap-1">
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : (id ? 'Update Product' : 'Create Product')}</button>
            <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
