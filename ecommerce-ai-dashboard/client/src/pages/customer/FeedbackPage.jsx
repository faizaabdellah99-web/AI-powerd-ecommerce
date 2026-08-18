import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout';
import api from '../../services/api';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { id:'product_quality', icon:'📦', label:'Product Quality',    desc:'Quality, condition, or accuracy of products'  },
  { id:'delivery',        icon:'🚚', label:'Delivery',           desc:'Speed, packaging, and delivery experience'     },
  { id:'customer_service',icon:'💬', label:'Customer Service',   desc:'Support quality and response time'             },
  { id:'website',         icon:'💻', label:'Website/App',        desc:'Design, speed, and ease of use'                },
  { id:'pricing',         icon:'💰', label:'Pricing',            desc:'Value for money and pricing fairness'          },
  { id:'suggestion',      icon:'💡', label:'Suggestion',         desc:'Ideas to improve our service'                  },
  { id:'other',           icon:'📝', label:'Other',              desc:'Anything else you would like to share'         },
];

const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
const RATING_LABELS = ['', 'Very Poor', 'Poor', 'Average', 'Good', 'Excellent'];

const STATUS_CONFIG = {
  new:      { color:'#3b82f6', label:'New'      },
  read:     { color:'#f59e0b', label:'Read'     },
  resolved: { color:'#10b981', label:'Resolved' },
  archived: { color:'#64748b', label:'Archived' },
};

