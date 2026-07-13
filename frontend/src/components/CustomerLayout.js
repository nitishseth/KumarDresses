import React, { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { getImageUrl } from '../utils/api';

export default function CustomerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [shopConfig, setShopConfig] = useState({ shop_name: 'Kumar Dresses', tagline: '' });
  const [search, setSearch] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);

  useEffect(() => {
    api.get('/storefront/config').then(r => setShopConfig(r.data)).catch(() => {});
    if (user) api.get('/storefront/wishlist/ids').then(r => setWishlistCount(r.data.length)).catch(() => {});
  }, [user]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => { setMobileMenu(false); }, [location]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/shop/products?search=${encodeURIComponent(search.trim())}`);
  };

  return (
    <div className="sf">
      {/* Top announcement bar */}
      <div className="sf-announce">
        <span>✨ Free shipping on orders above ₹999 | Use code <strong>WELCOME10</strong> for 10% off</span>
      </div>

      {/* Main Header */}
      <header className={`sf-header${scrolled ? ' sf-header-scrolled' : ''}`}>
        <div className="sf-header-inner">
          <div className="sf-header-left">
            <button className="sf-hamburger" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Menu">
              <span /><span /><span />
            </button>
            <Link to="/shop" className="sf-logo">
              {shopConfig.logo
                ? <img src={getImageUrl(shopConfig.logo)} alt={shopConfig.shop_name} />
                : <><span className="sf-logo-icon">👗</span><span className="sf-logo-text">{shopConfig.shop_name}</span></>
              }
            </Link>
            <nav className="sf-nav-desktop">
              <Link to="/shop/products?gender=Men" className="sf-nav-link">Men</Link>
              <Link to="/shop/products?gender=Women" className="sf-nav-link">Women</Link>
              <Link to="/shop/products?gender=Boys" className="sf-nav-link">Boys</Link>
              <Link to="/shop/products?gender=Girls" className="sf-nav-link">Girls</Link>
              <Link to="/shop/products?sort=discount" className="sf-nav-link sf-nav-sale">SALE</Link>
            </nav>
          </div>

          <form className="sf-search" onSubmit={handleSearch}>
            <span className="sf-search-icon">🔍</span>
            <input
              type="text" placeholder="Search for products, brands and more..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </form>

          <div className="sf-header-right">
            {user ? (
              <div className="sf-user-menu">
                <span className="sf-user-icon">👤</span>
                <div className="sf-user-dropdown">
                  <div className="sf-user-dropdown-header">Hello, {user.name}!</div>
                  <Link to="/shop/wishlist" className="sf-user-dropdown-item">❤️ My Wishlist</Link>
                  {(user.role === 'admin' || user.role === 'staff') &&
                    <Link to="/" className="sf-user-dropdown-item">⚙️ Admin Panel</Link>
                  }
                  <button onClick={logout} className="sf-user-dropdown-item sf-user-dropdown-btn">🚪 Logout</button>
                </div>
              </div>
            ) : (
              <Link to="/login" className="sf-action-btn">
                <span>👤</span><span className="sf-action-label">Login</span>
              </Link>
            )}
            <Link to="/shop/wishlist" className="sf-action-btn">
              <span>❤️</span>
              <span className="sf-action-label">Wishlist</span>
              {wishlistCount > 0 && <span className="sf-badge-count">{wishlistCount}</span>}
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileMenu && (
        <div className="sf-mobile-overlay" onClick={() => setMobileMenu(false)}>
          <nav className="sf-mobile-nav" onClick={e => e.stopPropagation()}>
            <div className="sf-mobile-nav-header">
              <span className="sf-logo-text">{shopConfig.shop_name}</span>
              <button onClick={() => setMobileMenu(false)} className="sf-mobile-close">✕</button>
            </div>
            <Link to="/shop" className="sf-mobile-link">🏠 Home</Link>
            <Link to="/shop/products?gender=Men" className="sf-mobile-link">👔 Men</Link>
            <Link to="/shop/products?gender=Women" className="sf-mobile-link">👗 Women</Link>
            <Link to="/shop/products?gender=Boys" className="sf-mobile-link">👦 Boys</Link>
            <Link to="/shop/products?gender=Girls" className="sf-mobile-link">👧 Girls</Link>
            <Link to="/shop/products?sort=discount" className="sf-mobile-link sf-nav-sale">🏷️ SALE</Link>
            <Link to="/shop/wishlist" className="sf-mobile-link">❤️ Wishlist</Link>
            {!user && <Link to="/login" className="sf-mobile-link">👤 Login</Link>}
            {user && <button onClick={logout} className="sf-mobile-link sf-mobile-btn">🚪 Logout</button>}
          </nav>
        </div>
      )}

      {/* Page content */}
      <main className="sf-main">
        <Outlet context={{ user, wishlistCount, setWishlistCount }} />
      </main>

      {/* Footer */}
      <footer className="sf-footer">
        <div className="sf-footer-inner">
          <div className="sf-footer-col">
            <h4>{shopConfig.shop_name}</h4>
            <p className="sf-footer-tagline">{shopConfig.tagline || 'Premium fashion for everyone'}</p>
          </div>
          <div className="sf-footer-col">
            <h4>Shop</h4>
            <Link to="/shop/products?gender=Men">Men</Link>
            <Link to="/shop/products?gender=Women">Women</Link>
            <Link to="/shop/products?gender=Boys">Boys</Link>
            <Link to="/shop/products?gender=Girls">Girls</Link>
          </div>
          <div className="sf-footer-col">
            <h4>Quick Links</h4>
            <Link to="/shop/products">All Products</Link>
            <Link to="/shop/products?sort=discount">Offers</Link>
            <Link to="/shop/wishlist">Wishlist</Link>
          </div>
          <div className="sf-footer-col">
            <h4>Connect</h4>
            <p>📞 Customer Support</p>
            <p>📧 Email Us</p>
          </div>
        </div>
        <div className="sf-footer-bottom">
          <p>© {new Date().getFullYear()} {shopConfig.shop_name}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
