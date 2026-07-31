import { useState, useRef, useEffect } from 'react';
import api from '../../services/api';

const SUGGESTED = [
  'What products need restocking?',
  'How can I improve my pricing strategy?',
  'Which products have the highest demand?',
  'Analyze my sales performance',
  'How to reduce customer churn?',
];

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '10px 14px' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%', background: '#6366f1',
          animation: 'bounce 1.2s infinite',
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
      <style>{`
        @keyframes bounce {
          0%,80%,100%{transform:translateY(0)}
          40%{transform:translateY(-6px)}
        }
        @keyframes fadeSlideIn {
          from{opacity:0;transform:translateY(8px)}
          to{opacity:1;transform:translateY(0)}
        }
        @keyframes pulseGlow {
          0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0.4)}
          50%{box-shadow:0 0 0 8px rgba(99,102,241,0)}
        }
      `}</style>
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{
      display: 'flex', gap: 8, marginBottom: 14,
      flexDirection: isUser ? 'row-reverse' : 'row',
      animation: 'fadeSlideIn 0.2s ease',
    }}>
      {/* Avatar */}
      <div style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
        background: isUser ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'linear-gradient(135deg,#10b981,#059669)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, color: '#fff',
      }}>
        {isUser ? 'U' : '✦'}
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth: '75%',
        background: isUser ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'var(--bg3)',
        color: isUser ? '#fff' : 'var(--text)',
        padding: '10px 14px',
        borderRadius: isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
        fontSize: 13, lineHeight: 1.6,
        border: isUser ? 'none' : '1px solid var(--border)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {msg.content}
        <div style={{
          fontSize: 10, marginTop: 4, opacity: 0.6, textAlign: isUser ? 'right' : 'left',
        }}>
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

export default function AIChatAssistant({ context = 'general' }) {
  const [open, setOpen]         = useState(false);
  const [input, setInput]       = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 Hi! I\'m your AI assistant.\n\nI can help you with sales insights, pricing strategies, inventory analysis, and more. What would you like to know?',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [loading, setLoading]   = useState(false);
  const [showSuggested, setShowSuggested] = useState(true);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, messages]);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    const userMsg = { role: 'user', content: msg, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setShowSuggested(false);

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const { data } = await api.post('/ai/chat', {
        message: msg,
        history,
        context,
      });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply,
        timestamp: data.timestamp,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Sorry, I encountered an error. Please make sure the server is running and AI_API_KEY is configured.\n\n' + (err.response?.data?.message || err.message),
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: '🔄 Chat cleared! How can I help you?',
      timestamp: new Date().toISOString(),
    }]);
    setShowSuggested(true);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="AI Assistant"
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 1000,
          width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          color: '#fff', fontSize: 22,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(99,102,241,0.5)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          animation: open ? 'none' : 'pulseGlow 2.5s infinite',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(99,102,241,0.7)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(99,102,241,0.5)'; }}
      >
        {open ? '✕' : '✦'}
      </button>

      {/* Chat Window */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 96, right: 28, zIndex: 1000,
          width: 380, height: 560,
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 20, display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          animation: 'fadeSlideIn 0.25s ease',
          overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{
            padding: '14px 18px', borderBottom: '1px solid var(--border)',
            background: 'linear-gradient(135deg,#6366f111,#8b5cf611)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0,
            }}>✦</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>AI Assistant</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--success)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />
                Online
              </div>
            </div>
            <button onClick={clearChat} title="Clear chat" style={{
              background: 'transparent', border: '1px solid var(--border)', borderRadius: 7,
              color: 'var(--text3)', fontSize: 11, cursor: 'pointer', padding: '4px 8px',
            }}>Clear</button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '14px 14px 4px',
            scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent',
          }}>
            {messages.map((msg, i) => <Message key={i} msg={msg} />)}
            {loading && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg,#10b981,#059669)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, color: '#fff',
                }}>✦</div>
                <div style={{
                  background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: '4px 18px 18px 18px',
                }}>
                  <TypingIndicator />
                </div>
              </div>
            )}

            {/* Suggested prompts */}
            {showSuggested && messages.length <= 1 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, fontWeight: 600, letterSpacing: 0.5 }}>SUGGESTED QUESTIONS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {SUGGESTED.map((s, i) => (
                    <button key={i} onClick={() => sendMessage(s)} style={{
                      padding: '8px 12px', background: 'var(--bg3)',
                      border: '1px solid var(--border)', borderRadius: 10,
                      color: 'var(--text2)', fontSize: 12, cursor: 'pointer', textAlign: 'left',
                      transition: 'border-color 0.15s, color 0.15s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--text)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text2)'; }}
                    >
                      💬 {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '12px 14px', borderTop: '1px solid var(--border)',
            display: 'flex', gap: 8, alignItems: 'flex-end',
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask AI anything… (Enter to send)"
              rows={1}
              style={{
                flex: 1, padding: '10px 12px', borderRadius: 12,
                background: 'var(--bg3)', border: '1px solid var(--border)',
                color: 'var(--text)', fontSize: 13, resize: 'none',
                outline: 'none', fontFamily: 'inherit', lineHeight: 1.4,
                maxHeight: 100, overflowY: 'auto',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                width: 40, height: 40, borderRadius: '50%', border: 'none',
                background: loading || !input.trim() ? 'var(--bg3)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color: loading || !input.trim() ? 'var(--text3)' : '#fff',
                fontSize: 18, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s', flexShrink: 0,
              }}
            >
              {loading ? '⏳' : '▶'}
            </button>
          </div>

          {/* Footer */}
          <div style={{
            padding: '4px 14px 10px', textAlign: 'center',
            fontSize: 10, color: 'var(--text3)',
          }}>
            Powered by AI · Shift+Enter for new line
          </div>
        </div>
      )}
    </>
  );
}
