import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiUsers, FiPlus, FiEdit2, FiTrash2, FiSearch, FiUserCheck, FiUserX, FiShield, FiUser, FiPhone, FiMapPin, FiEye, FiEyeOff } from 'react-icons/fi';
import api, { getImageUrl } from '../utils/api';

const ROLE_CONFIG = {
  admin: { label: 'Admin', color: '#ef4444', bg: '#fef2f2', icon: <FiShield />, desc: 'Full access to all features' },
  staff: { label: 'Staff', color: '#3b82f6', bg: '#eff6ff', icon: <FiUserCheck />, desc: 'Billing, stock & transfers' },
  user:  { label: 'Viewer', color: '#6b7280', bg: '#f3f4f6', icon: <FiUser />, desc: 'View products & dashboard' },
};

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [stores, setStores] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showView, setShowView] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'staff', phone: '', store_id: '' });
  const [picture, setPicture] = useState(null);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showPw, setShowPw] = useState(false);

  const load = () => api.get('/staff').then(r => setStaff(r.data));
  useEffect(() => { load(); api.get('/stores').then(r => setStores(r.data)); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
    if (picture) fd.append('picture', picture);
    try {
      if (editing) {
        await api.put(`/staff/${editing}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('User updated successfully');
      } else {
        await api.post('/staff', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('User created successfully');
      }
      setShowModal(false); setEditing(null); setPicture(null); setShowPw(false); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this user?')) return;
    try { await api.delete(`/staff/${id}`); toast.success('User deactivated'); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const handleReactivate = async (id) => {
    try { await api.put(`/staff/${id}`, { active: 1 }); toast.success('User reactivated'); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const openCreate = () => {
    setForm({ username: '', password: '', name: '', role: 'staff', phone: '', store_id: '' });
    setPicture(null); setEditing(null); setShowPw(false); setShowModal(true);
  };

  const openEdit = (s) => {
    setForm({ username: s.username, password: '', name: s.name, role: s.role, phone: s.phone || '', store_id: s.store_id || '' });
    setPicture(null); setEditing(s.id); setShowPw(false); setShowModal(true);
  };

  const filtered = staff.filter(s => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.username.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterRole && s.role !== filterRole) return false;
    return true;
  });

  const activeCount = staff.filter(s => s.active).length;
  const roleBreakdown = staff.reduce((acc, s) => { if (s.active) acc[s.role] = (acc[s.role] || 0) + 1; return acc; }, {});

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <FiUsers style={{ color: 'var(--primary)' }} /> User Management
          </h1>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>Create and manage staff accounts & permissions</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px' }}>
          <FiPlus /> Create New User
        </button>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon blue"><FiUsers /></div>
          <div className="stat-value">{staff.length}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><FiUserCheck /></div>
          <div className="stat-value">{activeCount}</div>
          <div className="stat-label">Active Users</div>
        </div>
        {Object.entries(roleBreakdown).map(([role, count]) => (
          <div className="stat-card" key={role}>
            <div className="stat-icon" style={{ background: ROLE_CONFIG[role]?.bg, color: ROLE_CONFIG[role]?.color }}>
              {ROLE_CONFIG[role]?.icon}
            </div>
            <div className="stat-value">{count}</div>
            <div className="stat-label">{ROLE_CONFIG[role]?.label || role}</div>
          </div>
        ))}
      </div>

      {/* Search & filters */}
      <div className="card" style={{ marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottom: 'none' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input className="form-control" placeholder="Search by name or username..." value={search}
              onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 38 }} />
          </div>
          <select className="form-control" style={{ width: 160 }} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
            <option value="user">Viewer</option>
          </select>
        </div>
      </div>

      {/* User cards grid */}
      <div className="card" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon"><FiUsers /></div>
            <p>No users found</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {filtered.map(s => {
              const rc = ROLE_CONFIG[s.role] || ROLE_CONFIG.user;
              const storeName = stores.find(st => st.id === s.store_id)?.name;
              return (
                <div key={s.id} style={{
                  border: '1px solid var(--border)', borderRadius: 14, padding: 20,
                  background: s.active ? '#fff' : '#fafafa', opacity: s.active ? 1 : 0.65,
                  transition: 'box-shadow 0.2s, transform 0.15s', cursor: 'pointer',
                  position: 'relative', overflow: 'hidden'
                }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
                >
                  {/* Status ribbon */}
                  {!s.active && (
                    <div style={{ position: 'absolute', top: 12, right: -30, background: '#ef4444', color: '#fff', padding: '2px 36px', fontSize: '0.65rem', fontWeight: 700, transform: 'rotate(45deg)', letterSpacing: 1 }}>INACTIVE</div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                    {/* Avatar */}
                    {s.picture ? (
                      <img src={getImageUrl(s.picture)} alt="" style={{ width: 54, height: 54, borderRadius: 14, objectFit: 'cover', border: `2px solid ${rc.color}22` }} />
                    ) : (
                      <div style={{
                        width: 54, height: 54, borderRadius: 14,
                        background: `linear-gradient(135deg, ${rc.color}22, ${rc.color}44)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.2rem', fontWeight: 700, color: rc.color
                      }}>
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '1rem' }}>{s.name}</div>
                      <div style={{ color: '#6b7280', fontSize: '0.82rem' }}>@{s.username}</div>
                    </div>
                    <span style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
                      background: rc.bg, color: rc.color, display: 'flex', alignItems: 'center', gap: 4,
                      textTransform: 'uppercase', letterSpacing: 0.5
                    }}>
                      {rc.icon} {rc.label}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {s.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', color: '#4b5563' }}>
                        <FiPhone style={{ color: '#9ca3af', fontSize: 14 }} /> {s.phone}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', color: '#4b5563' }}>
                      <FiMapPin style={{ color: '#9ca3af', fontSize: 14 }} /> {storeName || 'All Stores'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#9ca3af' }}>
                      Created: {new Date(s.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #f3f4f6', paddingTop: 12 }}>
                    <button className="btn btn-sm btn-outline" onClick={() => setShowView(s)} style={{ flex: 1 }}>
                      <FiEye /> View
                    </button>
                    <button className="btn btn-sm btn-outline" onClick={() => openEdit(s)} style={{ flex: 1 }}>
                      <FiEdit2 /> Edit
                    </button>
                    {s.active ? (
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s.id)} style={{ flex: 1 }}>
                        <FiUserX /> Deactivate
                      </button>
                    ) : (
                      <button className="btn btn-sm btn-success" onClick={() => handleReactivate(s.id)} style={{ flex: 1 }}>
                        <FiUserCheck /> Reactivate
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* View User Detail Modal */}
      {showView && (
        <div className="modal-overlay" onClick={() => setShowView(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              {showView.picture ? (
                <img src={getImageUrl(showView.picture)} alt="" style={{ width: 90, height: 90, borderRadius: 20, objectFit: 'cover', marginBottom: 12, border: '3px solid #e5e7eb' }} />
              ) : (
                <div style={{
                  width: 90, height: 90, borderRadius: 20, margin: '0 auto 12px',
                  background: `linear-gradient(135deg, ${ROLE_CONFIG[showView.role]?.color}33, ${ROLE_CONFIG[showView.role]?.color}66)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2rem', fontWeight: 700, color: ROLE_CONFIG[showView.role]?.color
                }}>
                  {showView.name.charAt(0).toUpperCase()}
                </div>
              )}
              <h2 style={{ marginBottom: 4 }}>{showView.name}</h2>
              <p className="text-muted">@{showView.username}</p>
              <span style={{
                padding: '5px 16px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600,
                background: ROLE_CONFIG[showView.role]?.bg, color: ROLE_CONFIG[showView.role]?.color,
                display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8
              }}>
                {ROLE_CONFIG[showView.role]?.icon} {ROLE_CONFIG[showView.role]?.label}
              </span>
            </div>
            <div style={{ background: '#f9fafb', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div><div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 4 }}>Phone</div><div style={{ fontWeight: 500 }}>{showView.phone || '—'}</div></div>
                <div><div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 4 }}>Store</div><div style={{ fontWeight: 500 }}>{stores.find(st => st.id === showView.store_id)?.name || 'All Stores'}</div></div>
                <div><div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 4 }}>Status</div><span className={`badge ${showView.active ? 'badge-success' : 'badge-danger'}`}>{showView.active ? 'Active' : 'Inactive'}</span></div>
                <div><div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 4 }}>Created</div><div style={{ fontWeight: 500 }}>{new Date(showView.created_at).toLocaleDateString()}</div></div>
              </div>
              <div style={{ marginTop: 16, padding: '10px 14px', background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 4 }}>Permissions</div>
                <div style={{ fontSize: '0.88rem' }}>{ROLE_CONFIG[showView.role]?.desc}</div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => { setShowView(null); openEdit(showView); }}>
                <FiEdit2 /> Edit User
              </button>
              <button className="btn btn-primary" onClick={() => setShowView(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit User Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                {editing ? <><FiEdit2 /> Edit User</> : <><FiPlus /> Create New User</>}
              </h2>
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                {editing ? 'Update user details and permissions' : 'Fill in the details to create a new user account'}
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Photo upload */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{
                  width: 80, height: 80, borderRadius: 16, margin: '0 auto 10px',
                  background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.8rem', color: '#9ca3af', border: '2px dashed #d1d5db', overflow: 'hidden'
                }}>
                  {picture ? '📷' : (form.name ? form.name.charAt(0).toUpperCase() : <FiUser />)}
                </div>
                <label style={{ fontSize: '0.82rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 }}>
                  Upload Photo
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setPicture(e.target.files[0])} />
                </label>
                {picture && <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 4 }}>{picture.name}</div>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Rahul Sharma" />
                </div>
                <div className="form-group">
                  <label>Username *</label>
                  <input className="form-control" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required disabled={!!editing}
                    placeholder="e.g. rahul123" style={editing ? { background: '#f3f4f6' } : {}} />
                  {editing && <small style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Username cannot be changed</small>}
                </div>
              </div>

              <div className="form-group">
                <label>{editing ? 'New Password' : 'Password *'} </label>
                <div style={{ position: 'relative' }}>
                  <input className="form-control" type={showPw ? 'text' : 'password'} value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })} required={!editing}
                    placeholder={editing ? 'Leave blank to keep current' : 'Min 6 characters'}
                    style={{ paddingRight: 40 }} />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                    {showPw ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              {/* Role selection */}
              <div className="form-group">
                <label>Role *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {['staff', 'user'].map(role => {
                    const rc = ROLE_CONFIG[role];
                    const selected = form.role === role;
                    return (
                      <div key={role} onClick={() => setForm({ ...form, role })}
                        style={{
                          padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                          border: `2px solid ${selected ? rc.color : '#e5e7eb'}`,
                          background: selected ? rc.bg : '#fff', transition: 'all 0.2s'
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ color: rc.color, fontSize: 16 }}>{rc.icon}</span>
                          <span style={{ fontWeight: 600, color: selected ? rc.color : '#374151' }}>{rc.label}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{rc.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label><FiPhone style={{ fontSize: 12 }} /> Phone</label>
                  <input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="e.g. 9876543210" />
                </div>
                <div className="form-group">
                  <label><FiMapPin style={{ fontSize: 12 }} /> Assigned Store</label>
                  <select className="form-control" value={form.store_id} onChange={e => setForm({ ...form, store_id: e.target.value })}>
                    <option value="">All Stores</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24, paddingTop: 20, borderTop: '1px solid #f3f4f6' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)} style={{ padding: '10px 24px' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px' }}>
                  {editing ? <><FiEdit2 /> Update User</> : <><FiPlus /> Create User</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
