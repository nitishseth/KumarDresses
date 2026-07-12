import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });
  const [shopConfig, setShopConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && user) {
      api.get('/shop').then(r => setShopConfig(r.data)).catch(() => {});
    }
    setLoading(false);
  }, [user]);

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setShopConfig(null);
  };

  const refreshShop = async () => {
    try { const { data } = await api.get('/shop'); setShopConfig(data); } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, shopConfig, login, logout, refreshShop, loading, isAdmin: user?.role === 'admin', isStaff: user?.role === 'staff' || user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
