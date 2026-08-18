import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/shared/Layout';
import Card from '../../components/shared/Card';
import api from '../../services/api';
import toast from 'react-hot-toast';

const CAT_CONFIG = {
  product_quality: { icon:'📦', label:'Product Quality',  color:'#6366f1' },
  delivery:        { icon:'🚚', label:'Delivery',          color:'#3b82f6' },
  customer_service:{ icon:'💬', label:'Customer Service',  color:'#10b981' },
  website:         { icon:'💻', label:'Website/App',       color:'#8b5cf6' },
  pricing:         { icon:'💰', label:'Pricing',           color:'#f59e0b' },
  suggestion:      { icon:'💡', label:'Suggestion',        color:'#06b6d4' },
  other:           { icon:'📝', label:'Other',             color:'#64748b' },
};

const STATUS_CONFIG = {
  new:      { color:'#3b82f6', bg:'#3b82f615', label:'🔵 New'      },
  read:     { color:'#f59e0b', bg:'#f59e0b15', label:'🟡 Read'     },
  resolved: { color:'#10b981', bg:'#10b98115', label:'🟢 Resolved' },
  archived: { color:'#64748b', bg:'#64748b15', label:'⚫ Archived' },
};

function StarDisplay({ rating, size = 14 }) {
  return (
    <span style={{ color:'#f59e0b', fontSize:size, letterSpacing:1 }}>
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  );
}

