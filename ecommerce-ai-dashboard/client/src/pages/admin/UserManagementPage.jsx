import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/shared/Layout';
import Card from '../../components/shared/Card';
import StatCard from '../../components/shared/StatCard';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

export default function UserManagementPage() {
  const { user: currentUser } = useAuthStore();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // all, admin, vendor, customer

  // Add Admin modal state
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '' });
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [showAdminPw, setShowAdminPw] = useState(false);

  // Add Vendor modal state
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendorForm, setVendorForm] = useState({ storeName: '', name: '', email: '', password: '' });
  const [vendorSubmitting, setVendorSubmitting] = useState(false);
  const [showVendorPw, setShowVendorPw] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/users');
      setUsers(data || []);
    } catch (err) {
      console.error('Failed to load users:', err);
      toast.error('Failed to load users list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ── Handle Add New Admin ──────────────────────────────────────────────────
  const handleAddAdmin = async (e) => {
    e.preventDefault();
    if (!adminForm.email.trim() || !adminForm.password) {
      return toast.error('Please enter email and password for the new Admin');
    }
    if (adminForm.password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }

    setAdminSubmitting(true);
    try {
      const { data } = await api.post('/users/admin', {
        name: adminForm.name,
        email: adminForm.email,
        password: adminForm.password,
      });

      toast.success(`Admin account "${data.user.email}" created successfully!`, { icon: '🛡️', duration: 4000 });
      setAdminForm({ name: '', email: '', password: '' });
      setShowAdminModal(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create admin');
    } finally {
      setAdminSubmitting(false);
    }
  };

  // ── Handle Add New Vendor ─────────────────────────────────────────────────
  const handleAddVendor = async (e) => {
    e.preventDefault();
    if (!vendorForm.storeName.trim() || !vendorForm.name.trim() || !vendorForm.email.trim() || !vendorForm.password) {
      return toast.error('Please fill in all vendor fields');
    }
    if (vendorForm.password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }

    setVendorSubmitting(true);
    try {
      const { data } = await api.post('/users/vendor', {
        storeName: vendorForm.storeName,
        name: vendorForm.name,
        email: vendorForm.email,
        password: vendorForm.password,
      });

      toast.success(`Vendor "${data.user.storeName}" account created successfully!`, { icon: '🏪', duration: 4000 });
      setVendorForm({ storeName: '', name: '', email: '', password: '' });
      setShowVendorModal(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create vendor');
    } finally {
      setVendorSubmitting(false);
    }
  };

  // ── Delete user ───────────────────────────────────────────────────────────
  const handleDeleteUser = async (userToDelete) => {
    if (userToDelete._id === currentUser?._id) {
      return toast.error('You cannot delete your own account');
    }
    if (!window.confirm(`Are you sure you want to delete "${userToDelete.name || userToDelete.email}" (${userToDelete.role})?`)) {
      return;
    }

    try {
      await api.delete(`/users/${userToDelete._id}`);
      toast.success(`User removed successfully`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  // ── Counts ────────────────────────────────────────────────────────────────
  const adminCount    = users.filter(u => u.role === 'admin').length;
  const vendorCount   = users.filter(u => u.role === 'vendor').length;
  const customerCount = users.filter(u => u.role === 'customer').length;

  const filteredUsers = users.filter(u => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesSearch =
      (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.storeName || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <Layout
      title="User Management • የተጠቃሚዎች አስተዳደር"
      subtitle="Manage system administrators, store vendors, and customers"
    >
      {/* ── Top Action Buttons & Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Platform Users" value={users.length} icon="👥" color="var(--primary)" />
        <StatCard label="Administrators" value={adminCount} icon="🛡️" color="#f59e0b" />
        <StatCard label="Active Vendors" value={vendorCount} icon="🏪" color="#8b5cf6" />
        <StatCard label="Customers" value={customerCount} icon="🛍️" color="#10b981" />
      </div>

      {/* ── Controls Bar ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12, marginBottom: 20,
      }}>
        {/* Left: Role Filter Tabs */}
        <div style={{ display: 'flex', gap: 6, background: 'var(--card)', padding: 4, borderRadius: 10, border: '1px solid var(--border)' }}>
          {[
            { id: 'all', label: 'All Users', count: users.length },
            { id: 'admin', label: '🛡️ Admins', count: adminCount },
            { id: 'vendor', label: '🏪 Vendors', count: vendorCount },
            { id: 'customer', label: '🛍️ Customers', count: customerCount },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id)}
              style={{
                padding: '8px 14px', borderRadius: 8, border: 'none',
                background: roleFilter === tab.id ? 'var(--primary)' : 'transparent',
                color: roleFilter === tab.id ? '#fff' : 'var(--text2)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <span>{tab.label}</span>
              <span style={{
                fontSize: 11, padding: '1px 6px', borderRadius: 10,
                background: roleFilter === tab.id ? 'rgba(255,255,255,0.25)' : 'var(--bg3)',
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Right: Search & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <input
            placeholder="🔍 Search by name or email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--card)', color: 'var(--text)', fontSize: 13, width: 220,
            }}
          />

          {/* Add Admin Button */}
          <button
            onClick={() => setShowAdminModal(true)}
            style={{
              padding: '9px 16px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg,#f59e0b,#d97706)',
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 2px 10px rgba(245,158,11,0.3)',
            }}
          >
            ➕ Add New Admin
          </button>

          {/* Add Vendor Button */}
          <button
            onClick={() => setShowVendorModal(true)}
            style={{
              padding: '9px 16px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg,#8b5cf6,#6366f1)',
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 2px 10px rgba(139,92,246,0.3)',
            }}
          >
            🏪 Add Vendor
          </button>
        </div>
      </div>

      {/* ── Users Table ── */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text3)' }}>
            Loading users data…
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text3)' }}>
            No users found matching current filter.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--border)', color: 'var(--text3)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>User / Name</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Email Address</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Role</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Role Details</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Joined</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => {
                  const isCurrent = u._id === currentUser?._id;
                  const roleConfig = {
                    admin:    { label: 'Admin',    color: '#f59e0b', bg: '#f59e0b18', icon: '🛡️' },
                    vendor:   { label: 'Vendor',   color: '#8b5cf6', bg: '#8b5cf618', icon: '🏪' },
                    customer: { label: 'Customer', color: '#10b981', bg: '#10b98118', icon: '🛍️' },
                  }[u.role] || { label: u.role, color: '#94a3b8', bg: '#94a3b818', icon: '👤' };

                  return (
                    <tr key={u._id} style={{ borderBottom: '1px solid var(--border)' }}>
                      {/* Name & Avatar */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: roleConfig.color + '25', color: roleConfig.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: 14, flexShrink: 0,
                          }}>
                            {u.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>{u.name || 'Unnamed'}</span>
                              {isCurrent && (
                                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: 'var(--primary)', color: '#fff' }}>
                                  You
                                </span>
                              )}
                            </div>
                            {u.role === 'vendor' && u.storeName && (
                              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Store: {u.storeName}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: 'var(--text2)', fontSize: 12 }}>
                        {u.email}
                      </td>

                      {/* Role */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '4px 10px', borderRadius: 20,
                          background: roleConfig.bg, color: roleConfig.color,
                          fontSize: 12, fontWeight: 700,
                        }}>
                          <span>{roleConfig.icon}</span>
                          <span>{roleConfig.label}</span>
                        </span>
                      </td>

                      {/* Role Specific Details */}
                      <td style={{ padding: '14px 16px', color: 'var(--text3)', fontSize: 12 }}>
                        {u.role === 'vendor' ? (
                          <span>🏪 {u.storeName || 'No store name set'}</span>
                        ) : u.role === 'customer' ? (
                          <span style={{ textTransform: 'capitalize' }}>Segment: {u.customerSegment || 'New'}</span>
                        ) : (
                          <span>Full Platform Access</span>
                        )}
                      </td>

                      {/* Date */}
                      <td style={{ padding: '14px 16px', color: 'var(--text3)', fontSize: 12 }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {isCurrent ? (
                          <span style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>Current session</span>
                        ) : (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            style={{
                              background: 'none', border: '1px solid #ef444433', borderRadius: 6,
                              color: '#ef4444', padding: '4px 10px', fontSize: 11, cursor: 'pointer',
                            }}
                          >
                            🗑️ Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Modal: Add New Admin ────────────────────────────────────────────── */}
      {showAdminModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20, backdropFilter: 'blur(3px)',
        }}>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16,
            width: '100%', maxWidth: 440, padding: 28, position: 'relative',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: '#f59e0b22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                }}>🛡️</div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Add New Admin</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>አዲስ Admin ኢሜይልና ፓስወርድ መመዝገቢያ</div>
                </div>
              </div>
              <button
                onClick={() => setShowAdminModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer' }}
              >✕</button>
            </div>

            <form onSubmit={handleAddAdmin}>
              {/* Full Name */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
                  Full Name (የአድሚን ስም)
                </label>
                <input
                  placeholder="e.g. Bethlehem Admin"
                  value={adminForm.name}
                  onChange={e => setAdminForm(p => ({ ...p, name: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 14 }}
                />
              </div>

              {/* Email */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
                  Email Address <span style={{ color: '#ef4444' }}>*</span> (ኢሜይል)
                </label>
                <input
                  type="email"
                  required
                  placeholder="newadmin@platform.com"
                  value={adminForm.email}
                  onChange={e => setAdminForm(p => ({ ...p, email: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 14 }}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
                  Password <span style={{ color: '#ef4444' }}>*</span> (ፓስወርድ)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showAdminPw ? 'text' : 'password'}
                    required
                    placeholder="Min 6 characters"
                    value={adminForm.password}
                    onChange={e => setAdminForm(p => ({ ...p, password: e.target.value }))}
                    style={{ width: '100%', padding: '10px 42px 10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 14 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPw(p => !p)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 16 }}
                  >
                    {showAdminPw ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  style={{
                    flex: 1, padding: 11, borderRadius: 8, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text2)', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminSubmitting}
                  style={{
                    flex: 2, padding: 11, borderRadius: 8, border: 'none',
                    background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                    color: '#fff', fontWeight: 700, cursor: adminSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  {adminSubmitting ? 'Creating Admin…' : '🛡️ Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Add New Vendor ────────────────────────────────────────────── */}
      {showVendorModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20, backdropFilter: 'blur(3px)',
        }}>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16,
            width: '100%', maxWidth: 440, padding: 28, position: 'relative',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: '#8b5cf622', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                }}>🏪</div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Add New Vendor</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>የሱቅ ስም፣ ባለቤት፣ ኢሜይልና ጊዜያዊ ፓስወርድ</div>
                </div>
              </div>
              <button
                onClick={() => setShowVendorModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer' }}
              >✕</button>
            </div>

            <form onSubmit={handleAddVendor}>
              {/* Store Name */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
                  Store / Shop Name <span style={{ color: '#ef4444' }}>*</span> (የሱቅ ስም)
                </label>
                <input
                  required
                  placeholder="e.g. Merkato Tech Store"
                  value={vendorForm.storeName}
                  onChange={e => setVendorForm(p => ({ ...p, storeName: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 14 }}
                />
              </div>

              {/* Owner Name */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
                  Owner's Full Name <span style={{ color: '#ef4444' }}>*</span> (የባለቤቱ ስም)
                </label>
                <input
                  required
                  placeholder="e.g. Yohannes Haile"
                  value={vendorForm.name}
                  onChange={e => setVendorForm(p => ({ ...p, name: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 14 }}
                />
              </div>

              {/* Email */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
                  Email Address <span style={{ color: '#ef4444' }}>*</span> (ኢሜይል)
                </label>
                <input
                  type="email"
                  required
                  placeholder="yohannes@store.com"
                  value={vendorForm.email}
                  onChange={e => setVendorForm(p => ({ ...p, email: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 14 }}
                />
              </div>

              {/* Temporary Password */}
              <div style={{ marginBottom: 22 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
                  Temporary Password <span style={{ color: '#ef4444' }}>*</span> (ጊዜያዊ ፓስወርድ)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showVendorPw ? 'text' : 'password'}
                    required
                    placeholder="Min 6 characters (e.g. TempVendor123)"
                    value={vendorForm.password}
                    onChange={e => setVendorForm(p => ({ ...p, password: e.target.value }))}
                    style={{ width: '100%', padding: '10px 42px 10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 14 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowVendorPw(p => !p)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 16 }}
                  >
                    {showVendorPw ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowVendorModal(false)}
                  style={{
                    flex: 1, padding: 11, borderRadius: 8, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text2)', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={vendorSubmitting}
                  style={{
                    flex: 2, padding: 11, borderRadius: 8, border: 'none',
                    background: 'linear-gradient(135deg,#8b5cf6,#6366f1)',
                    color: '#fff', fontWeight: 700, cursor: vendorSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  {vendorSubmitting ? 'Creating Vendor…' : '🏪 Create Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
