import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout';
import StatCard from '../../components/shared/StatCard';
import Card from '../../components/shared/Card';
import Badge from '../../components/shared/Badge';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { getSocket } from '../../hooks/useSocket';

const recentOrders = [
  { id:'ORD-001', product:'Wireless Headphones', date:'2024-12-01', status:'delivered', amount:'$79.99', nextReorder:'2025-01-01' },
  { id:'ORD-002', product:'Coffee Maker X1',     date:'2024-11-20', status:'shipped',   amount:'$49.99', nextReorder:'2025-02-20' },
  { id:'ORD-003', product:'Running Shoes V2',    date:'2024-11-05', status:'delivered', amount:'$99.99', nextReorder:'2025-05-05' },
];

const statusColor = { delivered: 'success', shipped: 'info', pending: 'warning', cancelled: 'danger' };

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
  const [loading, setLoading] = useState(true);

  // Use user data from store directly (login already returns enriched segment data)
  useEffect(() => {
    if (user?.segmentDetails) {
      // Data already available from login response
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
          // Use defaults
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
  const stats = segmentData?.stats || { totalOrders: 0, totalSpent: 0, avgOrder: 0 };
  const categories = segmentData?.favouriteCategories || user?.preferences || ['Electronics', 'Home & Living', 'Sports'];
  const recommendations = segmentData?.recommendations || [];
  const segStyle = segmentColors[segment?.key] || segmentColors.regular;

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

      {/* Recent orders */}
      <Card>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Recent Orders</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Order ID','Product','Date','Amount','Status','Next Reorder'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentOrders.map(o => (
              <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px', fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>{o.id}</td>
                <td style={{ padding: '12px', fontSize: 13, color: 'var(--text)' }}>{o.product}</td>
                <td style={{ padding: '12px', fontSize: 13, color: 'var(--text2)' }}>{o.date}</td>
                <td style={{ padding: '12px', fontSize: 13, fontWeight: 700 }}>{o.amount}</td>
                <td style={{ padding: '12px' }}><Badge color={statusColor[o.status]}>{o.status}</Badge></td>
                <td style={{ padding: '12px', fontSize: 12, color: 'var(--text2)' }}>🤖 {o.nextReorder}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </Layout>
  );
}