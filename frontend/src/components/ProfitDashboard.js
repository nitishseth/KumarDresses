import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { FiDollarSign, FiTrendingUp, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import api from '../utils/api';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PROFIT_PASSWORD = 'Kumar@profit2024';

export default function ProfitDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === PROFIT_PASSWORD) {
      setAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password. Access denied.');
    }
  };

  useEffect(() => {
    if (!authenticated) return;
    setLoading(true);
    api.get('/dashboard/profit', { params: { year } })
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authenticated, year]);

  if (!authenticated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="card" style={{ maxWidth: 420, width: '100%', textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}><FiLock style={{ color: '#4f46e5' }} /></div>
          <h2 style={{ marginBottom: 8 }}>Profit Dashboard</h2>
          <p className="text-muted" style={{ marginBottom: 24 }}>This section is password protected. Enter the profit dashboard password to view financial data.</p>
          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ position: 'relative' }}>
              <input
                className="form-control"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                autoFocus
                style={{ paddingRight: 40 }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#666' }}>
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}
            <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>Unlock Dashboard</button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) return <div className="text-center mt-2">Loading profit data...</div>;
  if (!data) return <div className="text-center mt-2">Failed to load profit data</div>;

  const { overall, monthly, today, thisMonth, topProducts, dailyProfit, categoryProfit } = data;
  const profitMargin = overall.total_revenue > 0 ? ((overall.total_profit / overall.total_revenue) * 100).toFixed(1) : 0;

  const monthlyChartData = monthly.map(m => ({
    name: MONTHS[parseInt(m.month) - 1],
    revenue: Number(m.revenue),
    cost: Number(m.cost),
    profit: Number(m.profit)
  }));

  const dailyChartData = dailyProfit.map(d => ({
    date: d.date,
    revenue: Number(d.revenue),
    cost: Number(d.cost),
    profit: Number(d.profit)
  }));

  const categoryChartData = categoryProfit.map(c => ({
    name: c.category_name || 'Uncategorized',
    value: Number(c.profit)
  })).filter(c => c.value > 0);

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <h1><FiDollarSign style={{ marginRight: 8 }} />Profit Dashboard</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="form-control" value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 120 }}>
            {[...Array(5)].map((_, i) => {
              const y = new Date().getFullYear() - i;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
          <button className="btn btn-outline" onClick={() => setAuthenticated(false)} title="Lock"><FiLock /> Lock</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon green"><FiDollarSign /></div>
          <div className="stat-value">₹{Number(today.profit || 0).toLocaleString()}</div>
          <div className="stat-label">Today's Profit</div>
          <div className="stat-change text-muted">Revenue: ₹{Number(today.revenue || 0).toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><FiTrendingUp /></div>
          <div className="stat-value">₹{Number(thisMonth.profit || 0).toLocaleString()}</div>
          <div className="stat-label">This Month Profit</div>
          <div className="stat-change text-muted">Revenue: ₹{Number(thisMonth.revenue || 0).toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><FiDollarSign /></div>
          <div className="stat-value">₹{Number(overall.total_profit || 0).toLocaleString()}</div>
          <div className="stat-label">Year Profit ({year})</div>
          <div className="stat-change text-muted">{overall.total_bills} bills</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon indigo"><FiTrendingUp /></div>
          <div className="stat-value">{profitMargin}%</div>
          <div className="stat-label">Profit Margin</div>
          <div className="stat-change text-muted">Cost: ₹{Number(overall.total_cost || 0).toLocaleString()}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="card">
          <div className="card-header"><span className="card-title">Daily Profit (Last 30 Days)</span></div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={dailyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => '₹' + (v/1000).toFixed(0) + 'k'} />
              <Tooltip formatter={v => '₹' + Number(v).toLocaleString()} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} dot={false} name="Revenue" />
              <Line type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={2} dot={false} name="Cost" />
              <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} dot={false} name="Profit" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Monthly Profit ({year})</span></div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => '₹' + (v/1000).toFixed(0) + 'k'} />
              <Tooltip formatter={v => '₹' + Number(v).toLocaleString()} />
              <Legend />
              <Bar dataKey="revenue" fill="#4f46e5" radius={[4,4,0,0]} name="Revenue" />
              <Bar dataKey="cost" fill="#ef4444" radius={[4,4,0,0]} name="Cost" />
              <Bar dataKey="profit" fill="#10b981" radius={[4,4,0,0]} name="Profit" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-2">
        {/* Category Profit Pie Chart */}
        <div className="card">
          <div className="card-header"><span className="card-title">Profit by Category</span></div>
          {categoryChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={categoryChartData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                  {categoryChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => '₹' + Number(v).toLocaleString()} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-muted text-center" style={{ padding: 40 }}>No category profit data</p>}
        </div>

        {/* Top Profit Products */}
        <div className="card">
          <div className="card-header"><span className="card-title">Top Profit Products ({year})</span></div>
          {topProducts.length > 0 ? (
            <div className="table-container">
              <table>
                <thead><tr><th>Product</th><th>Qty</th><th>Revenue</th><th>Cost</th><th>Profit</th></tr></thead>
                <tbody>
                  {topProducts.map((p, i) => (
                    <tr key={i}>
                      <td><strong>{p.product_name}</strong><br /><small className="text-muted">{p.sku}</small></td>
                      <td>{p.qty_sold}</td>
                      <td>₹{Number(p.revenue).toLocaleString()}</td>
                      <td>₹{Number(p.cost).toLocaleString()}</td>
                      <td><span className="badge badge-success">₹{Number(p.profit).toLocaleString()}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-muted text-center" style={{ padding: 40 }}>No sales data</p>}
        </div>
      </div>

      {/* Revenue vs Cost vs Profit Summary Table */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header"><span className="card-title">Monthly Summary ({year})</span></div>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Month</th><th>Revenue</th><th>Cost</th><th>Profit</th><th>Margin %</th><th>Bills</th></tr>
            </thead>
            <tbody>
              {monthlyChartData.map((m, i) => {
                const margin = m.revenue > 0 ? ((m.profit / m.revenue) * 100).toFixed(1) : 0;
                return (
                  <tr key={i}>
                    <td><strong>{m.name}</strong></td>
                    <td>₹{m.revenue.toLocaleString()}</td>
                    <td>₹{m.cost.toLocaleString()}</td>
                    <td className={m.profit >= 0 ? 'text-success' : 'text-danger'}><strong>₹{m.profit.toLocaleString()}</strong></td>
                    <td><span className={`badge ${margin >= 20 ? 'badge-success' : margin >= 10 ? 'badge-warning' : 'badge-danger'}`}>{margin}%</span></td>
                    <td>{monthly[i]?.bills || 0}</td>
                  </tr>
                );
              })}
              {monthlyChartData.length === 0 && <tr><td colSpan={6} className="text-center text-muted" style={{ padding: 40 }}>No data for {year}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
