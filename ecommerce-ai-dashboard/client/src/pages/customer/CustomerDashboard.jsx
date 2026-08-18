import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout';
import StatCard from '../../components/shared/StatCard';
import Card from '../../components/shared/Card';
import Badge from '../../components/shared/Badge';
import Spinner from '../../components/shared/Spinner';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { getSocket } from '../../hooks/useSocket';

const statusColor = { delivered: 'success', shipped: 'info', pending: 'warning', cancelled: 'danger', confirmed: 'info', out_for_delivery: 'warning' };

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatMoney(val) {
  return `$${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const segmentColors = {
  vip:        { bg: '#f59e0b22', text: '#f59e0b', label: '👑 VIP Customer',       icon: '👑' },
  regular:    { bg: '#10b98122', text: '#10b981', label: '⭐ Regular Customer',    icon: '⭐' },
  occasional: { bg: '#f59e0b22', text: '#f59e0b', label: '🔄 Occasional Shopper', icon: '🔄' },
  new:        { bg: '#6366f122', text: '#6366f1', label: '🆕 New Customer',        icon: '🆕' },
  atrisk:     { bg: '#ef444422', text: '#ef4444', label: '⚠️ At Risk',             icon: '⚠️' },
  inactive:   { bg: '#64748b22', text: '#64748b', label: '😴 Inactive',            icon: '😴' },
};

export default function CustomerDashboard() {
  const { user } = useAuthStore();
  const [segmentData, setSegmentData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [aiSuggestionsLoading, setAiSuggestionsLoading] = useState(false);

  useEffect(() => {
    let active = true;

    // ── 1. Segment data (fresh from database) ──────────────────────────────
    const fetchSegment = async () => {
      try {
        const { data } = await api.get('/segments/my-segment');
        if (active) setSegmentData(data);
      } catch (err) {
        console.error('Failed to fetch segment:', err);
        if (active) {
          setSegmentData({
            segment: user?.segmentDetails || null,
            stats: user?.orderStats || { totalOrders: 0, totalSpent: 0, avgOrder: 0, daysSinceLastOrder: null },
            favouriteCategories: user?.favouriteCategories || user?.preferences || [],
            recommendations: user?.recommendations || [],
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    // ── 2. Real orders from database ───────────────────────────────────────
    const fetchOrders = async () => {
      try {
        const { data } = await api.get('/orders/my');
        if (active) setOrders(data || []);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
        if (active) setOrdersError('Unable to load your orders. Please try again.');
      } finally {
        if (active) setLoadingOrders(false);
      }
    };

    fetchSegment();
    fetchOrders();

    return () => { active = false; };
  }, [user]);

  const segment = segmentData?.segment;
  const stats = segmentData?.stats || user?.orderStats || { totalOrders: 0, totalSpent: 0, avgOrder: 0, daysSinceLastOrder: null };
  const categories = segmentData?.favouriteCategories || user?.favouriteCategories || user?.preferences || ['Electronics', 'Home & Living', 'Sports'];
  const recommendations = segmentData?.recommendations || user?.recommendations || [];
  const segStyle = segmentColors[segment?.key] || segmentColors.regular;

  // ── AI Suggestions (personalized per customer) ─────────────────────────────
  const fetchAISuggestions = async () => {
    setAiSuggestionsLoading(true);
    try {
      const catStr = categories.slice(0, 5).join(', ');
      const { data } = await api.post('/ai/chat', {
        message: `You are a personal AI shopping assistant. Generate exactly 4 actionable, personalized suggestions for this customer:
- Name: ${user?.name || 'Customer'}
- Segment: ${segment?.label || 'General Customer'}
- Total orders: ${stats.totalOrders || 0}
- Total spent: $${(stats.totalSpent || 0).toFixed(2)}
- Avg order value: $${(stats.avgOrder || 0).toFixed(2)}
- Favorite categories: ${catStr || 'General Merchandise'}
- Days since last order: ${stats.daysSinceLastOrder !== null && stats.daysSinceLastOrder !== undefined ? `${stats.daysSinceLastOrder} days` : 'N/A'}
- Existing recommendations: ${(recommendations || []).slice(0, 3).join('; ') || 'None yet'}

Return ONLY a JSON array of exactly 4 objects, no markdown:
[{"icon":"emoji","title":"short title","text":"one specific actionable sentence with numbers personal to this customer","color":"hex color"}]
Use these colors: #6366f1, #10b981, #f59e0b, #ef4444
Make each suggestion specific and personal — reference their segment, spending, categories, or reorder timing.`,
        history: [],
        context: 'customer dashboard personalized suggestions',
      });
      const match = data.reply.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed) && parsed.length >= 4) setAiSuggestions(parsed.slice(0, 4));
        else throw new Error('parse error');
      } else {
        throw new Error('parse error');
      }
    } catch {
      // Fallback personalized suggestions if AI is unavailable
      setAiSuggestions([
        { icon: '🛍️', title: 'Shop Your Favorites', text: `Discover top new arrivals in ${categories[0] || 'your favorite categories'} — updated daily.`, color: '#6366f1' },
        { icon: '💰', title: 'Segment Reward', text: `As a ${segStyle.label.replace(/Customer|Shopper/g, '').trim() || 'valued'} customer, enjoy up to 10% off your next order.`, color: '#f59e0b' },
        { icon: '🔄', title: 'Smart Reorder', text: stats.daysSinceLastOrder != null ? `It's been ${stats.daysSinceLastOrder} days since your last order — time to restock with Reorder AI.` : 'Use Reorder AI to save time on repeat purchases.', color: '#10b981' },
        { icon: '⭐', title: 'Maximize Rewards', text: 'Use the AI Assistant to find the best deals across your favorite categories.', color: '#ef4444' },
      ]);
    } finally {
      setAiSuggestionsLoading(false);
    }
  };

  // Auto-generate personalized suggestions once profile data is ready
  useEffect(() => {
    if (!loading) fetchAISuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  return (
    <Layout title={`Hi, ${user?.name?.split(' ')[0] || 'there'} 👋`} subtitle="Your personal AI shopping assistant">
      {/* Demo button for testing admin/vendor notifications */}
      <div style={{ marginBottom: 16 }}>
        <button 
          onClick={() => {
            const socket = getSocket();
            // Simulate customer placing new order - admin/vendor will see notification
            socket.emit('new-order', {
              orderId: 'DEMO-' + Date.now(),
              total: 150.00,
              status: 'pending',
              paymentStatus: 'paid',
              customerName: user?.name || 'Demo Customer',
              items: [
                { productName: 'Wireless Headphones', qty: 1, price: 79.99 },
                { productName: 'Coffee Maker X1', qty: 1, price: 49.99 }
              ],
              createdAt: new Date()
            });
          }}
          style={{
            padding: '8px 16px',
            background: 'var(--warning)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 12,
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          🎭 Demo: Place Test Order (Admin/Vendor Notification)
        </button>
      </div>

      {/* Customer Profile Card with Segment */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <div style={{ 
            width: 80, height: 80, borderRadius: 16, 
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            fontSize: 32, color: '#fff', flexShrink: 0 
          }}>
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{user?.name || 'Customer'}</div>
              {segment && (
                <div style={{ 
                  padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: segStyle.bg, color: segStyle.text,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {segStyle.icon} {segStyle.label}
                </div>
              )}
            </div>
            {segment?.description && (
              <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12, lineHeight: 1.6 }}>
                {segment.description}
              </div>
            )}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text3)' }}>
                <span>📍</span> {user?.location || 'Addis Ababa, Ethiopia'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text3)' }}>
                <span>🏷️</span> {categories.slice(0, 3).join(', ')}
              </div>
              {stats.daysSinceLastOrder !== null && stats.daysSinceLastOrder !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text3)' }}>
                  <span>🕐</span> Last order: {stats.daysSinceLastOrder === 0 ? 'Today' : `${stats.daysSinceLastOrder}d ago`}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Orders"   value={stats.totalOrders || 0}     icon="📦" color="var(--primary)" />
        <StatCard label="Total Spent"    value={`$${(stats.totalSpent || 0).toLocaleString()}`} icon="💳" color="var(--success)" />
        <StatCard label="Avg Order"      value={`$${stats.avgOrder || 0}`}   icon="📊" color="var(--warning)" />
        <StatCard label="AI Suggestions" value={recommendations.length || 0} icon="🤖" color="var(--danger)" />
      </div>

      {/* ── AI Suggestions For You (4 personalized tips) ── */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>🤖 AI Suggestions For You</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>
              Personalized just for you — based on your segment, spending & preferences
            </div>
          </div>
          <button onClick={fetchAISuggestions} disabled={aiSuggestionsLoading} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            borderRadius: 8, border: 'none', cursor: aiSuggestionsLoading ? 'not-allowed' : 'pointer',
            background: aiSuggestionsLoading ? 'var(--bg3)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color: aiSuggestionsLoading ? 'var(--text3)' : '#fff',
            fontSize: 12, fontWeight: 700, transition: 'opacity 0.2s',
          }}>
            {aiSuggestionsLoading ? '⏳ Generating…' : aiSuggestions ? '✦ Refresh' : '✦ Generate AI Suggestions'}
          </button>
        </div>

        <style>{`@keyframes suggestionFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {aiSuggestionsLoading && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '12px', borderRadius: 10, background: 'var(--bg3)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--border)', animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 11, background: 'var(--border)', borderRadius: 4, marginBottom: 6, animation: 'pulse 1.5s infinite' }} />
                  <div style={{ height: 9, background: 'var(--border)', borderRadius: 4, width: '85%', animation: 'pulse 1.5s infinite' }} />
                </div>
              </div>
            ))}
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
          </div>
        )}

        {!aiSuggestions && !aiSuggestionsLoading && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { icon: '🛍️', title: 'Personalized Picks', desc: 'AI discovers products you\'ll love from your favorite categories.', color: '#6366f1' },
              { icon: '💰', title: 'Exclusive Deals', desc: 'Get offers tailored to your spending habits and segment.', color: '#f59e0b' },
              { icon: '🔄', title: 'Smart Reorder Alerts', desc: 'Never run out — get reminded when it\'s time to reorder.', color: '#10b981' },
              { icon: '⭐', title: 'Loyalty Rewards', desc: 'AI finds the best ways for you to earn and save points.', color: '#ef4444' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '12px', borderRadius: 10, background: 'var(--bg3)', border: `1px solid ${item.color}33` }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: item.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              </div>
            ))}
            <div style={{ gridColumn: '1/-1', fontSize: 10, color: 'var(--text3)', textAlign: 'center', padding: '6px', background: 'var(--bg3)', borderRadius: 8 }}>
              Click ✦ Generate for live personalized AI suggestions
            </div>
          </div>
        )}

        {aiSuggestions && !aiSuggestionsLoading && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {aiSuggestions.map((item, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, padding: '12px', borderRadius: 10,
                background: 'var(--bg3)', border: `1px solid ${item.color}33`,
                animation: 'suggestionFade 0.3s ease', animationDelay: `${i * 0.08}s`, animationFillMode: 'both',
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: item.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: item.color, marginBottom: 3 }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.5 }}>{item.text}</div>
                </div>
              </div>
            ))}
            <div style={{ gridColumn: '1/-1', fontSize: 10, color: 'var(--text3)', textAlign: 'right' }}>
              ✦ AI Personalized • {segment?.label || 'Customer'}
            </div>
          </div>
        )}
      </Card>

      {/* Segment Benefits & Recommendations */}
      {segment?.benefits && segment.benefits.length > 0 && (
        <Card style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{segStyle.icon}</span> Your {segStyle.label} Benefits
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {segment.benefits.map((benefit, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text2)' }}>
                <span style={{ color: segStyle.text }}>✦</span> {benefit}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* AI Recommendations */}
        <Card>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>🤖 AI Personalised Recommendations</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
            Based on your {segment?.label || 'customer'} profile
          </div>
          {recommendations.length > 0 ? recommendations.slice(0, 4).map((rec, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '12px 0', borderBottom: i < Math.min(recommendations.length, 4) - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: segStyle.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                {rec.charAt(0)}
              </div>
              <div style={{ flex: 1, fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
                {rec}
              </div>
            </div>
          )) : (
            <div style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: 20 }}>
              Start shopping to get personalised recommendations!
            </div>
          )}
        </Card>

        {/* Quick links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { icon:'🛍️', title:'Shop',          desc:'Browse all products',    path:'/customer/shop',         color:'#6366f1' },
            { icon:'🔍', title:'Visual Search', desc:'Find products by photo', path:'/customer/visual-search', color:'#8b5cf6' },
            { icon:'🔄', title:'Reorder AI',    desc:'Smart reorder analysis',  path:'/customer/reorder',        color:'#10b981' },
            { icon:'📋', title:'My Orders',     desc:'Track all your orders',   path:'/customer/orders',         color:'#f59e0b' },
          ].map(item => (
            <a key={item.path} href={item.path} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = item.color}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: item.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{item.icon}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{item.desc}</div>
                </div>
                <div style={{ marginLeft: 'auto', color: 'var(--text3)' }}>›</div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Recent orders — real data from database */}
      <Card>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Recent Orders</div>

        {loadingOrders ? (
          <Spinner size={28} />
        ) : ordersError ? (
          <div style={{ textAlign: 'center', padding: 30, color: 'var(--danger)', fontSize: 13 }}>
            ⚠️ {ordersError}
          </div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🛒</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No orders yet</div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>
              Start shopping and your orders will appear here.
            </div>
            <a href="/customer/shop" style={{ display: 'inline-block', marginTop: 16, padding: '10px 24px', background: 'var(--primary)', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
              🛍️ Browse Products
            </a>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Order ID','Product','Date','Amount','Status','Next Reorder'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 6).map(o => {
                const productNames = (o.items || []).map(i => i.productName).filter(Boolean);
                const productLabel = productNames.length > 1
                  ? `${productNames[0]} +${productNames.length - 1} more`
                  : (productNames[0] || '—');
                const nextReorder = o.nextReorderDate ? formatDate(o.nextReorderDate) : null;
                return (
                  <tr key={o._id || o.orderId} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px', fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>{o.orderId || '—'}</td>
                    <td style={{ padding: '12px', fontSize: 13, color: 'var(--text)' }}>{productLabel}</td>
                    <td style={{ padding: '12px', fontSize: 13, color: 'var(--text2)' }}>{formatDate(o.createdAt)}</td>
                    <td style={{ padding: '12px', fontSize: 13, fontWeight: 700 }}>{formatMoney(o.total)}</td>
                    <td style={{ padding: '12px' }}><Badge color={statusColor[o.status] || 'info'}>{o.status?.replace(/_/g, ' ') || '—'}</Badge></td>
                    <td style={{ padding: '12px', fontSize: 12, color: 'var(--text2)' }}>🤖 {nextReorder || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {!loadingOrders && orders.length > 6 && (
          <div style={{ textAlign: 'center', paddingTop: 16 }}>
            <a href="/customer/orders" style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              View all {orders.length} orders →
            </a>
          </div>
        )}
      </Card>
    </Layout>
  );
}