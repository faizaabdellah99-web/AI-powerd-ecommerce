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
  { path: '/admin/product-ai',   icon: '🤖', label: 'Product AI'      },
  { path: '/admin/products',     icon: '🏷️', label: 'Products'        },
  { path: '/admin/segments',     icon: '📊', label: 'Segments'        },
  { path: '/admin/feedback',     icon: '💬', label: 'Feedback', badge:'NEW' },
  { path: '/admin/ai-chat',      icon: '✦',  label: 'AI Chat'         },
];

const vendorNav = [
  { path: '/admin',              icon: '⊞', label: 'Dashboard'       },
  { path: '/admin/orders',       icon: '📋', label: 'Orders'          },
  { path: '/admin/inventory',    icon: '📦', label: 'Inventory'       },
  { path: '/admin/expiry',       icon: '⏰', label: 'Expiry Tracker'  },
  { path: '/admin/pricing',      icon: '💰', label: 'Smart Pricing'   },
  { path: '/admin/product-ai',   icon: '🤖', label: 'Product AI'      },
  { path: '/admin/products',     icon: '🏷️', label: 'Products'        },
  { path: '/admin/feedback',     icon: '💬', label: 'Feedback', badge:'NEW' },
  { path: '/admin/ai-chat',      icon: '✦',  label: 'AI Chat'         },
];

