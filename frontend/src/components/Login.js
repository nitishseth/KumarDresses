import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import { FiUser, FiLock, FiLogIn, FiEye, FiEyeOff } from 'react-icons/fi';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Welcome back!');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Decorative circles */}
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'rgba(79,70,229,0.15)', top: -100, right: -100 }} />
      <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'rgba(79,70,229,0.1)', bottom: -80, left: -80 }} />
      <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(139,92,246,0.08)', top: '40%', left: '15%' }} />

      <div style={{
        display: 'flex', borderRadius: 24, overflow: 'hidden',
        boxShadow: '0 25px 80px rgba(0,0,0,0.5)', maxWidth: 900, width: '90%', position: 'relative', zIndex: 1
      }}>
        {/* Left panel — branding */}
        <div style={{
          flex: 1, background: 'linear-gradient(160deg, #4f46e5 0%, #7c3aed 100%)',
          padding: '60px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
          color: '#fff', minWidth: 340
        }}>
          <img src="/logo.svg" alt="Kumar Dresses" style={{ width: 72, height: 72, marginBottom: 16, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))' }} />
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 8, lineHeight: 1.2 }}>Kumar Dresses</h1>
          <p style={{ fontSize: '1.05rem', opacity: 0.9, marginBottom: 32, lineHeight: 1.6 }}>
            Inventory Management System
          </p>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.25)', paddingTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📦</div>
              <div><div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Multi-Store Inventory</div><div style={{ fontSize: '0.75rem', opacity: 0.75 }}>Track stock across all locations</div></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🧾</div>
              <div><div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Smart Billing</div><div style={{ fontSize: '0.75rem', opacity: 0.75 }}>Barcode-enabled POS system</div></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📊</div>
              <div><div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Analytics & Predictions</div><div style={{ fontSize: '0.75rem', opacity: 0.75 }}>Data-driven insights</div></div>
            </div>
          </div>
        </div>

        {/* Right panel — login form */}
        <div style={{
          flex: 1, background: '#fff', padding: '60px 48px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 340
        }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1a1a2e', marginBottom: 6 }}>Welcome Back</h2>
          <p style={{ color: '#6b7280', marginBottom: 32, fontSize: '0.92rem' }}>Sign in to manage your inventory</p>

          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b',
              padding: '10px 14px', borderRadius: 10, marginBottom: 20, fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>Username</label>
              <div style={{ position: 'relative' }}>
                <FiUser style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 18 }} />
                <input
                  value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="Enter your username" required
                  style={{
                    width: '100%', padding: '12px 14px 12px 42px', border: '2px solid #e5e7eb',
                    borderRadius: 12, fontSize: '0.95rem', transition: 'border-color 0.2s',
                    outline: 'none', background: '#f9fafb', boxSizing: 'border-box'
                  }}
                  onFocus={e => e.target.style.borderColor = '#4f46e5'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <FiLock style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 18 }} />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password" required
                  style={{
                    width: '100%', padding: '12px 44px 12px 42px', border: '2px solid #e5e7eb',
                    borderRadius: 12, fontSize: '0.95rem', transition: 'border-color 0.2s',
                    outline: 'none', background: '#f9fafb', boxSizing: 'border-box'
                  }}
                  onFocus={e => e.target.style.borderColor = '#4f46e5'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 18, padding: 0 }}>
                  {showPw ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              style={{
                width: '100%', padding: '14px 24px', background: loading ? '#818cf8' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                color: '#fff', border: 'none', borderRadius: 12, fontSize: '1rem', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 8, transition: 'transform 0.15s, box-shadow 0.15s',
                boxShadow: '0 4px 14px rgba(79,70,229,0.4)'
              }}
              onMouseEnter={e => { if (!loading) { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 6px 20px rgba(79,70,229,0.5)'; } }}
              onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 14px rgba(79,70,229,0.4)'; }}
            >
              {loading ? (
                <><span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} /> Signing in...</>
              ) : (
                <><FiLogIn /> Sign In</>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 28, fontSize: '0.8rem', color: '#9ca3af' }}>
            <p>Contact your administrator for login credentials</p>
            <Link to="/shop" style={{ display: 'inline-block', marginTop: 12, color: '#4f46e5', fontWeight: 600, fontSize: '0.9rem' }}>
              🛍️ Browse Store as Guest →
            </Link>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
