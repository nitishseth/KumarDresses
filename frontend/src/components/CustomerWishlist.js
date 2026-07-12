import React, { useState, useEffect } from 'react';
import { Link, useOutletContext, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../utils/api';

export default function CustomerWishlist() {
  const { user, setWishlistCount } = useOutletContext();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    api.get('/storefront/wishlist').then(r => {
      setItems(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  const removeItem = async (productId) => {
    await api.delete(`/storefront/wishlist/${productId}`);
    setItems(items.filter(i => i.product_id !== productId));
    setWishlistCount(prev => Math.max(0, prev - 1));
    toast.success('Removed from wishlist');
  };

  const getDiscount = (mrp, sp) => mrp > sp ? Math.round(((mrp - sp) / mrp) * 100) : 0;
  const imgUrl = (img) => img ? (img.startsWith('http') ? img : `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}/${img}`) : null;

  if (!user) return (
    <div className="sf-wishlist-login">
      <div className="sf-wishlist-login-card">
        <span className="sf-wishlist-login-icon">❤️</span>
        <h2>Your Wishlist Awaits</h2>
        <p>Login to save your favorite items and access them anytime</p>
        <button className="sf-btn sf-btn-primary sf-btn-lg" onClick={() => navigate('/login')}>Login to Continue</button>
        <Link to="/shop/products" className="sf-wishlist-browse">or continue browsing →</Link>
      </div>
    </div>
  );

  if (loading) return <div className="sf-loader"><div className="sf-spinner" /><p>Loading your wishlist...</p></div>;

  return (
    <div className="sf-wishlist-page">
      <div className="sf-section-container">
        <div className="sf-breadcrumb">
          <Link to="/shop">Home</Link> <span>/</span> <span>My Wishlist</span>
        </div>

        <div className="sf-wishlist-header">
          <h1>My Wishlist <span className="sf-wishlist-count">({items.length} items)</span></h1>
        </div>

        {items.length === 0 ? (
          <div className="sf-empty">
            <span className="sf-empty-icon">💔</span>
            <h3>Your wishlist is empty</h3>
            <p>Start adding items you love by tapping the heart icon</p>
            <Link to="/shop/products" className="sf-btn sf-btn-primary">Explore Products</Link>
          </div>
        ) : (
          <div className="sf-wishlist-grid">
            {items.map(item => {
              const disc = getDiscount(item.mrp, item.selling_price);
              const src = imgUrl(item.image);
              return (
                <div key={item.id} className="sf-wishlist-card">
                  <Link to={`/shop/products/${item.product_id}`} className="sf-wishlist-img-wrap">
                    {src
                      ? <img src={src} alt={item.name} className="sf-wishlist-img" loading="lazy" />
                      : <div className="sf-wishlist-img sf-pcard-placeholder">👗</div>
                    }
                    {disc > 0 && <span className="sf-pcard-disc-badge">{disc}% OFF</span>}
                  </Link>
                  <button className="sf-wishlist-remove" onClick={() => removeItem(item.product_id)} title="Remove from Wishlist">✕</button>
                  <div className="sf-wishlist-body">
                    <span className="sf-pcard-brand">{item.brand || 'Kumar Dresses'}</span>
                    <Link to={`/shop/products/${item.product_id}`} className="sf-pcard-name">{item.name}</Link>
                    <div className="sf-pcard-price">
                      <span className="sf-pcard-sp">₹{item.selling_price?.toLocaleString()}</span>
                      {disc > 0 && <>
                        <span className="sf-pcard-mrp">₹{item.mrp?.toLocaleString()}</span>
                        <span className="sf-pcard-disc">({disc}% off)</span>
                      </>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
