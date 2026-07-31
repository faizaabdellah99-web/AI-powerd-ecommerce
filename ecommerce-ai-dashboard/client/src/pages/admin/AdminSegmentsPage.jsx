import { useState, useEffect, useMemo } from 'react';
import Layout from '../../components/shared/Layout';
import Card from '../../components/shared/Card';
import StatCard from '../../components/shared/StatCard';
import Badge from '../../components/shared/Badge';
import api from '../../services/api';
import {
  PieChart, Pie, Cell, BarChart as ReBarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';

// ─── Color palette for charts ──────────────────────────────────────────────────
const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#3b82f6','#f97316','#dc2626'];

// ─── Helper: horizontal bar chart component ────────────────────────────────────
function BarChart({ data, labelKey, valueKey, colorKey, maxValue, height = 220 }) {
  if (!data || data.length === 0) return <div style={{ color:'var(--text3)', fontSize:13, textAlign:'center', padding:20 }}>No data</div>;
  const max = maxValue || Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10, height, justifyContent:'flex-end', paddingTop:10 }}>
      {data.map((item, i) => {
        const pct = (item[valueKey] / max) * 100;
        return (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ width:110, fontSize:12, color:'var(--text2)', textAlign:'right', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {item[labelKey]}
            </span>
            <div style={{ flex:1, height:22, background:'var(--border)', borderRadius:6, overflow:'hidden' }}>
              <div style={{
                width: `${Math.max(pct, 2)}%`,
                height:'100%',
                background: item[colorKey] || COLORS[i % COLORS.length],
                borderRadius:6,
                transition:'width 0.5s ease',
                display:'flex',
                alignItems:'center',
                paddingLeft:6,
              }}>
                <span style={{ fontSize:10, color:'#fff', fontWeight:600, whiteSpace:'nowrap' }}>
                  {item[valueKey]}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Helper: donut/pie chart (simple CSS) ─────────────────────────────────────
function DonutChart({ data, labelKey, valueKey, colorKey, size = 160 }) {
  if (!data || data.length === 0) return <div style={{ color:'var(--text3)', fontSize:13, textAlign:'center', padding:20 }}>No data</div>;
  const total = data.reduce((s, d) => s + (d[valueKey] || 0), 0) || 1;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:20 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="var(--border)" strokeWidth={20} />
        {data.map((item, i) => {
          const pct = item[valueKey] / total;
          const dashLength = pct * circumference;
          const dashOffset = -accumulated * circumference;
          accumulated += pct;
          return (
            <circle
              key={i}
              cx={size/2}
              cy={size/2}
              r={radius}
              fill="none"
              stroke={item[colorKey] || COLORS[i % COLORS.length]}
              strokeWidth={20}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${size/2} ${size/2})`}
              style={{ transition:'stroke-dasharray 0.5s ease' }}
            />
          );
        })}
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central" fill="var(--text)" fontSize={24} fontWeight={700}>
          {total}
        </text>
      </svg>
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center', maxWidth:250 }}>
        {data.map((item, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--text2)' }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background: item[colorKey] || COLORS[i % COLORS.length], display:'inline-block' }}></span>
            {item[labelKey]}: {item[valueKey]}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Filter button component ────────────────────────────────────────────────────
function FilterButton({ label, active, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px',
        borderRadius: 20,
        border: `2px solid ${active ? (color || 'var(--primary)') : 'var(--border)'}`,
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 600,
        background: active ? (color || 'var(--primary)') : 'transparent',
        color: active ? '#fff' : 'var(--text2)',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

export default function AdminSegmentsPage() {
  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('customers');

  // ── Data states ────────────────────────────────────────────────────────────
  const [customerData, setCustomerData] = useState(null);
  const [productSegData, setProductSegData] = useState(null);
  const [salesData, setSalesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Filter states ──────────────────────────────────────────────────────────
  const [customerFilter, setCustomerFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');

  // ── Aggregation data (from MongoDB aggregation APIs) ──────────────────────
  const [aggCategoryData, setAggCategoryData] = useState(null);
  const [aggLocationData, setAggLocationData] = useState(null);
  const [aggAIInsights, setAggAIInsights] = useState(null);
  const [aggLoading, setAggLoading] = useState(false);

  // ── Sales tab filter states ───────────────────────────────────────────────
  const [salesCityFilter, setSalesCityFilter] = useState('all');
  const [salesDaysFilter, setSalesDaysFilter] = useState('all');

  // ── Available cities from location data ────────────────────────────────────
  const availableCities = useMemo(() => {
    if (!aggLocationData?.locations) return [];
    return aggLocationData.locations.map(l => l.city);
  }, [aggLocationData]);

  // ── Fetch aggregation data ────────────────────────────────────────────────
  const fetchAggregation = async (city, days) => {
    setAggLoading(true);
    try {
      const cityParam = city || salesCityFilter;
      const daysParam = days || salesDaysFilter;

      // Build query strings
      const catParams = new URLSearchParams();
      const locParams = new URLSearchParams();
      if (cityParam && cityParam !== 'all') catParams.set('city', cityParam);
      if (daysParam && daysParam !== 'all') {
        catParams.set('days', daysParam);
        locParams.set('days', daysParam);
      }
      const catQuery = catParams.toString() ? `?${catParams.toString()}` : '';
      const locQuery = locParams.toString() ? `?${locParams.toString()}` : '';

      const [catRes, locRes, insightRes] = await Promise.allSettled([
        api.get(`/sales-aggregation/category${catQuery}`),
        api.get(`/sales-aggregation/location${locQuery}`),
        api.get('/sales-aggregation/ai-insights'),
      ]);
      if (catRes.status === 'fulfilled') setAggCategoryData(catRes.value.data);
      else console.error('Category aggregation failed:', catRes.reason);

      if (locRes.status === 'fulfilled') setAggLocationData(locRes.value.data);
      else console.error('Location aggregation failed:', locRes.reason);

      if (insightRes.status === 'fulfilled') setAggAIInsights(insightRes.value.data);
      else console.error('AI insights failed:', insightRes.reason);
    } catch (e) {
      console.error('Aggregation fetch error:', e.message);
    } finally {
      setAggLoading(false);
    }
  };

  // ── Fetch all data ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        setError('');

        const [custRes, prodRes, salesRes] = await Promise.allSettled([
          api.get('/segments/customers'),
          api.get('/product-segments/overview'),
          api.get('/sale-segments/overview'),
        ]);

        if (custRes.status === 'fulfilled') setCustomerData(custRes.value.data);
        else {
          console.error('Customer segments fetch failed:', custRes.reason);
          try {
            const fallback = await api.get('/segments/customers');
            setCustomerData(fallback.data);
          } catch {}
        }

        if (prodRes.status === 'fulfilled') setProductSegData(prodRes.value.data);
        else {
          console.error('Product segments fetch failed:', prodRes.reason);
          try {
            const fallback = await api.get('/products/segments/all');
            setProductSegData(fallback.data);
          } catch {}
        }

        if (salesRes.status === 'fulfilled') setSalesData(salesRes.value.data);
        else {
          console.error('Sales segments fetch failed:', salesRes.reason);
          try {
            const fallback = await api.get('/orders/segments/all');
            setSalesData(fallback.data);
          } catch {}
        }

        if (custRes.status === 'rejected' && prodRes.status === 'rejected' && salesRes.status === 'rejected') {
          setError('Failed to load segment data. Make sure the server is running.');
        }

        // ── Now fetch aggregation data (wait for it) ──
        await fetchAggregation('all', 'all');
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // ── Re-fetch aggregation data when sales filters change ────────────────────
  useEffect(() => {
    if (activeTab === 'sales') {
      fetchAggregation(salesCityFilter, salesDaysFilter);
    }
  }, [salesCityFilter, salesDaysFilter, activeTab]);

  // ── Derived data: customer segments ───────────────────────────────────────
  const customerSegments = useMemo(() => {
    if (!customerData?.segmentCounts) return [];
    return Object.entries(customerData.segmentCounts)
      .filter(([_, count]) => count > 0)
      .map(([key, count]) => ({
        key,
        count,
        label: ({ vip: '👑 VIP', regular: '⭐ Regular', occasional: '🔄 Occasional', new: '🆕 New', atrisk: '⚠️ At Risk', inactive: '😴 Inactive' })[key] || key,
        color: ({ vip: '#f59e0b', regular: '#10b981', occasional: '#8b5cf6', new: '#3b82f6', atrisk: '#ef4444', inactive: '#64748b' })[key] || '#64748b',
      }))
      .sort((a, b) => b.count - a.count);
  }, [customerData]);

  // ── Derived data: product segments ────────────────────────────────────────
  const productSegments = useMemo(() => {
    if (!productSegData) return [];
    return Object.entries(productSegData).map(([key, seg]) => ({
      key,
      count: seg.count || 0,
      label: seg.label || key,
      color: seg.color || '#64748b',
      bg: seg.bg || '#64748b15',
      description: seg.description || '',
      action: seg.action || '',
      totalValue: seg.totalValue || 0,
      products: seg.products || [],
    })).sort((a, b) => b.count - a.count);
  }, [productSegData]);

  // ── Filtered customers ────────────────────────────────────────────────────
  const filteredCustomers = useMemo(() => {
    if (!customerData?.customers) return [];
    let list = [...customerData.customers];

    switch (customerFilter) {
      case 'highValue':
        list = list.filter(c => c.segment === 'vip' || (c.segment === 'regular' && c.avgOrder > 100));
        break;
      case 'new':
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
        list = list.filter(c => new Date(c.createdAt) > thirtyDaysAgo && c.totalOrders <= 1);
        break;
      case 'churnRisk':
        list = list.filter(c => c.segment === 'atrisk' || c.segment === 'inactive');
        break;
      default:
        break;
    }
    return list;
  }, [customerData, customerFilter]);

  // ── Filtered products ─────────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    if (!productSegData) return [];
    let result = {};

    if (productFilter === 'all') {
      result = productSegData;
    } else {
      Object.entries(productSegData).forEach(([key, seg]) => {
        if (key === productFilter) {
          result[key] = seg;
        }
      });
    }
    return result;
  }, [productSegData, productFilter]);

  const totalCustomers = customerData?.totalCustomers || 0;
  const totalProducts = productSegments.reduce((s, p) => s + p.count, 0);
  const totalCategorySales = salesData?.categorySegments?.reduce((s, c) => s + parseFloat(c.sales?.replace(/[$,]/g,'') || 0), 0) || 0;
  const totalLocationSales = salesData?.locationSales?.reduce((s, l) => s + parseFloat(l.sales?.replace(/[$,]/g,'') || 0), 0) || 0;

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout title="📊 Segmentation Analysis" subtitle="Customer, Product, and Sales Segments">
        <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text3)' }}>
          <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>
          <div>Loading segment data from database...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="📊 Segmentation Analysis" subtitle="Customer, Product, and Sales Segments">
      {error && (
        <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:10, padding:12, marginBottom:16, fontSize:13, color:'#ef4444' }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Overview Stats ─────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        <StatCard label="Total Customers" value={totalCustomers} icon="👥" color="var(--primary)" />
        <StatCard label="Total Products" value={totalProducts} icon="📦" color="var(--success)" />
        <StatCard label="Category Sales" value={`$${(totalCategorySales/1000).toFixed(1)}K`} icon="💰" color="var(--warning)" />
        <StatCard label="Location Sales" value={`$${(totalLocationSales/1000).toFixed(1)}K`} icon="📍" color="var(--danger)" />
      </div>

      {/* ── Tab Navigation ─────────────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:8, marginBottom:24, borderBottom:'1px solid var(--border)', paddingBottom:16 }}>
        {[
          { id: 'customers', label: '👥 Customer Segments' },
          { id: 'products',  label: '📦 Product Segments' },
          { id: 'sales',     label: '💰 Sales Segments' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--text2)',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          CUSTOMER SEGMENTS TAB
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'customers' && (
        <div>
          <div style={{ marginBottom:20 }}>
            <h3 style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>የደንበኞች ምድብ (Customer Segments)</h3>
            <p style={{ fontSize:13, color:'var(--text3)' }}>ብዙ ብር ያወጡ፣ አዲስ የተመዘገቡ እና ሊጠፉ የሚችሉ ደንበኞችን ለይቶ ማሳየት</p>
          </div>

          {/* Distribution Chart */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:24 }}>
            <Card>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:16 }}>📊 Customer Segment Distribution</div>
              <DonutChart
                data={customerSegments}
                labelKey="label"
                valueKey="count"
                colorKey="color"
                size={180}
              />
            </Card>
            <Card>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:16 }}>📈 Segment Size Comparison</div>
              <BarChart
                data={customerSegments}
                labelKey="label"
                valueKey="count"
                colorKey="color"
              />
            </Card>
          </div>

          {/* Filter Buttons */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:8, color:'var(--text2)' }}>
              🔍 Filter by Customer Type:
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <FilterButton
                label="👥 All Customers"
                active={customerFilter === 'all'}
                onClick={() => setCustomerFilter('all')}
                color="var(--primary)"
              />
              <FilterButton
                label="💰 High-Value Users"
                active={customerFilter === 'highValue'}
                onClick={() => setCustomerFilter('highValue')}
                color="#f59e0b"
              />
              <FilterButton
                label="🆕 New Users"
                active={customerFilter === 'new'}
                onClick={() => setCustomerFilter('new')}
                color="#3b82f6"
              />
              <FilterButton
                label="⚠️ Churn Risk"
                active={customerFilter === 'churnRisk'}
                onClick={() => setCustomerFilter('churnRisk')}
                color="#ef4444"
              />
            </div>
          </div>

          {/* Customer Table */}
          <Card style={{ marginBottom:24, overflow:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  <th style={{ textAlign:'left', padding:'12px', fontSize:12, color:'var(--text3)', fontWeight:600 }}>Customer</th>
                  <th style={{ textAlign:'left', padding:'12px', fontSize:12, color:'var(--text3)', fontWeight:600 }}>Segment</th>
                  <th style={{ textAlign:'center', padding:'12px', fontSize:12, color:'var(--text3)', fontWeight:600 }}>Orders</th>
                  <th style={{ textAlign:'center', padding:'12px', fontSize:12, color:'var(--text3)', fontWeight:600 }}>Total Spent</th>
                  <th style={{ textAlign:'center', padding:'12px', fontSize:12, color:'var(--text3)', fontWeight:600 }}>Avg Order</th>
                  <th style={{ textAlign:'center', padding:'12px', fontSize:12, color:'var(--text3)', fontWeight:600 }}>Last Order</th>
                  <th style={{ textAlign:'left', padding:'12px', fontSize:12, color:'var(--text3)', fontWeight:600 }}>Categories</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign:'center', padding:30, color:'var(--text3)', fontSize:13 }}>
                      No customers found for this filter.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.slice(0, 50).map(c => (
                    <tr key={c._id} style={{ borderBottom:'1px solid var(--border)' }}>
                      <td style={{ padding:'10px 12px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:700 }}>
                            {c.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div style={{ fontSize:13, fontWeight:600 }}>{c.name}</div>
                            <div style={{ fontSize:11, color:'var(--text3)' }}>{c.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:'10px 12px' }}>
                        <span style={{ background: c.segmentColor + '20', color: c.segmentColor, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, whiteSpace:'nowrap' }}>
                          {c.segmentLabel}
                        </span>
                      </td>
                      <td style={{ padding:'10px 12px', textAlign:'center', fontSize:14, fontWeight:600 }}>{c.totalOrders}</td>
                      <td style={{ padding:'10px 12px', textAlign:'center', fontSize:14, fontWeight:600 }}>${(c.totalSpent || 0).toLocaleString()}</td>
                      <td style={{ padding:'10px 12px', textAlign:'center', fontSize:13 }}>${c.avgOrder || 0}</td>
                      <td style={{ padding:'10px 12px', textAlign:'center', fontSize:13, color:'var(--text2)' }}>
                        {c.daysSinceLastOrder !== null ? `${c.daysSinceLastOrder}d ago` : '—'}
                      </td>
                      <td style={{ padding:'10px 12px' }}>
                        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                          {(c.favouriteCategories || []).slice(0, 2).map((cat, i) => (
                            <span key={i} style={{ fontSize:10, color:'var(--text3)', background:'var(--border)', padding:'2px 8px', borderRadius:10 }}>
                              {cat}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {filteredCustomers.length > 50 && (
              <div style={{ textAlign:'center', padding:12, fontSize:12, color:'var(--text3)' }}>
                Showing first 50 of {filteredCustomers.length} customers
              </div>
            )}
          </Card>

          {/* AI Recommendations */}
          <Card>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:12 }}>✦ AI Recommendations for Customer Segments</div>
            <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.8 }}>
              <div style={{ marginBottom:12 }}>
                <strong style={{ color:'#f59e0b' }}>👑 VIP Customers:</strong> Send exclusive early access to new products, VIP-only discounts (15-20%), and priority customer support.
              </div>
              <div style={{ marginBottom:12 }}>
                <strong style={{ color:'#ef4444' }}>⚠️ At Risk Customers:</strong> Send 20% win-back coupon with 7-day expiry. Follow up by SMS after 3 days if no response.
              </div>
              <div style={{ marginBottom:12 }}>
                <strong style={{ color:'#3b82f6' }}>🆕 New Customers:</strong> Trigger 3-email welcome sequence over 14 days. Include platform guide + first-purchase discount.
              </div>
              <div>
                <strong style={{ color:'#10b981' }}>⭐ Regular Customers:</strong> Reward loyalty with 10% discount on next purchase. Show "Frequently bought together" suggestions.
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PRODUCT SEGMENTS TAB
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'products' && (
        <div>
          <div style={{ marginBottom:20 }}>
            <h3 style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>የዕቃዎች ምድብ (Product Segments)</h3>
            <p style={{ fontSize:13, color:'var(--text3)' }}>በፍጥነት የሚሸጡ፣ የተቀመጡ (Dead Stock) እና ቅድም መታዘዝ ያለባቸውን ዕቃዎች ለይቶ ማሳየት</p>
          </div>

          {/* Product Distribution Chart */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:24 }}>
            <Card>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:16 }}>📊 Product Segment Distribution</div>
              <DonutChart
                data={productSegments}
                labelKey="label"
                valueKey="count"
                colorKey="color"
                size={180}
              />
            </Card>
            <Card>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:16 }}>📈 Products by Segment</div>
              <BarChart
                data={productSegments}
                labelKey="label"
                valueKey="count"
                colorKey="color"
              />
            </Card>
          </div>

          {/* Product Filter Buttons */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:8, color:'var(--text2)' }}>
              🔍 Filter by Product Type:
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <FilterButton label="📦 All Products" active={productFilter === 'all'} onClick={() => setProductFilter('all')} color="var(--primary)" />
              <FilterButton label="🚀 Fast-Moving" active={productFilter === 'fastMoving'} onClick={() => setProductFilter('fastMoving')} color="#10b981" />
              <FilterButton label="🔴 Critical Low Stock" active={productFilter === 'criticalLowStock'} onClick={() => setProductFilter('criticalLowStock')} color="#dc2626" />
              <FilterButton label="⚠️ Low Stock" active={productFilter === 'lowStock'} onClick={() => setProductFilter('lowStock')} color="#f97316" />
              <FilterButton label="💀 Dead Stock" active={productFilter === 'deadStock'} onClick={() => setProductFilter('deadStock')} color="#ef4444" />
              <FilterButton label="❌ Out of Stock" active={productFilter === 'outOfStock'} onClick={() => setProductFilter('outOfStock')} color="#991b1b" />
            </div>
          </div>

          {/* Product Segments Table */}
          <Card style={{ marginBottom:24, overflow:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  <th style={{ textAlign:'left', padding:'12px', fontSize:12, color:'var(--text3)', fontWeight:600 }}>Segment</th>
                  <th style={{ textAlign:'center', padding:'12px', fontSize:12, color:'var(--text3)', fontWeight:600 }}>Count</th>
                  <th style={{ textAlign:'left', padding:'12px', fontSize:12, color:'var(--text3)', fontWeight:600 }}>Description</th>
                  <th style={{ textAlign:'left', padding:'12px', fontSize:12, color:'var(--text3)', fontWeight:600 }}>Action Required</th>
                  <th style={{ textAlign:'center', padding:'12px', fontSize:12, color:'var(--text3)', fontWeight:600 }}>Inventory Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(filteredProducts).length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign:'center', padding:30, color:'var(--text3)', fontSize:13 }}>
                      No products found for this segment.
                    </td>
                  </tr>
                ) : (
                  Object.entries(filteredProducts).map(([key, seg]) => (
                    <tr key={key} style={{ borderBottom:'1px solid var(--border)' }}>
                      <td style={{ padding:'12px' }}>
                        <span style={{ background: seg.bg || `${seg.color}15`, color: seg.color, fontSize:11, fontWeight:700, padding:'4px 12px', borderRadius:20, whiteSpace:'nowrap' }}>
                          {seg.label || key}
                        </span>
                      </td>
                      <td style={{ padding:'12px', textAlign:'center', fontSize:16, fontWeight:700, color: seg.color }}>{seg.count || 0}</td>
                      <td style={{ padding:'12px', fontSize:13, color:'var(--text2)', maxWidth:220 }}>
                        {seg.description || ''}
                        {seg.count > 0 && seg.products?.length > 0 && (
                          <div style={{ marginTop:4, fontSize:11, color:'var(--text3)' }}>
                            e.g. {seg.products.slice(0, 2).map(p => p.name).join(', ')}
                          </div>
                        )}
                      </td>
                      <td style={{ padding:'12px', fontSize:13, color: seg.color, fontWeight:500 }}>
                        {seg.action || 'Monitor'}
                      </td>
                      <td style={{ padding:'12px', textAlign:'center', fontSize:13, fontWeight:600 }}>
                        ${(seg.totalValue || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>

          {/* AI Recommendations for Products */}
          <Card>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:12 }}>✦ AI Recommendations for Product Segments</div>
            <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.8 }}>
              <div style={{ marginBottom:12 }}>
                <strong style={{ color:'#10b981' }}>🚀 Fast-Moving:</strong> Increase inventory by 30% and feature on homepage. Consider bundling with complementary products to increase average order value.
              </div>
              <div style={{ marginBottom:12 }}>
                <strong style={{ color:'#ef4444' }}>💀 Dead Stock:</strong> Run clearance sale with 40-60% discount. Bundle with popular items or donate for tax write-off. Review if these products should be discontinued.
              </div>
              <div style={{ marginBottom:12 }}>
                <strong style={{ color:'#dc2626' }}>🔴 Critical Low Stock:</strong> Immediate restock required! Contact suppliers for expedited shipping. Consider temporary price increase to manage remaining demand.
              </div>
              <div>
                <strong style={{ color:'#f59e0b' }}>🐌 Slow-Moving:</strong> Review pricing strategy, run promotional campaign, or reposition product. Consider removing from premium placement.
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SALES SEGMENTS TAB
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'sales' && (
        <div>
          <div style={{ marginBottom:20 }}>
            <h3 style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>የሽያጭ ምድብ (Sales Segments)</h3>
            <p style={{ fontSize:13, color:'var(--text3)' }}>የትኛው የዕቃ ዓይነት (Category) እና የትኛው አካባቢ የተሻለ ሽያጭ እንዳለው መለየት</p>
          </div>

          {/* ── Sales Filter Controls ── */}
          <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
            {/* Location Filter */}
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:13, fontWeight:600, color:'var(--text2)', whiteSpace:'nowrap' }}>📍 አካባቢ (Area):</span>
              <select
                value={salesCityFilter}
                onChange={e => setSalesCityFilter(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  color: 'var(--text)',
                  fontSize: 12,
                  cursor: 'pointer',
                  outline: 'none',
                  minWidth: 120,
                }}
              >
                <option value="all">🌍 ሁሉም (All)</option>
                {availableCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            {/* Time Period Filter */}
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:13, fontWeight:600, color:'var(--text2)', whiteSpace:'nowrap' }}>📅 ጊዜ (Period):</span>
              <div style={{ display:'flex', gap:4 }}>
                {[
                  { value: 'all', label: 'ሁሉም' },
                  { value: '7', label: '7 ቀን' },
                  { value: '30', label: '30 ቀን' },
                  { value: '90', label: '90 ቀን' },
                ].map(opt => (
                  <FilterButton
                    key={opt.value}
                    label={opt.label}
                    active={salesDaysFilter === opt.value}
                    onClick={() => setSalesDaysFilter(opt.value)}
                    color="var(--primary)"
                  />
                ))}
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchAggregation(salesCityFilter, salesDaysFilter)}
              disabled={aggLoading}
              style={{
                padding: '6px 16px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                cursor: aggLoading ? 'not-allowed' : 'pointer',
                fontSize: 12,
                fontWeight: 600,
                background: aggLoading ? 'var(--border)' : 'var(--primary)',
                color: aggLoading ? 'var(--text3)' : '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                opacity: aggLoading ? 0.7 : 1,
              }}
            >
              {aggLoading ? '⏳' : '🔄'} {aggLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {/* ── Aggregation Loading ── */}
          {aggLoading && (
            <div style={{ textAlign:'center', padding:20, color:'var(--text3)', fontSize:13, marginBottom:16 }}>
              ⏳ Loading real-time sales aggregation data for <strong>{salesCityFilter === 'all' ? 'all areas' : salesCityFilter}</strong>...
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:24 }}>
            {/* ── Category Performance — Pie Chart ── */}
            <Card>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:16 }}>📊 Category Performance</div>
              {aggLoading ? (
                <div style={{ textAlign:'center', padding:30, color:'var(--text3)', fontSize:13 }}>⏳ Loading...</div>
              ) : aggCategoryData?.categories?.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={aggCategoryData.categories}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        dataKey="totalSales"
                        nameKey="category"
                        paddingAngle={3}
                      >
                        {aggCategoryData.categories.map((entry, i) => (
                          <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name, props) => [`$${Number(value).toLocaleString()}`, props.payload.category]}
                        contentStyle={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginTop:8 }}>
                    {aggCategoryData.categories.map((item, i) => (
                      <div key={item.category} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text2)' }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background: item.color || COLORS[i % COLORS.length], flexShrink:0 }} />
                        <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.category}</span>
                        <span style={{ color:'var(--text)', fontWeight:600 }}>{item.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ textAlign:'center', padding:30, color:'var(--text3)', fontSize:13 }}>
                  📭 No paid orders yet. Create orders through the Shop to see category sales data here.
                </div>
              )}
            </Card>

            {/* ── Location Performance — Bar Chart ── */}
            <Card>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:16 }}>📍 Location Performance</div>
              {aggLoading ? (
                <div style={{ textAlign:'center', padding:30, color:'var(--text3)', fontSize:13 }}>⏳ Loading...</div>
              ) : aggLocationData?.locations?.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <ReBarChart data={aggLocationData.locations.slice(0, 8)} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis type="number" tick={{ fill:'var(--text2)', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="city" tick={{ fill:'var(--text2)', fontSize:11 }} axisLine={false} tickLine={false} width={80} />
                      <Tooltip
                        formatter={(value, name, props) => [`$${Number(value).toLocaleString()}`, props.payload.city]}
                        contentStyle={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }}
                      />
                      <Bar dataKey="totalSales" radius={[0, 4, 4, 0]}>
                        {aggLocationData.locations.slice(0, 8).map((entry, i) => (
                          <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </ReBarChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop:12 }}>
                    {aggLocationData.locations.slice(0, 5).map((loc, idx) => (
                      <div key={idx} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom: idx < Math.min(aggLocationData.locations.length, 5) - 1 ? '1px solid var(--border)' : 'none' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <span style={{ width:20, height:20, borderRadius:6, background: loc.color || COLORS[idx % COLORS.length], display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#fff' }}>{idx + 1}</span>
                          <div>
                            <div style={{ fontSize:13, fontWeight:600 }}>{loc.city}</div>
                            <div style={{ fontSize:11, color:'var(--text3)' }}>{loc.orderCount} orders · {loc.customerCount} customers</div>
                          </div>
                        </div>
                        <div style={{ fontSize:13, fontWeight:700 }}>${Number(loc.totalSales).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ textAlign:'center', padding:30, color:'var(--text3)', fontSize:13 }}>
                  📭 No paid orders yet. Create orders through the Shop to see location performance here.
                </div>
              )}
            </Card>
          </div>

          {/* ── AI Recommendations from Real Sales Data ── */}
          <Card>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:12 }}>✦ AI Recommendations for Sales Segments</div>
            {aggAIInsights?.insights?.empty ? (
              <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.8 }}>
                <div style={{ marginBottom:12, padding:'14px 16px', background:'var(--bg3)', borderRadius:10, textAlign:'center' }}>
                  <div style={{ fontSize:24, marginBottom:8 }}>📭</div>
                  <div style={{ fontWeight:600, color:'var(--text)', marginBottom:4 }}>No sales data yet</div>
                  <div style={{ color:'var(--text3)', fontSize:12 }}>
                    Place orders through the customer Shop to see AI-powered sales insights, category trends, and location performance here.
                  </div>
                </div>
              </div>
            ) : aggAIInsights?.insights ? (
              <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.8 }}>
                {aggAIInsights.insights.bestCategory && (
                  <div style={{ marginBottom:12, padding:'10px 14px', background:'#10b98115', border:'1px solid #10b98133', borderRadius:10 }}>
                    <strong style={{ color:'#10b981' }}>🏆 Best Performing Category:</strong>{' '}
                    {aggAIInsights.insights.bestCategory.category} grew by <strong>{aggAIInsights.insights.bestCategory.growth}%</strong> with ${Number(aggAIInsights.insights.bestCategory.sales).toLocaleString()} in sales. Increase marketing budget and ensure adequate stock levels.
                  </div>
                )}
                {aggAIInsights.insights.worstCategory && (
                  <div style={{ marginBottom:12, padding:'10px 14px', background:'#ef444415', border:'1px solid #ef444433', borderRadius:10 }}>
                    <strong style={{ color:'#ef4444' }}>📉 Declining Category:</strong>{' '}
                    {aggAIInsights.insights.worstCategory.category} sales dropped by <strong>{Math.abs(aggAIInsights.insights.worstCategory.growth)}%</strong> (from ${Number(aggAIInsights.insights.worstCategory.previous).toLocaleString()} to ${Number(aggAIInsights.insights.worstCategory.sales).toLocaleString()}). Consider running a discount campaign or bundling with popular items.
                  </div>
                )}
                {aggAIInsights.insights.topLocation && (
                  <div style={{ marginBottom:12, padding:'10px 14px', background:'#6366f115', border:'1px solid #6366f133', borderRadius:10 }}>
                    <strong style={{ color:'#6366f1' }}>📍 Top Location:</strong>{' '}
                    {aggAIInsights.insights.topLocation.city} leads with ${Number(aggAIInsights.insights.topLocation.sales).toLocaleString()} across {aggAIInsights.insights.topLocation.orders} orders. Expand delivery options and run targeted local promotions.
                  </div>
                )}
                <div style={{ marginTop:12, padding:'10px 14px', background:'var(--bg3)', borderRadius:10 }}>
                  <strong style={{ color:'var(--text)' }}>📊 Summary:</strong>{' '}
                  Total category sales: <strong>${Number(aggAIInsights.insights.totalCategorySales).toLocaleString()}</strong> across {aggAIInsights.insights.categoryCount} categories. Total location sales: <strong>${Number(aggAIInsights.insights.totalLocationSales).toLocaleString()}</strong> across {aggAIInsights.insights.locationCount} locations.
                </div>
              </div>
            ) : (
              <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.8 }}>
                <div style={{ marginBottom:12, padding:'10px 14px', background:'#6366f115', border:'1px solid #6366f133', borderRadius:10 }}>
                  <strong style={{ color:'#6366f1' }}>📊 Category Strategy:</strong> Focus marketing budget on categories with positive growth. Investigate decline in declining categories — consider product refresh or promotional campaign.
                </div>
                <div style={{ padding:'10px 14px', background:'#10b98115', border:'1px solid #10b98133', borderRadius:10 }}>
                  <strong style={{ color:'#10b981' }}>📍 Location Strategy:</strong> Expand delivery options and marketing in top-performing locations. For declining regions, consider local marketing push or review delivery logistics.
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </Layout>
  );
}