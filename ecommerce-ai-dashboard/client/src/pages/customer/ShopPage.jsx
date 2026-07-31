import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductImage from '../../components/shared/ProductImage';
import api from '../../services/api';
import toast from 'react-hot-toast';

const PURCHASE_HISTORY = ['Electronics', 'Sports'];
const RECENTLY_VIEWED  = [1, 5, 18];

const ALL_PRODUCTS = [
  { id:1,  name:'Sony WH-1000XM5 Headphones',          category:'Electronics',     price:349, rating:4.9, reviews:1204, isAiPick:true,  isNew:false },
  { id:2,  name:'Smartwatch Pro Series 3',              category:'Electronics',     price:299, rating:4.8, reviews:521,  isAiPick:true,  isNew:false },
  { id:3,  name:'Mechanical Gaming Keyboard',           category:'Electronics',     price:89,  rating:4.6, reviews:445,  isAiPick:false, isNew:true  },
  { id:4,  name:'Portable Solar Charger',               category:'Electronics',     price:39,  rating:4.3, reviews:87,   isAiPick:false, isNew:true  },
  { id:5,  name:'Wireless Noise-Cancelling Headphones', category:'Electronics',     price:129, rating:4.7, reviews:389,  isAiPick:true,  isNew:false },
  { id:6,  name:'4K Webcam Ultra HD',                   category:'Electronics',     price:79,  rating:4.5, reviews:213,  isAiPick:false, isNew:false },
  { id:7,  name:'USB-C Hub 10-in-1',                    category:'Electronics',     price:55,  rating:4.4, reviews:678,  isAiPick:false, isNew:false },
  { id:8,  name:'Wool Blend Winter Coat',               category:'Clothing',       price:189, rating:4.6, reviews:97,   isAiPick:true,  isNew:false },
  { id:9,  name:'Running Sneakers Ultra Boost',         category:'Clothing',       price:129, rating:4.7, reviews:380,  isAiPick:true,  isNew:false },
  { id:10, name:'Premium Denim Jeans',                  category:'Clothing',       price:65,  rating:4.3, reviews:278,  isAiPick:false, isNew:false },
  { id:11, name:'Classic Leather Wallet',               category:'Clothing',       price:45,  rating:4.5, reviews:512,  isAiPick:false, isNew:false },
  { id:12, name:'Polarised Sunglasses',                 category:'Clothing',       price:59,  rating:4.4, reviews:163,  isAiPick:false, isNew:false },
  { id:13, name:'Ceramic Pour-Over Coffee Set',         category:'Home & Garden',  price:55,  rating:4.8, reviews:467,  isAiPick:true,  isNew:false },
  { id:14, name:'Memory Foam Pillow',                   category:'Home & Garden',  price:42,  rating:4.6, reviews:593,  isAiPick:true,  isNew:false },
  { id:15, name:'Indoor Herb Garden Kit',               category:'Home & Garden',  price:36,  rating:4.4, reviews:175,  isAiPick:false, isNew:false },
  { id:16, name:'Scented Soy Candle Set',               category:'Home & Garden',  price:28,  rating:4.7, reviews:341,  isAiPick:false, isNew:false },
  { id:17, name:'Bamboo Cutting Board Set',             category:'Home & Garden',  price:32,  rating:4.5, reviews:229,  isAiPick:false, isNew:false },
  { id:18, name:'Adjustable Dumbbell Set',              category:'Sports & Fitness',price:199, rating:4.8, reviews:304,  isAiPick:true,  isNew:false },
  { id:19, name:'Yoga Mat Premium',                     category:'Sports & Fitness',price:58,  rating:4.7, reviews:612,  isAiPick:true,  isNew:false },
  { id:20, name:'Insulated Water Bottle 1L',            category:'Sports & Fitness',price:32,  rating:4.7, reviews:823,  isAiPick:false, isNew:false },
  { id:21, name:'Tennis Racket Pro',                    category:'Sports & Fitness',price:110, rating:4.4, reviews:143,  isAiPick:false, isNew:false },
  { id:22, name:'Resistance Band Set',                  category:'Sports & Fitness',price:24,  rating:4.6, reviews:891,  isAiPick:false, isNew:false },
  { id:23, name:'Running Belt Waist Pack',              category:'Sports & Fitness',price:19,  rating:4.3, reviews:267,  isAiPick:false, isNew:false },
  { id:24, name:'Atomic Habits — James Clear',          category:'Books',          price:16,  rating:4.9, reviews:1204, isAiPick:true,  isNew:false },
  { id:25, name:'Deep Work — Cal Newport',              category:'Books',          price:15,  rating:4.7, reviews:876,  isAiPick:true,  isNew:false },
  { id:26, name:'The Design of Everyday Things',        category:'Books',          price:18,  rating:4.8, reviews:543,  isAiPick:false, isNew:false },
  { id:27, name:'Clean Code — Robert C. Martin',        category:'Books',          price:42,  rating:4.6, reviews:712,  isAiPick:false, isNew:false },
  { id:28, name:'The Pragmatic Programmer',             category:'Books',          price:38,  rating:4.7, reviews:489,  isAiPick:false, isNew:false },
];

