import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Barcode from 'react-barcode';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import api, { getImageUrl } from '../utils/api';

const SIZES_PRESET = ['XS','S','M','L','XL','XXL','XXXL','28','30','32','34','36','38','40','42','44','Free Size'];
const FITS = ['Regular','Slim','Relaxed','Oversized'];

export default function ProductDetail() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const [product, setProduct] = useState(null);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [variantForm, setVariantForm] = useState({ size: '', color: '', fit: '', additional_price: '0' });
  const [bulkSizes, setBulkSizes] = useState([]);
  const [bulkColor, setBulkColor] = useState('');
  const [bulkFit, setBulkFit] = useState('');
  const [showBarcode, setShowBarcode] = useState(null);

  const load = () => { api.get(`/products/${id}`).then(r => setProduct(r.data)); };
  useEffect(() => { load(); }, [id]);

  if (!product) return <div className="text-center mt-2">Loading...</div>;

  const addVariant = async (e) => {
    e.preventDefault();
    try {
      if (bulkMode) {
        const variants = bulkSizes.map(size => ({ size, color: bulkColor, fit: bulkFit, additional_price: 0 }));
        const { data } = await api.post(`/products/${id}/variants/bulk`, { variants });
        toast.success(`${data.created.length} variants added`);
      } else {
        await api.post(`/products/${id}/variants`, variantForm);
        toast.success('Variant added');
      }
      setShowVariantModal(false);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const deleteVariant = async (vid) => {
    if (!window.confirm('Delete this variant?')) return;
    await api.delete(`/products/${id}/variants/${vid}`);
    toast.success('Variant deleted'); load();
  };

  const toggleBulkSize = (size) => {
    setBulkSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <div>
          <Link to="/products" className="text-muted" style={{ fontSize: '0.85rem' }}>← Back to Products</Link>
          <h1 style={{ marginTop: 4 }}>{product.name}</h1>
        </div>
        <div className="flex gap-1">
          <button className="btn btn-outline" onClick={() => setShowBarcode(product)}>View Barcode</button>
          {isAdmin && <Link to={`/products/edit/${id}`} className="btn btn-primary">Edit Product</Link>}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><span className="card-title">Product Details</span></div>
          {product.image && <img src={getImageUrl(product.image)} alt="" className="product-image-lg mb-2" />}
          <table>
            <tbody>
              <tr><td className="text-muted">SKU</td><td><code>{product.sku}</code></td></tr>
              <tr><td className="text-muted">Barcode</td><td><code>{product.barcode}</code></td></tr>
              <tr><td className="text-muted">Category</td><td>{product.category_name || '—'}</td></tr>
              <tr><td className="text-muted">Brand</td><td>{product.brand || '—'}</td></tr>
              <tr><td className="text-muted">Fabric</td><td>{product.fabric || '—'}</td></tr>
              <tr><td className="text-muted">Season</td><td>{product.season || '—'}</td></tr>
              <tr><td className="text-muted">Collection</td><td>{product.collection || '—'}</td></tr>
              <tr><td className="text-muted">MRP</td><td>₹{product.mrp}</td></tr>
              <tr><td className="text-muted">Cost Price</td><td>₹{product.cost_price}</td></tr>
              <tr><td className="text-muted">Selling Price</td><td><strong>₹{product.selling_price}</strong></td></tr>
              <tr><td className="text-muted">HSN Code</td><td>{product.hsn_code || '—'}</td></tr>
              <tr><td className="text-muted">Tax %</td><td>{product.tax_percent}%</td></tr>
            </tbody>
          </table>
          {product.description && <p className="mt-2 text-muted">{product.description}</p>}
        </div>

        {product.size_chart && (
          <div className="card">
            <div className="card-header"><span className="card-title">Size Chart: {product.size_chart.name}</span></div>
            <div className="table-container">
              <table>
                <thead><tr><th>Size</th><th>Chest</th><th>Waist</th><th>Hip</th><th>Length</th><th>Shoulder</th></tr></thead>
                <tbody>
                  {product.size_chart.entries.map((e, i) => (
                    <tr key={i}><td><strong>{e.size_label}</strong></td><td>{e.chest||'—'}</td><td>{e.waist||'—'}</td><td>{e.hip||'—'}</td><td>{e.length||'—'}</td><td>{e.shoulder||'—'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Variants ({product.variants.length})</span>
          {isAdmin && <button className="btn btn-primary btn-sm" onClick={() => { setShowVariantModal(true); setBulkMode(false); }}>+ Add Variant</button>}
        </div>
        {product.variants.length === 0 ? (
          <div className="empty-state"><p>No variants yet. Add size/color/fit combinations.</p></div>
        ) : (
          <div className="table-container">
            <table>
              <thead><tr><th>SKU Variant</th><th>Size</th><th>Color</th><th>Fit</th><th>Barcode</th><th>Price Adj.</th><th>Stock (All Stores)</th><th>Actions</th></tr></thead>
              <tbody>
                {product.variants.map(v => {
                  const totalStock = v.stock?.reduce((s, st) => s + st.quantity, 0) || 0;
                  const totalReserved = v.stock?.reduce((s, st) => s + st.reserved_quantity, 0) || 0;
                  return (
                    <tr key={v.id}>
                      <td><code style={{ fontSize: '0.75rem' }}>{v.sku_variant}</code></td>
                      <td><span className="badge badge-info">{v.size}</span></td>
                      <td>{v.color || '—'}</td>
                      <td>{v.fit || '—'}</td>
                      <td><button className="btn btn-sm btn-outline" onClick={() => setShowBarcode(v)} style={{ fontSize: '0.7rem' }}>{v.barcode}</button></td>
                      <td>{v.additional_price > 0 ? `+₹${v.additional_price}` : '—'}</td>
                      <td>
                        <span className={`badge ${totalStock === 0 ? 'badge-danger' : 'badge-success'}`}>{totalStock}</span>
                        {totalReserved > 0 && <span className="badge badge-warning" style={{ marginLeft: 4 }}>{totalReserved} rsv</span>}
                        {v.stock?.map(s => <div key={s.store_id} style={{ fontSize: '0.7rem', color: '#888' }}>{s.store_name}: {s.quantity}</div>)}
                      </td>
                      <td>{isAdmin && <button className="btn btn-sm btn-danger" onClick={() => deleteVariant(v.id)}>Delete</button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showBarcode && (
        <div className="modal-overlay" onClick={() => setShowBarcode(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <h2>Barcode Label</h2>
            <p style={{ marginBottom: 8 }}><strong>{product.name}</strong></p>
            {showBarcode.size && <p className="text-muted">Size: {showBarcode.size} {showBarcode.color ? `| Color: ${showBarcode.color}` : ''}</p>}
            <p style={{ margin: '8px 0' }}>₹{product.selling_price + (showBarcode.additional_price || 0)}</p>
            <div style={{ margin: '16px 0' }}>
              <Barcode value={showBarcode.barcode} width={2} height={60} fontSize={12} />
            </div>
            <p style={{ fontSize: '0.8rem', color: '#888' }}>{showBarcode.sku_variant || showBarcode.sku}</p>
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => window.print()}>Print Label</button>
              <button className="btn btn-outline" onClick={() => setShowBarcode(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showVariantModal && (
        <div className="modal-overlay" onClick={() => setShowVariantModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Add Variant</h2>
            <div className="tabs" style={{ marginBottom: 16 }}>
              <div className={`tab ${!bulkMode ? 'active' : ''}`} onClick={() => setBulkMode(false)}>Single</div>
              <div className={`tab ${bulkMode ? 'active' : ''}`} onClick={() => setBulkMode(true)}>Bulk (Multiple Sizes)</div>
            </div>
            <form onSubmit={addVariant}>
              {bulkMode ? (
                <>
                  <div className="form-group">
                    <label>Select Sizes</label>
                    <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
                      {SIZES_PRESET.map(s => (
                        <button key={s} type="button" className={`btn btn-sm ${bulkSizes.includes(s) ? 'btn-primary' : 'btn-outline'}`} onClick={() => toggleBulkSize(s)}>{s}</button>
                      ))}
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label>Color</label><input className="form-control" value={bulkColor} onChange={e => setBulkColor(e.target.value)} /></div>
                    <div className="form-group"><label>Fit</label>
                      <select className="form-control" value={bulkFit} onChange={e => setBulkFit(e.target.value)}><option value="">Select</option>{FITS.map(f => <option key={f}>{f}</option>)}</select>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group"><label>Size *</label>
                    <select className="form-control" value={variantForm.size} onChange={e => setVariantForm({ ...variantForm, size: e.target.value })} required>
                      <option value="">Select size</option>{SIZES_PRESET.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label>Color</label><input className="form-control" value={variantForm.color} onChange={e => setVariantForm({ ...variantForm, color: e.target.value })} /></div>
                    <div className="form-group"><label>Fit</label>
                      <select className="form-control" value={variantForm.fit} onChange={e => setVariantForm({ ...variantForm, fit: e.target.value })}><option value="">Select</option>{FITS.map(f => <option key={f}>{f}</option>)}</select>
                    </div>
                  </div>
                  <div className="form-group"><label>Additional Price (₹)</label><input className="form-control" type="number" value={variantForm.additional_price} onChange={e => setVariantForm({ ...variantForm, additional_price: e.target.value })} /></div>
                </>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowVariantModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{bulkMode ? `Add ${bulkSizes.length} Variants` : 'Add Variant'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
