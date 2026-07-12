import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FiPackage, FiShoppingCart, FiAlertTriangle, FiDollarSign, FiTrendingUp, FiLayers } from 'react-icons/fi';
import api from '../utils/api';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard'),
      api.get('/dashboard/sales-chart')
    ]).then(([d, c]) => {
      setData(d.data);
      setChartData(c.data.map(m => ({ ...m, name: MONTHS[parseInt(m.month) - 1] })));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center mt-2">Loading dashboard...</div>;
  if (!data) return <div className="text-center mt-2">Failed to load dashboard</div>;

  const { totalProducts, totalVariants, stockSummary, todaySales, monthSales, overdueCount, recentBills, topProducts, dailyRevenue } = data;

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><FiPackage /></div>
          <div className="stat-value">{totalProducts}</div>
          <div className="stat-label">Total Products</div>
          <div className="stat-change text-muted">{totalVariants} variants</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><FiLayers /></div>
          <div className="stat-value">{stockSummary.total_stock.toLocaleString()}</div>
          <div className="stat-label">Total Stock Units</div>
          <div className="stat-change text-muted">{stockSummary.total_reserved} reserved</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><FiShoppingCart /></div>
          <div className="stat-value">₹{todaySales.revenue.toLocaleString()}</div>
          <div className="stat-label">Today's Sales</div>
          <div className="stat-change text-muted">{todaySales.bill_count} bills</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon indigo"><FiTrendingUp /></div>
          <div className="stat-value">₹{monthSales.revenue.toLocaleString()}</div>
          <div className="stat-label">This Month</div>
          <div className="stat-change text-muted">{monthSales.bill_count} bills</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow"><FiAlertTriangle /></div>
          <div className="stat-value">{stockSummary.low_stock_count}</div>
          <div className="stat-label">Low Stock Alerts</div>
          <Link to="/stock/alerts" className="stat-change" style={{ color: 'var(--primary)' }}>View all →</Link>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><FiDollarSign /></div>
          <div className="stat-value">{overdueCount.c}</div>
          <div className="stat-label">Overdue Payments</div>
          <div className="stat-change text-danger">₹{overdueCount.total_due.toLocaleString()} pending</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card">
          <div className="card-header"><span className="card-title">Revenue (Last 30 Days)</span></div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => '₹' + (v/1000).toFixed(0) + 'k'} />
              <Tooltip formatter={v => '₹' + v.toLocaleString()} />
              <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Monthly Revenue ({new Date().getFullYear()})</span></div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => '₹' + (v/1000).toFixed(0) + 'k'} />
              <Tooltip formatter={v => '₹' + Number(v).toLocaleString()} />
              <Bar dataKey="revenue" fill="#4f46e5" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Top Selling Products</span>
            <span className="text-muted" style={{ fontSize: '0.75rem' }}>This month</span>
          </div>
          {topProducts.length === 0 ? <p className="text-muted">No sales this month</p> : (
            <table>
              <thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Revenue</th></tr></thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={i}>
                    <td>{p.product_name}</td>
                    <td><code style={{ fontSize: '0.75rem' }}>{p.sku}</code></td>
                    <td>{p.total_qty}</td>
                    <td>₹{p.total_revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Bills</span>
            <Link to="/bills" className="btn btn-sm btn-outline">View All</Link>
          </div>
          {recentBills.length === 0 ? <p className="text-muted">No bills yet</p> : (
            <table>
              <thead><tr><th>Bill #</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {recentBills.map(b => (
                  <tr key={b.id}>
                    <td><Link to={`/bills/${b.id}`} style={{ color: 'var(--primary)' }}>{b.bill_number}</Link></td>
                    <td>{b.customer_name || '—'}</td>
                    <td>₹{b.total_amount.toLocaleString()}</td>
                    <td><span className={`badge ${b.payment_status === 'full' ? 'badge-success' : 'badge-warning'}`}>{b.payment_status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
