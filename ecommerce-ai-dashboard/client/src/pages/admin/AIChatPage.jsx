import { useState, useRef, useEffect } from 'react';
import Layout from '../../components/shared/Layout';
import Card from '../../components/shared/Card';
import api from '../../services/api';
import toast from 'react-hot-toast';

const PROMPT_GROUPS = [
  {
    label: '📊 Sales & Revenue', color: '#6366f1',
    prompts: [
      'What strategies can boost my monthly revenue?',
      'How do I identify my best-performing products?',
      'What are the key metrics I should track daily?',
    ],
  },
  {
    label: '📦 Inventory', color: '#10b981',
    prompts: [
      'How do I prevent stockouts without over-ordering?',
      'What is the ideal reorder point formula?',
      'How to manage slow-moving inventory?',
    ],
  },
  {
    label: '💰 Pricing', color: '#f59e0b',
    prompts: [
      'When should I run a discount campaign?',
      'How do competitor prices affect my strategy?',
      'What is dynamic pricing and how do I apply it?',
    ],
  },
  {
    label: '👥 Customers', color: '#ef4444',
    prompts: [
      'How to reduce customer churn rate?',
      'What drives repeat purchases?',
      'How to segment customers for better targeting?',
    ],
  },
];

function TypingDots() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:4, padding:'12px 16px' }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width:8, height:8, borderRadius:'50%', background:'#6366f1',
          animation:'chatBounce 1.2s infinite', animationDelay:`${i*0.2}s`,
        }} />
      ))}
    </div>
  );
}

function Bubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{
      display:'flex', gap:12, marginBottom:20,
      flexDirection: isUser ? 'row-reverse' : 'row',
      animation:'chatFadeIn 0.25s ease',
    }}>
      <div style={{
        width:38, height:38, borderRadius:'50%', flexShrink:0,
        background: isUser
          ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
          : 'linear-gradient(135deg,#10b981,#059669)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:16, fontWeight:700, color:'#fff',
        boxShadow: isUser ? '0 2px 8px rgba(99,102,241,0.4)' : '0 2px 8px rgba(16,185,129,0.4)',
      }}>
        {isUser ? 'U' : '✦'}
      </div>
      <div style={{ maxWidth:'72%', display:'flex', flexDirection:'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        <div style={{ fontSize:11, color:'var(--text3)', marginBottom:4, fontWeight:600 }}>
          {isUser ? 'You' : 'AI Assistant'}
        </div>
        <div style={{
          padding:'12px 16px',
          background: isUser ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'var(--bg3)',
          color: isUser ? '#fff' : 'var(--text)',
          borderRadius: isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
          fontSize:14, lineHeight:1.7, whiteSpace:'pre-wrap', wordBreak:'break-word',
          border: isUser ? 'none' : '1px solid var(--border)',
          boxShadow: isUser ? '0 4px 14px rgba(99,102,241,0.25)' : 'none',
        }}>
          {msg.content}
        </div>
        <div style={{ fontSize:10, color:'var(--text3)', marginTop:4 }}>
          {new Date(msg.timestamp).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
        </div>
      </div>
    </div>
  );
}

const WELCOME_TEXT = `👋 Hello! I'm your AI business assistant.

I can help you with:
• 📊 Sales analysis & revenue growth strategies
• 📦 Inventory management & demand forecasting
• 💰 Pricing optimization & competitor analysis
• 👥 Customer retention & purchase predictions

What would you like to explore today?`;

export default function AIChatPage() {
  const [messages, setMessages] = useState([
    { role:'assistant', content: WELCOME_TEXT, timestamp: new Date().toISOString() },
  ]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [activeGroup, setActiveGroup] = useState(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    const userMsg = { role:'user', content:msg, timestamp:new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const history = messages.slice(-14).map(m => ({ role:m.role, content:m.content }));
      const { data } = await api.post('/ai/chat', {
        message: msg,
        history,
        context: 'ecommerce business analytics and strategy',
      });
      setMessages(prev => [...prev, {
        role:'assistant', content:data.reply, timestamp:data.timestamp,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role:'assistant',
        content:`❌ Error: ${err.response?.data?.message || err.message}\n\nCheck:\n• Server is running on port 5000\n• AI_API_KEY is set in server/.env`,
        timestamp: new Date().toISOString(),
      }]);
      toast.error('Message failed — check server connection');
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const clearChat = () => {
    setMessages([{ role:'assistant', content:'🔄 Chat cleared. How can I help you?', timestamp:new Date().toISOString() }]);
    toast.success('Chat cleared');
  };

  return (
    <Layout title="💬 AI Chat Assistant" subtitle="Ask AI anything about your e-commerce business">
      <style>{`
        @keyframes chatBounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-7px)} }
        @keyframes chatFadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:20, height:'calc(100vh - 160px)' }}>

        {/* ── LEFT PANEL ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:14, overflowY:'auto' }}>

          {/* AI info card */}
          <Card style={{ background:'linear-gradient(135deg,#6366f111,#8b5cf611)', border:'1px solid #6366f133' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>✦</div>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>AI 1.0</div>
                <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--success)' }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--success)' }} />
                  Ready · Google AI
                </div>
              </div>
            </div>
            <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.6 }}>
              Multi-turn conversation specialised in e-commerce strategy, inventory, pricing, and customer analytics.
            </div>
          </Card>

          {/* Session stats */}
          <Card style={{ padding:'14px 16px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', letterSpacing:0.8, marginBottom:10 }}>SESSION</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                { label:'Messages',  value: messages.length },
                { label:'Your msgs', value: messages.filter(m=>m.role==='user').length },
              ].map(s => (
                <div key={s.label} style={{ textAlign:'center', padding:'10px 8px', background:'var(--bg3)', borderRadius:8 }}>
                  <div style={{ fontSize:20, fontWeight:800, color:'var(--primary)' }}>{s.value}</div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Suggested prompts */}
          <Card style={{ flex:1, overflowY:'auto' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', letterSpacing:0.8, marginBottom:12 }}>SUGGESTED PROMPTS</div>
            {PROMPT_GROUPS.map((group, gi) => (
              <div key={gi} style={{ marginBottom:10 }}>
                <button onClick={() => setActiveGroup(activeGroup===gi ? null : gi)} style={{
                  width:'100%', padding:'8px 10px', borderRadius:8, border:'none',
                  background: activeGroup===gi ? group.color+'22' : 'var(--bg3)',
                  color: activeGroup===gi ? group.color : 'var(--text2)',
                  fontSize:12, fontWeight:600, cursor:'pointer', textAlign:'left',
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  transition:'all 0.15s',
                }}>
                  {group.label}
                  <span style={{ fontSize:10 }}>{activeGroup===gi ? '▲' : '▼'}</span>
                </button>
                {activeGroup===gi && (
                  <div style={{ marginTop:4, display:'flex', flexDirection:'column', gap:4 }}>
                    {group.prompts.map((p, pi) => (
                      <button key={pi} onClick={() => sendMessage(p)} style={{
                        padding:'8px 12px', background:'var(--bg3)',
                        border:'1px solid var(--border)', borderRadius:8,
                        color:'var(--text2)', fontSize:11, cursor:'pointer', textAlign:'left',
                        lineHeight:1.4, transition:'border-color 0.15s',
                      }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = group.color}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </Card>
        </div>

        {/* ── RIGHT PANEL: Chat window ── */}
        <div style={{ display:'flex', flexDirection:'column', background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>

          {/* Header */}
          <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'linear-gradient(135deg,#6366f108,#8b5cf608)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#10b981,#059669)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>✦</div>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>AI Assistant</div>
                <div style={{ fontSize:11, color: loading ? 'var(--warning)' : 'var(--success)' }}>
                  {loading ? '⏳ Thinking…' : '● Online'}
                </div>
              </div>
            </div>
            <button onClick={clearChat} style={{ padding:'6px 14px', background:'transparent', border:'1px solid var(--border)', borderRadius:8, color:'var(--text2)', fontSize:12, cursor:'pointer', fontWeight:500 }}>
              🗑 Clear
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:'20px 24px', scrollbarWidth:'thin', scrollbarColor:'var(--border) transparent' }}>
            {messages.map((msg, i) => <Bubble key={i} msg={msg} />)}

            {loading && (
              <div style={{ display:'flex', gap:12, marginBottom:20 }}>
                <div style={{ width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg,#10b981,#059669)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#fff', flexShrink:0 }}>✦</div>
                <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'4px 18px 18px 18px' }}>
                  <TypingDots />
                </div>
              </div>
            )}

            {/* Quick-start chips (only before first user message) */}
            {messages.length === 1 && !loading && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:4 }}>
                {['What products should I restock?','Improve my pricing strategy','Analyze sales performance','Reduce customer churn'].map((s,i) => (
                  <button key={i} onClick={() => sendMessage(s)} style={{
                    padding:'8px 14px', background:'var(--bg3)', border:'1px solid var(--border)',
                    borderRadius:20, color:'var(--text2)', fontSize:12, cursor:'pointer', fontWeight:500,
                    transition:'all 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor='var(--primary)'; e.currentTarget.style.color='var(--text)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text2)'; }}
                  >
                    💬 {s}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding:'14px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:10, alignItems:'flex-end', background:'var(--bg3)' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask anything about your e-commerce business… (Enter to send)"
              rows={2}
              style={{
                flex:1, padding:'12px 16px', borderRadius:12,
                background:'var(--card)', border:'1px solid var(--border)',
                color:'var(--text)', fontSize:14, resize:'none', outline:'none',
                fontFamily:'inherit', lineHeight:1.5, maxHeight:120, overflowY:'auto',
                transition:'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor='var(--primary)'}
              onBlur={e => e.target.style.borderColor='var(--border)'}
            />
            <button onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{
              width:48, height:48, borderRadius:'50%', border:'none', flexShrink:0,
              background: loading||!input.trim() ? 'var(--bg3)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color: loading||!input.trim() ? 'var(--text3)' : '#fff',
              fontSize:20, cursor: loading||!input.trim() ? 'not-allowed' : 'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              transition:'all 0.2s',
              boxShadow: loading||!input.trim() ? 'none' : '0 4px 14px rgba(99,102,241,0.4)',
            }}>
              {loading ? '⏳' : '▶'}
            </button>
          </div>

          <div style={{ padding:'5px 20px 10px', textAlign:'center', fontSize:10, color:'var(--text3)', background:'var(--bg3)' }}>
            Powered by AI · Shift+Enter for new line
          </div>
        </div>
      </div>
    </Layout>
  );
}
