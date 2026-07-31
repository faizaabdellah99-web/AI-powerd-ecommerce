import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const ROLES = [
  {
    value: 'customer',
    icon:  '🛍️',
    label: 'Customer',
    desc:  'Browse, shop, and track your orders',
    color: '#10b981',
    free:  true,
  },
  {
    value: 'vendor',
    icon:  '🏪',
    label: 'Vendor',
    desc:  'List and sell your products',
    color: '#6366f1',
    free:  false,
    hint:  'Requires a vendor invite code',
  },
];

export default function RegisterPage() {
  const [form, setForm]     = useState({ name:'', email:'', password:'', role:'customer', vendorCode:'' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register: registerUser } = useAuthStore();
  const navigate = useNavigate();

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');

    // Basic email format check before sending to server
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      return toast.error('Please enter a valid email address (e.g. name@gmail.com)');
    }

    setLoading(true);
    try {
      const user = await registerUser(form.name, form.email, form.password, form.role, form.vendorCode);
      toast.success(`Welcome, ${user.name}! Account created.`);
      navigate(user.role === 'customer' ? '/customer' : '/admin');
    } catch (err) {
      const msg = err.response?.data?.message
        || err.response?.data?.errors?.[0]?.msg
        || 'Registration failed';
      toast.error(msg);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'stretch' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Left branding */}
      <div style={{
        flex:1, background:'linear-gradient(145deg,#0f0f1e 0%,#1a1a3e 50%,#0f1629 100%)',
        display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center',
        padding:'60px 48px', position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', top:'15%', left:'20%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,#6366f122 0%,transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'20%', right:'15%', width:250, height:250, borderRadius:'50%', background:'radial-gradient(circle,#8b5cf622 0%,transparent 70%)', pointerEvents:'none' }} />

        <div style={{ animation:'fadeUp 0.5s ease both', textAlign:'center', marginBottom:36 }}>
          <div style={{ width:76, height:76, borderRadius:22, margin:'0 auto 16px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, boxShadow:'0 8px 32px rgba(99,102,241,0.4)' }}>✦</div>
          <h1 style={{ fontSize:30, fontWeight:800, color:'#fff', margin:0 }}>Join AI Commerce</h1>
          <p style={{ color:'#a5b4fc', fontSize:14, marginTop:8 }}>Start your journey with AI-powered shopping</p>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14, maxWidth:340, width:'100%', animation:'fadeUp 0.5s ease 0.15s both' }}>
          {[
            { icon:'✦', text:'AI-powered product recommendations' },
            { icon:'📦', text:'Real-time order tracking' },
            { icon:'🔍', text:'Visual search — find by photo' },
            { icon:'🤖', text:'24/7 AI shopping assistant' },
          ].map((f,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:32, height:32, borderRadius:8, background:'rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>{f.icon}</div>
              <span style={{ fontSize:13, color:'#cbd5e1' }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div style={{ width:460, display:'flex', flexDirection:'column', justifyContent:'center', padding:'48px', borderLeft:'1px solid var(--border)', animation:'fadeUp 0.4s ease both' }}>
        <div style={{ marginBottom:28 }}>
          <h2 style={{ fontSize:24, fontWeight:800, color:'var(--text)', margin:'0 0 6px' }}>Create account</h2>
          <p style={{ fontSize:13, color:'var(--text2)', margin:0 }}>Fill in your details to get started</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:13, color:'var(--text2)', display:'block', marginBottom:6, fontWeight:500 }}>Full name</label>
            <input required placeholder="Abebe Girma" value={form.name} onChange={e=>set('name',e.target.value)} />
          </div>

          {/* Email */}
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:13, color:'var(--text2)', display:'block', marginBottom:6, fontWeight:500 }}>Email address</label>
            <input type="email" required placeholder="you@example.com" value={form.email} onChange={e=>set('email',e.target.value)} />
          </div>

          {/* Password */}
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:13, color:'var(--text2)', display:'block', marginBottom:6, fontWeight:500 }}>Password</label>
            <div style={{ position:'relative' }}>
              <input type={showPw?'text':'password'} required placeholder="Min 6 characters" value={form.password} onChange={e=>set('password',e.target.value)}
                style={{ paddingRight:44 }} />
              <button type="button" onClick={()=>setShowPw(v=>!v)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text3)', fontSize:16 }}>
                {showPw?'🙈':'👁️'}
              </button>
            </div>
          </div>

          {/* Role selector */}
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:13, color:'var(--text2)', display:'block', marginBottom:8, fontWeight:500 }}>Account type</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {ROLES.map(r => (
                <div key={r.value} onClick={() => set('role', r.value)} style={{
                  padding:'14px 12px', borderRadius:10, cursor:'pointer', textAlign:'center',
                  border:`2px solid ${form.role===r.value ? r.color : 'var(--border)'}`,
                  background: form.role===r.value ? r.color+'18' : 'var(--bg3)',
                  transition:'all 0.15s',
                }}>
                  <div style={{ fontSize:22, marginBottom:4 }}>{r.icon}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:form.role===r.value?r.color:'var(--text)', marginBottom:2 }}>{r.label}</div>
                  <div style={{ fontSize:10, color:'var(--text3)', lineHeight:1.3 }}>{r.desc}</div>
                  {!r.free && (
                    <div style={{ fontSize:9, color:r.color, fontWeight:700, marginTop:4, background:r.color+'22', padding:'1px 6px', borderRadius:10, display:'inline-block' }}>
                      INVITE CODE REQUIRED
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Admin note */}
            <div style={{ marginTop:10, padding:'8px 12px', background:'var(--bg3)', borderRadius:8, fontSize:11, color:'var(--text3)' }}>
              🔒 <strong>Admin accounts</strong> are created by the system administrator only and cannot be self-registered.
            </div>
          </div>

          {/* Vendor code — only shown when vendor selected */}
          {form.role === 'vendor' && (
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:13, color:'var(--text2)', display:'block', marginBottom:6, fontWeight:500 }}>
                Vendor Invite Code <span style={{ color:'var(--danger)' }}>*</span>
              </label>
              <input
                required={form.role==='vendor'}
                placeholder="Enter your vendor invite code"
                value={form.vendorCode}
                onChange={e=>set('vendorCode',e.target.value.toUpperCase())}
                style={{ borderColor: form.vendorCode ? 'var(--success)' : 'var(--border)' }}
              />
              <div style={{ fontSize:11, color:'var(--text3)', marginTop:5 }}>
                💡 Contact your administrator to get a vendor invite code.
              </div>
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading} style={{
            width:'100%', padding:13, borderRadius:10, border:'none',
            background: loading ? 'var(--bg3)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color: loading ? 'var(--text3)' : '#fff',
            fontWeight:700, fontSize:15, cursor:loading?'not-allowed':'pointer',
            boxShadow: loading ? 'none' : '0 4px 18px rgba(99,102,241,0.4)',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            transition:'all 0.2s',
          }}>
            {loading
              ? <><span style={{ animation:'spin 1s linear infinite', display:'inline-block' }}>⟳</span> Creating account…</>
              : <>✦ Create account</>
            }
          </button>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </form>

        <p style={{ textAlign:'center', marginTop:20, fontSize:13, color:'var(--text3)', margin:'20px 0 0' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color:'var(--primary)', fontWeight:600, textDecoration:'none' }}>Sign in →</Link>
        </p>
      </div>
    </div>
  );
}
