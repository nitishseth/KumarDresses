import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const API_HOST = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';

export default function ProductList() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ category_id: '', brand: '', season: '' });
  const [categories, setCategories] = useState([]);

  const load = () => {
    const params = { page, limit: 30, search, ...filters };
    Object.keys(params).forEach(k => !params[k] && delete params[k]);
    api.get('/products', { params }).then(r => { setProducts(r.data.products); setTotal(r.data.total); });
  };

  useEffect(() => { api.get('/categories').then(r => setCategories(r.data.categories)); }, []);
  useEffect(() => { load(); }, [page, search, filters]);

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <h1>Products ({total})</h1>
        {isAdmin && <Link to="/products/new" className="btn btn-primary">+ Add Product</Link>}
      </div>

      <div className="filter-bar">
        <div className="form-group" style={{ flex: 2 }}>
          <input className="form-control" placeholder="Search by name, SKU, barcode..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="form-group">
          <select className="form-control" value={filters.category_id} onChange={e => { setFilters({ ...filters, category_id: e.target.value }); setPage(1); }}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{'  '.repeat(c.level)}{c.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <select className="form-control" value={filters.season} onChange={e => { setFilters({ ...filters, season: e.target.value }); setPage(1); }}>
            <option value="">All Seasons</option>
            <option>Summer</option><option>Winter</option><option>Monsoon</option><option>All-Season</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr><th></th><th>Product</th><th>SKU</th><th>Category</th><th>Brand</th><th>MRP</th><th>Selling</th><th>Variants</th><th>Stock</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td>{p.image ? <img src={API_HOST + p.image} alt="" className="product-image" /> : <div className="product-image" />}</td>
                  <td><Link to={`/products/${p.id}`} style={{ color: 'var(--primary)', fontWeight: 500 }}>{p.name}</Link></td>
                  <td><code style={{ fontSize: '0.75rem' }}>{p.sku}</code></td>
                  <td>{p.category_name || '—'}</td>
                  <td>{p.brand || '—'}</td>
                  <td>₹{p.mrp}</td>
                  <td>₹{p.selling_price}</td>
                  <td><span className="badge badge-info">{p.variant_count}</span></td>
                  <td>
                    <span className={`badge ${p.total_stock === 0 ? 'badge-danger' : p.total_stock < 10 ? 'badge-warning' : 'badge-success'}`}>
                      {p.total_stock}
                    </span>
                  </td>
                  <td>
                    <Link to={`/products/${p.id}`} className="btn btn-sm btn-outline" style={{ marginRight: 4 }}>View</Link>
                    {isAdmin && <Link to={`/products/edit/${p.id}`} className="btn btn-sm btn-outline">Edit</Link>}
                  </td>
                </tr>
              ))}
              {!products.length && <tr><td colSpan={10} className="text-center text-muted" style={{ padding: 40 }}>No products found</td></tr>}
            </tbody>
          </table>
        </div>
        {total > 30 && (
          <div className="flex-between mt-2">
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>Showing {(page-1)*30+1}–{Math.min(page*30, total)} of {total}</span>
            <div className="flex gap-1">
              <button className="btn btn-sm btn-outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <button className="btn btn-sm btn-outline" disabled={page * 30 >= total} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
