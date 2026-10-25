import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout';
import Card from '../../components/shared/Card';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function AddVendorPage() {
  const [form, setForm] = useState({
    storeName: '',
    name: '',
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdVendor, setCreatedVendor] = useState(null);

  // List of vendors
  const [vendors, setVendors] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchVendors = async () => {
    try {
      setLoadingVendors(true);
      const { data } = await api.get('/users');
      // Filter for vendors only
      const vendorList = (data || []).filter(u => u.role === 'vendor');
      setVendors(vendorList);
    } catch (err) {
      console.error('Failed to load vendors:', err);
    } finally {
      setLoadingVendors(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let tempPass = 'Vend#';
    for (let i = 0; i < 6; i++) {
      tempPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm(p => ({ ...p, password: tempPass }));
    setShowPassword(true);
    toast.success('Generated temporary password!', { icon: '🔑' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.storeName.trim() || !form.name.trim() || !form.email.trim() || !form.password) {
      return toast.error('Please fill in all vendor fields');
    }
    if (form.password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/users/vendor', {
        storeName: form.storeName,
        name: form.name,
        email: form.email,
        password: form.password,
      });

      toast.success(`Vendor "${form.storeName}" account created successfully!`, { duration: 5000 });
      setCreatedVendor({
        storeName: form.storeName,
        name: form.name,
        email: form.email,
        password: form.password,
      });

      // Reset form
      setForm({ storeName: '', name: '', email: '', password: '' });
      fetchVendors();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create vendor';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const copyCredentials = () => {
    if (!createdVendor) return;
    const text = `🏪 Vendor Login Credentials:\nStore: ${createdVendor.storeName}\nOwner: ${createdVendor.name}\nEmail: ${createdVendor.email}\nTemporary Password: ${createdVendor.password}\nLogin URL: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    toast.success('Credentials copied to clipboard!', { icon: '📋' });
  };

  const handleDeleteVendor = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete vendor "${name}"?`)) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success(`Vendor "${name}" removed`);
      fetchVendors();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete vendor');
    }
  };

  const filteredVendors = vendors.filter(v =>
    (v.storeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout
      title="Add Vendor • አዲስ ቬንደር መመዝገቢያ"
      subtitle="Register merchant stores and generate initial credentials for vendor partners"
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 480px) 1fr', gap: 24, alignItems: 'start' }}>

        {/* ── Vendor Registration Form Card ── */}
        <Card style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: 'linear-gradient(135deg,#8b5cf6,#6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            }}>🏪</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Create Vendor Account</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>የVendor መረጃ እና ጊዜያዊ ፓስወርድ</div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Store Name */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
                Store / Shop Name <span style={{ color: '#ef4444' }}>*</span> (የሱቅ ስም)
              </label>
              <input
                required
                placeholder="e.g. Bole Electronics, Addis Fashion..."
                value={form.storeName}
                onChange={e => setForm(p => ({ ...p, storeName: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 14 }}
              />
            </div>

            {/* Owner Name */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
                Owner Full Name <span style={{ color: '#ef4444' }}>*</span> (የባለቤቱ ስም)
              </label>
              <input
                required
                placeholder="e.g. Dawit Bekele"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
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
                placeholder="vendor@example.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 14 }}
              />
            </div>

            {/* Temporary Password */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>
                  Temporary Password <span style={{ color: '#ef4444' }}>*</span> (ጊዜያዊ ፓስወርድ)
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  style={{
                    background: 'none', border: 'none', color: 'var(--primary)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0,
                  }}
                >
                  ⚡ Auto-Generate
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Min 6 characters (e.g. TempPass#2026)"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  style={{ width: '100%', padding: '10px 42px 10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 14 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 16,
                  }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%', padding: '12px', borderRadius: 8, border: 'none',
                background: submitting ? 'var(--bg3)' : 'linear-gradient(135deg,#8b5cf6,#6366f1)',
                color: '#fff', fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: submitting ? 'none' : '0 4px 16px rgba(139,92,246,0.35)',
              }}
            >
              {submitting ? 'Creating Vendor Account…' : '🏪 Create Vendor Account'}
            </button>
          </form>

          {/* Newly Created Vendor Credentials Box */}
          {createdVendor && (
            <div style={{
              marginTop: 20, padding: 16, borderRadius: 10,
              background: '#8b5cf615', border: '1px solid #8b5cf644',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#8b5cf6' }}>✅ Vendor Account Ready!</span>
                <button
                  onClick={copyCredentials}
                  style={{
                    padding: '5px 10px', borderRadius: 6, border: '1px solid #8b5cf6',
                    background: '#8b5cf6', color: '#fff', fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  📋 Copy Details
                </button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
                <div><strong>Store:</strong> {createdVendor.storeName}</div>
                <div><strong>Owner:</strong> {createdVendor.name}</div>
                <div><strong>Email:</strong> {createdVendor.email}</div>
                <div><strong>Temp Password:</strong> <span style={{ fontFamily: 'monospace', color: '#8b5cf6', fontWeight: 700 }}>{createdVendor.password}</span></div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
                Share these credentials with the vendor so they can sign in at <code>/login</code>.
              </div>
            </div>
          )}
        </Card>

        {/* ── Registered Vendors List Card ── */}
        <Card style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                Registered Vendors ({vendors.length})
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Active merchant accounts on your platform</div>
            </div>
            <input
              placeholder="🔍 Search vendor or store..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--bg3)', color: 'var(--text)', fontSize: 13, width: 220,
              }}
            />
          </div>

          {loadingVendors ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>
              Loading vendors…
            </div>
          ) : filteredVendors.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>
              {searchTerm ? 'No vendors match your search.' : 'No vendors registered yet. Use the form on the left to add one!'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text3)' }}>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Store Name</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Owner</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Email</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Date Added</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.map(v => (
                    <tr key={v._id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px', color: 'var(--text)', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16 }}>🏪</span>
                          <span>{v.storeName || '—'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text2)' }}>{v.name}</td>
                      <td style={{ padding: '12px', color: 'var(--text3)', fontFamily: 'monospace', fontSize: 12 }}>
                        {v.email}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text3)', fontSize: 12 }}>
                        {v.createdAt ? new Date(v.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeleteVendor(v._id, v.storeName || v.name)}
                          style={{
                            background: 'none', border: '1px solid #ef444433', borderRadius: 6,
                            color: '#ef4444', padding: '4px 8px', fontSize: 11, cursor: 'pointer',
                          }}
                          title="Remove vendor"
                        >
                          🗑️ Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
