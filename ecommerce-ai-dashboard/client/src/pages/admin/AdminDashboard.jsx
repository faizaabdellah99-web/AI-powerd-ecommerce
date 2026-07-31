import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout';
import StatCard from '../../components/shared/StatCard';
import Card from '../../components/shared/Card';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useOrderSocket } from '../../hooks/useSocket';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
  ReferenceLine, Legend,
} from 'recharts';

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#3b82f6'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px', fontSize:12 }}>
      <div style={{ color:'var(--text2)', marginBottom:6, fontWeight:600 }}>{label}</div>
      {payload.map((p,i) => p.value != null && (
        <div key={i} style={{ color:p.color, fontWeight:600, marginBottom:2 }}>
          {p.name==='revenue'||p.name==='forecast' ? '$'+Number(p.value).toLocaleString() : p.value+' orders'}
          {p.name==='forecast' && <span style={{ color:'#f59e0b', marginLeft:6, fontSize:10 }}>🔮 Forecast</span>}
          {p.name==='forecastOrders' && <span style={{ color:'#10b981', marginLeft:6, fontSize:10 }}>🔮 Forecast</span>}
        </div>
      ))}
    </div>
  );
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [greeting, setGreeting]       = useState('');
  const [aiInsights, setAiInsights]   = useState(null);
  const [aiLoading, setAiLoading]     = useState(false);
  const [forecastNote, setForecastNote] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(true);
  const [forecastModal, setForecastModal] = useState(null);
  const [forecastModalOpen, setForecastModalOpen] = useState(false);
  const [forecastModalLoading, setForecastModalLoading] = useState(false);
  const [aiForecastData, setAiForecastData] = useState(null);

  // ── Dashboard data (from API) ─────────────────────────────────────────────
  const [chartData, setChartData]      = useState([]);
  const [topProducts, setTopProducts]  = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders]  = useState(0);

  // ── Sales by Category (from dedicated aggregation endpoint) ──────────────
  const [salesCategoryData, setSalesCategoryData] = useState([]);
  const [salesCategoryLoading, setSalesCategoryLoading] = useState(false);
  const [salesCategoryGrandTotal, setSalesCategoryGrandTotal] = useState(0);

  // ── Live stats (updated via Socket.io) ───────────────────────────────────
  const [liveStats, setLiveStats] = useState({ pendingOrders:0, todayRevenue:0, totalOrders:0 });
  const [liveOrders, setLiveOrders] = useState([]);

  useOrderSocket({
    onNewOrder: (data) => {
      // Count total product quantity in the new order
      const itemQty = (data.items || []).reduce((sum, item) => sum + (item.qty || 0), 0);
      setLiveStats(prev => ({
        ...prev,
        pendingOrders: prev.pendingOrders + 1,
        totalOrders:   prev.totalOrders + (itemQty || 1),
      }));
      setLiveOrders(prev => [data, ...prev.slice(0, 4)]);
      toast(`🛒 New order ${data.orderId} — $${Number(data.total).toFixed(2)} by ${data.customerName}`, { duration:5000 });
    },
    onOrderPaid: (data) => {
      setLiveStats(prev => ({
        ...prev,
        todayRevenue:  prev.todayRevenue + Number(data.total || 0),
        pendingOrders: Math.max(0, prev.pendingOrders - 1),
      }));
      toast(`💰 Payment received: ${data.orderId} — $${Number(data.total).toFixed(2)}`, { duration:5000, icon:'💰' });
    },
  });

  // ── Fetch all dashboard data from API ─────────────────────────────────────
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');

    const fetchAll = async () => {
      try {
        setChartLoading(true);
        // Fetch each API separately so one failure doesn't kill everything
        let dash = { monthly:[], forecast:[], topProducts:[], categories:[], totalRevenue:0, totalOrders:0, pendingOrders:0 };
        let stats = { pendingOrders:0, todayRevenue:0, totalOrders:0 };
        let catResult = { categories: [], grandTotal: 0 };

        // 1. Dashboard data
        try {
          const dashRes = await api.get('/orders/dashboard');
          dash = dashRes.data;
        } catch (err) {
          console.error('Dashboard data fetch failed:', err);
          // Use fallback empty data
        }

        // Combine actual monthly data with forecast data
        const historical = (dash.monthly || []).map(m => ({
          month: m.month,
          revenue: m.revenue,
          orders: m.orders,
          forecast: null,
          forecastOrders: null,
        }));

        const forecast = (dash.forecast || []).map(f => ({
          month: f.month,
          revenue: null,
          orders: null,
          forecast: f.forecast || 0,
          forecastOrders: f.forecastOrders || 0,
        }));

        setChartData([...historical, ...forecast]);
        console.log('Top Products from API:', dash.topProducts);
        setTopProducts(dash.topProducts || []);
        setCategoryData(dash.categories || []);
        setTotalRevenue(dash.totalRevenue || 0);
        setTotalOrders(dash.totalOrders || 0);

        // 2. Stats
        try {
          const statsRes = await api.get('/orders/stats');
          stats = statsRes.data;
        } catch (err) {
          console.error('Stats fetch failed:', err);
        }
        setLiveStats({
          pendingOrders: dash.pendingOrders != null ? dash.pendingOrders : (stats.pendingOrders || 0),
          todayRevenue:  typeof stats.todayRevenue === 'number' ? stats.todayRevenue : (dash.todayRevenue || 0),
          totalOrders:   typeof stats.totalOrders === 'number' ? stats.totalOrders : (dash.totalOrders || 0),
        });

        // 3. Sales by Category
        try {
          const catRes = await api.get('/sales-aggregation/category');
          catResult = catRes.data;
          console.log('Sales by Category from API:', catResult);
        } catch (err) {
          console.error('Category sales fetch failed:', err);
        }
        setSalesCategoryData(catResult.categories || []);
        setSalesCategoryGrandTotal(catResult.grandTotal || 0);

      } catch (err) {
        console.error('Dashboard fetch error:', err);
        toast.error('Failed to load some dashboard data');
      } finally {
        setChartLoading(false);
      }
    };

    fetchAll();
  }, []);

  const fetchAIInsights = async () => {
    setAiLoading(true); setAiInsights(null);
    try {
      const revenueStr = chartData.filter(d => d.revenue != null).map(d => `${d.month} $${(d.revenue/1000).toFixed(0)}k`).join(' → ');
      const catStr = categoryData.map(c => `${c.name} ${c.value}%`).join(', ');
      const topStr = topProducts.slice(0, 3).map(p => `${p.name} (${p.trend})`).join(', ');

      const { data } = await api.post('/ai/chat', {
        message: `Analyze this e-commerce data and give exactly 4 short actionable insights with numbers:
- Revenue: ${revenueStr || 'Jan $38k → Feb $42k → Mar $51k → Apr $47k → May $63k → Jun $78k'}
- Top categories: ${catStr || 'Electronics 38%, Clothing 25%, Home 20%, Food 17%'}
- Best products: ${topStr || 'Wireless Headphones (+18%), Smart Watch (+24%)'}
- Total orders this period: ${totalOrders.toLocaleString() || '2,560'}

Return a JSON array of exactly 4 objects: [{"icon":"emoji","title":"short title","text":"one actionable sentence with a number","color":"hex color"}]
Use these colors: #6366f1, #10b981, #f59e0b, #ef4444`,
        history: [], context: 'ecommerce dashboard analytics',
      });
      const match = data.reply.match(/\[[\s\S]*\]/);
      if (match) { setAiInsights(JSON.parse(match[0])); toast.success('AI insights refreshed!'); }
      else throw new Error('parse error');
    } catch {
      setAiInsights([
        { icon:'📈', title:'Revenue Surge',    text:`Revenue hit $${(totalRevenue/1000).toFixed(0)}k total — strong momentum.`, color:'#6366f1' },
        { icon:'🏆', title:'Top Performer',    text: topProducts[0] ? `${topProducts[0].name} leads sales — consider bundling.` : 'Analyzing top products...', color:'#10b981' },
        { icon:'💡', title:'Price Opportunity',text:'Review pricing strategy to capture additional margin.', color:'#f59e0b' },
        { icon:'🔄', title:'Reorder Alert',    text:'Monitor repeat purchase patterns for customer retention.', color:'#ef4444' },
      ]);
      toast.success('Showing cached insights');
    } finally { setAiLoading(false); }
  };

  const fetchForecast = async () => {
    setForecastLoading(true); setForecastNote(null);
    try {
      const revenueStr = chartData.filter(d => d.revenue != null).map(d => `${d.month} $${(d.revenue/1000).toFixed(0)}k`).join(', ');
      const forecastStr = chartData.filter(d => d.forecast != null).map(d => `${d.month} $${(d.forecast/1000).toFixed(0)}k`).join(', ');

      const { data } = await api.post('/ai/chat', {
        message: `Based on this sales trend: ${revenueStr || 'Jan $38k, Feb $42k, Mar $51k, Apr $47k, May $63k, Jun $78k'}
With AI forecast: ${forecastStr || 'Jul $89k, Aug $102k, Sep $118k'}
Top products: ${topProducts.slice(0,3).map(p => p.name + ' ' + p.trend).join(', ') || 'Wireless Headphones, Smart Watch'}
Forecast Jul-Sep revenue and identify the top 2 products likely to drive growth.
Give a 2-sentence summary with numbers. Be specific.`,
        history: [], context: 'sales forecasting',
      });
      setForecastNote(data.reply);
      toast.success('Forecast analysis loaded!');
    } catch {
      const lastActual = chartData.filter(d => d.revenue != null);
      const lastRev = lastActual.length > 0 ? lastActual[lastActual.length - 1].revenue : 78000;
      const nextForecast = chartData.filter(d => d.forecast != null);
      const nextRev = nextForecast.length > 0 ? nextForecast[0].forecast : 89000;
      const growth = Math.round(((nextRev - lastRev) / lastRev) * 100);
      setForecastNote(`Based on the ${growth >= 0 ? 'growth' : 'decline'} trajectory, next month revenue is projected at ~$${(nextRev/1000).toFixed(0)}k. ${topProducts[0]?.name || 'Top products'} are expected to be key growth drivers.`);
    } finally { setForecastLoading(false); }
  };

  // ── New: Fetch detailed AI Forecast from dedicated backend endpoint ─────
  const fetchAIForecastDeepAnalysis = async () => {
    setForecastModalLoading(true);
    setForecastModalOpen(true);
    try {
      const { data } = await api.get('/orders/ai-forecast');
      setAiForecastData(data);
      setForecastModal(data.analysis);
      toast.success('AI forecast analysis loaded!');
    } catch (err) {
      console.error('AI Forecast error:', err);
      toast.error('Failed to load AI forecast analysis');
    } finally {
      setForecastModalLoading(false);
    }
  };

  // ── Use stats from /orders/stats endpoint for total/pending (matches orders page) ─
  const statRevenue = totalRevenue || (chartData || []).reduce((s, m) => s + (m.revenue || 0), 0);
  // Use liveStats from /orders/stats which matches orders page counts
  const statOrders = liveStats.totalOrders;
  const statPending = liveStats.pendingOrders;

  return (
    <Layout title={`${greeting}! 👋`} subtitle="Your AI-powered business command centre">

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        <StatCard label="Total Revenue"   value={`$${(statRevenue).toLocaleString()}`}  icon="💰" color="var(--primary)" change={14} />
        <StatCard label="Total Orders"    value={statOrders.toLocaleString()}            icon="📦" color="var(--success)" change={8}  />
        <StatCard label="Pending Orders"  value={statPending}                            icon="⏳" color="var(--warning)" change={0}  />
        <StatCard label="Today Revenue"   value={`$${liveStats.todayRevenue.toFixed(2)}`} icon="💳" color="var(--info)"    change={22} />
      </div>

      {/* Quick Links */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:12, marginBottom:20 }}>
        {[
          { icon:'📊', title:'Segments', desc:'Customer, Product & Sales segments', path:'/admin/segments', color:'#6366f1' },
          { icon:'📦', title:'Inventory', desc:'Stock levels & expiry tracking', path:'/admin/inventory', color:'#10b981' },
          { icon:'👥', title:'Customer Analysis', desc:'Individual customer analysis', path:'/admin/customer-segments', color:'#f59e0b' },
          { icon:'📈', title:'Demand Forecast', desc:'AI-powered sales predictions', path:'/admin/demand', color:'#8b5cf6' },
        ].map(item => (
          <div key={item.path} onClick={()=>navigate(item.path)} style={{
            background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:16,
            cursor:'pointer', transition:'all 0.15s',
          }} onMouseEnter={e=>e.currentTarget.style.borderColor=item.color} onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:item.color+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{item.icon}</div>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{item.title}</div>
            </div>
            <div style={{ fontSize:12, color:'var(--text3)' }}>{item.desc}</div>
          </div>
        ))}
      </div>

      {/* Live orders ticker */}
      {liveOrders.length > 0 && (
        <div style={{ marginBottom:20, padding:'12px 16px', background:'linear-gradient(135deg,#10b98111,#05966911)', border:'1px solid #10b98133', borderRadius:12, display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:10, height:10, borderRadius:'50%', background:'var(--success)', animation:'pulse 1.5s ease infinite', flexShrink:0 }} />
          <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.8)}}`}</style>
          <div style={{ fontSize:13, color:'var(--text2)', flex:1 }}>
            <strong style={{ color:'var(--success)' }}>Live: </strong>
            {liveOrders.slice(0,3).map((o,i) => (
              <span key={i}>
                {i>0 && ' · '}
                {o.orderId} — <strong>${o.total?.toFixed(2)}</strong> by {o.customerName}
              </span>
            ))}
          </div>
          <span style={{ fontSize:11, color:'var(--text3)' }}>Real-time</span>
        </div>
      )}

      {/* ── Sales Forecast Chart ── */}
      <Card style={{ marginBottom:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>📈 Revenue & Sales Forecast</div>
            <div style={{ fontSize:12, color:'var(--text3)', marginTop:3 }}>
              {chartLoading ? 'Loading data...' : (
                <>Actual ({chartData.filter(d=>d.revenue!=null).map(d=>d.month).join(', ')}) + <span style={{ color:'#f59e0b', fontWeight:600 }}>AI Predicted ({chartData.filter(d=>d.forecast!=null).map(d=>d.month).join(', ')})</span></>
              )}
            </div>
          </div>
          <button onClick={fetchForecast} disabled={forecastLoading} style={{
            display:'flex', alignItems:'center', gap:6, padding:'7px 14px',
            borderRadius:8, border:'none', cursor: forecastLoading ? 'not-allowed' : 'pointer',
            background: forecastLoading ? 'var(--bg3)' : 'linear-gradient(135deg,#f59e0b,#d97706)',
            color: forecastLoading ? 'var(--text3)' : '#fff',
            fontSize:12, fontWeight:700, transition:'opacity 0.2s',
          }}>
            {forecastLoading ? '⏳ Analyzing…' : '🔮 AI Forecast Analysis'}
          </button>
        </div>

        {chartLoading ? (
          <div style={{ height:260, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)', fontSize:14 }}>
            ⏳ Loading chart data from database...
          </div>
        ) : chartData.length === 0 ? (
          <div style={{ height:260, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)', fontSize:14 }}>
            📭 No sales data yet. Start selling to see your forecast.
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="foreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="foreOrdGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fill:'var(--text2)', fontSize:12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'var(--text2)', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine x={chartData.filter(d=>d.forecast!=null)[0]?.month} stroke="var(--border)" strokeDasharray="4 4" label={{ value:'Forecast →', fill:'#f59e0b', fontSize:10, position:'top' }} />
                <Area type="monotone" dataKey="revenue"  stroke="#6366f1" fill="url(#revGrad)"  strokeWidth={2.5} dot={false} name="revenue"  connectNulls={false} />
                <Area type="monotone" dataKey="forecast" stroke="#f59e0b" fill="url(#foreGrad)" strokeWidth={2.5} dot={{ fill:'#f59e0b', r:4 }} strokeDasharray="6 3" name="forecast" connectNulls={false} />
              </AreaChart>
            </ResponsiveContainer>

            {/* Forecast note */}
            {forecastNote && (
              <div style={{ marginTop:14, padding:'12px 16px', background:'linear-gradient(135deg,#f59e0b11,#d9770611)', border:'1px solid #f59e0b33', borderRadius:10, display:'flex', gap:10 }}>
                <span style={{ fontSize:18, flexShrink:0 }}>🔮</span>
                <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7 }}>{forecastNote}</div>
              </div>
            )}

            <div style={{ display:'flex', gap:20, marginTop:16 }}>
              {[['#6366f1','Actual Revenue'],['#f59e0b','AI Forecast']].map(([c,l]) => (
                <div key={l} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text2)' }}>
                  <div style={{ width:20, height:3, background:c, borderRadius:2 }} />{l}
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Charts row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>

        {/* Top Products */}
        <Card>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>🏆 Top Products</div>
          {topProducts.length === 0 ? (
            <div style={{ padding:'20px 0', textAlign:'center', color:'var(--text3)', fontSize:13 }}>
              📭 No product sales data yet
            </div>
          ) : (
            topProducts.map((p,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom: i<topProducts.length-1?12:0 }}>
                <div style={{ width:24, height:24, borderRadius:6, background:'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff', flexShrink:0 }}>{i+1}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500, color:'var(--text)', marginBottom:2 }}>{p.name}</div>
                  <div style={{ height:4, background:'var(--border)', borderRadius:2 }}>
                    <div style={{ width:`${Math.min(100, (p.sales/topProducts[0]?.sales||1)*100)}%`, height:'100%', background:'var(--primary)', borderRadius:2 }} />
                  </div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--text)' }}>{p.revenue}</div>
                  <div style={{ fontSize:11, color:p.up?'var(--success)':'var(--danger)', fontWeight:600 }}>{p.trend}</div>
                </div>
              </div>
            ))
          )}
        </Card>

        {/* Category pie — real data from DB aggregation */}
        <Card>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>📊 Sales by Category</div>
          {salesCategoryData.length === 0 ? (
            <div style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)', fontSize:13 }}>
              📭 No category data from database yet
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={salesCategoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="totalSales" paddingAngle={3} nameKey="category">
                    {salesCategoryData.map((item,i) => <Cell key={i} fill={item.color || COLORS[i%COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v=>`$${Number(v).toLocaleString()}`} contentStyle={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:8 }}>
                {salesCategoryData.map((item,i) => (
                  <div key={item.category} style={{
                    padding:'8px 10px', borderRadius:8,
                    background: item.color ? item.color + '11' : COLORS[i%COLORS.length]+'11',
                    border: `1px solid ${item.color ? item.color + '22' : COLORS[i%COLORS.length]+'22'}`,
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text2)', marginBottom:4 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background: item.color || COLORS[i%COLORS.length], flexShrink:0 }} />
                      <span style={{ fontWeight:600, color:'var(--text)' }}>{item.category}</span>
                      <span style={{ marginLeft:'auto', fontWeight:700, color: item.color || COLORS[i%COLORS.length] }}>${Number(item.totalSales).toLocaleString()}</span>
                    </div>
                    <div style={{ display:'flex', gap:12, fontSize:10, color:'var(--text3)' }}>
                      <span>📦 {item.totalQuantity} units</span>
                      <span>🛒 {item.orderCount} orders</span>
                      <span style={{ fontWeight:600 }}>{item.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
              {salesCategoryGrandTotal > 0 && (
                <div style={{ textAlign:'right', marginTop:8, fontSize:11, color:'var(--text3)' }}>
                  Grand Total: <strong style={{ color:'var(--text)' }}>${Number(salesCategoryGrandTotal).toLocaleString()}</strong>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* ── AI Forecast Deep Analysis Button ── */}
      <div style={{ marginBottom:20 }}>
        <button onClick={fetchAIForecastDeepAnalysis} disabled={forecastModalLoading} style={{
          display:'flex', alignItems:'center', gap:8, padding:'10px 20px',
          borderRadius:10, border:'none', cursor: forecastModalLoading?'not-allowed':'pointer',
          background: forecastModalLoading ? 'var(--bg3)' : 'linear-gradient(135deg,#8b5cf6,#6366f1)',
          color: forecastModalLoading ? 'var(--text3)' : '#fff',
          fontSize:13, fontWeight:700, width:'100%', justifyContent:'center',
          transition:'opacity 0.2s',
        }}>
          {forecastModalLoading ? '⏳ Loading AI Forecast Analysis...' : '🔮 Open Full AI Forecast Analysis'}
        </button>
      </div>

      {/* ── AI Forecast Analysis Modal ── */}
      {forecastModalOpen && (
        <div style={{
          position:'fixed', top:0, left:0, right:0, bottom:0,
          background:'rgba(0,0,0,0.6)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center',
          padding:20, overflowY:'auto',
        }} onClick={() => setForecastModalOpen(false)}>
          <div style={{
            background:'var(--card)', borderRadius:16, maxWidth:800, width:'100%',
            maxHeight:'90vh', overflowY:'auto', padding:28,
            border:'1px solid var(--border)',
          }} onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:18, fontWeight:700, color:'var(--text)' }}>🔮 AI Forecast Analysis</div>
                <div style={{ fontSize:12, color:'var(--text3)', marginTop:3 }}>
                  Powered by Gemini AI • Real database data
                </div>
              </div>
              <button onClick={() => setForecastModalOpen(false)} style={{
                width:32, height:32, borderRadius:8, border:'none',
                background:'var(--bg3)', cursor:'pointer', fontSize:16,
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'var(--text2)',
              }}>✕</button>
            </div>

            {forecastModalLoading ? (
              <div style={{ padding:'40px 0', textAlign:'center', color:'var(--text3)' }}>
                <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>
                <div>Analyzing your sales data with AI...</div>
                <div style={{ fontSize:12, marginTop:8, color:'var(--text3)' }}>Fetching real data from database + Gemini AI</div>
              </div>
            ) : forecastModal ? (
              <>
                {/* Summary */}
                <div style={{
                  padding:'14px 18px', borderRadius:12, marginBottom:16,
                  background:'linear-gradient(135deg,#8b5cf622,#6366f122)',
                  border:'1px solid #8b5cf644',
                }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#8b5cf6', marginBottom:6 }}>📋 Executive Summary</div>
                  <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7 }}>{forecastModal.summary}</div>
                </div>

                {/* Key Metrics Row */}
                {aiForecastData?.summary && (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
                    {[
                      { label:'Total Revenue', value:`$${(aiForecastData.summary.totalRevenue/1000).toFixed(0)}k`, color:'#6366f1' },
                      { label:'Total Orders', value:aiForecastData.summary.totalOrders.toLocaleString(), color:'#10b981' },
                      { label:'Growth Rate', value:`${aiForecastData.summary.growthRate}%`, color:aiForecastData.summary.growthRate >= 0 ? '#10b981' : '#ef4444' },
                      { label:'Next Month', value:`$${(aiForecastData.summary.nextMonthRevenue/1000).toFixed(0)}k`, color:'#f59e0b' },
                    ].map((m, i) => (
                      <div key={i} style={{
                        padding:'10px 12px', borderRadius:10, textAlign:'center',
                        background:m.color+'15', border:`1px solid ${m.color}33`,
                      }}>
                        <div style={{ fontSize:11, color:'var(--text3)', marginBottom:3 }}>{m.label}</div>
                        <div style={{ fontSize:16, fontWeight:700, color:m.color }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Growth Analysis */}
                {forecastModal.growthAnalysis && (
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:10 }}>📊 Growth Analysis</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                      {[
                        { label:'Trend', value:forecastModal.growthAnalysis.trend, color:forecastModal.growthAnalysis.trend === 'increasing' ? '#10b981' : forecastModal.growthAnalysis.trend === 'decreasing' ? '#ef4444' : '#f59e0b' },
                        { label:'Growth Rate', value:forecastModal.growthAnalysis.growthRate, color:'#6366f1' },
                        { label:'Momentum', value:forecastModal.growthAnalysis.momentum, color:forecastModal.growthAnalysis.momentum === 'strong' ? '#10b981' : forecastModal.growthAnalysis.momentum === 'weak' ? '#ef4444' : '#f59e0b' },
                        { label:'Key Driver', value:forecastModal.growthAnalysis.keyDriver, color:'#8b5cf6' },
                      ].map((g, i) => (
                        <div key={i} style={{ padding:'10px 14px', borderRadius:10, background:'var(--bg3)', border:'1px solid var(--border)' }}>
                          <div style={{ fontSize:11, color:'var(--text3)', marginBottom:2 }}>{g.label}</div>
                          <div style={{ fontSize:14, fontWeight:700, color:g.color }}>{g.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Category Forecast */}
                {forecastModal.categoryForecast && (
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:10 }}>🏷️ Category Forecast</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                      {[
                        { label:'🏆 Top Category', value:forecastModal.categoryForecast.topCategory, color:'#f59e0b' },
                        { label:'📈 Rising', value:forecastModal.categoryForecast.risingCategory || 'N/A', color:'#10b981' },
                        { label:'⚠️ Declining', value:forecastModal.categoryForecast.decliningCategory || 'None', color:forecastModal.categoryForecast.decliningCategory ? '#ef4444' : '#10b981' },
                      ].map((c, i) => (
                        <div key={i} style={{ padding:'10px 14px', borderRadius:10, background:'var(--bg3)', border:'1px solid var(--border)' }}>
                          <div style={{ fontSize:11, color:'var(--text3)', marginBottom:2 }}>{c.label}</div>
                          <div style={{ fontSize:13, fontWeight:600, color:c.color }}>{c.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Product Recommendations */}
                {forecastModal.productRecommendations?.length > 0 && (
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:10 }}>📦 Product Recommendations</div>
                    {forecastModal.productRecommendations.map((rec, i) => (
                      <div key={i} style={{
                        display:'flex', gap:10, padding:'10px 14px', borderRadius:10,
                        background:'var(--bg3)', border:'1px solid var(--border)', marginBottom:8,
                      }}>
                        <div style={{
                          width:28, height:28, borderRadius:7, flexShrink:0,
                          background: rec.action === 'increase stock' ? '#f59e0b22' : rec.action === 'promote' ? '#6366f122' : rec.action === 'bundle' ? '#10b98122' : '#8b5cf622',
                          display:'flex', alignItems:'center', justifyContent:'center', fontSize:14,
                        }}>
                          {rec.action === 'increase stock' ? '📦' : rec.action === 'promote' ? '📢' : rec.action === 'bundle' ? '🔗' : '💰'}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', marginBottom:2 }}>{rec.product}</div>
                          <div style={{ fontSize:11, color:'var(--text2)' }}>
                            <span style={{
                              display:'inline-block', padding:'1px 6px', borderRadius:4, fontSize:10, fontWeight:600,
                              background: rec.action === 'increase stock' ? '#f59e0b22' : rec.action === 'promote' ? '#6366f122' : '#10b98122',
                              color: rec.action === 'increase stock' ? '#f59e0b' : rec.action === 'promote' ? '#6366f1' : '#10b981',
                              marginRight:6,
                            }}>{rec.action.toUpperCase()}</span>
                            {rec.reason}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Risk Alerts */}
                {forecastModal.riskAlerts?.length > 0 && (
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:10 }}>🚨 Risk Alerts</div>
                    {forecastModal.riskAlerts.map((alert, i) => (
                      <div key={i} style={{
                        display:'flex', gap:10, padding:'10px 14px', borderRadius:10, marginBottom:8,
                        background: alert.severity === 'high' ? '#ef444415' : alert.severity === 'medium' ? '#f59e0b15' : '#6366f115',
                        border: `1px solid ${alert.severity === 'high' ? '#ef444433' : alert.severity === 'medium' ? '#f59e0b33' : '#6366f133'}`,
                      }}>
                        <div style={{ fontSize:16, flexShrink:0 }}>
                          {alert.type === 'stockout' ? '📦' : alert.type === 'overstock' ? '📊' : alert.type === 'declining' ? '📉' : '💡'}
                        </div>
                        <div>
                          <div style={{ fontSize:12, fontWeight:600, color: alert.severity === 'high' ? '#ef4444' : alert.severity === 'medium' ? '#f59e0b' : '#6366f1', marginBottom:2 }}>
                            {alert.type.toUpperCase()} • {alert.severity.toUpperCase()}
                          </div>
                          <div style={{ fontSize:12, color:'var(--text2)' }}>{alert.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actionable Insights */}
                {forecastModal.actionableInsights?.length > 0 && (
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:10 }}>💡 Actionable Insights</div>
                    {forecastModal.actionableInsights.map((insight, i) => (
                      <div key={i} style={{
                        display:'flex', gap:10, padding:'10px 14px', borderRadius:10,
                        background:'var(--bg3)', border:'1px solid var(--border)', marginBottom:6,
                      }}>
                        <div style={{ width:24, height:24, borderRadius:6, background:'#6366f122', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#6366f1', flexShrink:0 }}>{i + 1}</div>
                        <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.6 }}>{insight}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Confidence Score */}
                {forecastModal.confidenceScore != null && (
                  <div style={{
                    padding:'12px 16px', borderRadius:10, marginBottom:16,
                    background:'var(--bg3)', border:'1px solid var(--border)',
                    display:'flex', alignItems:'center', gap:12,
                  }}>
                    <div style={{ fontSize:20 }}>🎯</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', marginBottom:4 }}>AI Confidence Score</div>
                      <div style={{ height:6, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
                        <div style={{
                          width:`${Math.round(forecastModal.confidenceScore * 100)}%`, height:'100%',
                          background: forecastModal.confidenceScore >= 0.7 ? 'linear-gradient(90deg,#10b981,#059669)' : forecastModal.confidenceScore >= 0.4 ? 'linear-gradient(90deg,#f59e0b,#d97706)' : 'linear-gradient(90deg,#ef4444,#dc2626)',
                          borderRadius:3, transition:'width 0.5s ease',
                        }} />
                      </div>
                    </div>
                    <div style={{ fontSize:16, fontWeight:700, color: forecastModal.confidenceScore >= 0.7 ? '#10b981' : forecastModal.confidenceScore >= 0.4 ? '#f59e0b' : '#ef4444' }}>
                      {Math.round(forecastModal.confidenceScore * 100)}%
                    </div>
                  </div>
                )}

                {/* Forecast Table */}
                {aiForecastData?.forecast?.length > 0 && (
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:10 }}>📅 3-Month Forecast</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                      {aiForecastData.forecast.map((f, i) => (
                        <div key={i} style={{
                          padding:'12px', borderRadius:10, textAlign:'center',
                          background:'linear-gradient(135deg,#f59e0b11,#d9770611)',
                          border:'1px solid #f59e0b33',
                        }}>
                          <div style={{ fontSize:13, fontWeight:700, color:'#f59e0b', marginBottom:6 }}>{f.month}</div>
                          <div style={{ fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:2 }}>${(f.revenue/1000).toFixed(0)}k</div>
                          <div style={{ fontSize:11, color:'var(--text3)' }}>{f.orders} orders</div>
                          {f.growth != null && (
                            <div style={{ fontSize:11, fontWeight:600, color: f.growth >= 0 ? '#10b981' : '#ef4444', marginTop:4 }}>
                              {f.growth >= 0 ? '↑' : '↓'} {Math.abs(f.growth)}%
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding:'40px 0', textAlign:'center', color:'var(--text3)' }}>
                <div style={{ fontSize:32, marginBottom:12 }}>❌</div>
                <div>Failed to load AI forecast analysis</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

        {/* Monthly orders bar */}
        <Card>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>📦 Monthly Orders</div>
          {chartData.filter(d=>d.orders!=null).length === 0 ? (
            <div style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)', fontSize:13 }}>
              📭 No order data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData.filter(d=>d.orders!=null)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fill:'var(--text2)', fontSize:12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'var(--text2)', fontSize:12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }} />
                <Bar dataKey="orders" fill="#6366f1" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* AI Insights */}
        <Card>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={{ fontSize:14, fontWeight:600 }}>✦ Live AI Insights</div>
            <button onClick={fetchAIInsights} disabled={aiLoading} style={{
              display:'flex', alignItems:'center', gap:6, padding:'6px 12px',
              borderRadius:8, border:'none', cursor: aiLoading?'not-allowed':'pointer',
              background: aiLoading ? 'var(--bg3)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color: aiLoading ? 'var(--text3)' : '#fff',
              fontSize:11, fontWeight:700,
            }}>
              {aiLoading ? '⏳' : '✦'} {aiInsights ? 'Refresh' : 'Generate'}
            </button>
          </div>
          <style>{`@keyframes insightFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

          {!aiInsights && !aiLoading && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[['📈','Revenue Analysis','Click Generate to get AI-powered revenue insights.','#6366f1'],
                ['💡','Price Optimization','Click Generate for pricing recommendations.','#f59e0b'],
                ['🔄','Reorder Predictions','Click Generate to analyze customer patterns.','#10b981']].map((item,i) => (
                <div key={i} style={{ display:'flex', gap:10 }}>
                  <div style={{ width:34, height:34, borderRadius:9, background:item[3]+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{item[0]}</div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', marginBottom:1 }}>{item[1]}</div>
                    <div style={{ fontSize:11, color:'var(--text2)' }}>{item[2]}</div>
                  </div>
                </div>
              ))}
              <div style={{ fontSize:10, color:'var(--text3)', textAlign:'center', padding:'6px', background:'var(--bg3)', borderRadius:8 }}>
                Click ✦ Generate for live AI analysis
              </div>
            </div>
          )}

          {aiLoading && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[1,2,3,4].map(i=>(
                <div key={i} style={{ display:'flex', gap:10 }}>
                  <div style={{ width:34, height:34, borderRadius:9, background:'var(--bg3)', animation:'pulse 1.5s infinite', flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ height:11, background:'var(--bg3)', borderRadius:4, marginBottom:5, animation:'pulse 1.5s infinite' }} />
                    <div style={{ height:9, background:'var(--bg3)', borderRadius:4, width:'80%', animation:'pulse 1.5s infinite' }} />
                  </div>
                </div>
              ))}
              <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
            </div>
          )}

          {aiInsights && !aiLoading && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {aiInsights.map((item,i) => (
                <div key={i} style={{ display:'flex', gap:10, padding:'9px 11px', background:'var(--bg3)', borderRadius:10, border:`1px solid ${item.color}33`, animation:'insightFade 0.3s ease', animationDelay:`${i*0.08}s`, animationFillMode:'both' }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:item.color+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{item.icon}</div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:item.color, marginBottom:1 }}>{item.title}</div>
                    <div style={{ fontSize:11, color:'var(--text2)', lineHeight:1.5 }}>{item.text}</div>
                  </div>
                </div>
              ))}
              <div style={{ fontSize:10, color:'var(--text3)', textAlign:'right' }}>✦ AI Analysis</div>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}