function FeedbackCard({ item, onStatusChange, onAiAnalyze }) {
  const [expanded,  setExpanded]  = useState(false);
  const [adminNote,  setAdminNote]  = useState(item.adminNote  || '');
  const [adminReply, setAdminReply] = useState(item.adminReply || '');
  const [saving,     setSaving]     = useState(false);
  const [replying,   setReplying]   = useState(false);
  const [editingReply, setEditingReply] = useState(false);
  const cat = CAT_CONFIG[item.category] || CAT_CONFIG.other;
  const sta = STATUS_CONFIG[item.status]  || STATUS_CONFIG.new;

  const saveNote = async () => {
    setSaving(true);
    try {
      await api.patch(`/feedback/${item._id}`, { adminNote });
      toast.success('Note saved');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const sendReply = async () => {
    if (!adminReply.trim()) return toast.error('Reply cannot be empty');
    setReplying(true);
    try {
      const { data } = await api.patch(`/feedback/${item._id}`, { adminReply, status: 'resolved' });
      // Update local state so reply shows immediately
      item.adminReply = data.adminReply;
      item.repliedAt  = data.repliedAt;
      item.status     = 'resolved';
      setEditingReply(false);
      toast.success('✅ Reply sent — customer will see it on their Feedback page');
    } catch { toast.error('Reply failed'); }
    finally { setReplying(false); }
  };

  return (
    <div style={{
      background:'var(--card)', border:`1px solid ${expanded?cat.color+'66':'var(--border)'}`,
      borderRadius:14, overflow:'hidden', transition:'border-color 0.15s', marginBottom:12,
    }}>
      {/* Header row — always visible */}
      <div onClick={()=>setExpanded(v=>!v)} style={{ padding:'16px 18px', cursor:'pointer', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
        <div style={{ width:40, height:40, borderRadius:10, background:cat.color+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
          {cat.icon}
        </div>
        <div style={{ flex:1, minWidth:180 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2, flexWrap:'wrap' }}>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{item.title || cat.label + ' Feedback'}</span>
            <span style={{ fontSize:10, fontWeight:700, color:cat.color, background:cat.color+'18', padding:'1px 7px', borderRadius:20 }}>{cat.label}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:11 }}>
            <StarDisplay rating={item.rating} size={12} />
            <span style={{ color:'var(--text3)' }}>{item.alias}</span>
            <span style={{ color:'var(--text3)' }}>·</span>
            <span style={{ color:'var(--text3)' }}>{new Date(item.createdAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</span>
            {item.productName && <><span style={{ color:'var(--text3)' }}>·</span><span style={{ color:'var(--text2)' }}>📦 {item.productName}</span></>}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ background:sta.bg, color:sta.color, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20 }}>{sta.label}</span>
          <select value={item.status} onClick={e=>e.stopPropagation()} onChange={e=>onStatusChange(item._id, e.target.value)} style={{
            padding:'5px 8px', borderRadius:8, background:'var(--bg3)', border:'1px solid var(--border)',
            color:'var(--text)', fontSize:11, cursor:'pointer', outline:'none',
          }}>
            {Object.entries(STATUS_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
          </select>
          <span style={{ color:'var(--text3)', fontSize:16, transition:'transform 0.2s', transform:expanded?'rotate(180deg)':'rotate(0)' }}>▼</span>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding:'0 18px 18px', borderTop:'1px solid var(--border)' }}>
          {/* Message */}
          <div style={{ padding:'14px 16px', background:'var(--bg3)', borderRadius:10, margin:'14px 0', fontSize:13, color:'var(--text2)', lineHeight:1.8, borderLeft:`3px solid ${cat.color}` }}>
            "{item.message}"
          </div>

          {/* Admin note */}
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:12, color:'var(--text3)', display:'block', marginBottom:6, fontWeight:500 }}>Internal Note (not visible to customer)</label>
            <div style={{ display:'flex', gap:8 }}>
              <input value={adminNote} onChange={e=>setAdminNote(e.target.value)} placeholder="Add internal note…" style={{ flex:1 }} />
              <button onClick={saveNote} disabled={saving} style={{
                padding:'9px 16px', borderRadius:9, border:'none', cursor:saving?'not-allowed':'pointer',
                background:saving?'var(--bg3)':'var(--primary)', color:saving?'var(--text3)':'#fff',
                fontSize:12, fontWeight:700, flexShrink:0,
              }}>{saving?'⏳':'💾 Save'}</button>
            </div>
          </div>

          {/* Reply to customer */}
          <div style={{ marginBottom:12, padding:'14px 16px', background:'linear-gradient(135deg,#10b98111,#05966911)', border:'1px solid #10b98133', borderRadius:12 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--success)', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
              💬 Reply to Customer
              {item.adminReply && <span style={{ fontSize:10, color:'var(--success)', background:'#10b98122', padding:'1px 8px', borderRadius:20 }}>✓ Replied</span>}
            </div>
            {item.adminReply && !editingReply && (
              <div style={{ padding:'10px 12px', background:'var(--card)', borderRadius:9, fontSize:13, color:'var(--text2)', lineHeight:1.7, marginBottom:8, borderLeft:'3px solid var(--success)' }}>
                "{item.adminReply}"
                <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>
                  Sent {item.repliedAt ? new Date(item.repliedAt).toLocaleString() : ''}
                </div>
              </div>
            )}
            <textarea
              value={adminReply}
              onChange={e=>setAdminReply(e.target.value)}
              placeholder="Type your reply to the customer… This will be visible to them on their Feedback page."
              rows={3}
              style={{ resize:'vertical', marginBottom:8 }}
            />
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={sendReply} disabled={replying||!adminReply.trim()} style={{
                flex:1, padding:'9px 16px', borderRadius:9, border:'none',
                cursor:replying||!adminReply.trim()?'not-allowed':'pointer',
                background:replying||!adminReply.trim()?'var(--bg3)':'linear-gradient(135deg,#10b981,#059669)',
                color:replying||!adminReply.trim()?'var(--text3)':'#fff',
                fontSize:12, fontWeight:700,
              }}>{replying?'⏳ Sending…':'📨 Send Reply to Customer'}</button>
            </div>
            <div style={{ fontSize:11, color:'var(--text3)', marginTop:6 }}>
              🔒 The customer sees your reply but your name is shown as "Store Team"
            </div>
          </div>

          {/* AI analyze button */}
          <button onClick={()=>onAiAnalyze(item)} style={{
            padding:'8px 16px', borderRadius:9, border:'none', cursor:'pointer',
            background:`linear-gradient(135deg,${cat.color},${cat.color}cc)`,
            color:'#fff', fontSize:12, fontWeight:700,
          }}>
            ✦ AI: Suggest Action
          </button>
        </div>
      )}
    </div>
  );
}

export default function FeedbackAdminPage() {
  const [items,        setItems]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [stats,        setStats]        = useState({ avgRating:0, byCategory:{}, byStatus:{} });
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCat,    setFilterCat]    = useState('all');
  const [search,       setSearch]       = useState('');
  const [aiModal,      setAiModal]      = useState(null);
  const [aiLoading,    setAiLoading]    = useState(false);
  const [bulkInsight,  setBulkInsight]  = useState(null);
  const [bulkLoading,  setBulkLoading]  = useState(false);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.set('status',   filterStatus);
      if (filterCat    !== 'all') params.set('category', filterCat);
      const { data } = await api.get(`/feedback?${params}&limit=100`);
      setItems(data.items || []);
      setStats({ avgRating: data.avgRating || 0, byCategory: data.byCategory || {}, byStatus: data.byStatus || {} });
    } catch {
      setItems([]);
    } finally { setLoading(false); }
  }, [filterStatus, filterCat]);

  useEffect(() => { fetchFeedback(); }, [fetchFeedback]);

  const handleStatusChange = async (id, status) => {
    try {
      await api.patch(`/feedback/${id}`, { status });
      setItems(prev => prev.map(f => f._id === id ? { ...f, status } : f));
      toast.success(`Status → ${status}`);
    } catch { toast.error('Update failed'); }
  };

  const handleAiAnalyze = async (item) => {
    setAiModal({ item, loading:true, advice:null });
    setAiLoading(true);
    try {
      const cat = CAT_CONFIG[item.category]?.label || item.category;
      const { data } = await api.post('/ai/chat', {
        message: `Customer feedback analysis:
Category: ${cat} | Rating: ${item.rating}/5 | Alias: ${item.alias}
Message: "${item.message}"

Provide:
1. Root cause analysis (what specifically went wrong or right)
2. Immediate action to take within 24 hours
3. Long-term process improvement to prevent recurrence
Be specific and actionable.`,
        history: [], context: 'customer feedback analysis and business improvement',
      });
      setAiModal({ item, loading:false, advice:data.reply });
    } catch {
      const fallbacks = {
        1: `1. Root cause: Serious issue needing immediate investigation.\n2. Immediate: Contact customer within 24h, offer refund/replacement.\n3. Long-term: Review QC process for ${CAT_CONFIG[item.category]?.label || 'this category'}.`,
        2: `1. Root cause: Below-expectations experience.\n2. Immediate: Review this specific case and provide resolution.\n3. Long-term: Identify pattern and improve process.`,
        3: `1. Root cause: Average experience — room for improvement.\n2. Immediate: Acknowledge and ask for more details.\n3. Long-term: Set higher standards for this category.`,
        4: `1. Root cause: Good experience with minor issues.\n2. Immediate: Thank customer and note the small gap.\n3. Long-term: Aim to convert good experiences to excellent.`,
        5: `1. Root cause: Excellent — identify what worked.\n2. Immediate: Share with team as a success case.\n3. Long-term: Replicate this standard across all interactions.`,
      };
      setAiModal({ item, loading:false, advice:fallbacks[item.rating] || fallbacks[3] });
    } finally { setAiLoading(false); }
  };

  const getBulkInsight = async () => {
    setBulkLoading(true); setBulkInsight(null);
    const topCat   = Object.entries(stats.byCategory).sort((a,b)=>b[1]-a[1])[0];
    const newCount = stats.byStatus.new || 0;
    try {
      const { data } = await api.post('/ai/chat', {
        message: `Feedback summary: Total=${items.length}, Avg rating=${stats.avgRating}/5, New=${newCount}, Top category="${topCat?.[0]||'N/A'}" (${topCat?.[1]||0} items).
Recent messages: ${items.slice(0,5).map(f=>`"${f.message.slice(0,80)}"`).join(' | ')}

Give a 3-point executive summary: key issue, sentiment trend, and top priority action.`,
        history: [], context: 'customer feedback executive summary',
      });
      setBulkInsight(data.reply);
    } catch {
      setBulkInsight(`📊 ${items.length} total feedback items with avg rating ${stats.avgRating}/5.\n\n⚠️ ${newCount} unread items need attention — prioritise by lowest rating.\n\n✅ Top action: Address the ${topCat?.[0]||'most common'} category issues first as they represent the highest volume.`);
    } finally { setBulkLoading(false); }
  };

  const filtered = items.filter(f => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return f.message.toLowerCase().includes(q) || f.title?.toLowerCase().includes(q) || f.alias.toLowerCase().includes(q);
  });

  const totalNew = stats.byStatus.new || 0;

  return (
    <Layout title="💬 Customer Feedback" subtitle="Anonymous feedback management and AI-powered insights">

      {/* Summary stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:20 }}>
        {[
          ['Total',    items.length,          'var(--primary)'],
          ['⭐ Avg',   `${stats.avgRating}/5`, '#f59e0b'       ],
          ['🔵 New',   totalNew,              '#3b82f6'        ],
          ['🟢 Resolved', stats.byStatus.resolved||0, '#10b981'],
          ['Categories', Object.keys(stats.byCategory).length, '#8b5cf6'],
        ].map(([l,v,c])=>(
          <div key={l} style={{ background:'var(--card)', border:`1px solid ${c}33`, borderRadius:12, padding:'12px 16px' }}>
            <div style={{ fontSize:11,color:'var(--text3)',marginBottom:4 }}>{l}</div>
            <div style={{ fontSize:20,fontWeight:800,color:c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* AI Bulk Insight */}
      <Card style={{ marginBottom:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:bulkInsight?14:0 }}>
          <div>
            <div style={{ fontSize:14,fontWeight:700 }}>✦ AI Feedback Analysis</div>
            <div style={{ fontSize:12,color:'var(--text3)',marginTop:2 }}>Executive summary of all customer feedback</div>
          </div>
          <button onClick={getBulkInsight} disabled={bulkLoading||items.length===0} style={{
            padding:'8px 16px', borderRadius:9, border:'none',
            cursor:bulkLoading||items.length===0?'not-allowed':'pointer',
            background:bulkLoading||items.length===0?'var(--bg3)':'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color:bulkLoading||items.length===0?'var(--text3)':'#fff', fontSize:12, fontWeight:700,
          }}>{bulkLoading?'⏳ Analyzing…':'✦ Analyze All Feedback'}</button>
        </div>
        {bulkInsight && (
          <div style={{ padding:'14px 16px', background:'var(--bg3)', borderRadius:10, border:'1px solid #6366f133', fontSize:13, color:'var(--text2)', lineHeight:1.9, whiteSpace:'pre-line' }}>
            {bulkInsight}
          </div>
        )}
      </Card>

      {/* Category breakdown */}
      {Object.keys(stats.byCategory).length > 0 && (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
          {Object.entries(stats.byCategory).sort((a,b)=>b[1]-a[1]).map(([cat,count])=>{
            const cfg = CAT_CONFIG[cat] || CAT_CONFIG.other;
            return (
              <div key={cat} onClick={()=>setFilterCat(filterCat===cat?'all':cat)} style={{
                display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:20, cursor:'pointer',
                background:filterCat===cat?cfg.color+'33':'var(--card)',
                border:`1px solid ${filterCat===cat?cfg.color:'var(--border)'}`,
                fontSize:12, color:filterCat===cat?cfg.color:'var(--text2)', fontWeight:filterCat===cat?700:400,
                transition:'all 0.15s',
              }}>
                <span>{cfg.icon}</span>{cfg.label} ({count})
              </div>
            );
          })}
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ display:'flex', gap:6 }}>
          {[['all','All'],['new','New'],['read','Read'],['resolved','Resolved'],['archived','Archived']].map(([v,l])=>(
            <button key={v} onClick={()=>setFilterStatus(v)} style={{
              padding:'7px 14px', borderRadius:20, border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
              background:filterStatus===v?'var(--primary)':'var(--card)',
              color:filterStatus===v?'#fff':'var(--text2)',
            }}>{l} ({v==='all'?items.length:stats.byStatus[v]||0})</button>
          ))}
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Search feedback…"
          style={{ marginLeft:'auto', padding:'8px 14px', borderRadius:10, background:'var(--bg3)', border:'1px solid var(--border)', color:'var(--text)', fontSize:12, outline:'none', width:220 }}
        />
        <button onClick={fetchFeedback} style={{ padding:'8px 12px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:9, color:'var(--text2)', cursor:'pointer', fontSize:13 }}>
          🔄
        </button>
      </div>

      {/* Feedback list */}
      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'var(--text3)' }}>
          <div style={{ fontSize:32, marginBottom:12, animation:'spin 1s linear infinite', display:'inline-block' }}>⟳</div>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          <div>Loading feedback…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:60, color:'var(--text3)' }}>
          <div style={{ fontSize:44, marginBottom:12 }}>💬</div>
          <div style={{ fontSize:15, fontWeight:600, color:'var(--text2)', marginBottom:6 }}>
            {items.length === 0 ? 'No feedback yet' : 'No results match your filter'}
          </div>
          <div style={{ fontSize:13 }}>
            {items.length === 0 ? 'Customer feedback will appear here once submitted.' : 'Try adjusting your filters.'}
          </div>
        </div>
      ) : (
        <div>
          {filtered.map(item => (
            <FeedbackCard key={item._id} item={item} onStatusChange={handleStatusChange} onAiAnalyze={handleAiAnalyze} />
          ))}
        </div>
      )}

      {/* AI Advice Modal */}
      {aiModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }} onClick={()=>setAiModal(null)}>
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:18, padding:28, maxWidth:560, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:700 }}>✦ AI Action Recommendation</div>
                <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>
                  {CAT_CONFIG[aiModal.item.category]?.icon} {CAT_CONFIG[aiModal.item.category]?.label} · {aiModal.item.alias}
                </div>
              </div>
              <button onClick={()=>setAiModal(null)} style={{ background:'var(--bg3)', border:'none', borderRadius:8, padding:'6px 12px', color:'var(--text2)', cursor:'pointer', fontSize:16 }}>✕</button>
            </div>

            {/* Original feedback */}
            <div style={{ padding:'10px 14px', background:'var(--bg3)', borderRadius:10, marginBottom:16, fontSize:13, color:'var(--text2)', lineHeight:1.6, borderLeft:'3px solid var(--primary)', fontStyle:'italic' }}>
              <StarDisplay rating={aiModal.item.rating} /> "{aiModal.item.message}"
            </div>

            {aiModal.loading ? (
              <div style={{ textAlign:'center', padding:30, color:'var(--text3)' }}>⏳ AI is analyzing feedback…</div>
            ) : (
              <div style={{ padding:'14px 16px', background:'var(--bg3)', borderRadius:12, fontSize:13, color:'var(--text2)', lineHeight:1.9, whiteSpace:'pre-line', borderLeft:'3px solid var(--success)' }}>
                {aiModal.advice}
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
