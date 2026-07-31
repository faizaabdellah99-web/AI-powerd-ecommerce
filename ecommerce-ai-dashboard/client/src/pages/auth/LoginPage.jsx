import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const FEATURES = [
  { icon:'✦', label:'AI Engine',       desc:'Powered by Advanced AI'           },
  { icon:'📈', label:'Demand Forecast',  desc:'AI-driven inventory predictions'   },
  { icon:'💰', label:'Smart Pricing',    desc:'Dynamic pricing with competitor AI' },
  { icon:'🔍', label:'Visual Search',    desc:'Find products by image instantly'  },
];

const DEMOS = [
  { role:'admin',    label:'Admin',    email:'admin@demo.com',    color:'#6366f1' },
  { role:'vendor',   label:'Vendor',   email:'vendor@demo.com',   color:'#8b5cf6' },
  { role:'customer', label:'Customer', email:'customer@demo.com', color:'#10b981' },
];

export default function LoginPage() {
  const [form, setForm]     = useState({ email:'', password:'' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const { login } = useAuthStore();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(user.role === 'customer' ? '/customer' : '/admin');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Check credentials.');
    } finally { setLoading(false); }
  };

  const demoFill = (role) => {
    const emails = { admin:'admin@demo.com', vendor:'vendor@demo.com', customer:'customer@demo.com' };
    setForm({ email: emails[role], password:'demo123' });
    toast('Demo credentials filled — click Sign in', { icon:'💡' });
  };

  return (
    <div style={{
      minHeight:'100vh', background:'var(--bg)',
      display:'flex', alignItems:'stretch',
    }}>
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .login-input:focus { border-color: var(--primary) !important; outline: none; }
        .demo-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
      `}</style>

      {/* ── LEFT PANEL (branding) ── */}
      <div style={{
        flex:1, background:'linear-gradient(145deg,#0f0f1e 0%,#1a1a3e 50%,#0f1629 100%)',
        display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center',
        padding:'60px 48px', position:'relative', overflow:'hidden',
      }}>
        {/* Background orbs */}
        <div style={{ position:'absolute', top:'15%', left:'20%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,#6366f122 0%,transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'20%', right:'15%', width:250, height:250, borderRadius:'50%', background:'radial-gradient(circle,#8b5cf622 0%,transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:'50%', left:'50%', width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,#10b98111 0%,transparent 70%)', transform:'translate(-50%,-50%)', pointerEvents:'none' }} />

        {/* Logo */}
        <div style={{ animation:'float 4s ease-in-out infinite', marginBottom:32, textAlign:'center' }}>
          <div style={{
            width:80, height:80, borderRadius:24, margin:'0 auto 16px',
            background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:38,
            boxShadow:'0 8px 32px rgba(99,102,241,0.4)',
          }}>✦</div>
          <h1 style={{ fontSize:32, fontWeight:800, color:'#fff', margin:0, letterSpacing:-0.5 }}>AI Commerce</h1>
          <p style={{ fontSize:15, color:'#a5b4fc', marginTop:6, fontWeight:500 }}>
            AI-Powered Ecommerce Platform
          </p>
        </div>

        {/* Feature list */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, maxWidth:400, width:'100%', animation:'fadeUp 0.6s ease 0.2s both' }}>
          {FEATURES.map((f,i) => (
            <div key={i} style={{
              padding:'16px 18px', borderRadius:14,
              background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
              backdropFilter:'blur(10px)',
            }}>
              <div style={{ fontSize:20, marginBottom:6 }}>{f.icon}</div>
              <div style={{ fontSize:13, fontWeight:700, color:'#e2e8f0', marginBottom:2 }}>{f.label}</div>
              <div style={{ fontSize:11, color:'#94a3b8', lineHeight:1.4 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Bottom tag */}
        <div style={{ marginTop:40, display:'flex', alignItems:'center', gap:10, animation:'fadeUp 0.6s ease 0.4s both' }}>
          <div style={{ height:1, width:60, background:'rgba(255,255,255,0.15)' }} />
          <span style={{ fontSize:12, color:'#64748b' }}>Full-stack MERN + AI</span>
          <div style={{ height:1, width:60, background:'rgba(255,255,255,0.15)' }} />
        </div>
      </div>

      {/* ── RIGHT PANEL (form) ── */}
      <div style={{
        width:460, display:'flex', flexDirection:'column',
        justifyContent:'center', padding:'48px 48px',
        borderLeft:'1px solid var(--border)',
        animation:'fadeUp 0.5s ease both',
      }}>
        <div style={{ marginBottom:36 }}>
          <h2 style={{ fontSize:26, fontWeight:800, color:'var(--text)', margin:'0 0 6px' }}>
            Sign in
          </h2>
          <p style={{ fontSize:14, color:'var(--text2)', margin:0 }}>
            Welcome back — enter your credentials to continue
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom:18 }}>
            <label style={{ fontSize:13, color:'var(--text2)', display:'block', marginBottom:6, fontWeight:500 }}>
              Email address
            </label>
            <input
              type="email" required
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm(p=>({...p,email:e.target.value}))}
              className="login-input"
              style={{ width:'100%', boxSizing:'border-box', padding:'12px 14px', transition:'border-color 0.15s' }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom:28 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <label style={{ fontSize:13, color:'var(--text2)', fontWeight:500 }}>Password</label>
            </div>
            <div style={{ position:'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(p=>({...p,password:e.target.value}))}
                className="login-input"
                style={{ width:'100%', boxSizing:'border-box', padding:'12px 44px 12px 14px', transition:'border-color 0.15s' }}
              />
              <button type="button" onClick={() => setShowPw(v=>!v)} style={{
                position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                background:'none', border:'none', cursor:'pointer', color:'var(--text3)', fontSize:16,
              }}>{showPw ? '🙈' : '👁️'}</button>
            </div>
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading} style={{
            width:'100%', padding:'13px', borderRadius:10, border:'none',
            background: loading ? 'var(--bg3)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color: loading ? 'var(--text3)' : '#fff',
            fontWeight:700, fontSize:15, cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 4px 18px rgba(99,102,241,0.4)',
            transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          }}>
            {loading
              ? <><span style={{ animation:'spin 1s linear infinite', display:'inline-block' }}>⟳</span> Signing in…</>
              : <><span>✦</span> Sign in</>
            }
          </button>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </form>

        {/* Divider */}
        <div style={{ display:'flex', alignItems:'center', gap:12, margin:'24px 0' }}>
          <div style={{ flex:1, height:1, background:'var(--border)' }} />
          <span style={{ fontSize:12, color:'var(--text3)', fontWeight:500 }}>QUICK DEMO ACCESS</span>
          <div style={{ flex:1, height:1, background:'var(--border)' }} />
        </div>

        {/* Demo buttons */}
        <div style={{ display:'flex', gap:10, marginBottom:28 }}>
          {DEMOS.map(d => (
            <button key={d.role} onClick={() => demoFill(d.role)} className="demo-btn" style={{
              flex:1, padding:'10px 4px', borderRadius:10,
              background:'var(--bg3)', border:`1px solid ${d.color}44`,
              color:'var(--text)', fontSize:13, cursor:'pointer', fontWeight:600,
              transition:'all 0.15s',
            }}>
              <div style={{ fontSize:11, color:d.color, fontWeight:700, marginBottom:2 }}>
                {d.role === 'admin' ? '⚙️' : d.role === 'vendor' ? '🏪' : '👤'} {d.label}
              </div>
              <div style={{ fontSize:10, color:'var(--text3)' }}>{d.email}</div>
            </button>
          ))}
        </div>

        {/* Register link */}
        <p style={{ textAlign:'center', fontSize:13, color:'var(--text3)', margin:0 }}>
          No account?{' '}
          <Link to="/register" style={{ color:'var(--primary)', fontWeight:600, textDecoration:'none' }}>
            Create one →
          </Link>
        </p>

        {/* AI badge */}
        <div style={{ marginTop:32, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          <div style={{ width:22, height:22, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11 }}>✦</div>
          <span style={{ fontSize:11, color:'var(--text3)' }}>Secured · AI-Powered Platform</span>
        </div>
      </div>
    </div>
  );
}
