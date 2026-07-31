import { useState, useEffect, useRef } from 'react';
import { getSocket } from '../../hooks/useSocket';

const TYPE_COLOR = { order:'#10b981', inventory:'#f59e0b', ai:'#6366f1', promo:'#8b5cf6' };

export default function NotificationBell() {
  const [open, setOpen]          = useState(false);
  const [notifs, setNotifs]      = useState([]);
  const [filter, setFilter]      = useState('all');
  const notifIdRef = useRef(0);

  useEffect(() => {
    const s = getSocket();
    if (!s.connected) s.connect();

    const addNotif = (n) => {
      notifIdRef.current += 1;
      setNotifs(prev => [{ id: notifIdRef.current, read: false, ...n }, ...prev].slice(0, 50));
    };

    s.on('new-order', (data) => {
      addNotif({ type:'order', title:'New Order Received', msg:`${data.orderId} — $${Number(data.total).toFixed(2)} by ${data.customerName}`, icon:'🛒' });
    });

    s.on('order-paid', (data) => {
      addNotif({ type:'order', title:'Payment Received', msg:`${data.orderId} — $${Number(data.total).toFixed(2)}`, icon:'💰' });
    });

    s.on('low-stock', (alerts) => {
      alerts.forEach(a => addNotif({ type:'inventory', title:'Low Stock Alert', msg:`${a.name} — only ${a.stock} left. Reorder now.`, icon:'⚠️' }));
    });

    s.on('expiry-alert', (data) => {
      if (data.expiringSoon?.length > 0) {
        addNotif({ type:'inventory', title:'⏰ Expiry Alert', msg:`${data.expiringSoon.length} product(s) expiring within 3 days!`, icon:'⏰' });
      }
    });

    return () => {
      s.off('new-order');
      s.off('order-paid');
      s.off('low-stock');
      s.off('expiry-alert');
    };
  }, []);

  const unread  = notifs.filter(n => !n.read).length;
  const visible = filter === 'all' ? notifs : notifs.filter(n => n.type === filter);

  const markRead = (id) => setNotifs(prev => prev.map(n => n.id === id ? {...n, read:true} : n));
  const markAll  = ()   => setNotifs(prev => prev.map(n => ({...n, read:true})));
  const clear    = ()   => setNotifs([]);

  return (
    <div style={{ position:'relative' }}>
      {/* Bell button */}
      <button onClick={() => setOpen(o=>!o)} style={{
        position:'relative', background:'transparent', border:'1px solid var(--border)',
        borderRadius:9, padding:'7px 10px', cursor:'pointer', color:'var(--text2)',
        fontSize:17, display:'flex', alignItems:'center',
        transition:'border-color 0.15s',
      }}
        onMouseEnter={e => e.currentTarget.style.borderColor='var(--primary)'}
        onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}
      >
        🔔
        {unread > 0 && (
          <div style={{
            position:'absolute', top:-6, right:-6, width:18, height:18,
            background:'#ef4444', borderRadius:'50%', border:'2px solid var(--card)',
            fontSize:10, fontWeight:800, color:'#fff',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>{unread > 9 ? '9+' : unread}</div>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 8px)', right:0, zIndex:500,
          width:360, background:'var(--card)', border:'1px solid var(--border)',
          borderRadius:16, boxShadow:'0 16px 48px rgba(0,0,0,0.4)',
          overflow:'hidden', animation:'notifFade 0.2s ease',
        }}>
          <style>{`@keyframes notifFade{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>

          {/* Header */}
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>Notifications</div>
              {unread > 0 && <div style={{ fontSize:11, color:'var(--text3)', marginTop:1 }}>{unread} unread</div>}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {unread > 0 && <button onClick={markAll} style={{ background:'transparent', border:'none', color:'var(--primary)', fontSize:11, cursor:'pointer', fontWeight:600 }}>Mark all read</button>}
              <button onClick={clear} style={{ background:'transparent', border:'none', color:'var(--text3)', fontSize:11, cursor:'pointer' }}>Clear</button>
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{ display:'flex', gap:0, borderBottom:'1px solid var(--border)', padding:'0 10px' }}>
            {[['all','All'],['order','Orders'],['inventory','Stock'],['ai','AI'],['promo','Promos']].map(([v,l])=>(
              <button key={v} onClick={()=>setFilter(v)} style={{
                padding:'8px 10px', background:'transparent', border:'none',
                borderBottom:`2px solid ${filter===v?'var(--primary)':'transparent'}`,
                color:filter===v?'var(--primary)':'var(--text3)', fontSize:11, fontWeight:600,
                cursor:'pointer', whiteSpace:'nowrap',
              }}>{l}</button>
            ))}
          </div>

          {/* List */}
          <div style={{ maxHeight:340, overflowY:'auto', scrollbarWidth:'thin', scrollbarColor:'var(--border) transparent' }}>
            {visible.length === 0 ? (
              <div style={{ textAlign:'center', padding:40, color:'var(--text3)', fontSize:13 }}>
                🔔 No notifications
              </div>
            ) : visible.map(n => (
              <div key={n.id} onClick={()=>markRead(n.id)} style={{
                display:'flex', gap:12, padding:'13px 18px',
                borderBottom:'1px solid var(--border)',
                background:n.read?'transparent':'var(--bg3)',
                cursor:'pointer', transition:'background 0.15s',
              }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--bg2)'}
                onMouseLeave={e=>e.currentTarget.style.background=n.read?'transparent':'var(--bg3)'}
              >
                <div style={{ width:36, height:36, borderRadius:'50%', background:TYPE_COLOR[n.type]+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{n.icon}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
                    <div style={{ fontSize:13, fontWeight:n.read?500:700, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{n.title}</div>
                    {!n.read && <div style={{ width:7, height:7, borderRadius:'50%', background:TYPE_COLOR[n.type], flexShrink:0, marginLeft:8 }} />}
                  </div>
                  <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.4, marginBottom:3 }}>{n.msg}</div>
                  <div style={{ fontSize:10, color:'var(--text3)' }}>{n.time || 'just now'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {open && <div style={{ position:'fixed', inset:0, zIndex:499 }} onClick={()=>setOpen(false)} />}
    </div>
  );
}