const CATEGORIES  = ['All products','Electronics','Fashion','Home & Living','Food & Beverage','Sports & Fitness','Beauty & Care','Books','Toys','Health'];
const CAT_ICONS   = { 'All products':'⊞', Electronics:'💻', Fashion:'👗', 'Home & Living':'🏠', 'Food & Beverage':'🍎', 'Sports & Fitness':'⚽', 'Beauty & Care':'💄', Books:'📚', Toys:'🧸', Health:'💊' };
const CAT_EMOJI   = { Electronics:'💻', Fashion:'�', 'Home & Living':'🏠', 'Food & Beverage':'🍎', 'Sports & Fitness':'⚽', 'Beauty & Care':'💄', Books:'📚', Toys:'🧸', Health:'💊' };
const SORT_OPTIONS= ['AI recommended','Price: Low to High','Price: High to Low','Highest Rated','Most Reviews'];

const SYNONYMS = {
  headphone:['earbud','earphone','audio','sound','music'],
  laptop:['computer','notebook','pc','macbook'],
  shoe:['sneaker','boot','footwear','running'],
  coat:['jacket','outerwear','winter','warm','wool'],
  book:['novel','read','author'],
  coffee:['espresso','brew'],
  yoga:['mat','meditation','fitness'],
  dumbbell:['weight','gym','workout','exercise'],
};

function fuzzyMatch(q, p) {
  const query = q.toLowerCase().trim();
  const text  = (p.name + ' ' + p.category).toLowerCase();
  if (text.includes(query)) return true;
  const words = query.split(' ');
  if (words.every(w => text.includes(w.slice(0, Math.max(3, w.length - 1))))) return true;
  for (const [key, syns] of Object.entries(SYNONYMS)) {
    if (syns.some(s => query.includes(s)) && text.includes(key)) return true;
    if (query.includes(key) && syns.some(s => text.includes(s))) return true;
  }
  return false;
}

function Stars({ rating }) {
  return <span style={{ color:'#f59e0b', fontSize:11 }}>{'★'.repeat(Math.floor(rating))}{'☆'.repeat(5-Math.floor(rating))}</span>;
}

