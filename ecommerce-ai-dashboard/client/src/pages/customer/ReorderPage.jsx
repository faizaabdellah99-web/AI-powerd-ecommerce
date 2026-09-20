import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/shared/Layout';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import Spinner from '../../components/shared/Spinner';
import Badge from '../../components/shared/Badge';
import ProductImage from '../../components/shared/ProductImage';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

// Product catalog with image, price & stock info for the reorder cards
const PRODUCT_CATALOG = {
  p1: {
    product_name: 'Wireless Headphones',
    price: 129.99,
    stock: 24,
    category: 'Electronics',
    imageUrl: null,
  },
  p2: {
    product_name: 'Coffee Capsules',
    price: 25.00,
    stock: 4,
    category: 'Food & Beverage',
    imageUrl: null,
  },
  p3: {
    product_name: 'Protein Powder',
    price: 45.50,
    stock: 12,
    category: 'Sports & Fitness',
    imageUrl: null,
  },
};

// Merge AI suggestion with product catalog data (image, price, stock)
const enrichSuggestion = (s, productData = {}) => {
  // Try exact match by ID first
  let meta = productData[s.product_id];
  
  // If not found, try matching by name (case-insensitive)
  if (!meta && s.product_name) {
    const productNameKey = Object.keys(productData).find(
      key => key.toLowerCase() === s.product_name.toLowerCase()
    );
    if (productNameKey) {
      meta = productData[productNameKey];
    }
  }
  
  // Fallback to sample catalog
  if (!meta) {
    meta = PRODUCT_CATALOG[s.product_id] || {};
    console.log('Using fallback catalog for:', s.product_id, s.product_name);
  } else {
    console.log('Found product data for:', s.product_id, s.product_name, 'price:', meta.price);
  }
  
  return {
    ...s,
    product_name: s.product_name || meta.product_name || 'Product',
    price:        s.price        ?? meta.price        ?? 0,
    stock:        s.stock        ?? meta.stock        ?? 0,
    category:     s.category     || meta.category     || 'General',
    imageUrl:     s.imageUrl     || meta.imageUrl     || null,
  };
};

