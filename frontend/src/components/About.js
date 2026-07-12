import React from 'react';
import { FiCode, FiHeart, FiShield, FiPackage, FiTrendingUp, FiSmartphone, FiUser, FiMail, FiGlobe } from 'react-icons/fi';

const APP_VERSION = '1.0.0';
const BUILD_YEAR = 2026;

export default function About() {
  const features = [
    { icon: <FiPackage />, title: 'Product & Variant Management', desc: 'Multi-level categories, SKU/barcode generation, size-color-fit tracking' },
    { icon: <FiTrendingUp />, title: 'Multi-Store Inventory', desc: 'Real-time stock across stores, transfers, reservations, batch tracking' },
    { icon: <FiSmartphone />, title: 'Smart Billing & POS', desc: 'Barcode-enabled billing, partial payments, overdue alerts' },
    { icon: <FiShield />, title: 'Role-Based Access', desc: 'Admin, Staff & Viewer roles with granular permissions' },
    { icon: <FiTrendingUp />, title: 'Reports & Predictions', desc: 'Dead stock, aging reports, sales predictions based on history' },
    { icon: <FiCode />, title: 'Modern Tech Stack', desc: 'React, Node.js, Express, SQLite — fast, reliable, offline-capable' },
  ];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* App Header */}
      <div className="card" style={{ textAlign: 'center', padding: '40px 32px', background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: '#fff', border: 'none' }}>
        <img src="/logo.svg" alt="Logo" style={{ width: 72, height: 72, borderRadius: 16, marginBottom: 16, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }} />
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 6 }}>Kumar Dresses</h1>
        <p style={{ fontSize: '1rem', opacity: 0.9, marginBottom: 4 }}>Inventory Management System</p>
        <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 14px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600 }}>
          v{APP_VERSION}
        </span>
      </div>

      {/* About */}
      <div className="card" style={{ marginTop: 16 }}>
        <p style={{ fontSize: '0.95rem', lineHeight: 1.7, color: '#4b5563' }}>
          A complete inventory management solution designed specifically for readymade garment shops.
          Manage products, track stock across multiple stores, generate bills with barcodes, 
          monitor payments, and gain insights through smart analytics — all in one platform.
        </p>
      </div>

      {/* Features */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header"><span className="card-title">Key Features</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {features.map((f, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, padding: 14, borderRadius: 12,
              background: '#f9fafb', border: '1px solid #f3f4f6'
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: 'var(--primary-light)', color: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
              }}>
                {f.icon}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: 2 }}>{f.title}</div>
                <div style={{ fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.4 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Developer */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header"><span className="card-title">Developer</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '1.5rem', fontWeight: 700, flexShrink: 0
          }}>
            NK
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 4 }}>Nitish Kumar</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', fontSize: '0.88rem', marginBottom: 6 }}>
              <FiCode style={{ fontSize: 14 }} /> Software Engineer
            </div>
            <a href="https://in.linkedin.com/in/nitish-kumar-b8a206104" target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px',
                background: '#0a66c2', color: '#fff', borderRadius: 8, fontSize: '0.8rem',
                fontWeight: 600, textDecoration: 'none', marginBottom: 10, transition: 'opacity 0.2s'
              }}
              onMouseEnter={e => e.target.style.opacity = '0.85'}
              onMouseLeave={e => e.target.style.opacity = '1'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              LinkedIn
            </a>
            <p style={{ fontSize: '0.82rem', color: '#9ca3af', lineHeight: 1.5 }}>
              Designed and developed this inventory management system to simplify 
              day-to-day operations for readymade garment shops.
            </p>
          </div>
        </div>
      </div>

      {/* Tech & Copyright */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header"><span className="card-title">Technical Details</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Frontend', value: 'React 18, React Router, Recharts' },
            { label: 'Backend', value: 'Node.js, Express.js' },
            { label: 'Database', value: 'SQLite (better-sqlite3)' },
            { label: 'Authentication', value: 'JWT (JSON Web Tokens)' },
            { label: 'Barcode', value: 'react-barcode (Code128)' },
            { label: 'Version', value: `v${APP_VERSION}` },
          ].map((item, i) => (
            <div key={i} style={{ padding: '10px 14px', background: '#f9fafb', borderRadius: 8 }}>
              <div style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Copyright Footer */}
      <div style={{
        textAlign: 'center', padding: '24px 0 40px', color: '#9ca3af', fontSize: '0.82rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 6 }}>
          Built with <FiHeart style={{ color: '#ef4444', fontSize: 14 }} /> by <strong style={{ color: '#4b5563' }}>Nitish Kumar</strong>
        </div>
        <p>© {BUILD_YEAR} Kumar Dresses. All rights reserved.</p>
        <p style={{ fontSize: '0.75rem', marginTop: 4 }}>Unauthorized reproduction or distribution of this software is prohibited.</p>
      </div>
    </div>
  );
}
