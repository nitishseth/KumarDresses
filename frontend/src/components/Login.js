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
    <div className="login-wrapper">
      <div className="login-bg-circle login-bg-1" />
      <div className="login-bg-circle login-bg-2" />
      <div className="login-bg-circle login-bg-3" />

      <div className="login-container">
        {/* Left panel — branding */}
        <div className="login-brand">
          <img src="/logo.svg" alt="Kumar Dresses" className="login-brand-logo" />
          <h1 className="login-brand-title">Kumar Dresses</h1>
          <p className="login-brand-sub">Inventory Management System</p>
          <div className="login-features">
            <div className="login-feature">
              <div className="login-feature-icon">📦</div>
              <div><div className="login-feature-title">Multi-Store Inventory</div><div className="login-feature-desc">Track stock across all locations</div></div>
            </div>
            <div className="login-feature">
              <div className="login-feature-icon">🧾</div>
              <div><div className="login-feature-title">Smart Billing</div><div className="login-feature-desc">Barcode-enabled POS system</div></div>
            </div>
            <div className="login-feature">
              <div className="login-feature-icon">📊</div>
              <div><div className="login-feature-title">Analytics & Predictions</div><div className="login-feature-desc">Data-driven insights</div></div>
            </div>
          </div>
        </div>

        {/* Right panel — login form */}
        <div className="login-form-panel">
          <h2 className="login-form-title">Welcome Back</h2>
          <p className="login-form-sub">Sign in to manage your inventory</p>

          {error && (
            <div className="login-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <label>Username</label>
              <div className="login-input-wrap">
                <FiUser className="login-input-icon" />
                <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter your username" required />
              </div>
            </div>

            <div className="login-field">
              <label>Password</label>
              <div className="login-input-wrap">
                <FiLock className="login-input-icon" />
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required />
                <button type="button" onClick={() => setShowPw(!showPw)} className="login-pw-toggle">
                  {showPw ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="login-submit">
              {loading ? (
                <><span className="login-spinner" /> Signing in...</>
              ) : (
                <><FiLogIn /> Sign In</>
              )}
            </button>
          </form>

          <div className="login-footer">
            <p>Contact your administrator for login credentials</p>
            <Link to="/shop">🛍️ Browse Store as Guest →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
