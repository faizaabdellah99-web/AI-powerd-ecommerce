import Sidebar from './Sidebar';
import AIChatAssistant from './AIChatAssistant';
import NotificationBell from './NotificationBell';
import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Layout({ children, title, subtitle }) {
  const { pathname } = useLocation();
  const [theme, setTheme] = useState('dark');

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const getContext = () => {
    if (pathname.includes('demand'))      return 'demand forecasting and inventory management';
    if (pathname.includes('pricing'))     return 'smart pricing and competitor analysis';
    if (pathname.includes('product-ai'))  return 'product content generation and SEO';
    if (pathname.includes('products'))    return 'product catalog management';
    if (pathname.includes('inventory'))   return 'inventory management and stock alerts';
    if (pathname.includes('segments'))    return 'customer segmentation and targeting';
    if (pathname.includes('reorder'))     return 'customer reorder prediction';
    if (pathname.includes('visual'))      return 'visual search and product discovery';
    if (pathname.includes('orders'))      return 'order management and tracking';
    if (pathname.includes('ai-chat'))     return 'general ecommerce AI assistance';
    if (pathname.includes('chat'))        return 'customer support and order assistance';
    if (pathname.includes('shop'))        return 'product discovery and shopping';
    return 'ecommerce analytics and management';
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 240, minHeight: '100vh' }}>

        {/* ── Top header bar ── */}
        <div style={{
          padding: '16px 32px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}>
          <div>
            {title    && <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{title}</h1>}
            {subtitle && <p  style={{ fontSize: 12, color: 'var(--text3)', margin: '2px 0 0' }}>{subtitle}</p>}
          </div>

          {/* Right side: theme toggle and notification bell */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={toggleTheme}
              style={{
                padding: '8px 12px',
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text2)',
                cursor: 'pointer',
                fontSize: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s',
              }}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
              <span style={{ fontSize: 12, fontWeight: 500 }}>
                {theme === 'dark' ? 'Light' : 'Dark'}
              </span>
            </button>
            <NotificationBell />
          </div>
        </div>

        {/* ── Page content ── */}
        <div style={{ padding: '24px 32px' }}>
          {children}
        </div>
      </main>

      {/* Floating AI Chat */}
      <AIChatAssistant context={getContext()} />
    </div>
  );
}
