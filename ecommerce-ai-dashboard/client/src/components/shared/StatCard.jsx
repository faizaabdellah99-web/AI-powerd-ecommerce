export default function StatCard({ label, value, icon, color = 'var(--primary)', change, sub }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
      padding: 20, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: color, borderRadius: '12px 0 0 12px' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingLeft: 8 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{sub}</div>}
          {change !== undefined && (
            <div style={{ fontSize: 12, color: change >= 0 ? 'var(--success)' : 'var(--danger)', marginTop: 4 }}>
              {change >= 0 ? '▲' : '▼'} {Math.abs(change)}% vs last month
            </div>
          )}
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: color + '22', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 22,
        }}>{icon}</div>
      </div>
    </div>
  );
}