export default function ReorderPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState({}); // { product_id: true/false }
  const [dismissed, setDismissed] = useState({});   // { product_id: true/false }
  const [cart, setCart] = useState({}); // { product_id: { ...product, qty } }

  // ── Fetch real product data from the database ─────────────────────────────
  const [products, setProducts] = useState({});
  const [productsLoading, setProductsLoading] = useState(true);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  // ── Fetch the customer's real order history from the database ──────────────
  const [orderHistory, setOrderHistory] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchOrders = async () => {
      try {
        const { data } = await api.get('/orders/my');
        if (!active) return;

        if (data && data.length > 0) {
          // Build order history from real orders
          const history = [];
          data.forEach(order => {
            (order.items || []).forEach(item => {
              history.push({
                product_id:   item.productId || item.product?._id || item.productName,
                product_name: item.productName || item.product?.name || 'Product',
                quantity:     item.qty || 1,
                order_date:   order.createdAt ? order.createdAt.slice(0, 10) : '',
              });
            });
          });
          console.log('Order history built:', history.length, 'items');
          history.forEach(h => console.log('  -', h.product_id, h.product_name));
          setOrderHistory(history.length > 0 ? history : []);
        } else {
          // New customer with no orders — show empty state
          setOrderHistory([]);
        }
      } catch (err) {
        console.error('Failed to fetch orders:', err);
        if (active) setOrderHistory([]);
      } finally {
        if (active) setOrdersLoading(false);
      }
    };
    fetchOrders();
    return () => { active = false; };
  }, [user]);

  // ── Fetch all products from the database ─────────────────────────────────────
  useEffect(() => {
    let active = true;
    const fetchProducts = async () => {
      try {
        const { data } = await api.get('/products');
        if (!active) return;

        // Build a product lookup map by ID and name
        const productMap = {};
        const productList = data.products || data || []; // Handle both array and object with products property
        console.log('Fetched products:', productList.length, 'products');
        
        if (productList && productList.length > 0) {
          productList.forEach(product => {
            productMap[product._id] = {
              product_name: product.name,
              price: product.price || 0,
              stock: product.stock || 0,
              category: product.category || 'General',
              imageUrl: product.imageUrl || product.images?.[0] || null,
            };
            // Also map by name for fallback matching
            productMap[product.name] = productMap[product._id];
          });
          console.log('Product map built with', Object.keys(productMap).length, 'entries');

          // Build trending products — sort by sales history quantity (most sold first),
          // then by rating, then by stock as fallback so products always show up
          const trending = [...productList]
            .map(p => {
              const totalSold = (p.salesHistory || []).reduce((sum, s) => sum + (s.quantity || 0), 0);
              // Try multiple image sources
              const imageUrl = p.images?.[0]?.url || p.images?.[0] || p.imageUrl || null;
              console.log('Product image for', p.name, ':', imageUrl);
              return {
                _id: p._id,
                name: p.name,
                price: p.price || 0,
                stock: p.stock || 0,
                category: p.category || 'General',
                imageUrl,
                totalSold,
                rating: p.ratings?.average || 0,
                ratingCount: p.ratings?.count || 0,
              };
            })
            .sort((a, b) => {
              // Primary: most sold
              if (b.totalSold !== a.totalSold) return b.totalSold - a.totalSold;
              // Secondary: highest rating
              if (b.rating !== a.rating) return b.rating - a.rating;
              // Tertiary: most stock available
              return b.stock - a.stock;
            })
            .slice(0, 6);
          console.log('Trending products:', trending.length, 'items');
          setTrendingProducts(trending);
        }
      } catch (err) {
        console.error('Failed to fetch products:', err);
      } finally {
        if (active) setProductsLoading(false);
        if (active) setTrendingLoading(false);
      }
    };
    fetchProducts();
    return () => { active = false; };
  }, []);

  // ── Only suggest products the customer has actually purchased ──────────────
  const purchasedProductIds = () => {
    const ids = new Set(orderHistory.map(h => h.product_id));
    return ids;
  };

  // Build a reorder suggestion from real order-history data for a purchased product
  const buildSuggestionFromHistory = (productId, productName) => {
    // Find the customer's past orders for this product
    const productOrders = orderHistory.filter(h => h.product_id === productId);
    const dates = productOrders
      .map(h => h.order_date)
      .filter(Boolean)
      .sort();

    // Average days between orders (at least 14 days for a realistic reorder cycle)
    let avgDays = 30;
    if (dates.length >= 2) {
      const gaps = [];
      for (let i = 1; i < dates.length; i++) {
        const d = Math.round((new Date(dates[i]) - new Date(dates[i-1])) / 86400000);
        if (d > 0) gaps.push(d);
      }
      if (gaps.length > 0) avgDays = Math.max(14, Math.round(gaps.reduce((a,b) => a+b, 0) / gaps.length));
    }

    const lastDate = dates[dates.length - 1] || new Date().toISOString().slice(0, 10);
    const suggestedDate = new Date(lastDate);
    suggestedDate.setDate(suggestedDate.getDate() + avgDays);

    const meta = PRODUCT_CATALOG[productId] || {};
    return {
      product_id: productId,
      product_name: productName || meta.product_name || 'Product',
      suggested_reorder_date: suggestedDate.toISOString().slice(0, 10),
      confidence: Math.min(0.95, 0.55 + (dates.length * 0.08)),
      avg_days_between_orders: avgDays,
    };
  };

  const runPrediction = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/ai/reorder-prediction', {
        customer_id: user?._id || 'cust_001',
        order_history: orderHistory,
      });

      // Only keep AI suggestions for products the customer actually purchased
      const purchased = purchasedProductIds();
      let suggestions = (data.suggestions || [])
        .filter(s => purchased.has(s.product_id))
        .map(s => enrichSuggestion(s, products));

      // If the AI returned nothing for this customer's products, build from history
      if (suggestions.length === 0) {
        suggestions = buildSuggestionsFromHistory();
      }

      setResult({ ...data, suggestions });
      if (suggestions.length === 0) {
        toast('No order history found — make your first purchase to get reorder suggestions', { icon: '📭' });
      } else {
        toast.success(`Found ${suggestions.length} reorder suggestion(s) for your purchased items!`);
      }
    } catch {
      // Always generate suggestions from the customer's real purchase history
      const suggestions = buildSuggestionsFromHistory();
      setResult({
        customer_id: user?._id || 'cust_001',
        suggestions,
      });
      if (suggestions.length === 0) {
        toast('No order history found — make your first purchase to get reorder suggestions', { icon: '📭' });
      } else {
        toast.success(`Prediction complete — ${suggestions.length} product(s) you purchased!`);
      }
    } finally { setLoading(false); }
  };

  // Generate reorder suggestions only for products the customer bought
  const buildSuggestionsFromHistory = () => {
    const purchased = purchasedProductIds();
    const uniqueProducts = [];
    const seen = new Set();
    
    console.log('Building suggestions from order history:', orderHistory.length, 'items');
    console.log('Purchased product IDs:', Array.from(purchased));
    console.log('Available product keys:', Object.keys(products).slice(0, 10));
    
    orderHistory.forEach(h => {
      if (!seen.has(h.product_id) && purchased.has(h.product_id)) {
        seen.add(h.product_id);
        uniqueProducts.push({ product_id: h.product_id, product_name: h.product_name });
      }
    });

    console.log('Unique products from history:', uniqueProducts.length);
    uniqueProducts.forEach(p => console.log('  -', p.product_id, p.product_name));

    if (uniqueProducts.length === 0) {
      // New customer with no order history — no suggestions to show
      console.log('No order history found — returning empty suggestions for new customer');
      return [];
    }

    // Customer has real orders - build suggestions with real product data
    console.log('Customer has real orders, building suggestions with real product data');
    const suggestions = uniqueProducts
      .map(({ product_id, product_name }) => {
        const suggestion = buildSuggestionFromHistory(product_id, product_name);
        
        // Try to find real product data by ID first
        let productData = products[product_id];
        
        // If not found by ID, try by name (case-insensitive)
        if (!productData && product_name) {
          const productKey = Object.keys(products).find(
            key => key.toLowerCase() === product_name.toLowerCase()
          );
          if (productKey) {
            productData = products[productKey];
            console.log('Found product by name:', product_name, '->', productKey);
          }
        }
        
        // If still not found, try partial match
        if (!productData && product_name) {
          const partialKey = Object.keys(products).find(
            key => key.toLowerCase().includes(product_name.toLowerCase().split(' ')[0]) ||
                   product_name.toLowerCase().includes(key.toLowerCase())
          );
          if (partialKey) {
            productData = products[partialKey];
            console.log('Found product by partial match:', product_name, '->', partialKey);
          }
        }
        
        // If still not found, try keyword matching (synonyms)
        if (!productData && product_name) {
          const keywords = {
            'wireless': ['headset', 'headphone', 'earphone', 'earbuds'],
            'headphones': ['headset', 'headphone', 'earphone', 'earbuds'],
            'coffee': ['coffee', 'brew', 'espresso', 'cappuccino'],
            'capsules': ['capsule', 'pod', 'k-cup'],
            'protein': ['protein', 'whey', 'supplement', 'shake'],
            'powder': ['powder', 'supplement', 'mix'],
          };
          
          const productNameLower = product_name.toLowerCase();
          for (const [keyword, synonyms] of Object.entries(keywords)) {
            if (productNameLower.includes(keyword)) {
              const synonymKey = Object.keys(products).find(
                key => synonyms.some(syn => key.toLowerCase().includes(syn))
              );
              if (synonymKey) {
                productData = products[synonymKey];
                console.log('Found product by keyword match:', product_name, '->', synonymKey, '(keyword:', keyword, ')');
                break;
              }
            }
          }
        }
        
        if (productData) {
          console.log('Enriching suggestion with real data:', product_id, 'price:', productData.price);
          return enrichSuggestion({ ...suggestion, price: productData.price, stock: productData.stock, category: productData.category, imageUrl: productData.imageUrl }, products);
        } else {
          console.log('No product data found for:', product_id, product_name, 'using suggestion as-is');
          return enrichSuggestion(suggestion, products);
        }
      });
    
    return suggestions;
  };

  // ── Dynamic date logic: "In X days" / "Overdue by X days" ──────────────────
  // Uses date-only comparison (midnight timestamps) to avoid time-of-day
  // rounding errors and produce accurate day counts.
  const urgency = (date) => {
    if (!date) return { label: '🟢 Normal', color: 'success', days: 0, overdue: false };

    const target = new Date(date);
    const now = new Date();

    // Reset both to start-of-day so a 2:00 AM vs 11:59 PM edge case
    // doesn't shift the day count incorrectly.
    const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const daysDiff = Math.round((targetDay - nowDay) / 86400000);

    // ── Overdue (date is in the past) → always Urgent (red) ──
    if (daysDiff < 0) {
      const overdueDays = Math.abs(daysDiff);
      return {
        label: '🔴 Urgent',
        color: 'danger',
        days: overdueDays,
        overdue: true,
      };
    }

    // ── 0–5 days left → Urgent (red) ──
    if (daysDiff <= 5) {
      return { label: '🔴 Urgent', color: 'danger', days: daysDiff, overdue: false };
    }

    // ── 6–15 days left → Due Soon (yellow) ──
    if (daysDiff <= 15) {
      return { label: '🟡 Due Soon', color: 'warning', days: daysDiff, overdue: false };
    }

    // ── More than 15 days → Normal (green) — recently purchased, no rush ──
    return { label: '🟢 Normal', color: 'success', days: daysDiff, overdue: false };
  };

  const stockStatus = (stock) => {
    if (stock <= 0) return { label: '❌ Out of Stock', color: 'danger' };
    if (stock <= 5) return { label: `⚠️ Low Stock (${stock} left)`, color: 'warning' };
    return { label: '✅ In Stock', color: 'success' };
  };

  const toggleSubscribe = (productId) => {
    setSubscribed(prev => {
      const next = { ...prev, [productId]: !prev[productId] };
      const product = PRODUCT_CATALOG[productId];
      if (next[productId]) {
        toast.success(`🔁 Auto-Refill enabled for ${product?.product_name || 'product'} — we'll reorder automatically!`);
      } else {
        toast('Auto-Refill disabled', { icon: '⏸️' });
      }
      return next;
    });
  };

  // ── Dismiss / Not Now: hide this suggestion card from the UI ──────────────
  const dismissSuggestion = (s) => {
    setDismissed(prev => ({ ...prev, [s.product_id]: true }));
    toast(`"${s.product_name}" dismissed — we'll remind you later`, { icon: '⏰' });
  };

  // ── Functional Add to Cart: adds product and goes to checkout ──────────────
  const addToCart = (s) => {
    const productId = s.product_id;
    const cartItem = {
      id:       productId,
      name:     s.product_name,
      category: s.category || 'General',
      price:    s.price ?? 0,
      qty:      1,
    };
    setCart(prev => {
      const existing = prev[productId];
      const next = {
        ...prev,
        [productId]: existing
          ? { ...existing, qty: existing.qty + 1 }
          : cartItem,
      };
      return next;
    });
    toast.success(`${s.product_name} added to your cart!`);
  };

  const goToCheckout = () => {
    const cartItems = Object.values(cart);
    if (cartItems.length === 0) {
      toast.error('Your cart is empty — add a product first');
      return;
    }
    navigate('/customer/checkout', { state: { cartItems } });
  };

  const cartCount = Object.values(cart).reduce((s, i) => s + i.qty, 0);

  return (
    <Layout title="🔄 Predictive Re-ordering" subtitle="AI predicts when you'll need to reorder based on your purchase patterns">
      {/* Order history */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Your Order History</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>
              {ordersLoading ? 'Loading your orders…' : orderHistory.length === 0 ? 'No orders yet — AI suggestions will appear after your first purchase' : `Loaded ${orderHistory.length} item(s) from your real orders`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {cartCount > 0 && (
              <Button onClick={goToCheckout} style={{ background: 'var(--success)' }}>
                🛒 Checkout ({cartCount})
              </Button>
            )}
            <Button onClick={runPrediction} loading={loading}>🤖 Predict Reorders</Button>
          </div>
        </div>
        {!ordersLoading && orderHistory.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '40px 20px',
            background: 'var(--bg3)', borderRadius: 12,
            border: '1px dashed var(--border)',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              No Order History Found
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', maxWidth: 420, margin: '0 auto', lineHeight: 1.6 }}>
              You haven't placed any orders yet. Once you make your first purchase, your frequently ordered items and smart re-order suggestions will appear here.
            </div>
            <div style={{ marginTop: 20 }}>
              <Button onClick={() => navigate('/customer/shop')} style={{ background: 'var(--primary)' }}>
                🛍️ Explore Top Products
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {orderHistory.map((o, i) => (
              <div key={i} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>{o.product_name}</span>
                <span style={{ color: 'var(--text3)', marginLeft: 8 }}>{o.order_date}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── View Trending Items — shown for all customers ── */}
      {!trendingLoading && trendingProducts.length > 0 && (
        <Card style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>🔥 View Trending Items</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>
                Popular products other customers are buying right now
              </div>
            </div>
            <Button onClick={() => navigate('/customer/shop')} style={{ background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)' }}>
              View All →
            </Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
            {trendingProducts.map((p, i) => (
              <div key={p._id} style={{
                background: 'var(--bg3)', borderRadius: 10, overflow: 'hidden',
                border: '1px solid var(--border)', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
                onClick={() => navigate('/customer/shop')}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                {/* Product image */}
                <div style={{ height: 100, background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  {p.imageUrl ? (
                    <img 
                      src={p.imageUrl} 
                      alt={p.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      onError={(e) => {
                        console.log('Image load error for', p.name, ':', p.imageUrl);
                        e.target.style.display = 'none';
                      }}
                      onLoad={() => console.log('Image loaded for', p.name)}
                    />
                  ) : (
                    <ProductImage name={p.name} category={p.category} size={64} borderRadius={8} />
                  )}
                  {/* Rank badge */}
                  <div style={{
                    position: 'absolute', top: 8, left: 8,
                    background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : 'var(--primary)',
                    color: '#fff', fontSize: 10, fontWeight: 700,
                    padding: '2px 8px', borderRadius: 12,
                  }}>
                    #{i + 1}
                  </div>
                  {/* Sold badge */}
                  {p.totalSold > 0 && (
                    <div style={{
                      position: 'absolute', bottom: 8, right: 8,
                      background: '#10b981', color: '#fff', fontSize: 9, fontWeight: 600,
                      padding: '2px 8px', borderRadius: 12,
                    }}>
                      {p.totalSold} sold
                    </div>
                  )}
                </div>
                {/* Product info */}
                <div style={{ padding: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    {p.category}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary)' }}>
                      ${(p.price ?? 0).toFixed(2)}
                    </span>
                    {p.rating > 0 && (
                      <span style={{ fontSize: 11, color: '#f59e0b' }}>
                        ⭐ {p.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {loading && <Spinner />}

      {result && !loading && result.suggestions.length === 0 && (
        <Card style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📭</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No Reorder Suggestions Yet</div>
          <div style={{ fontSize: 14, color: 'var(--text2)', maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
            You haven't placed any orders yet. Once you make your first purchase, your frequently ordered items and smart re-order suggestions will appear here.
          </div>
        </Card>
      )}

      {result && !loading && result.suggestions.length > 0 && (
        <>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
            🤖 {result.suggestions.length} Reorder Prediction{result.suggestions.length !== 1 ? 's' : ''}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16 }}>
            {result.suggestions.filter(s => !dismissed[s.product_id]).map((s, i) => {
              const u = urgency(s.suggested_reorder_date);
              const st = stockStatus(s.stock);
              const isSubscribed = !!subscribed[s.product_id];
              const inCartQty = cart[s.product_id]?.qty || 0;
              return (
                <Card key={i} style={{ position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: u.color === 'danger' ? 'var(--danger)' : u.color === 'warning' ? 'var(--warning)' : 'var(--success)' }} />

                  {/* ── Dismiss (Not Now) button ── */}
                  <button
                    onClick={() => dismissSuggestion(s)}
                    title="Not now — hide this suggestion"
                    style={{
                      position: 'absolute', top: 10, right: 10, zIndex: 5,
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'var(--bg3)', border: '1px solid var(--border)',
                      color: 'var(--text3)', cursor: 'pointer', fontSize: 13,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s', lineHeight: 1,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--danger)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                  >
                    ✕
                  </button>

                  <div style={{ paddingLeft: 8 }}>

                    {/* ── Product Image + Name + Price ── */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                      {/* Product photo */}
                      <div style={{ width: 64, height: 64, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                        {s.imageUrl ? (
                          <img src={s.imageUrl} alt={s.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e=>e.target.style.display='none'} />
                        ) : (
                          <ProductImage name={s.product_name} category={s.category} size={56} borderRadius={8} />
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{s.product_name}</div>
                          <Badge color={u.color}>{u.label}</Badge>
                        </div>
                        {/* Price */}
                        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)', marginTop: 4 }}>
                          ${(s.price ?? 0).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* ── Stock Status ── */}
                    <div style={{ marginBottom: 12 }}>
                      <Badge color={st.color}>{st.label}</Badge>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                      {[
                        ['📅 Reorder Date', s.suggested_reorder_date],
                        ['⏱ Time',
                          u.overdue
                            ? u.days === 1
                              ? 'Yesterday'
                              : `Overdue by ${u.days} days`
                            : u.days === 0
                              ? 'Today'
                              : u.days === 1
                                ? 'Tomorrow'
                                : `In ${u.days} days`
                        ],
                        ['🔁 Avg Interval', `${s.avg_days_between_orders} days`],
                        ['🎯 Confidence', `${(s.confidence * 100).toFixed(0)}%`],
                      ].map(([label, val]) => (
                        <div key={label} style={{ background: 'var(--bg3)', padding: '8px 10px', borderRadius: 8 }}>
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>{label.split(' ').slice(1).join(' ')}</div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{val}</div>
                        </div>
                      ))}
                    </div>

                    {/* Confidence bar */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>
                        <span>AI Confidence</span><span style={{ fontWeight: 600, color: 'var(--text)' }}>{(s.confidence*100).toFixed(0)}%</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
                        <div style={{ width: `${s.confidence*100}%`, height: '100%', borderRadius: 3, background: s.confidence > 0.8 ? 'var(--success)' : s.confidence > 0.6 ? 'var(--warning)' : 'var(--danger)' }} />
                      </div>
                    </div>

                    {/* ── Auto-Refill (Subscribe Monthly) + Add to Cart ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {/* Subscribe Monthly checkbox */}
                      <label style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                        borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                        background: isSubscribed ? '#6366f122' : 'var(--bg3)',
                        border: `1px solid ${isSubscribed ? 'var(--primary)' : 'var(--border)'}`,
                      }}>
                        <input
                          type="checkbox"
                          checked={isSubscribed}
                          onChange={() => toggleSubscribe(s.product_id)}
                          style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer', flexShrink: 0 }}
                        />
                        <span style={{ fontSize: 13, fontWeight: 600, color: isSubscribed ? 'var(--primary)' : 'var(--text)' }}>
                          🔁 Subscribe Monthly
                        </span>
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: isSubscribed ? 'var(--primary)' : 'var(--text3)' }}>
                          {isSubscribed ? 'AI Auto-Refill ON' : 'AI Re-ordering'}
                        </span>
                      </label>

                      {/* Action buttons: Add to Cart + Not Now (Dismiss) */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        {/* Functional Add to Cart */}
                        <button
                          onClick={() => addToCart(s)}
                          style={{
                            flex: 1, padding: '10px', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13,
                            background: inCartQty > 0 ? 'var(--success)' : 'var(--primary)',
                            color: '#fff', transition: 'all 0.15s',
                          }}
                        >
                          {inCartQty > 0 ? `✓ ${inCartQty} in cart — Add more` : '🛒 Add to Cart'}
                        </button>

                        {/* Not Now (Dismiss) button */}
                        <button
                          onClick={() => dismissSuggestion(s)}
                          title="Not now — hide this suggestion"
                          style={{
                            padding: '10px 14px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13,
                            background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)',
                            transition: 'all 0.15s', whiteSpace: 'nowrap',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--danger)'; e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = '#ef444410'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.background = 'transparent'; }}
                        >
                          Not Now
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Restore dismissed suggestions */}
          {Object.keys(dismissed).length > 0 && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button
                onClick={() => setDismissed({})}
                style={{
                  padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: 'transparent', border: '1px solid var(--border)', color: 'var(--text2)',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text2)'; }}
              >
                ↩️ Restore dismissed suggestions
              </button>
            </div>
          )}
        </>
      )}

      {!result && !loading && (
        <Card style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔄</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Ready to Predict</div>
          <div style={{ fontSize: 14, color: 'var(--text2)', maxWidth: 400, margin: '0 auto' }}>
            Click "Predict Reorders" and our AI will analyze your purchase history to suggest what you'll need to buy next.
          </div>
        </Card>
      )}
    </Layout>
  );
}