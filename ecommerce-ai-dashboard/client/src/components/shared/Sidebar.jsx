import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useOrderStore } from '../../store/orderStore';
import { getSocket } from '../../hooks/useSocket';
import api from '../../services/api';

const adminNav = [
  { path: '/admin',              icon: '⊞', label: 'Dashboard'       },
  { path: '/admin/orders',       icon: '📋', label: 'Orders'          },
  { path: '/admin/inventory',    icon: '📦', label: 'Inventory'       },
  { path: '/admin/demand',       icon: '📈', label: 'Demand Forecast' },
  { path: '/admin/pricing',      icon: '💰', label: 'Smart Pricing'   },
  {
    path: '/admin/product-ai',   icon: '🤖', label: 'Product AI',
    subItems: [
      { path: '/admin/product-ai?tab=description', icon: '✍️', label: 'Description Generator' },
      { path: '/admin/product-ai?tab=vision',      icon: '📷', label: 'Photo Cataloging'       },
      { path: '/admin/product-ai?tab=image',       icon: '🖼️', label: 'Image Search'           },
    ],
  },
  { path: '/admin/products',     icon: '🏷️', label: 'Products'        },
  { path: '/admin/segments',     icon: '📊', label: 'Segments'        },
  { path: '/admin/feedback',     icon: '💬', label: 'Feedback'        },
  { path: '/admin/ai-chat',      icon: '⚡',  label: 'AI Chat'         },
  { path: '/admin/users',        icon: '👥', label: 'User Management' },
];

const vendorNav = [
  { path: '/admin',              icon: '⊞', label: 'Dashboard'       },
  { path: '/admin/orders',       icon: '📋', label: 'Orders'          },
  { path: '/admin/inventory',    icon: '📦', label: 'Inventory'       },
  { path: '/admin/expiry',       icon: '⏰', label: 'Expiry Tracker'  },
  { path: '/admin/pricing',      icon: '💰', label: 'Smart Pricing'   },
  {
    path: '/admin/product-ai',   icon: '🤖', label: 'Product AI',
    subItems: [
      { path: '/admin/product-ai?tab=description', icon: '✍️', label: 'Description Generator' },
      { path: '/admin/product-ai?tab=vision',      icon: '📷', label: 'Photo Cataloging'       },
      { path: '/admin/product-ai?tab=image',       icon: '🖼️', label: 'Image Search'           },
    ],
  },
  { path: '/admin/products',     icon: '🏷️', label: 'Products'        },
  { path: '/admin/feedback',     icon: '💬', label: 'Feedback'        },
  { path: '/admin/ai-chat',      icon: '⚡',  label: 'AI Chat'         },
];

const customerNav = [
  { path: '/customer',               icon: '⊞', label: 'Dashboard'     },
  { path: '/customer/shop',          icon: '🛍️', label: 'Shop'          },
  { path: '/customer/chat',          icon: '⚡',  label: 'AI Assistant'  },
  { path: '/customer/visual-search', icon: '🔍', label: 'Visual Search' },
  { path: '/customer/orders',        icon: '📋', label: 'My Orders'     },
  { path: '/customer/reorder',       icon: '🔄', label: 'Re-order AI'   },
  { path: '/customer/feedback',      icon: '💬', label: 'Feedback'      },
  { path: '/customer/profile',       icon: '👤', label: 'My Profile'    },
];

