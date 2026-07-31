export default function Badge({ children, color = 'primary' }) {
  const colors = {
    primary: { bg: '#6366f122', text: '#818cf8' },
    success: { bg: '#10b98122', text: '#34d399' },
    warning: { bg: '#f59e0b22', text: '#fbbf24' },
    danger:  { bg: '#ef444422', text: '#f87171' },
    info:    { bg: '#3b82f622', text: '#60a5fa' },
  };
  const c = colors[color] || colors.primary;
  return (
    <span style={{
      background: c.bg, color: c.text,
      padding: '3px 10px', borderRadius: 20,
      fontSize: 12, fontWeight: 600,
    }}>{children}</span>
  );
}
