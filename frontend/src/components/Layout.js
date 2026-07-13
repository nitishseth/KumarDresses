import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiHome, FiPackage, FiShoppingCart, FiUsers, FiSettings, FiBarChart2, FiGrid, FiLayers, FiAlertTriangle, FiTruck, FiLock, FiArchive, FiFileText, FiTrendingUp, FiDollarSign, FiLogOut, FiMenu, FiX, FiInfo } from 'react-icons/fi';
import api, { getImageUrl } from '../utils/api';

export default function Layout({ children }) {
  const { user, shopConfig, logout, isAdmin, isStaff } = useAuth();
  const location = useLocation();
  const [alertCount, setAlertCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    api.get('/stock/alerts').then(r => setAlertCount(r.data.length)).catch(() => {});
    api.get('/billing/partial/overdue').then(r => setOverdueCount(r.data.length)).catch(() => {});
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const navItems = [
    { section: 'Main', items: [
      { to: '/dashboard', icon: <FiHome />, label: 'Dashboard' },
    ]},
    { section: 'Products', items: [
      { to: '/products', icon: <FiPackage />, label: 'All Products' },
      ...(isAdmin ? [
        { to: '/categories', icon: <FiGrid />, label: 'Categories' },
        { to: '/size-charts', icon: <FiLayers />, label: 'Size Charts' },
      ] : []),
    ]},
    { section: 'Inventory', items: [
      { to: '/stock', icon: <FiArchive />, label: 'Stock Overview' },
      { to: '/stock/alerts', icon: <FiAlertTriangle />, label: 'Stock Alerts', badge: alertCount || null },
      { to: '/stock/transfers', icon: <FiTruck />, label: 'Transfers' },
      { to: '/stock/reservations', icon: <FiLock />, label: 'Reservations' },
      { to: '/stock/batches', icon: <FiArchive />, label: 'Batch/Lots' },
    ]},
    { section: 'Sales', items: [
      ...(isStaff ? [{ to: '/billing', icon: <FiShoppingCart />, label: 'New Bill' }] : []),
      { to: '/bills', icon: <FiFileText />, label: 'Bill History' },
      { to: '/partial-payments', icon: <FiDollarSign />, label: 'Partial Payments', badge: overdueCount || null },
    ]},
    { section: 'Reports', items: [
      { to: '/reports/dead-stock', icon: <FiBarChart2 />, label: 'Dead Stock' },
      { to: '/reports/stock-aging', icon: <FiTrendingUp />, label: 'Stock Aging' },
      { to: '/reports/predictions', icon: <FiTrendingUp />, label: 'Predictions' },
      { to: '/profit', icon: <FiDollarSign />, label: 'Profit Analysis', badge: '🔒' },
    ]},
    ...(isAdmin ? [{ section: 'Settings', items: [
      { to: '/stores', icon: <FiGrid />, label: 'Stores' },
      { to: '/staff', icon: <FiUsers />, label: 'Staff' },
      { to: '/shop-config', icon: <FiSettings />, label: 'Shop Config' },
    ]}] : []),
    { section: '', items: [
      { to: '/shop', icon: <FiShoppingCart />, label: 'Visit Store', external: true },
      { to: '/about', icon: <FiInfo />, label: 'About' },
    ]},
  ];

  return (
    <div className="app-layout">
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img
            src={shopConfig?.logo ? getImageUrl(shopConfig.logo) : '/logo.svg'}
            alt="Shop Logo"
            style={{ width: 52, height: 52, borderRadius: 14, objectFit: 'cover', marginBottom: 10, background: 'rgba(255,255,255,0.1)' }}
          />
          <h2>{shopConfig?.shop_name || 'Kumar Dresses'}</h2>
          <p>{shopConfig?.tagline || 'Inventory Management'}</p>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(section => (
            <div className="nav-section" key={section.section}>
              <div className="nav-section-title">{section.section}</div>
              {section.items.map(item => (
                <Link key={item.to} to={item.to} className={`nav-item ${isActive(item.to) ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
                  <span className="icon">{item.icon}</span>
                  {item.label}
                  {item.badge && <span className="badge">{item.badge}</span>}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <div>
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          </div>
          <button className="btn btn-outline" style={{ width: '100%', marginTop: 10, color: '#c7d2fe', borderColor: 'rgba(255,255,255,0.2)' }} onClick={logout}>
            <FiLogOut /> Logout
          </button>
        </div>
      </aside>
      <main className="main-content">
        <div className="topbar no-print">
          <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <FiX /> : <FiMenu />}
          </button>
          <div></div>
          <div className="flex gap-1">
            {alertCount > 0 && (
              <Link to="/stock/alerts" className="btn btn-sm btn-warning">
                <FiAlertTriangle /> {alertCount} Low Stock
              </Link>
            )}
            {overdueCount > 0 && (
              <Link to="/partial-payments" className="btn btn-sm btn-danger">
                <FiDollarSign /> {overdueCount} Overdue
              </Link>
            )}
          </div>
        </div>
        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
}
