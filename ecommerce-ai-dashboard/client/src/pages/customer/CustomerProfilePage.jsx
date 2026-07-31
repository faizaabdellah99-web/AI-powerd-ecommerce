import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout';
import Card from '../../components/shared/Card';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import toast from 'react-hot-toast';

const segmentColors = {
  vip:        { bg: '#f59e0b22', text: '#f59e0b', label: '👑 VIP Customer',       icon: '👑' },
  regular:    { bg: '#10b98122', text: '#10b981', label: '⭐ Regular Customer',    icon: '⭐' },
  occasional: { bg: '#f59e0b22', text: '#f59e0b', label: '🔄 Occasional Shopper', icon: '🔄' },
  new:        { bg: '#6366f122', text: '#6366f1', label: '🆕 New Customer',        icon: '🆕' },
  atrisk:     { bg: '#ef444422', text: '#ef4444', label: '⚠️ At Risk',             icon: '⚠️' },
  inactive:   { bg: '#64748b22', text: '#64748b', label: '😴 Inactive',            icon: '😴' },
};

export default function CustomerProfilePage() {
  const { user, fetchMe } = useAuthStore();
  const [segmentData, setSegmentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    location: user?.location || '',
    preferences: user?.preferences?.join(', ') || '',
  });

  // Use user data from store directly (login already returns enriched segment data)
  useEffect(() => {
    if (user?.segmentDetails) {
      setSegmentData({
        segment: user.segmentDetails,
        stats: user.orderStats || { totalOrders: 0, totalSpent: 0, avgOrder: 0, daysSinceLastOrder: null },
        favouriteCategories: user.favouriteCategories || user.preferences || [],
        recommendations: user.recommendations || [],
      });
      setLoading(false);
    } else {
      // Fallback: try to fetch from API
      const fetchSegment = async () => {
        try {
          const { data } = await api.get('/segments/my-segment');
          setSegmentData(data);
        } catch (err) {
          console.error('Failed to fetch segment:', err);
          setSegmentData({
            segment: null,
            stats: { totalOrders: 0, totalSpent: 0, avgOrder: 0, daysSinceLastOrder: null },
            favouriteCategories: user?.preferences || ['Electronics', 'Home & Living', 'Sports'],
            recommendations: [],
          });
        } finally {
          setLoading(false);
        }
      };
      fetchSegment();
    }
  }, [user]);

  const segment = segmentData?.segment;
  const stats = segmentData?.stats || {};
  const categories = segmentData?.favouriteCategories || user?.preferences || [];
  const recommendations = segmentData?.recommendations || [];
  const segStyle = segmentColors[segment?.key] || segmentColors.regular;

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const prefs = form.preferences.split(',').map(s => s.trim()).filter(Boolean);
      const { data } = await api.put('/users/profile', {
        name: form.name,
        location: form.location,
        preferences: prefs,
      });
      await fetchMe(); // Refresh user data
      toast.success('Profile updated!');
      setEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    }
  };

  return (
    <Layout title="My Profile" subtitle="Manage your account and view your customer segment">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Left: Profile Info */}
        <div>
          <Card style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Account Information</div>
              <button onClick={() => setEditing(!editing)} style={{
                padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>
                {editing ? 'Cancel' : '✏️ Edit'}
              </button>
            </div>

            {editing ? (
              <form onSubmit={handleSave}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, color: 'var(--text2)', display: 'block', marginBottom: 6, fontWeight: 500 }}>Full Name</label>
                  <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} required />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, color: 'var(--text2)', display: 'block', marginBottom: 6, fontWeight: 500 }}>Location</label>
                  <input value={form.location} onChange={e => setForm(p => ({...p, location: e.target.value}))} placeholder="City, Country" />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, color: 'var(--text2)', display: 'block', marginBottom: 6, fontWeight: 500 }}>Preferences (comma-separated)</label>
                  <input value={form.preferences} onChange={e => setForm(p => ({...p, preferences: e.target.value}))} placeholder="Electronics, Fashion, Books" />
                </div>
                <button type="submit" style={{
                  width: '100%', padding: 11, borderRadius: 9, border: 'none',
                  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
                  fontWeight: 700, fontSize: 14, cursor: 'pointer',
                }}>💾 Save Changes</button>
              </form>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: 16,
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28, color: '#fff', fontWeight: 700,
                  }}>{user?.name?.charAt(0) || 'U'}</div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{user?.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text2)' }}>{user?.email}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Member since {new Date(user?.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, color: 'var(--text3)' }}>📍 Location</span>
                    <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{user?.location || 'Not set'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, color: 'var(--text3)' }}>🏷️ Preferences</span>
                    <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{(user?.preferences || []).join(', ') || 'Not set'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, color: 'var(--text3)' }}>🔑 Role</span>
                    <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, textTransform: 'capitalize' }}>{user?.role}</span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Order Stats */}
          <Card>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📊 Order Statistics</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Total Orders', value: stats.totalOrders || 0, color: 'var(--primary)' },
                { label: 'Total Spent', value: `$${(stats.totalSpent || 0).toLocaleString()}`, color: 'var(--success)' },
                { label: 'Avg Order', value: `$${stats.avgOrder || 0}`, color: 'var(--warning)' },
                { label: 'Last Order', value: stats.daysSinceLastOrder === null ? 'N/A' : stats.daysSinceLastOrder === 0 ? 'Today' : `${stats.daysSinceLastOrder}d ago`, color: 'var(--danger)' },
              ].map((s, i) => (
                <div key={i} style={{ background: 'var(--bg3)', borderRadius: 10, padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right: Segment Info */}
        <div>
          {/* Segment Card */}
          <Card style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{segStyle.icon}</span> Your Customer Segment
            </div>
            {segment ? (
              <>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                  background: segStyle.bg, color: segStyle.text, marginBottom: 12,
                }}>
                  {segStyle.icon} {segStyle.label}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 16 }}>
                  {segment.description}
                </div>

                {/* Benefits */}
                {segment.benefits && segment.benefits.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Your Benefits:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {segment.benefits.map((b, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text2)' }}>
                          <span style={{ color: segStyle.text }}>✦</span> {b}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Marketing Strategy */}
                {segment.marketingStrategy && (
                  <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>📢 Marketing Strategy for this Segment:</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
                      <div><strong>Channel:</strong> {segment.marketingStrategy.channel}</div>
                      <div><strong>Frequency:</strong> {segment.marketingStrategy.frequency}</div>
                      <div><strong>Offers:</strong> {segment.marketingStrategy.offers}</div>
                      <div><strong>Tone:</strong> {segment.marketingStrategy.tone}</div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: 20 }}>
                {loading ? 'Loading segment data...' : 'Start shopping to determine your customer segment!'}
              </div>
            )}
          </Card>

          {/* Favourite Categories */}
          {categories.length > 0 && (
            <Card style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>🏷️ Favourite Categories</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {categories.map((cat, i) => (
                  <span key={i} style={{
                    padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: segStyle.bg, color: segStyle.text, border: `1px solid ${segStyle.text}33`,
                  }}>{cat}</span>
                ))}
              </div>
            </Card>
          )}

          {/* AI Recommendations */}
          {recommendations.length > 0 && (
            <Card>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>🤖 AI Recommendations</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recommendations.slice(0, 4).map((rec, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 0', borderBottom: i < Math.min(recommendations.length, 4) - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: segStyle.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
                      {rec.charAt(0)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{rec}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}