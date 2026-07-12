import React, { useState, useEffect } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../utils/api';

export default function CustomerProductView() {
  const { id } = useParams();
  const { user } = useOutletContext();
  const [product, setProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [wishlisted, setWishlisted] = useState(false);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [imgZoom, setImgZoom] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/storefront/products/${id}`).then(r => {
      setProduct(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));

    if (user) {
      api.get('/storefront/wishlist/ids').then(r => {
        setWishlisted(r.data.includes(Number(id)));
      }).catch(() => {});
    }
  }, [id, user]);

  const toggleWish = async () => {
    if (!user) { toast.info('Please login to add to wishlist'); return; }
    if (wishlisted) {
      await api.delete(`/storefront/wishlist/${id}`);
      setWishlisted(false);
      toast.success('Removed from wishlist');
    } else {
      await api.post(`/storefront/wishlist/${id}`);
      setWishlisted(true);
      toast.success('Added to wishlist! ❤️');
    }
  };

  if (loading) return <div className="sf-loader"><div className="sf-spinner" /><p>Loading product...</p></div>;
  if (!product) return <div className="sf-empty"><span className="sf-empty-icon">😕</span><h3>Product not found</h3><Link to="/shop/products" className="sf-btn sf-btn-primary">Browse Products</Link></div>;

  const disc = product.mrp > product.selling_price ? Math.round(((product.mrp - product.selling_price) / product.mrp) * 100) : 0;
  const imgSrc = product.image ? (product.image.startsWith('http') ? product.image : `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}${product.image}`) : null;
  const sizes = [...new Set(product.variants?.map(v => v.size) || [])];
  const colors = [...new Set(product.variants?.filter(v => v.color).map(v => v.color) || [])];
  const selectedVariant = product.variants?.find(v =>
    (!selectedSize || v.size === selectedSize) && (!selectedColor || v.color === selectedColor)
  );

  return (
    <div className="sf-pdp">
      <div className="sf-section-container">
        {/* Breadcrumb */}
        <div className="sf-breadcrumb">
          <Link to="/shop">Home</Link> <span>/</span>
          <Link to="/shop/products">Products</Link> <span>/</span>
          <span>{product.name}</span>
        </div>

        <div className="sf-pdp-grid">
          {/* Image Section */}
          <div className="sf-pdp-images">
            <div className={`sf-pdp-main-img${imgZoom ? ' sf-pdp-zoomed' : ''}`} onClick={() => setImgZoom(!imgZoom)}>
              {imgSrc
                ? <img src={imgSrc} alt={product.name} />
                : <div className="sf-pdp-placeholder">👗<span>No Image Available</span></div>
              }
              {disc > 0 && <span className="sf-pdp-disc-badge">{disc}% OFF</span>}
            </div>
            <div className="sf-pdp-img-actions">
              <button className={`sf-pdp-wish-btn${wishlisted ? ' wishlisted' : ''}`} onClick={toggleWish}>
                {wishlisted ? '❤️' : '🤍'} {wishlisted ? 'Wishlisted' : 'Add to Wishlist'}
              </button>
            </div>
          </div>

          {/* Details Section */}
          <div className="sf-pdp-details">
            <span className="sf-pdp-brand">{product.brand || 'Kumar Dresses'}</span>
            <h1 className="sf-pdp-name">{product.name}</h1>

            {product.category_name && (
              <Link to={`/shop/products?category_id=${product.category_id}`} className="sf-pdp-cat">{product.category_name}</Link>
            )}

            {/* Price */}
            <div className="sf-pdp-price-block">
              <span className="sf-pdp-sp">₹{product.selling_price?.toLocaleString()}</span>
              {disc > 0 && (
                <>
                  <span className="sf-pdp-mrp">MRP ₹{product.mrp?.toLocaleString()}</span>
                  <span className="sf-pdp-disc-text">{disc}% OFF</span>
                </>
              )}
            </div>
            <p className="sf-pdp-tax-info">Inclusive of all taxes</p>

            {/* Size Selection */}
            {sizes.length > 0 && (
              <div className="sf-pdp-section">
                <div className="sf-pdp-section-header">
                  <h3>Select Size</h3>
                  {product.size_chart && product.size_chart.length > 0 && (
                    <button className="sf-size-chart-btn" onClick={() => setShowSizeChart(true)}>📏 Size Chart</button>
                  )}
                </div>
                <div className="sf-pdp-sizes">
                  {sizes.map(s => {
                    const variant = product.variants?.find(v => v.size === s && (!selectedColor || v.color === selectedColor));
                    const inStock = variant && variant.available > 0;
                    return (
                      <button key={s}
                        className={`sf-pdp-size${selectedSize === s ? ' active' : ''}${!inStock ? ' out' : ''}`}
                        onClick={() => inStock && setSelectedSize(selectedSize === s ? '' : s)}
                        disabled={!inStock}
                      >
                        {s}
                        {!inStock && <span className="sf-pdp-size-line" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Color Selection */}
            {colors.length > 0 && (
              <div className="sf-pdp-section">
                <h3>Select Color</h3>
                <div className="sf-pdp-colors">
                  {colors.map(c => (
                    <button key={c}
                      className={`sf-pdp-color-btn${selectedColor === c ? ' active' : ''}`}
                      onClick={() => setSelectedColor(selectedColor === c ? '' : c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stock info */}
            {selectedVariant && (
              <div className="sf-pdp-stock-info">
                {selectedVariant.available > 0
                  ? <span className="sf-stock-in">✓ In Stock {selectedVariant.available <= 5 ? `— Only ${selectedVariant.available} left!` : ''}</span>
                  : <span className="sf-stock-out">✕ Out of Stock</span>
                }
              </div>
            )}

            {/* Product Details */}
            <div className="sf-pdp-section sf-pdp-details-section">
              <h3>Product Details</h3>
              <div className="sf-pdp-info-grid">
                {product.brand && <div className="sf-pdp-info-row"><span>Brand</span><span>{product.brand}</span></div>}
                {product.fabric && <div className="sf-pdp-info-row"><span>Fabric</span><span>{product.fabric}</span></div>}
                {product.material && <div className="sf-pdp-info-row"><span>Material</span><span>{product.material}</span></div>}
                {product.season && <div className="sf-pdp-info-row"><span>Season</span><span>{product.season}</span></div>}
                {product.gender && <div className="sf-pdp-info-row"><span>Gender</span><span>{product.gender}</span></div>}
                {product.collection && <div className="sf-pdp-info-row"><span>Collection</span><span>{product.collection}</span></div>}
                <div className="sf-pdp-info-row"><span>SKU</span><span>{product.sku}</span></div>
              </div>
            </div>

            {product.description && (
              <div className="sf-pdp-section">
                <h3>Description</h3>
                <p className="sf-pdp-desc">{product.description}</p>
              </div>
            )}

            {/* Delivery & Returns */}
            <div className="sf-pdp-promises">
              <div className="sf-pdp-promise"><span>🚚</span><div><strong>Free Delivery</strong><span>on orders above ₹999</span></div></div>
              <div className="sf-pdp-promise"><span>↩️</span><div><strong>Easy Returns</strong><span>7 day return policy</span></div></div>
              <div className="sf-pdp-promise"><span>✅</span><div><strong>100% Genuine</strong><span>Authentic products only</span></div></div>
            </div>
          </div>
        </div>
      </div>

      {/* Size Chart Modal */}
      {showSizeChart && product.size_chart && (
        <div className="sf-modal-overlay" onClick={() => setShowSizeChart(false)}>
          <div className="sf-modal" onClick={e => e.stopPropagation()}>
            <div className="sf-modal-header">
              <h2>Size Chart</h2>
              <button onClick={() => setShowSizeChart(false)} className="sf-modal-close">✕</button>
            </div>
            <div className="sf-modal-body">
              <table className="sf-size-table">
                <thead>
                  <tr>
                    <th>Size</th>
                    {product.size_chart[0]?.chest != null && <th>Chest (in)</th>}
                    {product.size_chart[0]?.waist != null && <th>Waist (in)</th>}
                    {product.size_chart[0]?.hip != null && <th>Hip (in)</th>}
                    {product.size_chart[0]?.length != null && <th>Length (in)</th>}
                    {product.size_chart[0]?.shoulder != null && <th>Shoulder (in)</th>}
                    {product.size_chart[0]?.sleeve != null && <th>Sleeve (in)</th>}
                  </tr>
                </thead>
                <tbody>
                  {product.size_chart.map((entry, i) => (
                    <tr key={i} className={selectedSize === entry.size_label ? 'sf-size-highlight' : ''}>
                      <td><strong>{entry.size_label}</strong></td>
                      {entry.chest != null && <td>{entry.chest}</td>}
                      {entry.waist != null && <td>{entry.waist}</td>}
                      {entry.hip != null && <td>{entry.hip}</td>}
                      {entry.length != null && <td>{entry.length}</td>}
                      {entry.shoulder != null && <td>{entry.shoulder}</td>}
                      {entry.sleeve != null && <td>{entry.sleeve}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
