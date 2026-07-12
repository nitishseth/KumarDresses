import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useOutletContext, Link } from 'react-router-dom';
import { ProductCard } from './CustomerHome';
import api from '../utils/api';

export default function CustomerProducts() {
  const { user } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({ brands: [], genders: [], sizes: [], colors: [], priceRange: {} });
  const [categories, setCategories] = useState([]);
  const [wishIds, setWishIds] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [openSections, setOpenSections] = useState({ gender: true, category: true, size: true, color: false, brand: false, price: false });

  const page = Number(searchParams.get('page') || 1);
  const currentFilters = {
    search: searchParams.get('search') || '',
    gender: searchParams.get('gender') || '',
    category_id: searchParams.get('category_id') || '',
    size: searchParams.get('size') || '',
    color: searchParams.get('color') || '',
    brand: searchParams.get('brand') || '',
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || '',
    sort: searchParams.get('sort') || '',
  };

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 24 };
      Object.entries(currentFilters).forEach(([k, v]) => { if (v) params[k] = v; });
      const { data } = await api.get('/storefront/products', { params });
      setProducts(data.products);
      setTotal(data.total);
      setPages(data.pages);
    } catch { }
    setLoading(false);
  }, [searchParams]); // eslint-disable-line

  useEffect(() => {
    Promise.all([
      api.get('/storefront/filters'),
      api.get('/storefront/categories'),
      user ? api.get('/storefront/wishlist/ids').catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
    ]).then(([f, c, w]) => {
      setFilters(f.data);
      setCategories(c.data.filter(cat => !cat.parent_id));
      setWishIds(w.data);
    });
  }, [user]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const setFilter = (key, value) => {
    const sp = new URLSearchParams(searchParams);
    if (value) sp.set(key, value); else sp.delete(key);
    sp.delete('page');
    setSearchParams(sp);
  };

  const clearFilters = () => setSearchParams({});

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
  const activeFilterCount = Object.values(currentFilters).filter(v => v).length;
  const toggleSection = (s) => setOpenSections({ ...openSections, [s]: !openSections[s] });

  const FilterSection = ({ id, title, children }) => (
    <div className="sf-filter-section">
      <button className="sf-filter-section-header" onClick={() => toggleSection(id)}>
        <span>{title}</span><span className="sf-filter-chevron">{openSections[id] ? '▾' : '▸'}</span>
      </button>
      {openSections[id] && <div className="sf-filter-section-body">{children}</div>}
    </div>
  );

  return (
    <div className="sf-products-page">
      {/* Breadcrumb & title */}
      <div className="sf-products-topbar">
        <div className="sf-breadcrumb">
          <Link to="/shop">Home</Link> <span>/</span>
          <span>{currentFilters.gender || currentFilters.search || 'All Products'}</span>
        </div>
        <div className="sf-products-meta">
          <h1 className="sf-products-title">
            {currentFilters.search ? `Results for "${currentFilters.search}"` : currentFilters.gender || 'All Products'}
          </h1>
          <span className="sf-products-count">{total} items found</span>
        </div>
      </div>

      {/* Sort & filter bar (mobile) */}
      <div className="sf-sort-bar">
        <button className="sf-filter-toggle" onClick={() => setShowFilters(!showFilters)}>
          <span>☰ Filters</span>
          {activeFilterCount > 0 && <span className="sf-badge-sm">{activeFilterCount}</span>}
        </button>
        <div className="sf-sort-options">
          <span className="sf-sort-label">Sort by:</span>
          {[
            { val: '', label: 'Newest' },
            { val: 'price_low', label: 'Price: Low to High' },
            { val: 'price_high', label: 'Price: High to Low' },
            { val: 'discount', label: 'Best Discount' },
            { val: 'name_asc', label: 'Name: A-Z' },
          ].map(s => (
            <button key={s.val} className={`sf-sort-btn${currentFilters.sort === s.val ? ' active' : ''}`} onClick={() => setFilter('sort', s.val)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sf-products-layout">
        {/* Filter Sidebar */}
        <aside className={`sf-filter-sidebar${showFilters ? ' sf-filter-sidebar-open' : ''}`}>
          <div className="sf-filter-sidebar-header">
            <h3>Filters</h3>
            {activeFilterCount > 0 && <button className="sf-clear-filters" onClick={clearFilters}>Clear All</button>}
            <button className="sf-filter-close" onClick={() => setShowFilters(false)}>✕</button>
          </div>

          <FilterSection id="gender" title="Gender">
            {['Men', 'Women', 'Boys', 'Girls', 'Unisex'].map(g => (
              <label key={g} className="sf-filter-check">
                <input type="radio" name="gender" checked={currentFilters.gender === g} onChange={() => setFilter('gender', currentFilters.gender === g ? '' : g)} />
                <span className="sf-filter-checkmark" />
                <span>{g}</span>
              </label>
            ))}
          </FilterSection>

          <FilterSection id="category" title="Category">
            {categories.map(c => (
              <label key={c.id} className="sf-filter-check">
                <input type="radio" name="category" checked={currentFilters.category_id === String(c.id)} onChange={() => setFilter('category_id', currentFilters.category_id === String(c.id) ? '' : String(c.id))} />
                <span className="sf-filter-checkmark" />
                <span>{c.name}</span>
              </label>
            ))}
          </FilterSection>

          <FilterSection id="size" title="Size">
            <div className="sf-size-chips">
              {filters.sizes.map(s => (
                <button key={s} className={`sf-size-chip${currentFilters.size === s ? ' active' : ''}`} onClick={() => setFilter('size', currentFilters.size === s ? '' : s)}>
                  {s}
                </button>
              ))}
            </div>
          </FilterSection>

          <FilterSection id="color" title="Color">
            <div className="sf-color-chips">
              {filters.colors.map(c => (
                <button key={c} className={`sf-color-chip${currentFilters.color === c ? ' active' : ''}`} onClick={() => setFilter('color', currentFilters.color === c ? '' : c)}>
                  {c}
                </button>
              ))}
            </div>
          </FilterSection>

          <FilterSection id="brand" title="Brand">
            {filters.brands.map(b => (
              <label key={b} className="sf-filter-check">
                <input type="radio" name="brand" checked={currentFilters.brand === b} onChange={() => setFilter('brand', currentFilters.brand === b ? '' : b)} />
                <span className="sf-filter-checkmark" />
                <span>{b}</span>
              </label>
            ))}
          </FilterSection>

          <FilterSection id="price" title="Price Range">
            <div className="sf-price-inputs">
              <input type="number" placeholder="Min ₹" value={currentFilters.min_price} onChange={e => setFilter('min_price', e.target.value)} className="sf-price-input" />
              <span>to</span>
              <input type="number" placeholder="Max ₹" value={currentFilters.max_price} onChange={e => setFilter('max_price', e.target.value)} className="sf-price-input" />
            </div>
          </FilterSection>
        </aside>

        {/* Overlay for mobile filters */}
        {showFilters && <div className="sf-filter-overlay" onClick={() => setShowFilters(false)} />}

        {/* Product Grid */}
        <div className="sf-products-main">
          {/* Active filter tags */}
          {activeFilterCount > 0 && (
            <div className="sf-active-filters">
              {currentFilters.gender && <span className="sf-filter-tag" onClick={() => setFilter('gender', '')}>{currentFilters.gender} ✕</span>}
              {currentFilters.size && <span className="sf-filter-tag" onClick={() => setFilter('size', '')}>{currentFilters.size} ✕</span>}
              {currentFilters.color && <span className="sf-filter-tag" onClick={() => setFilter('color', '')}>{currentFilters.color} ✕</span>}
              {currentFilters.brand && <span className="sf-filter-tag" onClick={() => setFilter('brand', '')}>{currentFilters.brand} ✕</span>}
              {currentFilters.search && <span className="sf-filter-tag" onClick={() => setFilter('search', '')}>"{currentFilters.search}" ✕</span>}
            </div>
          )}

          {loading ? (
            <div className="sf-loader"><div className="sf-spinner" /><p>Finding best matches...</p></div>
          ) : products.length === 0 ? (
            <div className="sf-empty">
              <span className="sf-empty-icon">🔍</span>
              <h3>No products found</h3>
              <p>Try adjusting your filters or search terms</p>
              <button className="sf-btn sf-btn-primary" onClick={clearFilters}>Clear Filters</button>
            </div>
          ) : (
            <>
              <div className="sf-product-grid">
                {products.map(p => (
                  <ProductCard key={p.id} product={p} wishlisted={wishIds.includes(p.id)} onWishToggle={() => toggleWish(p.id)} user={user} getDiscount={getDiscount} />
                ))}
              </div>

              {/* Pagination */}
              {pages > 1 && (
                <div className="sf-pagination">
                  <button disabled={page <= 1} onClick={() => setFilter('page', String(page - 1))} className="sf-page-btn">← Previous</button>
                  <div className="sf-page-nums">
                    {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
                      let p;
                      if (pages <= 7) p = i + 1;
                      else if (page <= 4) p = i + 1;
                      else if (page >= pages - 3) p = pages - 6 + i;
                      else p = page - 3 + i;
                      return (
                        <button key={p} className={`sf-page-num${p === page ? ' active' : ''}`} onClick={() => setFilter('page', String(p))}>
                          {p}
                        </button>
                      );
                    })}
                  </div>
                  <button disabled={page >= pages} onClick={() => setFilter('page', String(page + 1))} className="sf-page-btn">Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