export default function FeedbackPage() {
  const [activeTab, setActiveTab] = useState('submit'); // 'submit' | 'history'

  // ── Submit form state ──
  const [step,      setStep]      = useState(1);
  const [category,  setCategory]  = useState('');
  const [rating,    setRating]    = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [title,     setTitle]     = useState('');
  const [message,   setMessage]   = useState('');
  const [product,   setProduct]   = useState('');
  const [submitting,setSubmitting]= useState(false);

  // ── My feedback history state ──
  const [myFeedback,  setMyFeedback]  = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [expanded,    setExpanded]    = useState(null);

  // Load history whenever tab switches to 'history'
  useEffect(() => {
    if (activeTab !== 'history') return;
    setHistLoading(true);
    api.get('/feedback/my')
      .then(({ data }) => setMyFeedback(data || []))
      .catch(() => setMyFeedback([]))
      .finally(() => setHistLoading(false));
  }, [activeTab]);

  const submit = async () => {
    if (!message.trim()) return toast.error('Please write your feedback');
    if (!rating)         return toast.error('Please select a star rating');
    setSubmitting(true);
    try {
      await api.post('/feedback', { category, rating, title, message, productName: product });
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit. Please try again.');
    } finally { setSubmitting(false); }
  };

  const reset = () => {
    setStep(1); setCategory(''); setRating(0);
    setTitle(''); setMessage(''); setProduct('');
  };

  return (
    <Layout title="💬 Feedback & Suggestions" subtitle="Your voice matters — all feedback is completely anonymous">
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ maxWidth:700, margin:'0 auto' }}>

        {/* Tab bar */}
        <div style={{ display:'flex', gap:0, background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:4, marginBottom:24, width:'fit-content' }}>
          {[['submit','✍️ Give Feedback'],['history','📋 My Feedback & Replies']].map(([id,label])=>(
            <button key={id} onClick={()=>{ setActiveTab(id); if(id==='submit') setStep(1); }} style={{
              padding:'9px 20px', borderRadius:9, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, transition:'all 0.15s',
              background:activeTab===id?'var(--primary)':'transparent',
              color:activeTab===id?'#fff':'var(--text2)',
            }}>{label}</button>
          ))}
        </div>

        {/* ══════════════ SUBMIT TAB ══════════════ */}
        {activeTab==='submit' && (
          <>
            {/* Privacy notice */}
            <div style={{ padding:'12px 16px', background:'linear-gradient(135deg,#10b98111,#05966911)', border:'1px solid #10b98133', borderRadius:12, marginBottom:22, display:'flex', gap:10 }}>
              <span style={{ fontSize:18, flexShrink:0 }}>🔒</span>
              <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6 }}>
                <strong style={{ color:'var(--success)' }}>100% Anonymous</strong> — Your name is never stored.
                Feedback is identified only by a random alias (e.g. "Customer #4521").
              </div>
            </div>

            {/* Steps */}
            {step < 3 && (
              <div style={{ display:'flex', alignItems:'center', marginBottom:28 }}>
                {['Choose Category','Write Feedback'].map((label, i) => {
                  const n=i+1; const done=step>n; const active=step===n;
                  return (
                    <div key={i} style={{ display:'flex', alignItems:'center', flex:1 }}>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                        <div style={{ width:32,height:32,borderRadius:'50%', display:'flex',alignItems:'center',justifyContent:'center', fontWeight:700,fontSize:13,
                          background:done?'var(--success)':active?'var(--primary)':'var(--bg3)',
                          border:`2px solid ${done?'var(--success)':active?'var(--primary)':'var(--border)'}`,
                          color:done||active?'#fff':'var(--text3)',
                        }}>{done?'✓':n}</div>
                        <div style={{ fontSize:11, color:active?'var(--primary)':'var(--text3)', fontWeight:active?700:400 }}>{label}</div>
                      </div>
                      {i===0 && <div style={{ flex:1, height:2, background:done?'var(--success)':'var(--border)', margin:'0 8px 18px' }} />}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Step 1 — Category */}
            {step===1 && (
              <div style={{ animation:'fadeUp 0.25s ease' }}>
                <h2 style={{ fontSize:18,fontWeight:700,marginBottom:6,color:'var(--text)' }}>What is your feedback about?</h2>
                <p style={{ fontSize:13,color:'var(--text3)',marginBottom:20 }}>Choose the category that best matches</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  {CATEGORIES.map(cat=>(
                    <div key={cat.id} onClick={()=>{ setCategory(cat.id); setStep(2); }}
                      style={{ padding:'16px 18px',borderRadius:14,cursor:'pointer',transition:'all 0.15s',
                        background:category===cat.id?'var(--primary)':'var(--card)',
                        border:`2px solid ${category===cat.id?'var(--primary)':'var(--border)'}`,
                        boxShadow:category===cat.id?'0 4px 16px rgba(99,102,241,0.3)':'none',
                      }}
                      onMouseEnter={e=>{ if(category!==cat.id){ e.currentTarget.style.borderColor='var(--primary)'; e.currentTarget.style.transform='translateY(-1px)'; }}}
                      onMouseLeave={e=>{ if(category!==cat.id){ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform='translateY(0)'; }}}
                    >
                      <div style={{ fontSize:24,marginBottom:8 }}>{cat.icon}</div>
                      <div style={{ fontSize:14,fontWeight:700,color:category===cat.id?'#fff':'var(--text)',marginBottom:4 }}>{cat.label}</div>
                      <div style={{ fontSize:11,color:category===cat.id?'rgba(255,255,255,0.8)':'var(--text3)',lineHeight:1.4 }}>{cat.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2 — Details */}
            {step===2 && (
              <div style={{ animation:'fadeUp 0.25s ease' }}>
                <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:20 }}>
                  <span style={{ fontSize:24 }}>{CAT_MAP[category]?.icon}</span>
                  <div>
                    <div style={{ fontSize:16,fontWeight:700,color:'var(--text)' }}>{CAT_MAP[category]?.label}</div>
                    <button onClick={()=>setStep(1)} style={{ background:'none',border:'none',color:'var(--primary)',fontSize:12,cursor:'pointer',padding:0,fontWeight:600 }}>← Change category</button>
                  </div>
                </div>

                {/* Star rating */}
                <div style={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:14,padding:'18px 20px',marginBottom:16 }}>
                  <div style={{ fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:12 }}>Overall Rating *</div>
                  <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                    {[1,2,3,4,5].map(n=>(
                      <button key={n} onMouseEnter={()=>setHoverStar(n)} onMouseLeave={()=>setHoverStar(0)} onClick={()=>setRating(n)}
                        style={{ background:'none',border:'none',cursor:'pointer',fontSize:32,color:(hoverStar||rating)>=n?'#f59e0b':'var(--border)',transition:'all 0.1s',lineHeight:1,padding:'0 2px' }}>★</button>
                    ))}
                    {(hoverStar||rating)>0 && <span style={{ marginLeft:8,fontSize:13,fontWeight:600,color:'var(--text)' }}>{RATING_LABELS[hoverStar||rating]}</span>}
                  </div>
                </div>

                {['product_quality','delivery'].includes(category) && (
                  <div style={{ marginBottom:16 }}>
                    <label style={{ fontSize:13,color:'var(--text2)',display:'block',marginBottom:6,fontWeight:500 }}>Product Name <span style={{ color:'var(--text3)',fontSize:11 }}>(optional)</span></label>
                    <input value={product} onChange={e=>setProduct(e.target.value)} placeholder="Which product?" />
                  </div>
                )}

                <div style={{ marginBottom:16 }}>
                  <label style={{ fontSize:13,color:'var(--text2)',display:'block',marginBottom:6,fontWeight:500 }}>Subject <span style={{ color:'var(--text3)',fontSize:11 }}>(optional)</span></label>
                  <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Brief summary…" maxLength={100} />
                </div>

                <div style={{ marginBottom:20 }}>
                  <label style={{ fontSize:13,color:'var(--text2)',display:'block',marginBottom:6,fontWeight:500 }}>Your Feedback * <span style={{ color:'var(--text3)',fontSize:11 }}>({message.length}/500)</span></label>
                  <textarea value={message} onChange={e=>setMessage(e.target.value.slice(0,500))}
                    placeholder="Share your experience, suggestion, or concern…" rows={5} style={{ resize:'vertical' }} />
                </div>

                <div style={{ padding:'10px 14px',background:'var(--bg3)',borderRadius:10,marginBottom:20,fontSize:12,color:'var(--text3)',display:'flex',gap:8 }}>
                  <span>🔒</span><span>This feedback will be submitted anonymously.</span>
                </div>

                <div style={{ display:'flex',gap:10 }}>
                  <button onClick={()=>setStep(1)} style={{ flex:1,padding:12,background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,color:'var(--text2)',cursor:'pointer',fontWeight:600,fontSize:14 }}>← Back</button>
                  <button onClick={submit} disabled={submitting||!message.trim()||!rating} style={{
                    flex:2,padding:12,borderRadius:10,border:'none',fontWeight:700,fontSize:14,
                    cursor:submitting||!message.trim()||!rating?'not-allowed':'pointer',
                    background:submitting||!message.trim()||!rating?'var(--bg3)':'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    color:submitting||!message.trim()||!rating?'var(--text3)':'#fff',
                  }}>{submitting?'⏳ Submitting…':'🔒 Submit Anonymously'}</button>
                </div>
              </div>
            )}

            {/* Step 3 — Done */}
            {step===3 && (
              <div style={{ textAlign:'center',padding:'40px 20px',animation:'fadeUp 0.3s ease' }}>
                <div style={{ width:80,height:80,borderRadius:'50%',background:'linear-gradient(135deg,#10b981,#059669)',margin:'0 auto 20px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:38,boxShadow:'0 8px 32px rgba(16,185,129,0.4)' }}>✓</div>
                <h2 style={{ fontSize:24,fontWeight:800,color:'var(--text)',marginBottom:8 }}>Thank you!</h2>
                <p style={{ fontSize:14,color:'var(--text2)',lineHeight:1.7,maxWidth:400,margin:'0 auto 24px' }}>
                  Your anonymous feedback has been submitted. We review every message and reply when possible.
                </p>
                <div style={{ padding:'12px 16px',background:'#6366f115',border:'1px solid #6366f133',borderRadius:12,marginBottom:20,fontSize:13,color:'var(--text2)',textAlign:'left' }}>
                  💡 <strong>Tip:</strong> Check the <strong>"My Feedback &amp; Replies"</strong> tab above to see if the team has responded to your message.
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,maxWidth:360,margin:'0 auto' }}>
                  <button onClick={()=>{ reset(); setActiveTab('history'); }} style={{ padding:'11px',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,color:'var(--text)',fontWeight:600,fontSize:13,cursor:'pointer' }}>
                    📋 View My Feedback
                  </button>
                  <button onClick={reset} style={{ padding:'11px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',border:'none',borderRadius:10,color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer' }}>
                    💬 Submit More
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════════════ HISTORY TAB ══════════════ */}
        {activeTab==='history' && (
          <div style={{ animation:'fadeUp 0.25s ease' }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
              <div>
                <div style={{ fontSize:16,fontWeight:700,color:'var(--text)' }}>My Submitted Feedback</div>
                <div style={{ fontSize:12,color:'var(--text3)',marginTop:2 }}>Check if the team has replied to your messages</div>
              </div>
              <button onClick={()=>{ setHistLoading(true); api.get('/feedback/my').then(({data})=>setMyFeedback(data||[])).catch(()=>{}).finally(()=>setHistLoading(false)); }} style={{ padding:'7px 14px',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:9,color:'var(--text2)',fontSize:12,cursor:'pointer' }}>
                🔄 Refresh
              </button>
            </div>

            {histLoading ? (
              <div style={{ textAlign:'center',padding:60,color:'var(--text3)' }}>
                <div style={{ fontSize:28,marginBottom:12,animation:'spin 1s linear infinite',display:'inline-block' }}>⟳</div>
                <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
                <div>Loading your feedback…</div>
              </div>
            ) : myFeedback.length===0 ? (
              <div style={{ textAlign:'center',padding:60,color:'var(--text3)' }}>
                <div style={{ fontSize:48,marginBottom:12 }}>💬</div>
                <div style={{ fontSize:15,fontWeight:600,color:'var(--text2)',marginBottom:8 }}>No feedback yet</div>
                <div style={{ fontSize:13,marginBottom:20 }}>Submit your first anonymous feedback using the "Give Feedback" tab.</div>
                <button onClick={()=>setActiveTab('submit')} style={{ padding:'10px 24px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',border:'none',borderRadius:10,color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer' }}>
                  ✍️ Give Feedback
                </button>
              </div>
            ) : (
              <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
                {myFeedback.map((fb,i)=>{
                  const cat    = CAT_MAP[fb.category] || { icon:'📝', label:'Other' };
                  const sta    = STATUS_CONFIG[fb.status] || STATUS_CONFIG.new;
                  const isOpen = expanded===fb._id;
                  const hasReply = fb.adminReply && fb.adminReply.trim().length > 0;

                  return (
                    <div key={fb._id} style={{
                      background:'var(--card)', border:`1px solid ${hasReply?'var(--success)':'var(--border)'}`,
                      borderRadius:14, overflow:'hidden', transition:'all 0.15s',
                    }}>
                      {/* Card header */}
                      <div onClick={()=>setExpanded(isOpen?null:fb._id)} style={{ padding:'16px 18px',cursor:'pointer',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap' }}>
                        <div style={{ width:40,height:40,borderRadius:10,background:hasReply?'#10b98122':'var(--bg3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0 }}>
                          {cat.icon}
                        </div>
                        <div style={{ flex:1,minWidth:160 }}>
                          <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:3,flexWrap:'wrap' }}>
                            <span style={{ fontSize:13,fontWeight:700,color:'var(--text)' }}>{fb.title || cat.label}</span>
                            {hasReply && <span style={{ fontSize:11,fontWeight:700,color:'var(--success)',background:'#10b98122',padding:'2px 8px',borderRadius:20 }}>💬 Reply received</span>}
                          </div>
                          <div style={{ display:'flex',alignItems:'center',gap:8,fontSize:11,color:'var(--text3)' }}>
                            <span style={{ color:'#f59e0b' }}>{'★'.repeat(fb.rating)}{'☆'.repeat(5-fb.rating)}</span>
                            <span>{cat.label}</span>
                            <span>·</span>
                            <span>{new Date(fb.createdAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</span>
                          </div>
                        </div>
                        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                          <span style={{ background:sta.color+'22',color:sta.color,fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20 }}>{sta.label}</span>
                          <span style={{ color:'var(--text3)',fontSize:14,transition:'transform 0.2s',transform:isOpen?'rotate(180deg)':'rotate(0)' }}>▼</span>
                        </div>
                      </div>

                      {/* Expanded */}
                      {isOpen && (
                        <div style={{ padding:'0 18px 18px',borderTop:'1px solid var(--border)' }}>
                          {/* Your message */}
                          <div style={{ marginTop:14 }}>
                            <div style={{ fontSize:11,fontWeight:700,color:'var(--text3)',letterSpacing:0.8,marginBottom:6 }}>YOUR FEEDBACK</div>
                            <div style={{ padding:'12px 14px',background:'var(--bg3)',borderRadius:10,fontSize:13,color:'var(--text2)',lineHeight:1.8,borderLeft:'3px solid var(--primary)' }}>
                              {fb.message}
                            </div>
                            {fb.productName && <div style={{ fontSize:11,color:'var(--text3)',marginTop:6 }}>📦 Product: {fb.productName}</div>}
                          </div>

                          {/* Admin reply */}
                          {hasReply ? (
                            <div style={{ marginTop:16 }}>
                              <div style={{ fontSize:11,fontWeight:700,color:'var(--success)',letterSpacing:0.8,marginBottom:8,display:'flex',alignItems:'center',gap:6 }}>
                                💬 REPLY FROM STORE TEAM
                                {fb.repliedAt && <span style={{ fontSize:10,color:'var(--text3)',fontWeight:400 }}>· {new Date(fb.repliedAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</span>}
                              </div>
                              <div style={{
                                padding:'14px 16px', background:'linear-gradient(135deg,#10b98111,#05966911)',
                                border:'1px solid #10b98133', borderRadius:12,
                                fontSize:13, color:'var(--text)', lineHeight:1.8,
                              }}>
                                <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8 }}>
                                  <div style={{ width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#10b981,#059669)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,color:'#fff',fontWeight:700,flexShrink:0 }}>S</div>
                                  <span style={{ fontSize:12,fontWeight:700,color:'var(--success)' }}>Store Team</span>
                                </div>
                                {fb.adminReply}
                              </div>
                            </div>
                          ) : (
                            <div style={{ marginTop:16,padding:'10px 14px',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,fontSize:12,color:'var(--text3)',display:'flex',gap:8,alignItems:'center' }}>
                              <span>⏳</span>
                              <span>Our team is reviewing your feedback. We'll reply here when we have an update.</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
