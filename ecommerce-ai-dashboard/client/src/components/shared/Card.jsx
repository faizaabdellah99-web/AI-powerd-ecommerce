export default function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: 24,
      boxShadow: 'var(--shadow)', ...style,
    }}>
      {children}
    </div>
  );
}
