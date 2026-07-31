import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout';
import Card from '../../components/shared/Card';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
  ReferenceLine, ComposedChart, Line,
} from 'recharts';

const COLORS = ['#6366f1','#8b5cf6','#10b981','#f59e0b','#ef4444','#3b82f6','#f97316','#14b8a6','#84cc16','#dc2626'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px', fontSize:12 }}>
      <div style={{ color:'var(--text2)', marginBottom:6, fontWeight:600 }}>{label}</div>
      {payload.map((p,i) => p.value != null && p.name !== 'percentageOfTotal' && (
        <div key={i} style={{ color:p.color, fontWeight:600, marginBottom:2 }}>
          {p.name==='revenue'||p.name==='forecast' ? '$'+Number(p.value).toLocaleString() : p.name==='orders' ? p.value+' orders' : p.name==='itemsSold' ? p.value+' items' : p.value}
        </div>
      ))}
    </div>
  );
};

const PeriodSelector = ({ value, onChange }) => (
  <div style={{ display:'flex', gap:6 }}>
    {[
      { label:'3 Months', val:3 },
      { label:'6 Months', val:6 },
      { label:'12 Months', val:12 },
      { label:'24 Months', val:24 },
    ].map(opt => (
      <button
        key={opt.val}
        onClick={() => onChange(opt.val)}
        style={{
          padding:'6px 14px', borderRadius:8, border:'1px solid var(--border)',
          background: value===opt.val ? 'var(--primary)' : 'transparent',
          color: value===opt.val ? '#fff' : 'var(--text2)',
          fontSize:12, fontWeight:600, cursor:'pointer',
          transition:'all 0.15s',
        }}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

export default function RevenueForecastPage() {
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(12);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData();
  }, [months]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get(`/revenue/monthly-breakdown?months=${months}`);
      if (res.success) setData(res);
      else throw new Error(res.message);
    } catch (err) {
      console.error('Revenue data fetch error:', err);
      toast.error('Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  };

  const monthly = data?.monthlyBreakdown || [];
  const summary = data?.summary || {};
  const categoryData = data?.categoryBreakdown || [];
  const forecast = data?.forecast || {};

  // Build combined chart data: actual months + forecast
  const hasActualData = monthly.some(m => m.revenue > 0);
  const activeMonths = monthly.filter(m => m.revenue > 0);
  const chartData = [
    ...monthly.map(m => ({
      month: m.label,
      revenue: m.revenue || null,
      orders: m.orders || null,
      itemsSold: m.itemsSold || null,
      isForecast: false,
    })),
    ...forecast.nextMonths?.map(f => ({
      month: f.label,
      revenue: null,
      orders: null,
      itemsSold: null,
      forecast: f.revenue,
      isForecast: true,
    })) || [],
  ];

  const revenueChartData = [
    ...monthly.filter(m => m.revenue > 0).map(m => ({ month: m.label, revenue: m.revenue })),
    ...forecast.nextMonths?.map(f => ({ month: f.label, forecast: f.revenue })) || [],
  ];

  return (
    <Layout title="💰 Revenue & Sales Forecast" subtitle="Monthly revenue breakdown with total revenue comparison and AI-powered forecast">
      
      {/* Period selector */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div style={{ fontSize:13, color:'var(--text3)' }}>
          {loading ? 'Loading...' : data ? `${summary.monthsWithData} months with data out of ${summary.monthsAnalyzed} analyzed` : ''}
        </div>
        <PeriodSelector value={months} onChange={setMonths} />
      </div>

      {loading ? (
        <div style={{ padding:'80px 0', textAlign:'center', color:'var(--text3)', fontSize:14 }}>
          <div style={{ fontSize:40, marginBottom:16 }}>⏳</div>
          Loading revenue data from database...
        </div>
      ) : !hasActualData ? (
        <div style={{ padding:'80px 0', textAlign:'center', color:'var(--text3)', fontSize:14 }}>
          <div style={{ fontSize:40, marginBottom:16 }}>📭</div>
          No revenue data found for this period. Start selling to see your revenue breakdown.
        </div>
      ) : (
        <>
          {/* ── Summary Stats ── */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:14, marginBottom:24 }}>
            {[
              { label:'Total Revenue', value:`$${(summary.totalRevenue || 0).toLocaleString()}`, icon:'💰', color:'#6366f1' },
              { label:'Total Orders', value:(summary.totalOrders || 0).toLocaleString(), icon:'📦', color:'#10b981' },
              { label:'Growth Rate', value:`${summary.growthRate >= 0 ? '+' : ''}${summary.growthRate || 0}%`, icon:'📈', color: summary.growthRate >= 0 ? '#10b981' : '#ef4444' },
              { label:'Avg Monthly Revenue', value:`$${(summary.averageMonthlyRevenue || 0).toLocaleString()}`, icon:'📊', color:'#8b5cf6' },
              { label:'Total Items Sold', value:(summary.totalItemsSold || 0).toLocaleString(), icon:'🏷️', color:'#f59e0b' },
            ].map((s, i) => (
              <div key={i} style={{
                padding:'16px 18px', borderRadius:12,
                background:`${s.color}11`, border:`1px solid ${s.color}33`,
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <span style={{ fontSize:22 }}>{s.icon}</span>
                  <span style={{ fontSize:12, color:'var(--text3)', fontWeight:500 }}>{s.label}</span>
                </div>
                <div style={{ fontSize:22, fontWeight:700, color:s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* ── Best / Worst Month cards ── */}
          {summary.bestMonth && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:24 }}>
              <div style={{
                padding:'14px 18px', borderRadius:12,
                background:'linear-gradient(135deg,#10b98115,#05966915)',
                border:'1px solid #10b98133',
              }}>
                <div style={{ fontSize:12, color:'var(--text3)', marginBottom:4 }}>🏆 Best Month</div>
                <div style={{ fontSize:16, fontWeight:700, color:'#10b981' }}>{summary.bestMonth.month}</div>
                <div style={{ fontSize:14, color:'var(--text2)', marginTop:2 }}>${(summary.bestMonth.revenue || 0).toLocaleString()}</div>
              </div>
              {summary.worstMonth && (
                <div style={{
                  padding:'14px 18px', borderRadius:12,
                  background:'linear-gradient(135deg,#ef444415,#dc262615)',
                  border:'1px solid #ef444433',
                }}>
                  <div style={{ fontSize:12, color:'var(--text3)', marginBottom:4 }}>⚠️ Lowest Month</div>
                  <div style={{ fontSize:16, fontWeight:700, color:'#ef4444' }}>{summary.worstMonth.month}</div>
                  <div style={{ fontSize:14, color:'var(--text2)', marginTop:2 }}>${(summary.worstMonth.revenue || 0).toLocaleString()}</div>
                </div>
              )}
            </div>
          )}

          {/* ── Revenue Trend Chart (Area + Bar combo) ── */}
          <Card style={{ marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>📈 Monthly Revenue Trend</div>
                <div style={{ fontSize:11, color:'var(--text3)', marginTop:3 }}>Revenue per month with percentage of total</div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData}>
                <defs>
                  <linearGradient id="revAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="forecastAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fill:'var(--text2)', fontSize:11 }} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={50} />
                <YAxis yAxisId="left" tick={{ fill:'var(--text2)', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill:'var(--text2)', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 'auto']} />
                <Tooltip content={<CustomTooltip />} />
                {chartData.some(d => d.isForecast) && (
                  <ReferenceLine x={chartData.filter(d => d.isForecast)[0]?.month} stroke="var(--border)" strokeDasharray="4 4" label={{ value:'Forecast →', fill:'#f59e0b', fontSize:10, position:'top' }} />
                )}
                {/* Actual revenue area */}
                <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#revAreaGrad)" strokeWidth={2.5} dot={{ fill:'#6366f1', r:4 }} name="revenue" connectNulls={false} />
                {/* Forecast area */}
                <Area yAxisId="left" type="monotone" dataKey="forecast" stroke="#f59e0b" fill="url(#forecastAreaGrad)" strokeWidth={2.5} dot={{ fill:'#f59e0b', r:4 }} strokeDasharray="6 3" name="forecast" connectNulls={false} />
                {/* Bar chart for orders behind the area */}
                <Bar yAxisId="left" dataKey="orders" fill="#8b5cf644" radius={[2,2,0,0]} barSize={8} name="orders" />
              </ComposedChart>
            </ResponsiveContainer>

            <div style={{ display:'flex', gap:20, marginTop:14, flexWrap:'wrap' }}>
              {[['#6366f1','Revenue'],['#f59e0b','Forecast'],['#8b5cf666','Orders']].map(([c,l]) => (
                <div key={l} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text2)' }}>
                  {l === 'Orders' ? (
                    <div style={{ width:10, height:10, background:c, borderRadius:2 }} />
                  ) : (
                    <div style={{ width:20, height:3, background:c, borderRadius:2 }} />
                  )}
                  {l}
                </div>
              ))}
            </div>
          </Card>

          {/* ── Revenue Breakdown Table ── */}
          <Card style={{ marginBottom:20 }}>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:16 }}>📋 Monthly Revenue Breakdown</div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
                <thead>
                  <tr style={{ borderBottom:'2px solid var(--border)' }}>
                    {['Month','Revenue','% of Total','Orders','Items Sold','Avg Order','Trend'].map(h => (
                      <th key={h} style={{ textAlign:'left', padding:'10px 12px', fontSize:11, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((m, i) => (
                    <tr key={i} style={{
                      borderBottom:'1px solid var(--border)',
                      background: m.revenue === 0 ? 'var(--bg3)' : 'transparent',
                    }}>
                      <td style={{ padding:'12px', fontWeight:700, color:'var(--text)', fontSize:13 }}>{m.label}</td>
                      <td style={{ padding:'12px', fontWeight:700, color:'#6366f1', fontSize:14 }}>
                        ${m.revenue.toLocaleString()}
                      </td>
                      <td style={{ padding:'12px', fontSize:13 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:60, height:6, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
                            <div style={{ width:`${Math.min(100, m.percentageOfTotal)}%`, height:'100%', background:'#8b5cf6', borderRadius:3 }} />
                          </div>
                          <span style={{ fontWeight:600, color:'var(--text2)' }}>{m.percentageOfTotal}%</span>
                        </div>
                      </td>
                      <td style={{ padding:'12px', fontSize:13, color:'var(--text2)' }}>{m.orders}</td>
                      <td style={{ padding:'12px', fontSize:13, color:'var(--text2)' }}>{m.itemsSold}</td>
                      <td style={{ padding:'12px', fontSize:13, fontWeight:600, color:'var(--text)' }}>${m.avgOrderValue.toLocaleString()}</td>
                      <td style={{ padding:'12px', fontSize:13, fontWeight:700, color: m.up === null ? 'var(--text3)' : m.up ? '#10b981' : '#ef4444' }}>
                        {m.trendLabel}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop:'2px solid var(--border)', background:'var(--bg3)' }}>
                    <td style={{ padding:'12px', fontWeight:700, fontSize:13 }}>Total</td>
                    <td style={{ padding:'12px', fontWeight:700, fontSize:15, color:'#6366f1' }}>${(summary.totalRevenue || 0).toLocaleString()}</td>
                    <td style={{ padding:'12px', fontWeight:700, fontSize:13, color:'#8b5cf6' }}>100%</td>
                    <td style={{ padding:'12px', fontWeight:700 }}>{(summary.totalOrders || 0).toLocaleString()}</td>
                    <td style={{ padding:'12px', fontWeight:700 }}>{(summary.totalItemsSold || 0).toLocaleString()}</td>
                    <td style={{ padding:'12px', fontWeight:700 }}>—</td>
                    <td style={{ padding:'12px', fontWeight:700, color: summary.growthRate >= 0 ? '#10b981' : '#ef4444' }}>
                      {summary.growthRate >= 0 ? '↑' : '↓'} {Math.abs(summary.growthRate || 0)}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* ── Forecast + Category Row ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
            
            {/* Forecast Cards */}
            <Card>
              <div style={{ fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:16 }}>🔮 3-Month Revenue Forecast</div>
              {forecast.hasData ? (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:14 }}>
                    {forecast.nextMonths?.map((f, i) => (
                      <div key={i} style={{
                        padding:'14px', borderRadius:10, textAlign:'center',
                        background:'linear-gradient(135deg,#f59e0b11,#d9770611)',
                        border:'1px solid #f59e0b33',
                      }}>
                        <div style={{ fontSize:14, fontWeight:700, color:'#f59e0b', marginBottom:6 }}>{f.month} {f.year}</div>
                        <div style={{ fontSize:18, fontWeight:700, color:'var(--text)' }}>${(f.revenue / 1000).toFixed(0)}k</div>
                      </div>
                    ))}
                  </div>
                  <div style={{
                    padding:'12px 16px', borderRadius:10,
                    background:'var(--bg3)', border:'1px solid var(--border)',
                    display:'flex', justifyContent:'space-between', alignItems:'center',
                  }}>
                    <span style={{ fontSize:13, color:'var(--text2)' }}>Total Projected Revenue</span>
                    <span style={{ fontSize:18, fontWeight:700, color:'#f59e0b' }}>${(forecast.totalForecastRevenue / 1000).toFixed(0)}k</span>
                  </div>
                </>
              ) : (
                <div style={{ padding:'30px 0', textAlign:'center', color:'var(--text3)', fontSize:13 }}>
                  📭 Need at least 2 months of data to generate forecast
                </div>
              )}
            </Card>

            {/* Category Pie */}
            <Card>
              <div style={{ fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:16 }}>📊 Revenue by Category</div>
              {categoryData.length === 0 ? (
                <div style={{ height:200, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)', fontSize:13 }}>
                  📭 No category data
                </div>
              ) : (
                <div style={{ display:'flex', gap:16, alignItems:'center' }}>
                  <ResponsiveContainer width="45%" height={200}>
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} dataKey="revenue" paddingAngle={3} nameKey="name">
                        {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => `$${Number(v).toLocaleString()}`} contentStyle={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ flex:1 }}>
                    {categoryData.slice(0, 6).map((c, i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, fontSize:12 }}>
                        <div style={{ width:10, height:10, borderRadius:'50%', background: c.color || COLORS[i], flexShrink:0 }} />
                        <span style={{ flex:1, color:'var(--text2)' }}>{c.name}</span>
                        <span style={{ fontWeight:700, color:'var(--text)' }}>{c.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* ── Cumulative Revenue + Cumulative bar chart ── */}
          <Card style={{ marginBottom:20 }}>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:16 }}>📊 Cumulative Revenue Over Time</div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthly.filter(m => m.revenue > 0)}>
                <defs>
                  <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fill:'var(--text2)', fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'var(--text2)', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }} formatter={v => `$${Number(v).toLocaleString()}`} />
                <Area type="monotone" dataKey="cumulativeRevenue" stroke="#10b981" fill="url(#cumGrad)" strokeWidth={2.5} dot={false} name="Cumulative Revenue" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* ── Daily Trends link card ── */}
          <Card>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--text)', marginBottom:4 }}>📅 Daily Revenue Trends</div>
                <div style={{ fontSize:12, color:'var(--text3)' }}>View daily revenue breakdown for finer-grained analysis</div>
              </div>
              <button
                onClick={async () => {
                  try {
                    const { data: dailyRes } = await api.get('/revenue/daily-trends?days=30');
                    if (!dailyRes.success) throw new Error('Failed');
                    const daily = dailyRes.dailyData || [];
                    const total = dailyRes.summary?.totalRevenue || 0;
                    const avg = dailyRes.summary?.avgDailyRevenue || 0;
                    toast.success(
                      `📊 Past 30 days: $${total.toLocaleString()} total, $${avg.toLocaleString()} avg daily (${dailyRes.summary.daysWithSales} days with sales)`,
                      { duration: 6000 }
                    );
                  } catch {
                    toast.error('Failed to load daily trends');
                  }
                }}
                style={{
                  padding:'8px 16px', borderRadius:8, border:'none',
                  background:'linear-gradient(135deg,#3b82f6,#2563eb)',
                  color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer',
                }}
              >
                View Daily Trends
              </button>
            </div>
          </Card>
        </>
      )}
    </Layout>
  );
}