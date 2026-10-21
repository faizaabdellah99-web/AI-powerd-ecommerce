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

  

  return (
    <Layout title={`Hi, ${user?.name?.split(' ')[0] || 'there'} 👋`} subtitle="Your personal AI shopping assistant">
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