const customerNav = [
  { path: '/customer',               icon: '⊞', label: 'Dashboard'     },
  { path: '/customer/shop',          icon: '🛍️', label: 'Shop'          },
  { path: '/customer/chat',          icon: '✦',  label: 'AI Assistant'  },
  { path: '/customer/reorder',       icon: '🔄', label: 'Re-order AI'   },
  { path: '/customer/visual-search', icon: '🔍', label: 'Visual Search' },
  { path: '/customer/orders',        icon: '📋', label: 'My Orders'     },
  { path: '/customer/feedback',      icon: '💬', label: 'Feedback', badge:'NEW' },
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
  const { newOrderCount, recentOrders, topCustomers, setTopCustomers } = useOrderStore();
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [showCustomerPanel, setShowCustomerPanel] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});
  const [orderStats, setOrderStats] = useState({ pending: 0, today: 0, total: 0, totalRevenue: 0 });

  // Auto-expand Product AI menu if on a product-ai sub-page
  useEffect(() => {
    if (location.pathname === '/admin/product-ai' && location.search.includes('tab=')) {
      setExpandedMenus(prev => ({ ...prev, '/admin/product-ai': true }));
    }
  }, [location.pathname, location.search]);

  // Reset badge when visiting Orders page
  useEffect(() => {
    if (location.pathname === '/admin/orders') {
      useOrderStore.getState().resetNewOrders();
    }
  }, [location.pathname]);

  // Socket listener for new orders
  useEffect(() => {
    const s = getSocket();
    if (!s.connected) s.connect();
    const handler = () => useOrderStore.getState().incrementNewOrders();
    s.on('new-order', handler);
    return () => { s.off('new-order', handler); };
  }, []);

  // Fetch order stats and top customers (admin/vendor only)
  useEffect(() => {
    if (user?.role === 'customer') return;
    const fetchData = async () => {
      try {
        const { data: stats } = await api.get('/orders/stats');
        setOrderStats({
          pending: stats.pendingOrders || 0,
          today: stats.todayRevenue || 0,
          total: stats.totalOrders || 0,
          totalRevenue: stats.totalRevenue || 0,
        });
      } catch {
        setOrderStats({ pending: 3, today: 1250, total: 156, totalRevenue: 125000 });
      }

      try {
        const { data } = await api.get('/orders?limit=100');
        const orders = data.orders || data || [];
        // Aggregate top customers by total spent
        const customerMap = {};
        orders.forEach(o => {
          if (!o.customer?.name) return;
          const key = o.customer._id || o.customer.email || o.customer.name;
          if (!customerMap[key]) {
            customerMap[key] = { name: o.customer.name, email: o.customer.email || '', totalSpent: 0, orders: 0, avatar: o.customer.name[0] };
          }
          customerMap[key].totalSpent += o.total || 0;
          customerMap[key].orders += 1;
        });
        const sorted = Object.values(customerMap).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);
        if (sorted.length > 0) setTopCustomers(sorted);
        else setTopCustomers(DEMO_TOP_CUSTOMERS);
      } catch {
        setTopCustomers(DEMO_TOP_CUSTOMERS);
      }
    };
    fetchData();
  }, [setTopCustomers, user?.role]);

  const nav = user?.role === 'vendor' ? vendorNav : ['admin'].includes(user?.role) ? adminNav : customerNav;
  const roleLabel = user?.role === 'vendor' ? 'Vendor' : user?.role === 'admin' ? 'Admin' : 'Customer';

  const handleLogout = () => { logout(); navigate('/login'); };

  const toggleMenu = (path) => {
    setExpandedMenus(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const isActive = (path) => {
    if (path.includes('?')) {
      const [base, qs] = path.split('?');
      const param = new URLSearchParams(qs);
      const currentParams = new URLSearchParams(location.search);
      return location.pathname === base && currentParams.get('tab') === param.get('tab');
    }
    return location.pathname === path;
  };

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
          }}>✦</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>AI Commerce</div>
            <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 500 }}>{roleLabel} Portal</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        {nav.map(item => {
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isExpanded = expandedMenus[item.path];
          const isParentActive = location.pathname === item.path && !location.search.includes('tab=');

          return (
            <div key={item.path}>
              {/* Parent nav item */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <NavLink to={hasSubItems ? '#' : item.path} end={item.path.split('/').length === 2}
                  onClick={hasSubItems ? (e) => { e.preventDefault(); toggleMenu(item.path); } : undefined}
                  style={({ isActive: active }) => ({
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    borderRadius: 8, marginBottom: 2, fontSize: 14, fontWeight: 500,
                    color: (isParentActive || (hasSubItems && location.pathname === item.path && location.search.includes('tab='))) ? '#fff' : 'var(--text2)',
                    background: (isParentActive || (hasSubItems && location.pathname === item.path && location.search.includes('tab='))) ? 'var(--primary)' : 'transparent',
                    transition: 'all 0.15s',
                    textDecoration: 'none', flex: 1,
                  })}
                >
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {/* Orders badge */}
                  {(item.label === 'Orders' && user?.role !== 'customer' && newOrderCount > 0) && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 20,
                      background: '#10b981', color: '#fff', letterSpacing: 0.5,
                    }}>{newOrderCount}</span>
                  )}
                  {(item.badge && item.label !== 'Orders') && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 20,
                      background: '#10b981', color: '#fff', letterSpacing: 0.5,
                    }}>{item.badge}</span>
                  )}
                </NavLink>
                {hasSubItems && (
                  <button onClick={() => toggleMenu(item.path)} style={{
                    background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer',
                    padding: '10px 8px', fontSize: 10, display: 'flex', alignItems: 'center',
                  }}>
                    <span style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
                  </button>
                )}
              </div>

              {/* Sub-items */}
              {hasSubItems && isExpanded && (
                <div style={{ marginLeft: 8, marginBottom: 4, borderLeft: '1px solid var(--border)', paddingLeft: 8 }}>
                  {item.subItems.map(sub => (
                    <NavLink key={sub.path} to={sub.path}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
                        borderRadius: 6, marginBottom: 1, fontSize: 13, fontWeight: 400,
                        color: isActive(sub.path) ? '#fff' : 'var(--text2)',
                        background: isActive(sub.path) ? 'var(--primary)' : 'transparent',
                        transition: 'all 0.15s',
                        textDecoration: 'none',
                      }}
                    >
                      <span style={{ fontSize: 13 }}>{sub.icon}</span>
                      <span style={{ flex: 1 }}>{sub.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* ── Order Stats Panel (Admin/Vendor only) ── */}
        {user?.role !== 'customer' && (
          <div style={{ marginTop: 16, padding: '0 4px' }}>
            <div
              onClick={() => setShowOrderPanel(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                color: 'var(--text3)', background: showOrderPanel ? 'var(--bg3)' : 'transparent',
              }}
            >
              <span>📊</span>
              <span style={{ flex: 1 }}>Order Overview</span>
              <span style={{ fontSize: 10 }}>{showOrderPanel ? '▲' : '▼'}</span>
            </div>

            {showOrderPanel && (
              <div style={{ padding: '8px 12px', background: 'var(--bg3)', borderRadius: 8, marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>
                  <span>⏳ Pending</span>
                  <span style={{ fontWeight: 700, color: '#eab308' }}>{orderStats.pending}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>
                  <span>💰 Today</span>
                  <span style={{ fontWeight: 700, color: '#10b981' }}>${orderStats.today.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>
                  <span>💵 Total Revenue</span>
                  <span style={{ fontWeight: 700, color: '#6366f1' }}>${(orderStats.totalRevenue || 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)' }}>
                  <span>📋 Total Orders</span>
                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{orderStats.total}</span>
                </div>

                {/* Recent orders ticker */}
                {recentOrders.length > 0 && (
                  <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', marginBottom: 6, letterSpacing: 0.5 }}>
                      🔔 RECENT ORDERS
                    </div>
                    {recentOrders.slice(0, 3).map((o, i) => (
                      <div key={i} style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                        <span>{o.orderId || `#${i + 1}`}</span>
                        <span style={{ fontWeight: 600, color: '#10b981' }}>${Number(o.total || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Top Customers Panel (Admin/Vendor only) ── */}
        {user?.role !== 'customer' && (
          <div style={{ marginTop: 8, padding: '0 4px' }}>
            <div
              onClick={() => setShowCustomerPanel(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                color: 'var(--text3)', background: showCustomerPanel ? 'var(--bg3)' : 'transparent',
              }}
            >
              <span>👑</span>
              <span style={{ flex: 1 }}>Top Customers</span>
              <span style={{ fontSize: 10 }}>{showCustomerPanel ? '▲' : '▼'}</span>
            </div>

            {showCustomerPanel && (
              <div style={{ padding: '8px 12px', background: 'var(--bg3)', borderRadius: 8, marginTop: 4 }}>
                {topCustomers.length === 0 ? (
                  <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', padding: 8 }}>
                    No customer data yet
                  </div>
                ) : (
                  topCustomers.map((c, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 0', borderBottom: i < topCustomers.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#3b82f6'][i],
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0,
                      }}>
                        {c.avatar || c.name?.[0] || '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.name}
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--text3)' }}>
                          {c.orders} orders · ${(c.totalSpent || 0).toLocaleString()}
                        </div>
                      </div>
                      <div style={{
                        fontSize: 9, fontWeight: 700, color: '#10b981',
                        background: '#10b98115', padding: '2px 6px', borderRadius: 10,
                      }}>
                        #{i + 1}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
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