import { useState } from 'react';

// ── Button ─────────────────────────────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', loading, icon, onClick, type = 'button', disabled, style }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 10,
    fontWeight: 600, border: 'none', cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: 'all .2s', fontFamily: 'inherit',
    opacity: disabled || loading ? 0.6 : 1,
  };
  const sizes = { sm: { padding: '6px 14px', fontSize: 13 }, md: { padding: '10px 20px', fontSize: 14 }, lg: { padding: '14px 28px', fontSize: 16 } };
  const variants = {
    primary:  { background: 'var(--accent)', color: '#fff' },
    secondary:{ background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)' },
    danger:   { background: 'var(--danger)', color: '#fff' },
    ghost:    { background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)' },
    success:  { background: 'var(--success)', color: '#000' },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}>
      {loading ? <Spinner size={16} /> : icon}
      {children}
    </button>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────
export function Card({ children, style, onClick, hoverable }) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: 24,
      cursor: hoverable ? 'pointer' : 'default',
      transition: hoverable ? 'border-color .2s' : 'none',
      ...style
    }}
    onMouseEnter={e => hoverable && (e.currentTarget.style.borderColor = 'var(--accent)')}
    onMouseLeave={e => hoverable && (e.currentTarget.style.borderColor = 'var(--border)')}>
      {children}
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────
export function Input({ label, error, icon, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        {icon && <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }}>{icon}</span>}
        <input {...props} style={{
          width: '100%', background: 'var(--bg3)', border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
          borderRadius: 8, padding: icon ? '10px 12px 10px 38px' : '10px 12px',
          color: 'var(--text)', fontSize: 14, outline: 'none',
          transition: 'border-color .2s', ...props.style
        }}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e => e.target.style.borderColor = error ? 'var(--danger)' : 'var(--border)'} />
      </div>
      {error && <span style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</span>}
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────────────────
export function Select({ label, options, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>{label}</label>}
      <select {...props} style={{
        background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
        padding: '10px 12px', color: 'var(--text)', fontSize: 14, outline: 'none', ...props.style
      }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────
export function Badge({ children, color = 'accent' }) {
  const colors = {
    accent:  { bg: 'rgba(108,99,255,.2)', text: 'var(--accent)' },
    success: { bg: 'rgba(67,233,123,.15)', text: 'var(--success)' },
    warning: { bg: 'rgba(249,202,36,.15)', text: 'var(--warning)' },
    danger:  { bg: 'rgba(255,107,107,.15)', text: 'var(--danger)' },
    info:    { bg: 'rgba(116,185,255,.15)', text: 'var(--info)' },
    muted:   { bg: 'var(--bg3)', text: 'var(--muted)' },
  };
  const c = colors[color] || colors.accent;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
      borderRadius: 20, fontSize: 12, fontWeight: 600,
      background: c.bg, color: c.text,
    }}>{children}</span>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────
export function Spinner({ size = 24, color = 'var(--accent)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.5" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────
export function StatCard({ label, value, change, icon, color = 'var(--accent)' }) {
  const isPos = parseFloat(change) >= 0;
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>{label}</p>
          <p style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1 }}>{value}</p>
          {change !== undefined && (
            <p style={{ fontSize: 12, color: isPos ? 'var(--success)' : 'var(--danger)', marginTop: 6, fontWeight: 500 }}>
              {isPos ? '▲' : '▼'} {Math.abs(parseFloat(change))}% from last month
            </p>
          )}
        </div>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

// ── Page Header ───────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>{title}</h1>
        {subtitle && <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>{title}</p>
      <p style={{ color: 'var(--muted)', fontSize: 14 }}>{subtitle}</p>
    </div>
  );
}

// ── Tab Bar ───────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, background: 'var(--bg3)', borderRadius: 10, padding: 4, width: 'fit-content', marginBottom: 24 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          padding: '8px 18px', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 500,
          background: active === t.id ? 'var(--accent)' : 'transparent',
          color: active === t.id ? '#fff' : 'var(--muted)',
          transition: 'all .2s',
        }}>{t.label}</button>
      ))}
    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────────
export function Progress({ value, max = 100, color = 'var(--accent)', label }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      {label && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
        <span>{label}</span><span>{Math.round(pct)}%</span>
      </div>}
      <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width .4s' }} />
      </div>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 520 }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg2)', borderRadius: 16, width: '100%', maxWidth: width,
        border: '1px solid var(--border)', boxShadow: 'var(--shadow)', maxHeight: '90vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontWeight: 600, fontSize: 16 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

// ── Textarea ──────────────────────────────────────────────────────────────
export function Textarea({ label, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>{label}</label>}
      <textarea {...props} style={{
        width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 14,
        outline: 'none', resize: 'vertical', minHeight: 100, ...props.style
      }}
      onFocus={e => e.target.style.borderColor = 'var(--accent)'}
      onBlur={e => e.target.style.borderColor = 'var(--border)'} />
    </div>
  );
}