function ProductCard({ p, onAdd, qty }) {
  const [hover, setHover] = useState(false);
  const outOfStock = (p.stock ?? 0) === 0;

  const expiryInfo = (() => {
    if (!p.expiryDate) return null;
    const days = Math.ceil((new Date(p.expiryDate) - new Date()) / 86400000);
    if (days <= 0)  return { badge:'💀 Expired',        badgeColor:'#ef4444', label:null };
    if (days <= 3)  return { badge:`⏰ Exp in ${days}d`, badgeColor:'#ef4444', label:null };
    if (days <= 7)  return { badge:`⏰ ${days} days left`,badgeColor:'#f97316', label:null };
    if (days <= 30) return { badge:null, label:`⏰ Best before ${new Date(p.expiryDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'2-digit'})}` };
    return { badge:null, label:`⏰ Expires ${new Date(p.expiryDate).getFullYear()}` };
  })();

  return (
    <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} style={{
      background:hover&&!outOfStock?'var(--bg2)':'var(--card)',
      border:`1px solid ${hover&&!outOfStock?'var(--primary)':'var(--border)'}`,
      borderRadius:14, overflow:'hidden', position:'relative', transition:'all 0.18s',
      boxShadow:hover&&!outOfStock?'0 8px 28px rgba(99,102,241,0.18)':'none',
      transform:hover&&!outOfStock?'translateY(-2px)':'translateY(0)',
      display:'flex', flexDirection:'column', opacity: outOfStock ? 0.72 : 1,
    }}>
      {/* Badges */}
      {outOfStock && <div style={{ position:'absolute',top:10,left:10,zIndex:3,background:'#ef4444cc',color:'#fff',fontSize:10,fontWeight:800,padding:'3px 9px',borderRadius:20 }}>⚠️ Out of Stock</div>}
      {!outOfStock && p.isAiPick && <div style={{ position:'absolute',top:10,left:10,zIndex:2,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:20 }}>✦ AI pick</div>}
      {!outOfStock && p.isNew    && <div style={{ position:'absolute',top:10,right:10,zIndex:2,background:'#10b981',color:'#fff',fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:20 }}>New</div>}
      {!outOfStock && expiryInfo?.badge && <div style={{ position:'absolute',top: p.isNew?34:10,right:10,zIndex:2,background:expiryInfo.badgeColor+'22',color:expiryInfo.badgeColor,fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:20,border:`1px solid ${expiryInfo.badgeColor}44` }}>{expiryInfo.badge}</div>}

      {/* Image */}
      <div style={{ height:170,background:'var(--bg3)',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',position:'relative' }}>
        {outOfStock && <div style={{ position:'absolute',inset:0,background:'rgba(0,0,0,0.3)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2 }}><span style={{ color:'#fff',fontWeight:800,fontSize:13,background:'#ef4444bb',padding:'5px 14px',borderRadius:20 }}>OUT OF STOCK</span></div>}
        {p.imageUrl ? (
          <img src={p.imageUrl} alt={p.name} style={{ width:'100%',height:'100%',objectFit:'cover',position:'absolute',top:0,left:0 }} onError={e=>e.target.style.display='none'} />
        ) : (
          <ProductImage name={p.name} category={p.category} size={110} borderRadius={10} />
        )}
      </div>

      {/* Content */}
      <div style={{ padding:'14px 16px 16px',flex:1,display:'flex',flexDirection:'column' }}>
        <div style={{ fontSize:11,color:'var(--primary)',fontWeight:600,marginBottom:4 }}>{p.category}</div>
        <div style={{ fontSize:14,fontWeight:700,color:'var(--text)',marginBottom:6,lineHeight:1.35,flex:1 }}>{p.name}</div>

        {/* Description */}
        {p.description && (
          <div style={{ fontSize:12,color:'var(--text3)',marginBottom:6,lineHeight:1.5,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden' }}>
            {p.description}
          </div>
        )}

        {/* Brand / Warranty / Expiry labels */}
        <div style={{ display:'flex',flexWrap:'wrap',gap:5,marginBottom:6 }}>
          {p.brand && <span style={{ fontSize:10,color:'var(--text3)',background:'var(--bg3)',padding:'2px 7px',borderRadius:20,border:'1px solid var(--border)' }}>🏷️ {p.brand}</span>}
          {p.warranty && <span style={{ fontSize:10,color:'#10b981',background:'#10b98115',padding:'2px 7px',borderRadius:20,border:'1px solid #10b98133' }}>🛡️ {p.warranty}</span>}
          {expiryInfo?.label && <span style={{ fontSize:10,color:'#f59e0b',background:'#f59e0b15',padding:'2px 7px',borderRadius:20,border:'1px solid #f59e0b33' }}>{expiryInfo.label}</span>}
        </div>

        {/* Sizes */}
        {p.sizes?.length > 0 && (
          <div style={{ display:'flex',flexWrap:'wrap',gap:4,marginBottom:8 }}>
            {p.sizes.slice(0,5).map(s=>(
              <span key={s} style={{ fontSize:10,fontWeight:600,color:'var(--text2)',background:'var(--bg3)',padding:'2px 7px',borderRadius:5,border:'1px solid var(--border)' }}>{s}</span>
            ))}
          </div>
        )}

        <div style={{ display:'flex',alignItems:'center',gap:5,marginBottom:10 }}>
          <Stars rating={p.rating} />
          <span style={{ fontSize:11,color:'var(--text3)' }}>{p.rating} ({p.reviews.toLocaleString()})</span>
        </div>

        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <div>
            <span style={{ fontSize:19,fontWeight:800,color:outOfStock?'var(--text3)':'var(--primary)' }}>${p.price}</span>
            {!outOfStock && p.stock > 0 && p.stock <= 5 && (
              <div style={{ fontSize:10,color:'#f97316',fontWeight:700,marginTop:1 }}>⚠️ Only {p.stock} left!</div>
            )}
          </div>
          <button onClick={e=>{e.stopPropagation();if(!outOfStock)onAdd(p);}} disabled={outOfStock} style={{
            padding:'8px 14px', borderRadius:9, border:'none', fontWeight:700, fontSize:11, transition:'all 0.15s',
            cursor: outOfStock?'not-allowed':'pointer',
            background: outOfStock?'var(--bg3)': qty>0?'var(--success)':'var(--primary)',
            color: outOfStock?'var(--text3)':'#fff',
          }}>
            {outOfStock ? '❌ Out of Stock' : qty>0 ? `✓ ${qty} in cart` : 'Add to cart'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ShopPage() {
  const navigate = useNavigate();
  const [category,  setCategory]  = useState('All products');
  const [sort,      setSort]      = useState('AI recommended');
  const [search,    setSearch]    = useState('');
  const [maxPrice,  setMaxPrice]  = useState(1000);
  const [minRating, setMinRating] = useState(0);
  const [cart,      setCart]      = useState({});
  const [aiOnly,    setAiOnly]    = useState(false);
  const [cartOpen,  setCartOpen]  = useState(false);

  // ── Fetch real products from API ──────────────────────────────────────────
  const [allProducts, setAllProducts] = useState(ALL_PRODUCTS); // start with static, replace with real
  const [loadingProds, setLoadingProds] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoadingProds(true);
    try {
      const { data } = await api.get('/products?limit=100');
      console.log('Products API response:', data);
      const prods = (data.products || []).map((p, i) => ({
        id:          p._id,
        name:        p.name,
        category:    p.category,
        price:       p.price,
        rating:      p.ratings?.average || +(4.0 + Math.random() * 0.9).toFixed(1),
        reviews:     p.ratings?.count   || Math.floor(Math.random() * 500 + 50),
        isAiPick:    i % 4 === 0,
        isNew:       new Date(p.createdAt) > new Date(Date.now() - 7*86400000),
        stock:       p.stock ?? 0,
        imageUrl:    p.images?.[0]?.url  || null,
        description: p.description       || '',
        expiryDate:  p.expiryDate        || null,
        isPerishable:p.isPerishable      || false,
        warranty:    p.warranty          || null,
        brand:       p.brand             || null,
        sizes:       p.sizes             || [],
        colors:      p.colors            || [],
      }));
      console.log('Processed products:', prods);
      setAllProducts(prods);
    } catch (err) {
      console.error('Products fetch error:', err);
      // Fallback to static ALL_PRODUCTS (already set as default)
    } finally { setLoadingProds(false); }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const addToCart = (p) => {
    setCart(prev => ({ ...prev, [p.id]: { ...p, qty: (prev[p.id]?.qty || 0) + 1 } }));
    toast.success(`${p.name} added!`);
  };
  const removeFromCart = (id) => setCart(prev => { const n={...prev}; delete n[id]; return n; });
  const updateQty = (id, qty) => {
    if (qty < 1) return removeFromCart(id);
    setCart(prev => ({ ...prev, [id]: { ...prev[id], qty } }));
  };

  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((s,i) => s + i.qty, 0);
  const cartTotal = cartItems.reduce((s,i) => s + i.price * i.qty, 0);

  const filtered = useMemo(() => {
    let list = allProducts;
    if (category !== 'All products') list = list.filter(p => p.category === category);
    if (search.trim()) list = list.filter(p => fuzzyMatch(search, p));
    list = list.filter(p => p.price <= maxPrice && p.rating >= minRating);
    if (aiOnly) list = list.filter(p => p.isAiPick);
    switch (sort) {
      case 'Price: Low to High': return [...list].sort((a,b)=>a.price-b.price);
      case 'Price: High to Low': return [...list].sort((a,b)=>b.price-a.price);
      case 'Highest Rated':      return [...list].sort((a,b)=>b.rating-a.rating);
      case 'Most Reviews':       return [...list].sort((a,b)=>b.reviews-a.reviews);
      default: return [...list].sort((a,b)=>(b.isAiPick?1:0)-(a.isAiPick?1:0));
    }
  }, [allProducts, category, sort, search, maxPrice, minRating, aiOnly]);

  const recommendations = useMemo(() => ({
    liked:   allProducts.filter(p=>PURCHASE_HISTORY.includes(p.category)&&!RECENTLY_VIEWED.includes(p.id)).sort((a,b)=>b.rating-a.rating).slice(0,4),
    together:allProducts.filter(p=>!PURCHASE_HISTORY.includes(p.category)&&p.isAiPick).slice(0,3),
  }), [allProducts]);

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', color:'var(--text)' }}>

      {/* Navbar */}
      <div style={{ background:'var(--card)', borderBottom:'1px solid var(--border)', padding:'12px 28px', display:'flex', alignItems:'center', gap:14, position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginRight:8 }}>
          <div style={{ width:30,height:30,borderRadius:8,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14 }}>✦</div>
          <span style={{ fontSize:15,fontWeight:800 }}>AI Commerce</span>
        </div>
        <div style={{ flex:1, maxWidth:460 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search products…"
            style={{ width:'100%',padding:'9px 16px',borderRadius:10,background:'var(--bg3)',border:'1px solid var(--border)',color:'var(--text)',fontSize:13,outline:'none' }} />
        </div>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={()=>setCartOpen(true)} style={{
            display:'flex',alignItems:'center',gap:8,padding:'8px 16px',borderRadius:10,fontWeight:700,fontSize:13,cursor:'pointer',transition:'all 0.15s',
            background:cartCount>0?'var(--primary)':'var(--bg3)', border:`1px solid ${cartCount>0?'var(--primary)':'var(--border)'}`, color:cartCount>0?'#fff':'var(--text2)',
          }}>🛒 {cartCount>0?`${cartCount} item${cartCount>1?'s':''} · $${cartTotal.toFixed(2)}`:'Cart'}</button>
          <button onClick={()=>navigate('/customer')} style={{ padding:'7px 14px',background:'transparent',border:'1px solid var(--border)',borderRadius:9,color:'var(--text2)',fontSize:13,cursor:'pointer' }}>← Dashboard</button>
        </div>
      </div>

      {/* Body */}
      <div style={{ display:'flex', maxWidth:1380, margin:'0 auto', padding:'24px 20px', gap:22 }}>

        {/* Sidebar */}
        <aside style={{ width:210, flexShrink:0 }}>
          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:10,fontWeight:700,color:'var(--text3)',letterSpacing:1,marginBottom:10 }}>CATEGORIES</div>
            {CATEGORIES.map(cat=>(
              <button key={cat} onClick={()=>setCategory(cat)} style={{
                display:'flex',alignItems:'center',gap:10,width:'100%',padding:'10px 12px',borderRadius:9,border:'none',cursor:'pointer',marginBottom:3,
                fontSize:13,fontWeight:category===cat?700:400,background:category===cat?'var(--primary)':'transparent',color:category===cat?'#fff':'var(--text2)',textAlign:'left',transition:'all 0.1s',
              }}><span style={{ fontSize:15 }}>{CAT_ICONS[cat]}</span>{cat}</button>
            ))}
          </div>
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:10,fontWeight:700,color:'var(--text3)',letterSpacing:1,marginBottom:10 }}>PRICE RANGE</div>
            <div style={{ display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--text2)',marginBottom:8 }}><span>$0</span><span style={{ fontWeight:700,color:'var(--text)' }}>${maxPrice}</span></div>
            <input type="range" min={0} max={1000} step={10} value={maxPrice} onChange={e=>setMaxPrice(+e.target.value)} style={{ width:'100%',accentColor:'var(--primary)' }} />
          </div>
          <div>
            <div style={{ fontSize:10,fontWeight:700,color:'var(--text3)',letterSpacing:1,marginBottom:10 }}>RATING</div>
            {[[0,'⭐ Any rating'],[4,'⭐ 4+ stars'],[4.5,'⭐ 4.5+ stars']].map(([v,l])=>(
              <button key={v} onClick={()=>setMinRating(v)} style={{
                display:'flex',alignItems:'center',gap:8,width:'100%',padding:'9px 12px',borderRadius:9,border:'none',cursor:'pointer',marginBottom:3,
                fontSize:12,fontWeight:minRating===v?700:400,background:minRating===v?'var(--primary)':'transparent',color:minRating===v?'#fff':'var(--text2)',textAlign:'left',transition:'all 0.1s',
              }}>{l}</button>
            ))}
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex:1, minWidth:0 }}>
          {/* AI banner */}
          <div style={{ background:'linear-gradient(135deg,#6366f111,#8b5cf611)',border:'1px solid #6366f133',borderRadius:12,padding:'14px 18px',marginBottom:20,display:'flex',alignItems:'flex-start',gap:10 }}>
            <div style={{ width:32,height:32,borderRadius:8,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0,marginTop:1 }}>✦</div>
            <div><span style={{ fontWeight:700,color:'var(--primary)',fontSize:13 }}>AI recommendation: </span><span style={{ fontSize:13,color:'var(--text2)',lineHeight:1.6 }}>Electronics and Home & Living are trending this week. AI picks are personalised for you.</span></div>
          </div>

          {/* You may also like */}
          {!search && category==='All products' && (
            <div style={{ marginBottom:28 }}>
              <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:14 }}>
                <div style={{ width:28,height:28,borderRadius:8,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13 }}>✦</div>
                <div><div style={{ fontSize:15,fontWeight:700,color:'var(--text)' }}>You May Also Like</div><div style={{ fontSize:11,color:'var(--text3)' }}>Based on your purchase history</div></div>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14 }}>
                {recommendations.liked.map(p=><ProductCard key={p.id} p={p} onAdd={addToCart} qty={cart[p.id]?.qty||0} />)}
              </div>
            </div>
          )}

          {/* Frequently bought together */}
          {!search && category==='All products' && (
            <div style={{ marginBottom:28 }}>
              <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:14 }}>
                <div style={{ width:28,height:28,borderRadius:8,background:'linear-gradient(135deg,#10b981,#059669)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13 }}>🛒</div>
                <div><div style={{ fontSize:15,fontWeight:700,color:'var(--text)' }}>Frequently Bought Together</div><div style={{ fontSize:11,color:'var(--text3)' }}>Customers who bought your items also purchased</div></div>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14 }}>
                {recommendations.together.map(p=><ProductCard key={p.id} p={p} onAdd={addToCart} qty={cart[p.id]?.qty||0} />)}
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18 }}>
            <div>
              <span style={{ fontSize:16,fontWeight:700,color:'var(--text)' }}>{category}</span>
              <span style={{ fontSize:12,color:'var(--text3)',marginLeft:10 }}>{filtered.length} products</span>
            </div>
            <div style={{ display:'flex',alignItems:'center',gap:10 }}>
              <button onClick={()=>setAiOnly(v=>!v)} style={{
                display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:9,border:`1px solid ${aiOnly?'var(--primary)':'var(--border)'}`,cursor:'pointer',fontSize:12,fontWeight:600,
                background:aiOnly?'var(--primary)':'transparent',color:aiOnly?'#fff':'var(--text2)',transition:'all 0.15s',
              }}>✦ {aiOnly?'Show all':'AI picks only'}</button>
              <select value={sort} onChange={e=>setSort(e.target.value)} style={{ padding:'8px 12px',borderRadius:9,background:'var(--card)',border:'1px solid var(--border)',color:'var(--text)',fontSize:12,cursor:'pointer',outline:'none' }}>
                {SORT_OPTIONS.map(s=><option key={s} value={s}>Sort: {s}</option>)}
              </select>
            </div>
          </div>

          {/* Product grid */}
          {loadingProds ? (
            <div style={{ textAlign:'center',padding:'60px 0',color:'var(--text3)' }}>
              <div style={{ fontSize:32,marginBottom:12,animation:'shopSpin 1s linear infinite',display:'inline-block' }}>⟳</div>
              <style>{`@keyframes shopSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
              <div style={{ fontSize:14,color:'var(--text2)' }}>Loading products from store…</div>
            </div>
          ) : filtered.length===0 ? (
            <div style={{ textAlign:'center',padding:'80px 0',color:'var(--text3)' }}>
              <div style={{ fontSize:44,marginBottom:12 }}>🔍</div>
              <div style={{ fontSize:16,fontWeight:600,color:'var(--text2)',marginBottom:6 }}>No products found</div>
              <div style={{ fontSize:13 }}>Try adjusting your filters or ask an admin to add products</div>
            </div>
          ) : (
            <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:18 }}>
              {filtered.map(p=><ProductCard key={p.id} p={p} onAdd={addToCart} qty={cart[p.id]?.qty||0} />)}
            </div>
          )}
        </main>
      </div>

      {/* ── Cart Drawer ── */}
      {cartOpen && (
        <div style={{ position:'fixed',inset:0,zIndex:300 }}>
          <div style={{ position:'absolute',inset:0,background:'rgba(0,0,0,0.55)' }} onClick={()=>setCartOpen(false)} />
          <div style={{ position:'absolute',right:0,top:0,bottom:0,width:400,background:'var(--card)',borderLeft:'1px solid var(--border)',display:'flex',flexDirection:'column',boxShadow:'-8px 0 32px rgba(0,0,0,0.3)',animation:'slideInRight 0.25s ease' }}>
            <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

            {/* Drawer header */}
            <div style={{ padding:'18px 20px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
              <div style={{ fontSize:16,fontWeight:700 }}>🛒 Cart ({cartCount})</div>
              <button onClick={()=>setCartOpen(false)} style={{ background:'var(--bg3)',border:'none',borderRadius:8,padding:'6px 12px',color:'var(--text2)',cursor:'pointer',fontSize:18 }}>✕</button>
            </div>

            {/* Items */}
            <div style={{ flex:1,overflowY:'auto',padding:'16px 20px' }}>
              {cartItems.length===0 ? (
                <div style={{ textAlign:'center',padding:60,color:'var(--text3)' }}>
                  <div style={{ fontSize:44,marginBottom:12 }}>🛒</div>
                  <div style={{ fontSize:14,color:'var(--text2)' }}>Your cart is empty</div>
                  <button onClick={()=>setCartOpen(false)} style={{ marginTop:14,padding:'8px 20px',background:'var(--primary)',border:'none',borderRadius:9,color:'#fff',cursor:'pointer',fontWeight:600,fontSize:13 }}>Browse Products</button>
                </div>
              ) : cartItems.map(item=>(
                <div key={item.id} style={{ display:'flex',gap:12,padding:'14px 0',borderBottom:'1px solid var(--border)' }}>
                  <div style={{ width:54,height:54,borderRadius:10,background:'var(--bg3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0 }}>
                    {CAT_EMOJI[item.category]||'📦'}
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{item.name}</div>
                    <div style={{ fontSize:14,fontWeight:800,color:'var(--primary)',marginBottom:8 }}>${item.price}</div>
                    <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                      <button onClick={()=>updateQty(item.id,item.qty-1)} style={{ width:28,height:28,borderRadius:7,border:'1px solid var(--border)',background:'var(--bg3)',color:'var(--text)',cursor:'pointer',fontWeight:700,fontSize:16,display:'flex',alignItems:'center',justifyContent:'center' }}>−</button>
                      <span style={{ fontSize:14,fontWeight:700,minWidth:22,textAlign:'center' }}>{item.qty}</span>
                      <button onClick={()=>updateQty(item.id,item.qty+1)} style={{ width:28,height:28,borderRadius:7,border:'1px solid var(--border)',background:'var(--bg3)',color:'var(--text)',cursor:'pointer',fontWeight:700,fontSize:16,display:'flex',alignItems:'center',justifyContent:'center' }}>+</button>
                      <button onClick={()=>removeFromCart(item.id)} style={{ marginLeft:'auto',background:'transparent',border:'none',color:'var(--danger)',cursor:'pointer',fontSize:18 }}>🗑</button>
                    </div>
                  </div>
                  <div style={{ fontSize:14,fontWeight:800,color:'var(--text)',flexShrink:0,alignSelf:'flex-start',marginTop:4 }}>${(item.price*item.qty).toFixed(2)}</div>
                </div>
              ))}
            </div>

            {/* Footer */}
            {cartItems.length>0 && (
              <div style={{ padding:'16px 20px',borderTop:'1px solid var(--border)' }}>
                <div style={{ display:'flex',justifyContent:'space-between',fontSize:16,fontWeight:800,marginBottom:14 }}>
                  <span>Subtotal</span>
                  <span style={{ color:'var(--primary)' }}>${cartTotal.toFixed(2)}</span>
                </div>
                <button onClick={()=>{ setCartOpen(false); navigate('/customer/checkout',{state:{cartItems}}); }} style={{
                  width:'100%',padding:14,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',
                  borderRadius:12,fontWeight:700,fontSize:15,cursor:'pointer',boxShadow:'0 4px 16px rgba(99,102,241,0.4)',
                }}>Proceed to Checkout →</button>
                <button onClick={()=>setCart({})} style={{ width:'100%',marginTop:8,padding:9,background:'transparent',border:'none',color:'var(--text3)',cursor:'pointer',fontSize:13 }}>🗑 Clear Cart</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