// Demo top customers for when API is unavailable
const DEMO_TOP_CUSTOMERS = [
  { name: 'Abebe Girma', email: 'abebe@test.com', totalSpent: 12500, orders: 24, avatar: 'A' },
  { name: 'Sara Kebede', email: 'sara@test.com', totalSpent: 8900, orders: 18, avatar: 'S' },
  { name: 'Daniel Haile', email: 'daniel@test.com', totalSpent: 7200, orders: 15, avatar: 'D' },
  { name: 'Hana Tadesse', email: 'hana@test.com', totalSpent: 5400, orders: 11, avatar: 'H' },
  { name: 'Meron Alemu', email: 'meron@test.com', totalSpent: 3800, orders: 8, avatar: 'M' },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { newOrderCount } = useOrderStore();
  const [expandedMenus, setExpandedMenus] = useState({});
  const [feedbackUnread, setFeedbackUnread] = useState(0); // admin: new feedback count
  const [replyUnread, setReplyUnread] = useState(0);       // customer: unread admin replies

  // Auto-expand Product AI menu when on that page
  useEffect(() => {
    if (location.pathname === '/admin/product-ai') {
      setExpandedMenus(p => ({ ...p, '/admin/product-ai': true }));
    }
  }, [location.pathname]);

  // Reset badge when visiting Orders page
  useEffect(() => {
    if (location.pathname === '/admin/orders') {
      useOrderStore.getState().resetNewOrders();
    }
  }, [location.pathname]);

  // ── Feedback badges ────────────────────────────────────────────────────────
  // Fetch unread counts on mount / role change
  useEffect(() => {
    if (!user) return;
    const isAdmin = user.role === 'admin' || user.role === 'vendor';

    if (isAdmin) {
      api.get('/feedback/unread-count')
        .then(({ data }) => setFeedbackUnread(data.count || 0))
        .catch(() => setFeedbackUnread(0));
    } else {
      api.get('/feedback/unread-replies')
        .then(({ data }) => setReplyUnread(data.count || 0))
        .catch(() => setReplyUnread(0));
    }
  }, [user]);

  // Reset admin feedback badge when visiting Feedback admin page
  useEffect(() => {
    if (location.pathname === '/admin/feedback' && (user?.role === 'admin' || user?.role === 'vendor')) {
      setFeedbackUnread(0);
    }
  }, [location.pathname, user?.role]);

  // Reset customer reply badge when visiting Feedback page
  useEffect(() => {
    if (location.pathname === '/customer/feedback' && user?.role === 'customer') {
      setReplyUnread(0);
      // Mark replies as read on the server
      api.patch('/feedback/my/read').catch(() => {});
    }
  }, [location.pathname, user?.role]);

  // Socket listeners for real-time badge updates
  useEffect(() => {
    const s = getSocket();
    if (!s.connected) s.connect();

    // Admin: new feedback submitted → update unread count
    const onFeedbackNew = (data) => {
      if (user?.role === 'admin' || user?.role === 'vendor') {
        setFeedbackUnread(data?.unreadCount ?? (prev => prev + 1));
      }
    };

    // Customer: admin replied → increment unread reply count
    const onFeedbackReply = (data) => {
      if (user?.role === 'customer') {
        setReplyUnread(prev => prev + 1);
      }
    };

    s.on('feedback-new', onFeedbackNew);
    s.on('feedback-reply', onFeedbackReply);
    return () => {
      s.off('feedback-new', onFeedbackNew);
      s.off('feedback-reply', onFeedbackReply);
    };
  }, [user?.role]);

  // Socket listener for new orders
  useEffect(() => {
    const s = getSocket();
    if (!s.connected) s.connect();
    const handler = () => useOrderStore.getState().incrementNewOrders();
    s.on('new-order', handler);
    return () => { s.off('new-order', handler); };
  }, []);

  const nav = user?.role === 'vendor' ? vendorNav : ['admin'].includes(user?.role) ? adminNav : customerNav;
  const roleLabel = user?.role === 'vendor' ? 'Vendor' : user?.role === 'admin' ? 'Admin' : 'Customer';

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside style={{
      width: 240, minHeight: '100vh', background: 'var(--bg2)',
      borderRight: '1px solid var(--border)', display: 'flex',
      flexDirection: 'column', position: 'fixed', top: 0, left: 0, zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>⚡</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>⚡ AI Commerce</div>
            <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 500 }}>{roleLabel} Portal</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        {nav.map(item => {
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isExpanded  = expandedMenus[item.path];
          // Active: exact path match OR on a sub-page (with ?tab=)
          const isParentActive = location.pathname === item.path;
          const isSubPageActive = hasSubItems && location.pathname === item.path;

          // isActive helper for sub-items with ?tab= query
          const isSubActive = (subPath) => {
            if (subPath.includes('?')) {
              const [base, qs] = subPath.split('?');
              const param = new URLSearchParams(qs);
              const cur   = new URLSearchParams(location.search);
              return location.pathname === base && cur.get('tab') === param.get('tab');
            }
            return location.pathname === subPath;
          };

          return (
            <div key={item.path} style={{ marginBottom: 2 }}>
              {/* Parent row */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <NavLink
                  to={hasSubItems ? item.path : item.path}
                  end={item.path.split('/').length === 2}
                  onClick={hasSubItems ? (e) => { e.preventDefault(); setExpandedMenus(p => ({ ...p, [item.path]: !p[item.path] })); } : undefined}
                  style={({ isActive: active }) => ({
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    borderRadius: 8, fontSize: 14, fontWeight: 500, flex: 1,
                    color: (active || isSubPageActive) ? '#fff' : 'var(--text2)',
                    background: (active || isSubPageActive) ? 'var(--primary)' : 'transparent',
                    transition: 'all 0.15s', textDecoration: 'none',
                  })}
                >
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {/* Orders badge */}
                  {item.label === 'Orders' && user?.role !== 'customer' && newOrderCount > 0 && (
                    <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:20, background:'#10b981', color:'#fff' }}>
                      {newOrderCount}
                    </span>
                  )}
                  {/* Admin Feedback badge */}
                  {item.label === 'Feedback' && (user?.role === 'admin' || user?.role === 'vendor') && feedbackUnread > 0 && (
                    <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:20, background:'#ef4444', color:'#fff' }}>
                      {feedbackUnread > 99 ? '99+' : feedbackUnread}
                    </span>
                  )}
                  {/* Customer Feedback badge */}
                  {item.label === 'Feedback' && user?.role === 'customer' && replyUnread > 0 && (
                    <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:20, background:'#f59e0b', color:'#fff' }}>
                      {replyUnread > 99 ? '99+' : replyUnread}
                    </span>
                  )}
                  {/* Expand/collapse chevron */}
                  {hasSubItems && (
                    <span style={{ fontSize:10, color:'var(--text3)', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition:'transform 0.2s', display:'inline-block' }}>▼</span>
                  )}
                </NavLink>
              </div>

              {/* Sub-items */}
              {hasSubItems && isExpanded && (
                <div style={{ marginLeft:10, marginTop:2, marginBottom:4, paddingLeft:8, borderLeft:'1px solid var(--border)' }}>
                  {item.subItems.map(sub => (
                    <NavLink
                      key={sub.path}
                      to={sub.path}
                      style={{
                        display:'flex', alignItems:'center', gap:8, padding:'7px 12px',
                        borderRadius:7, marginBottom:1, fontSize:13, fontWeight:400,
                        textDecoration:'none', transition:'all 0.15s',
                        color: isSubActive(sub.path) ? '#fff' : 'var(--text2)',
                        background: isSubActive(sub.path) ? 'var(--primary)' : 'transparent',
                      }}
                      onMouseEnter={e => { if (!isSubActive(sub.path)) e.currentTarget.style.background = 'var(--bg3)'; }}
                      onMouseLeave={e => { if (!isSubActive(sub.path)) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ fontSize:14 }}>{sub.icon}</span>
                      <span>{sub.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 8, background: 'var(--bg3)',
          marginBottom: 8,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 14,
          }}>{user?.name?.[0]?.toUpperCase() || 'U'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{user?.email}</div>
          </div>
        </div>
        <button onClick={handleLogout} style={{
          width: '100%', padding: '9px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'transparent', color: 'var(--text2)', fontSize: 13,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>🚪 Sign out</button>
      </div>
    </aside>
  );
}