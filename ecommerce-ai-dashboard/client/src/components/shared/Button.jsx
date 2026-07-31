export default function Button({ children, onClick, variant = 'primary', size = 'md', loading, disabled, style = {} }) {
  const variants = {
    primary: { background: 'var(--primary)', color: '#fff', border: 'none' },
    secondary: { background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)' },
    success: { background: 'var(--success)', color: '#fff', border: 'none' },
    danger: { background: 'var(--danger)', color: '#fff', border: 'none' },
    ghost: { background: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)' },
  };
  const sizes = {
    sm: { padding: '6px 12px', fontSize: 12 },
    md: { padding: '10px 20px', fontSize: 14 },
    lg: { padding: '13px 28px', fontSize: 15 },
  };
  return (
    <button onClick={onClick} disabled={disabled || loading} style={{
      ...variants[variant], ...sizes[size],
      borderRadius: 8, fontWeight: 600, cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
      opacity: (disabled || loading) ? 0.6 : 1, transition: 'all 0.15s',
      display: 'inline-flex', alignItems: 'center', gap: 6,
      ...style,
    }}>
      {loading ? '⏳' : children}
    </button>
  );
}
