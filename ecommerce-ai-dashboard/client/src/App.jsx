import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import LoginPage    from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// ── Admin pages ────────────────────────────────────────────────────────────
import AdminDashboard       from './pages/admin/AdminDashboard';
import DemandForecastPage   from './pages/admin/DemandForecastPage';
import SmartPricingPage     from './pages/admin/SmartPricingPage';
import ProductAIPage        from './pages/admin/ProductAIPage';
import ProductsPage         from './pages/admin/ProductsPage';
import AIChatPage           from './pages/admin/AIChatPage';
import InventoryPage        from './pages/admin/InventoryPage';
import CustomerSegmentPage  from './pages/admin/CustomerSegmentPage';
import AdminSegmentsPage    from './pages/admin/AdminSegmentsPage';
import AdminOrdersPage      from './pages/admin/AdminOrdersPage';
import RevenueForecastPage  from './pages/admin/RevenueForecastPage';
import ExpiryTrackerPage    from './pages/admin/ExpiryTrackerPage';

// ── Customer pages ─────────────────────────────────────────────────────────
import CustomerDashboard    from './pages/customer/CustomerDashboard';
import ReorderPage          from './pages/customer/ReorderPage';
import VisualSearchPage     from './pages/customer/VisualSearchPage';
import OrdersPage           from './pages/customer/OrdersPage';
import ShopPage             from './pages/customer/ShopPage';
import CustomerChatPage     from './pages/customer/CustomerChatPage';
import CustomerProfilePage  from './pages/customer/CustomerProfilePage';
import CheckoutPage         from './pages/customer/CheckoutPage';
import OrderConfirmedPage   from './pages/customer/OrderConfirmedPage';

import { useEffect } from 'react';
import ProtectedRoute from './components/shared/ProtectedRoute';
import { useAuthStore } from './store/authStore';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 5 * 60 * 1000 } },
});

export default function App() {
  const { user, token, fetchMe } = useAuthStore();

  // Refresh user data on mount (gets segment info for already-logged-in users)
  useEffect(() => {
    if (token && !user?.segmentDetails) {
      fetchMe();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* ── Admin routes ── */}
          <Route path="/admin" element={<ProtectedRoute roles={['admin','vendor']} />}>
            <Route index                 element={<AdminDashboard />} />
            <Route path="orders"         element={<AdminOrdersPage />} />
            <Route path="inventory"      element={<InventoryPage />} />
            <Route path="expiry"         element={<ExpiryTrackerPage />} />
            <Route path="demand"         element={<DemandForecastPage />} />
            <Route path="pricing"        element={<SmartPricingPage />} />
            <Route path="product-ai"     element={<ProductAIPage />} />
            <Route path="products"       element={<ProductsPage />} />
            <Route path="segments"       element={<AdminSegmentsPage />} />
            <Route path="customer-segments" element={<CustomerSegmentPage />} />
            <Route path="revenue"           element={<RevenueForecastPage />} />
            <Route path="ai-chat"        element={<AIChatPage />} />
          </Route>

          {/* ── Customer routes ── */}
          <Route path="/customer" element={<ProtectedRoute roles={['customer']} />}>
            <Route index                 element={<CustomerDashboard />} />
            <Route path="shop"           element={<ShopPage />} />
            <Route path="chat"           element={<CustomerChatPage />} />
            <Route path="reorder"        element={<ReorderPage />} />
            <Route path="visual-search"  element={<VisualSearchPage />} />
            <Route path="orders"         element={<OrdersPage />} />
            <Route path="profile"        element={<CustomerProfilePage />} />
          </Route>

          {/* Checkout routes — outside ProtectedRoute layout so they render full-screen */}
          <Route path="/customer/checkout"       element={<CheckoutPage />} />
          <Route path="/customer/order-confirmed" element={<OrderConfirmedPage />} />

          <Route path="/" element={
            !user                       ? <Navigate to="/login"    /> :
            user.role === 'customer'    ? <Navigate to="/customer" /> :
                                          <Navigate to="/admin"    />
          } />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{ style: { background:'#1e1e3a', color:'#e2e8f0', border:'1px solid #2a2a4a' } }}
      />
    </QueryClientProvider>
  );
}
