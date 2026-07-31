import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout';
import Card from '../../components/shared/Card';
import api from '../../services/api';
import toast from 'react-hot-toast';

const SEGMENTS = {
  vip:       { label:'👑 VIP',        color:'#f59e0b', bg:'#f59e0b15', desc:'High frequency + high spend'    },
  highvalue: { label:'💎 High Value', color:'#6366f1', bg:'#6366f115', desc:'Large average order value'      },
  regular:   { label:'🟢 Regular',    color:'#10b981', bg:'#10b98115', desc:'Consistent, loyal customers'    },
  new:       { label:'🆕 New',        color:'#3b82f6', bg:'#3b82f615', desc:'Recently joined, needs nurture' },
  atrisk:    { label:'⚠️ At Risk',    color:'#ef4444', bg:'#ef444415', desc:'Declining activity, may churn'  },
  inactive:  { label:'😴 Inactive',   color:'#64748b', bg:'#64748b15', desc:'No activity in 90+ days'        },
};

export default function CustomerSegmentPage() {
  const [selected, setSelected] = useState('all');
  const [aiAdvice, setAiAdvice] = useState({});
  const [loadingId, setLoadingId] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkAdvice, setBulkAdvice] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/segments/customers');
        setCustomers(data.customers || []);
      } catch {
        toast.error('Failed to load customer data');
      } finally { setLoading(false); }
    })();
  }, []);

  const counts = Object.fromEntries(
    Object.keys(SEGMENTS).map(s => [s, customers.filter(c => c.segment === s).length])
  );
  const filtered = selected === 'all' ? customers : customers.filter(c => c.segment === selected);

  const getAiAdvice = async (customer) => {
    setLoadingId(customer._id);
    try {
      const seg = SEGMENTS[customer.segment];
      const { data } = await api.post('/ai/chat', {
        message: `Customer profile: ${customer.name}
Segment: ${seg.label} | Orders: ${customer.totalOrders} | Total spent: $${customer.totalSpent} | Avg order: $${customer.avgOrder}
Days since last order: ${customer.daysSinceLastOrder} | Favourite categories: ${(customer.favouriteCategories||[]).join(', ') || 'none'}
Give 2 specific, personalised marketing actions to engage this customer. Be concrete.`,
        history: [], context: 'customer relationship management',
      });
      setAiAdvice(prev => ({ ...prev, [customer._id]: data.reply }));
      toast.success('AI advice generated!');
    } catch {
      const fallbacks = {
        vip:      `1. Send a VIP exclusive offer: 15% off their next purchase — they spend $${customer.avgOrder} avg.\n2. Invite them to a loyalty programme with early access to new arrivals.`,
        highvalue:`1. Upsell complementary products in their preferred category with a personalised email.\n2. Offer free express shipping on their next order — they value premium service.`,
        regular:  `1. Send a "Thank you" loyalty discount of 10% after their next purchase.\n2. Show "Frequently bought together" suggestions based on their purchase history.`,
        new:      `1. Send a welcome series email with a 10% first-reorder discount within 14 days.\n2. Highlight best sellers in their purchased category to encourage exploration.`,
        atrisk:   `1. Send a win-back email: "We miss you — here is 20% off, valid 7 days only."\n2. Follow up with an SMS reminder after 3 days if no response.`,
        inactive: `1. Send a re-engagement email with a bold 30% discount and a clear CTA.\n2. If no response in 14 days, mark as churned and remove from active campaigns.`,
      };
      setAiAdvice(prev => ({ ...prev, [customer._id]: fallbacks[customer.segment] }));
    } finally { setLoadingId(null); }
  };

  const bulkStrategy = async () => {
    setBulkLoading(true); setBulkAdvice(null);
    const summary = Object.entries(counts).map(([k,v]) => `${SEGMENTS[k].label}: ${v}`).join(', ');
    try {
      const { data } = await api.post('/ai/chat', {
        message: `Customer base summary: ${summary} (total: ${customers.length})
Give a 4-point segmentation strategy covering: how to retain VIPs, convert at-risk customers, nurture new customers, and win back inactive ones. Be specific with channel and offer recommendations.`,
        history: [], context: 'customer segmentation strategy',
      });
      setBulkAdvice(data.reply);
      toast.success('Strategy generated!');
    } catch {
      setBulkAdvice(`👑 VIP (${counts.vip}): Launch an exclusive loyalty tier — offer early access + free shipping. Email personally, not via bulk.\n\n⚠️ At Risk (${counts.atrisk}): Send a 20% win-back coupon with 7-day urgency. Follow up by SMS after 3 days.\n\n🆕 New (${counts.new}): Trigger a 3-email welcome sequence over 14 days. Include a 10% reorder incentive in email 3.\n\n😴 Inactive (${counts.inactive}): One final 30% re-engagement offer. No response = mark churned, stop sending.`);
      toast.success('Showing cached strategy');
    } finally { setBulkLoading(false); }
  };

  return (
    <Layout title="👥 Customer Segments" subtitle="AI-powered customer grouping and personalised targeting">
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
        {Object.entries(SEGMENTS).map(([k,s])=>(
          <div key={k} style={{ background:'var(--card)', border:`1px solid ${s.color}33`, borderRadius:12, padding:'14px 18px', cursor:'pointer', transition:'border-color 0.15s' }}
            onClick={()=>setSelected(k==='all'?'all':k)}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
              <span style={{ background:s.bg, color:s.color, fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:20 }}>{s.label}</span>
              <span style={{ fontSize:20, fontWeight:800, color:s.color }}>{counts[k]}</span>
            </div>
            <div style={{ fontSize:11, color:'var(--text3)' }}>{s.desc}</div>
          </div>
        ))}
      </div>

      <Card style={{ marginBottom:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: bulkAdvice?14:0 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700 }}>✦ AI Segmentation Strategy</div>
            <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>Get a full targeting plan for all segments</div>
          </div>
          <button onClick={bulkStrategy} disabled={bulkLoading} style={{
            padding:'8px 16px', borderRadius:9, border:'none', cursor:bulkLoading?'not-allowed':'pointer',
            background:bulkLoading?'var(--bg3)':'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color:bulkLoading?'var(--text3)':'#fff', fontSize:12, fontWeight:700,
          }}>{bulkLoading?'⏳ Generating…':'✦ Generate Strategy'}</button>
        </div>
        {bulkAdvice && (
          <div style={{ padding:'14px 16px', background:'var(--bg3)', borderRadius:10, border:'1px solid #6366f133', fontSize:13, color:'var(--text2)', lineHeight:1.9, whiteSpace:'pre-line' }}>
            {bulkAdvice}
          </div>
        )}
      </Card>

      <div style={{ display:'flex', gap:8, marginBottom:18, flexWrap:'wrap' }}>
        {[['all','All Customers',customers.length],...Object.entries(SEGMENTS).map(([k,s])=>[k,s.label,counts[k]])].map(([v,l,n])=>(
          <button key={v} onClick={()=>setSelected(v)} style={{
            padding:'7px 16px', borderRadius:20, border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
            background:selected===v?'var(--primary)':'var(--card)', color:selected===v?'#fff':'var(--text2)',
          }}>{l} ({n})</button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:16 }}>
        {filtered.map(c => {
          const seg = SEGMENTS[c.segment];
          return (
            <Card key={c._id}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:38, height:38, borderRadius:'50%', background:`linear-gradient(135deg,${seg.color},${seg.color}88)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, color:'#fff', fontWeight:700 }}>
                    {c.name[0]}
                  </div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{c.name}</div>
                    <span style={{ background:seg.bg, color:seg.color, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{seg.label}</span>
                  </div>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12 }}>
                {[['Orders',c.totalOrders],['Spent',`$${c.totalSpent}`],['Last',`${c.daysSinceLastOrder}d ago`]].map(([l,v])=>(
                  <div key={l} style={{ background:'var(--bg3)', borderRadius:8, padding:'8px', textAlign:'center' }}>
                    <div style={{ fontSize:10, color:'var(--text3)', marginBottom:2 }}>{l}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{v}</div>
                  </div>
                ))}
              </div>

              {(c.favouriteCategories||[]).length > 0 && (
                <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:12 }}>
                  {c.favouriteCategories.map(cat=>(
                    <span key={cat} style={{ background:'var(--bg3)', border:'1px solid var(--border)', color:'var(--text2)', fontSize:10, padding:'2px 8px', borderRadius:20 }}>{cat}</span>
                  ))}
                </div>
              )}

              {aiAdvice[c._id] && (
                <div style={{ padding:'10px 12px', background:'var(--bg3)', borderRadius:10, border:`1px solid ${seg.color}33`, fontSize:12, color:'var(--text2)', lineHeight:1.7, whiteSpace:'pre-line', marginBottom:10 }}>
                  {aiAdvice[c._id]}
                </div>
              )}

              <button onClick={()=>getAiAdvice(c)} disabled={loadingId===c._id} style={{
                width:'100%', padding:9, borderRadius:8, border:'none', cursor:loadingId===c._id?'not-allowed':'pointer',
                background:`linear-gradient(135deg,${seg.color},${seg.color}cc)`,
                color:'#fff', fontSize:12, fontWeight:700,
              }}>
                {loadingId===c._id ? '⏳ Generating…' : aiAdvice[c._id] ? '🔄 Refresh Advice' : '✦ Get AI Marketing Advice'}
              </button>
            </Card>
          );
        })}
      </div>
    </Layout>
  );
}
