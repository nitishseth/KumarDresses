import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import api, { getImageUrl } from '../utils/api';

export default function CustomerHome() {
  const { user } = useOutletContext();
  const [newArrivals, setNewArrivals] = useState([]);
  const [offers, setOffers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [wishIds, setWishIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/storefront/new-arrivals').catch(() => ({ data: [] })),
      api.get('/storefront/offers').catch(() => ({ data: [] })),
      api.get('/storefront/categories').catch(() => ({ data: [] })),
      user ? api.get('/storefront/wishlist/ids').catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
    ]).then(([na, of, ca, wi]) => {
      setNewArrivals(na.data);
      setOffers(of.data);
      setCategories(ca.data.filter(c => !c.parent_id));
      setWishIds(wi.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  const toggleWish = async (productId) => {
    if (!user) return;
    if (wishIds.includes(productId)) {
      await api.delete(`/storefront/wishlist/${productId}`);
      setWishIds(wishIds.filter(id => id !== productId));
    } else {
      await api.post(`/storefront/wishlist/${productId}`);
      setWishIds([...wishIds, productId]);
    }
  };

  const getDiscount = (mrp, sp) => mrp > sp ? Math.round(((mrp - sp) / mrp) * 100) : 0;

  if (loading) return (
    <div className="sf-loader">
      <div className="sf-spinner" />
      <p>Loading amazing products...</p>
    </div>
  );

  return (
    <div className="sf-home">
      {/* Hero Banner */}
      <section className="sf-hero">
        <div className="sf-hero-bg" />
        <div className="sf-hero-content">
          <span className="sf-hero-badge">NEW SEASON</span>
          <h1>Discover Your<br /><span className="sf-hero-accent">Perfect Style</span></h1>
          <p>Explore the latest trends in fashion. Premium quality at unbeatable prices.</p>
          <div className="sf-hero-actions">
            <Link to="/shop/products" className="sf-btn sf-btn-white">Shop Now →</Link>
            <Link to="/shop/products?sort=discount" className="sf-btn sf-btn-outline-white">View Offers</Link>
          </div>
        </div>
        <div className="sf-hero-shapes">
          <div className="sf-shape sf-shape-1" />
          <div className="sf-shape sf-shape-2" />
          <div className="sf-shape sf-shape-3" />
        </div>
      </section>

      {/* Gender Category Cards */}
      <section className="sf-section">
        <div className="sf-section-container">
          <div className="sf-gender-grid">
            {[
              { label: 'Men', icon: '👔', color: '#3b82f6', bg: 'linear-gradient(135deg, #1e3a5f, #3b82f6)' },
              { label: 'Women', icon: '👗', color: '#ec4899', bg: 'linear-gradient(135deg, #831843, #ec4899)' },
              { label: 'Boys', icon: '👦', color: '#10b981', bg: 'linear-gradient(135deg, #064e3b, #10b981)' },
              { label: 'Girls', icon: '👧', color: '#f59e0b', bg: 'linear-gradient(135deg, #78350f, #f59e0b)' },
            ].map(g => (
              <Link key={g.label} to={`/shop/products?gender=${g.label}`} className="sf-gender-card" style={{ background: g.bg }}>
                <span className="sf-gender-icon">{g.icon}</span>
                <span className="sf-gender-label">{g.label}</span>
                <span className="sf-gender-arrow">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      {newArrivals.length > 0 && (
        <section className="sf-section">
          <div className="sf-section-container">
            <div className="sf-section-header">
              <div>
                <h2 className="sf-section-title">New Arrivals</h2>
                <p className="sf-section-sub">Fresh styles just dropped — be the first to wear them</p>
              </div>
              <Link to="/shop/products?sort=newest" className="sf-view-all">View All →</Link>
            </div>
            <div className="sf-product-scroll">
              {newArrivals.map(p => (
                <ProductCard key={p.id} product={p} wishlisted={wishIds.includes(p.id)} onWishToggle={() => toggleWish(p.id)} user={user} getDiscount={getDiscount} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Offers Banner */}
      <section className="sf-offer-banner">
        <div className="sf-offer-banner-inner">
          <div className="sf-offer-text">
            <span className="sf-offer-tag">LIMITED TIME</span>
            <h2>Up to 50% Off</h2>
            <p>On select styles. Don't miss out on incredible deals!</p>
            <Link to="/shop/products?sort=discount" className="sf-btn sf-btn-primary">Shop Offers</Link>
          </div>
          <div className="sf-offer-decoration">
            <span className="sf-offer-pct">50<small>%</small></span>
            <span className="sf-offer-off">OFF</span>
          </div>
        </div>
      </section>

      {/* Products on Offer */}
      {offers.length > 0 && (
        <section className="sf-section">
          <div className="sf-section-container">
            <div className="sf-section-header">
              <div>
                <h2 className="sf-section-title">Best Deals 🔥</h2>
                <p className="sf-section-sub">Handpicked offers you'll love</p>
              </div>
              <Link to="/shop/products?sort=discount" className="sf-view-all">View All →</Link>
            </div>
            <div className="sf-product-grid sf-product-grid-4">
              {offers.slice(0, 8).map(p => (
                <ProductCard key={p.id} product={p} wishlisted={wishIds.includes(p.id)} onWishToggle={() => toggleWish(p.id)} user={user} getDiscount={getDiscount} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Shop by Category */}
      {categories.length > 0 && (
        <section className="sf-section sf-section-gray">
          <div className="sf-section-container">
            <div className="sf-section-header">
              <div>
                <h2 className="sf-section-title">Shop by Category</h2>
                <p className="sf-section-sub">Find exactly what you're looking for</p>
              </div>
            </div>
            <div className="sf-cat-grid">
              {categories.map(c => (
                <Link key={c.id} to={`/shop/products?category_id=${c.id}`} className="sf-cat-card">
                  <div className="sf-cat-icon">🏷️</div>
                  <span>{c.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Trust badges */}
      <section className="sf-trust">
        <div className="sf-section-container">
          <div className="sf-trust-grid">
            <div className="sf-trust-item"><span className="sf-trust-icon">🚚</span><strong>Free Delivery</strong><span>On orders above ₹999</span></div>
            <div className="sf-trust-item"><span className="sf-trust-icon">↩️</span><strong>Easy Returns</strong><span>7-day return policy</span></div>
            <div className="sf-trust-item"><span className="sf-trust-icon">✅</span><strong>Genuine Products</strong><span>100% authentic items</span></div>
            <div className="sf-trust-item"><span className="sf-trust-icon">🔒</span><strong>Secure Payments</strong><span>Safe & encrypted</span></div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProductCard({ product: p, wishlisted, onWishToggle, user, getDiscount }) {
  const disc = getDiscount(p.mrp, p.selling_price);
  const imgSrc = getImageUrl(p.image);

  return (
    <div className="sf-pcard">
      <Link to={`/shop/products/${p.id}`} className="sf-pcard-img-wrap">
        {imgSrc
          ? <img src={imgSrc} alt={p.name} className="sf-pcard-img" loading="lazy" />
          : <div className="sf-pcard-img sf-pcard-placeholder">👗</div>
        }
        {disc > 0 && <span className="sf-pcard-disc-badge">{disc}% OFF</span>}
      </Link>
      <button className={`sf-pcard-wish${wishlisted ? ' sf-pcard-wished' : ''}`} onClick={onWishToggle} title={user ? 'Add to Wishlist' : 'Login to Wishlist'}>
        {wishlisted ? '❤️' : '🤍'}
      </button>
      <Link to={`/shop/products/${p.id}`} className="sf-pcard-body">
        <span className="sf-pcard-brand">{p.brand || 'Kumar Dresses'}</span>
        <span className="sf-pcard-name">{p.name}</span>
        <div className="sf-pcard-price">
          <span className="sf-pcard-sp">₹{p.selling_price?.toLocaleString()}</span>
          {disc > 0 && <>
            <span className="sf-pcard-mrp">₹{p.mrp?.toLocaleString()}</span>
            <span className="sf-pcard-disc">({disc}% off)</span>
          </>}
        </div>
      </Link>
    </div>
  );
}

export { ProductCard };
