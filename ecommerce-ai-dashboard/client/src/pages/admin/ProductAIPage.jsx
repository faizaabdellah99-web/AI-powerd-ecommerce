import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Layout from '../../components/shared/Layout';
import Card from '../../components/shared/Card';
import Spinner from '../../components/shared/Spinner';
import api from '../../services/api';
import toast from 'react-hot-toast';

const CATS = ['Electronics','Clothing','Home & Garden','Food & Beverage',
              'Sports & Fitness','Beauty & Care','Books','Toys','Automotive','Health','General Merchandise'];

// ── Description via server ────────────────────────────────────────────────────
async function generateDescriptionAPI(form) {
  const features = form.key_features.split(',').map(s => s.trim()).filter(Boolean);
  const { data } = await api.post('/ai/generate-description', {
    product_name:    form.product_name,
    category:        form.category,
    key_features:    features,
    target_audience: form.target_audience,
    tone:            form.tone,
  }, { timeout: 60000 });
  return data;
}

// ── Pollinations fallback images ──────────────────────────────────────────────
async function findImages(productName, category) {
  const styles = [
    'professional product photography, studio lighting, white background',
    'ecommerce product photo, high detail, sharp focus',
    'product on gradient background, commercial photography',
    'lifestyle product photo, natural lighting, modern setting',
    'product close-up, macro photography, detailed texture',
    'product packaging shot, clean composition, retail ready',
  ];
  const seen = new Set();
  return styles.map((style, i) => {
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(`${productName}, ${category||'product'}, ${style}`)}?width=400&height=400&nologo=true`;
    if (seen.has(url)) return null;
    seen.add(url);
    return { id:`ai-${i}`, thumb:url, url, label:`${productName} ${i+1}`, by:'AI Generated' };
  }).filter(Boolean).slice(0, 9);
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function Field({ label, children, mb = 14 }) {
  return (
    <div style={{ marginBottom: mb }}>
      <label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:5, fontWeight:500 }}>{label}</label>
      {children}
    </div>
  );
}
function Section({ label, color, children }) {
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ fontSize:11, fontWeight:700, color, letterSpacing:0.8, marginBottom:8 }}>{label}</div>
      {children}
    </div>
  );
}
function CopyBtn({ text, id, copied, onCopy }) {
  return (
    <button onClick={() => onCopy(text, id)} style={{
      marginTop:6, padding:'4px 12px', background:'transparent',
      border:'1px solid var(--border)', borderRadius:6,
      color: copied===id ? '#10b981' : 'var(--text3)',
      fontSize:11, cursor:'pointer', fontWeight:500,
    }}>
      {copied===id ? '✅ Copied' : '📋 Copy'}
    </button>
  );
}
const ghostBtn = { padding:'8px 14px', background:'transparent', border:'1px solid var(--border)', borderRadius:7, color:'var(--text2)', fontSize:13, cursor:'pointer', fontWeight:500 };
const primBtn  = { padding:'8px 14px', background:'var(--primary)', border:'none', borderRadius:7, color:'#fff', fontSize:13, cursor:'pointer', fontWeight:600 };

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProductAIPage() {
  const location  = useLocation();
  const validTabs = ['description','vision','image'];

  const [tab, setTab] = useState(() => {
    const t = new URLSearchParams(location.search).get('tab') || 'description';
    return validTabs.includes(t) ? t : 'description';
  });
  useEffect(() => {
    const t = new URLSearchParams(location.search).get('tab') || 'description';
    if (validTabs.includes(t) && t !== tab) setTab(t);
  }, [location.search]); // eslint-disable-line

  // ── Products list (for dropdown) ──────────────────────────────────────────
  const [products, setProducts] = useState([]);
  useEffect(() => {
    api.get('/products?all=true&limit=200')
      .then(({ data }) => setProducts(data.products || []))
      .catch(() => setProducts([]));
  }, []);

  // ── Description state ─────────────────────────────────────────────────────
  const [selectedPid, setSelectedPid]   = useState('');
  const [dForm, setDForm]               = useState({ product_name:'', category:'', key_features:'', target_audience:'general shoppers', tone:'professional' });
  const [dResult, setDResult]           = useState(null);
  const [dLoading, setDLoading]         = useState(false);
  const [dError,   setDError]           = useState('');
  const [copied,   setCopied]           = useState('');
  const [fillLoading, setFillLoading]   = useState(false);

  // ── Image search state ────────────────────────────────────────────────────
  const [iForm,    setIForm]    = useState({ product_name:'', category:'' });
  const [iResults, setIResults] = useState(null);
  const [selected, setSelected] = useState(null);
  const [iLoading, setILoading] = useState(false);

  // ── Vision state ──────────────────────────────────────────────────────────
  const [vFile,    setVFile]    = useState(null);
  const [vPreview, setVPreview] = useState(null);
  const [vResult,  setVResult]  = useState(null);
  const [vLoading, setVLoading] = useState(false);
  const [vError,   setVError]   = useState('');
  const vInputRef = useRef(null);

  const copy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success('Copied!');
    setTimeout(() => setCopied(''), 2000);
  };

  // ── Select product → auto-fill form fields ─────────────────────────────────
  const selectProduct = (pid) => {
    setSelectedPid(pid);
    setDResult(null);
    if (!pid) {
      setDForm(p => ({ ...p, product_name:'', category:'', key_features:'' }));
      return;
    }
    const prod = products.find(p => p._id === pid);
    if (!prod) return;
    const featureParts = [
      prod.brand           ? `Brand: ${prod.brand}`           : null,
      prod.stock != null   ? `Stock: ${prod.stock} units`     : null,
      prod.warranty        ? `Warranty: ${prod.warranty}`     : null,
      prod.ratings?.average? `Rating: ${prod.ratings.average}/5` : null,
    ].filter(Boolean);
    setDForm(p => ({
      ...p,
      product_name: prod.name     || '',
      category:     prod.category || '',
      key_features: featureParts.join(', '),
    }));
    toast(`📦 "${prod.name}" loaded — click Generate!`, { duration:2500 });
  };

  // ── Generate description ──────────────────────────────────────────────────
  const genDesc = async () => {
    if (!dForm.product_name.trim()) return toast.error('Product name is required');
    setDLoading(true); setDResult(null); setDError('');
    // Safety: force loading off after 65s to prevent stuck spinner
    const loadingTimer = setTimeout(() => setDLoading(false), 65000);
    try {
      const result = await generateDescriptionAPI(dForm);
      console.log('✅ Description result:', result);
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response from server');
      }
      setDResult(result);
      clearTimeout(loadingTimer);
      if (result._fallback) toast('⚡ Quota exceeded — showing smart template.', { icon:'⚡', duration:4000 });
      else toast.success('Description generated!');
    } catch (err) {
      // ── Local fallback ──────────────────────────────────────────────────
      const name  = dForm.product_name.trim();
      const feats = dForm.key_features.split(',').map(s=>s.trim()).filter(Boolean);
      const cat   = dForm.category || 'product';
      const aud   = dForm.target_audience || 'everyday users';
      const brand = name.split(' ')[0];
      const nl    = name.toLowerCase();
      const hasF  = feats.length >= 1;

      const isHeadphone = nl.includes('headphone')||nl.includes('wh-')||nl.includes('earphone')||nl.includes('earbud')||nl.includes('airpod');
      const isPhone     = nl.includes('phone')||nl.includes('iphone')||nl.includes('galaxy')||nl.includes('pixel');
      const isLaptop    = nl.includes('laptop')||nl.includes('macbook')||nl.includes('notebook')||nl.includes('thinkpad');
      const isSpeaker   = nl.includes('speaker')||nl.includes('soundbar')||nl.includes('jbl')||nl.includes('bose');

      let intro, features, usecases, bullets;
      if (isHeadphone) {
        intro    = `The ${name} is a headphone for ${aud} who want clear, immersive audio.`;
        features = hasF ? `It features ${feats.join(', ')}.` : `The ${name} delivers balanced stereo sound with Bluetooth, a built-in mic, padded ear cups, and foldable design.`;
        usecases = `Works well for commuting, working from home, and gym sessions.`;
        bullets  = hasF ? feats.map(f=>`${f} — built into the ${name}`) : ['Stereo sound — full frequency range','Built-in mic — hands-free calls','Bluetooth — pairs wirelessly','Foldable — packs flat for travel','Padded ear cups — comfortable for long sessions'];
      } else if (isPhone) {
        intro    = `The ${name} is a smartphone for ${aud} who want a reliable all-day device.`;
        features = hasF ? `It comes with ${feats.join(', ')}.` : `The ${name} includes a multi-lens camera, high-res display, fast charging, and ample storage.`;
        usecases = `Handles browsing, streaming, photography, and daily communication.`;
        bullets  = hasF ? feats.map(f=>`${f} — standout feature`) : ['Multi-lens camera — sharp photos','Fast charging — powers up quickly','High-res display — clear visuals','Ample storage — holds apps and media','All-day battery'];
      } else if (isLaptop) {
        intro    = `The ${name} is a laptop for ${aud} who need reliable computing for work or study.`;
        features = hasF ? `Equipped with ${feats.join(', ')}.` : `The ${name} comes with a fast processor, SSD storage, ample RAM, and all-day battery.`;
        usecases = `Handles document editing, video calls, web browsing, and everyday computing.`;
        bullets  = hasF ? feats.map(f=>`${f} — core spec`) : ['Fast processor — smooth multitasking','SSD storage — quick boot','Portable — light to carry','Long battery — hours unplugged','Clear display — suited for work'];
      } else if (isSpeaker) {
        intro    = `The ${name} is a speaker for ${aud} who want quality sound at home or on the go.`;
        features = hasF ? `It features ${feats.join(', ')}.` : `The ${name} delivers full-range audio with Bluetooth, built-in battery, and durable outdoor build.`;
        usecases = `Works well for indoor listening, outdoor gatherings, and travel.`;
        bullets  = hasF ? feats.map(f=>`${f} — key feature`) : ['Full-range audio','Bluetooth connectivity','Built-in battery — hours of play','Portable — sized for travel','Durable build'];
      } else {
        intro    = hasF ? `The ${name} is a ${cat} for ${aud} built around ${feats[0]}.` : `The ${name} is a ${cat} for ${aud} focused on reliable everyday performance.`;
        features = hasF ? `It includes ${feats.join(', ')}.` : `Built with quality materials and a user-friendly design.`;
        usecases = `Suits ${aud} who need a dependable ${cat} for regular use.`;
        bullets  = hasF ? feats.map(f=>`${f} — defining feature`) : [`Reliable build — handles regular use`,`Easy setup — ready out of the box`,`Consistent output`,`Built for ${aud}`,`Practical design`];
      }
      while (bullets.length < 5) bullets.push(`${cat} quality — meets ${brand} standards`);
      setDResult({
        short_description: intro,
        long_description:  `${intro}\n\n${features}\n\n${usecases}`,
        bullet_points:     bullets.slice(0,5),
        seo_tags:          [name.toLowerCase(), `buy ${name.toLowerCase()}`, `${name.toLowerCase()} review`, `best ${cat} ${new Date().getFullYear()}`, `${name.toLowerCase()} price`, `${brand.toLowerCase()} ${cat}`],
        _fallback: true,
      });
      toast('⚡ Using smart template (AI unavailable).', { icon:'⚡', duration:4000 });
    } finally { clearTimeout(loadingTimer); setDLoading(false); }
  };

  // ── Smart Fill ────────────────────────────────────────────────────────────
  const smartFill = async () => {
    if (!dForm.product_name.trim()) return toast.error('Enter a product name first');
    setFillLoading(true);
    try {
      const { data } = await api.post('/ai/detect-product', { product_name: dForm.product_name.trim() });
      setDForm(p => ({ ...p, category: data.category||p.category, key_features: data.features||p.key_features }));
      if (data._fallback) toast('⚡ Local detection used', { icon:'⚡', duration:3000 });
      else toast.success('Auto-filled!');
    } catch {
      const nl = dForm.product_name.trim().toLowerCase();
      const catKws = [['Electronics',['phone','laptop','headphone','speaker','camera','tv','charger','tablet','drone','smartwatch','earphone','monitor']],['Clothing',['shirt','dress','shoe','pants','jacket','hat','sock','hoodie','sweater','jean','sneaker','boot']],['Home & Garden',['chair','table','lamp','sofa','bed','pillow','pot','plant','kitchen','curtain','rug']],['Beauty & Care',['cream','lotion','soap','shampoo','perfume','makeup','serum','spray']],['Sports & Fitness',['gym','yoga','dumbbell','running','bike','helmet','racket','fitness','exercise']],['Food & Beverage',['food','drink','coffee','juice','snack','honey','milk','tea','cereal','oil']],['Books',['book','novel','guide','manual','magazine','journal']],['Toys',['toy','lego','game','doll','puzzle']],['Automotive',['car','tire','wheel','engine','brake']],['Health',['mask','thermometer','vitamin','supplement','bandage']]];
      let best = { cat:'General Merchandise', score:0 };
      for (const [cat, kws] of catKws) { const s=kws.filter(k=>nl.includes(k)).length; if(s>best.score) best={cat,score:s}; }
      const fmap = { Electronics:'durable build, advanced technology, user-friendly interface, reliable performance', Clothing:'comfortable fit, premium materials, stylish design, breathable fabric', 'Home & Garden':'functional design, quality materials, easy to use, long-lasting', 'Beauty & Care':'natural ingredients, gentle formula, effective results, safe for daily use', 'Sports & Fitness':'durable, ergonomic design, high performance, easy to maintain', 'Food & Beverage':'premium quality, natural ingredients, great taste, nutritious', Books:'well-written, informative, engaging, good quality print', Toys:'safe materials, educational, fun and engaging, durable', Automotive:'reliable, easy installation, durable, fits most vehicles', Health:'effective, safe to use, high quality', 'General Merchandise':'quality product, reliable performance, good value, easy to use' };
      setDForm(p => ({ ...p, category: best.cat, key_features: fmap[best.cat]||fmap['General Merchandise'] }));
      toast('⚡ Local detection used', { icon:'⚡', duration:3000 });
    } finally { setFillLoading(false); }
  };

  // ── Vision: handle file ───────────────────────────────────────────────────
  const handleVFile = (f) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast.error('Please upload an image file (JPG, PNG, WebP)');
    if (vPreview) URL.revokeObjectURL(vPreview);
    setVFile(f);
    setVPreview(URL.createObjectURL(f));
    setVResult(null);
    setVError('');
  };

  // ── Vision: analyze ───────────────────────────────────────────────────────
  const analyzePhoto = async () => {
    if (!vFile) return toast.error('Upload a product photo first');
    setVLoading(true); setVResult(null); setVError('');
    try {
      const fd = new FormData();
      fd.append('image', vFile);
      // NOTE: do NOT set Content-Type header — axios sets it with the correct boundary
      const { data } = await api.post('/ai/analyze-image', fd, { timeout: 60000 });
      setVResult(data);
      toast.success('Photo analyzed!');
    } catch {
      const productName = (vFile.name||'product').replace(/\.[^/.]+$/,'').replace(/[-_]/g,' ').trim();
      const nl = productName.toLowerCase();
      const ckws = [['Electronics',['phone','laptop','speaker','camera','charger','headphone','monitor']],['Clothing',['shirt','shoe','dress','jacket','sneaker','boot']],['Home & Garden',['chair','lamp','sofa','kitchen','pot','mattress']],['Books',['book','novel','guide']],['Toys',['toy','lego','game']],['Beauty & Care',['cream','soap','shampoo','makeup']]];
      let cat = 'General Merchandise';
      for (const [c, kws] of ckws) { if (kws.some(k=>nl.includes(k))) { cat=c; break; } }
      setVResult({ product_name:productName||'Unknown Product', category:cat, tags:[cat.toLowerCase(),'product','catalog'], short_description:`Product: ${productName}`, long_description:`A product image for ${productName}. Review and update details below.`, bullet_points:['Image uploaded successfully','Category auto-detected','Edit details manually for accuracy','Use Description Generator for full content','Ready to save to catalog'], suggested_price_range:'$10-$100', confidence:'medium', _fallback:true });
      toast('⚡ AI unavailable — basic info from filename.', { icon:'⚡', duration:4000 });
    } finally { setVLoading(false); }
  };

  // ── Image search ──────────────────────────────────────────────────────────
  const searchImgs = async () => {
    if (!iForm.product_name.trim()) return toast.error('Enter a product name');
    setILoading(true); setIResults(null); setSelected(null);
    try {
      let imgs = [];
      try {
        const { data } = await api.post('/ai/search-images', { query:iForm.product_name.trim(), category:iForm.category });
        imgs = data.results || [];
      } catch { imgs = await findImages(iForm.product_name.trim(), iForm.category); }
      setIResults(imgs);
      if (imgs.length) setSelected(imgs[0]);
      toast.success(`${imgs.length} images found!`);
    } catch { toast.error('Image search failed'); }
    finally { setILoading(false); }
  };

  const TABS = [
    { id:'description', icon:'✍️', label:'Description Generator' },
    { id:'vision',      icon:'📷', label:'Photo Cataloging'       },
    { id:'image',       icon:'🖼️', label:'Image Search'           },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <Layout title="🤖 Product AI" subtitle="AI description generator · Photo cataloging · Image search">
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* Tab bar */}
      <div style={{ display:'flex', gap:8, marginBottom:24 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:'10px 22px', borderRadius:10, fontWeight:600, fontSize:14, cursor:'pointer', transition:'all 0.15s',
            background: tab===t.id ? 'var(--primary)' : 'var(--card)',
            color:       tab===t.id ? '#fff'           : 'var(--text2)',
            border:      `1px solid ${tab===t.id ? 'var(--primary)' : 'var(--border)'}`,
            boxShadow:   tab===t.id ? '0 4px 14px rgba(99,102,241,0.3)' : 'none',
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* ══ DESCRIPTION TAB ════════════════════════════════════════════════════ */}
      {tab === 'description' && (
        <div style={{ display:'grid', gridTemplateColumns:'400px 1fr', gap:20 }}>

          {/* ── Left: input panel ── */}
          <div>
            <Card>
              {/* AI badge */}
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18, padding:'10px 14px', background:'linear-gradient(135deg,#6366f111,#8b5cf611)', borderRadius:10, border:'1px solid #6366f133' }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>⚡</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>AI Description Generator</div>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>Select a product or type a name below</div>
                </div>
              </div>

              <Field label="Product Name *">
                <input
                  placeholder="e.g. Sony WH-1000XM5 Headphones"
                  value={dForm.product_name}
                  onChange={e => { setDForm(p=>({...p,product_name:e.target.value})); setSelectedPid(''); }}
                  onKeyDown={e => e.key==='Enter' && genDesc()}
                />
              </Field>

              {/* Smart Fill */}
              <div style={{ marginBottom:14 }}>
                <button onClick={smartFill} disabled={fillLoading||!dForm.product_name.trim()} style={{
                  width:'100%', padding:'9px 14px', borderRadius:8, border:'1px dashed #6366f155',
                  background: fillLoading ? 'var(--bg3)' : '#6366f10d',
                  color: fillLoading||!dForm.product_name.trim() ? 'var(--text3)' : '#818cf8',
                  fontSize:12, fontWeight:600, cursor: fillLoading||!dForm.product_name.trim() ? 'not-allowed':'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                }}>
                  {fillLoading
                    ? <><span style={{ animation:'spin 1s linear infinite', display:'inline-block' }}>⟳</span> Detecting…</>
                    : <><span>⚡</span> Smart Fill — auto-detect category &amp; features</>
                  }
                </button>
              </div>

              <Field label="Category">
                <select value={dForm.category} onChange={e => setDForm(p=>({...p,category:e.target.value}))}>
                  <option value="">— auto-detect —</option>
                  {CATS.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>

              <Field label="Key Features (comma-separated)">
                <input placeholder="e.g. noise cancelling, 30hr battery, foldable" value={dForm.key_features}
                  onChange={e => setDForm(p=>({...p,key_features:e.target.value}))} />
              </Field>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:18 }}>
                <Field label="Target Audience" mb={0}>
                  <select value={dForm.target_audience} onChange={e => setDForm(p=>({...p,target_audience:e.target.value}))}>
                    {['general shoppers','professionals','students','athletes','parents','tech enthusiasts','seniors','gamers'].map(a=><option key={a}>{a}</option>)}
                  </select>
                </Field>
                <Field label="Tone" mb={0}>
                  <select value={dForm.tone} onChange={e => setDForm(p=>({...p,tone:e.target.value}))}>
                    <option value="professional">Professional</option>
                    <option value="casual">Casual &amp; Friendly</option>
                    <option value="luxury">Luxury &amp; Premium</option>
                    <option value="technical">Technical</option>
                  </select>
                </Field>
              </div>

              <button onClick={genDesc} disabled={dLoading} style={{
                width:'100%', padding:13, borderRadius:10, border:'none', cursor:dLoading?'not-allowed':'pointer',
                background: dLoading ? 'var(--bg3)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color: dLoading ? 'var(--text3)' : '#fff', fontWeight:700, fontSize:15,
                boxShadow: dLoading ? 'none' : '0 4px 14px rgba(99,102,241,0.35)',
              }}>
                {dLoading ? '⏳ AI is generating…' : '✨ Generate Description'}
              </button>

              <div style={{ marginTop:12, padding:'10px 12px', background:'var(--bg3)', borderRadius:8, fontSize:11, color:'var(--text3)', lineHeight:1.7 }}>
                💡 <strong>Select a product</strong> from the dropdown to auto-fill, or type any product name and click Generate.
              </div>
            </Card>
          </div>

          {/* ── Right: result ── */}
          <div>
            {dLoading && (
              <Card style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:480 }}>
                <Spinner />
                <div style={{ marginTop:16, fontSize:14, color:'var(--text2)', textAlign:'center' }}>
                  <div style={{ fontWeight:600, marginBottom:4 }}>AI is writing…</div>
                  <div style={{ fontSize:12, color:'var(--text3)' }}>Generating for <strong>{dForm.product_name}</strong></div>
                </div>
              </Card>
            )}

            {dError && !dLoading && (
              <Card>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <span style={{ fontSize:18 }}>❌</span>
                  <span style={{ fontSize:14, fontWeight:600, color:'#ef4444' }}>Generation Failed</span>
                </div>
                <div style={{ fontSize:13, color:'var(--text2)' }}>{dError}</div>
              </Card>
            )}

            {!dLoading && !dResult && !dError && (
              <Card style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:480, textAlign:'center' }}>
                <div style={{ width:70, height:70, borderRadius:'50%', background:'linear-gradient(135deg,#6366f111,#8b5cf611)', border:'1px solid #6366f133', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, marginBottom:16 }}>⚡</div>
                <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>AI Description Generator</div>
                <div style={{ fontSize:13, color:'var(--text2)', maxWidth:320, lineHeight:1.8 }}>
                  Select a product from the dropdown or type a product name, then click <strong>Generate Description</strong>.
                </div>
              </Card>
            )}

            {dResult && !dLoading && (
              <Card>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>⚡</div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700 }}>{dForm.product_name}</div>
                      <div style={{ fontSize:11, color: dResult._fallback?'#f59e0b':'var(--text3)' }}>
                        {dResult._fallback ? '⚡ Template (AI quota exceeded)' : '⚡ Generated by Gemini AI'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => setDResult(null)} style={ghostBtn}>Clear</button>
                    <button onClick={() => copy([dResult.short_description,'',dResult.long_description,'',dResult.bullet_points?.map(b=>`• ${b}`).join('\n'),'',dResult.seo_tags?.map(t=>`#${t}`).join(' ')].join('\n'),'all')} style={primBtn}>
                      {copied==='all' ? '✅ Copied!' : '📋 Copy All'}
                    </button>
                  </div>
                </div>

                <Section label="SHORT DESCRIPTION" color="#6366f1">
                  <div style={{ fontSize:14, color:'var(--text)', lineHeight:1.8, background:'var(--bg3)', padding:'12px 14px', borderRadius:8, borderLeft:'3px solid #6366f1' }}>{dResult.short_description}</div>
                  <CopyBtn text={dResult.short_description} id="s" copied={copied} onCopy={copy} />
                </Section>
                <Section label="FULL DESCRIPTION" color="#8b5cf6">
                  <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.9, background:'var(--bg3)', padding:14, borderRadius:8, whiteSpace:'pre-line', borderLeft:'3px solid #8b5cf6' }}>{dResult.long_description}</div>
                  <CopyBtn text={dResult.long_description} id="l" copied={copied} onCopy={copy} />
                </Section>
                <Section label="KEY SELLING POINTS" color="#10b981">
                  <div style={{ background:'var(--bg3)', padding:'12px 14px', borderRadius:8, borderLeft:'3px solid #10b981' }}>
                    {dResult.bullet_points?.map((b,i) => (
                      <div key={i} style={{ display:'flex', gap:10, marginBottom:i<dResult.bullet_points.length-1?10:0 }}>
                        <span style={{ color:'#10b981', fontWeight:700 }}>✓</span>
                        <span style={{ fontSize:13, color:'var(--text2)', lineHeight:1.5 }}>{b}</span>
                      </div>
                    ))}
                  </div>
                  <CopyBtn text={dResult.bullet_points?.map(b=>`• ${b}`).join('\n')} id="bp" copied={copied} onCopy={copy} />
                </Section>
                <Section label="SEO TAGS" color="#f59e0b">
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8, background:'var(--bg3)', padding:'12px 14px', borderRadius:8, borderLeft:'3px solid #f59e0b' }}>
                    {dResult.seo_tags?.map((t,i) => (
                      <span key={i} style={{ background:'#f59e0b18', color:'#fbbf24', padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600 }}>#{t}</span>
                    ))}
                  </div>
                  <CopyBtn text={dResult.seo_tags?.map(t=>`#${t}`).join(' ')} id="tg" copied={copied} onCopy={copy} />
                </Section>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ══ VISION TAB ══════════════════════════════════════════════════════════ */}
      {tab === 'vision' && (
        <div style={{ display:'grid', gridTemplateColumns:'360px 1fr', gap:20 }}>

          {/* ── Left: upload ── */}
          <div>
            <Card>
              <div style={{ fontSize:15, fontWeight:600, marginBottom:12 }}>📷 AI Photo Cataloging</div>
              <div style={{ padding:'10px 14px', background:'linear-gradient(135deg,#6366f111,#8b5cf611)', border:'1px solid #6366f133', borderRadius:10, marginBottom:16, fontSize:12, color:'var(--text2)', lineHeight:1.6 }}>
                Upload a product photo — AI Vision detects the product name, category, tags, and writes a full description.
              </div>

              {/* Drop zone */}
              <div
                onClick={() => vInputRef.current?.click()}
                onDrop={e => { e.preventDefault(); handleVFile(e.dataTransfer.files[0]); }}
                onDragOver={e => e.preventDefault()}
                style={{
                  border: `2px dashed ${vPreview ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius:12,
                  padding: vPreview ? 8 : 28,
                  textAlign:'center', cursor:'pointer', marginBottom:14,
                  background:'var(--bg3)', transition:'all 0.2s',
                  minHeight:180, display:'flex', alignItems:'center',
                  justifyContent:'center', flexDirection:'column',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor='var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = vPreview ? 'var(--primary)' : 'var(--border)'}
              >
                {vPreview ? (
                  <div style={{ width:'100%' }}>
                    <img
                      src={vPreview}
                      alt="Product preview"
                      style={{ width:'100%', maxHeight:200, objectFit:'contain', borderRadius:8, display:'block' }}
                      onError={e => { e.target.style.display='none'; }}
                    />
                    <div style={{ fontSize:11, color:'var(--text3)', marginTop:6 }}>
                      📎 {vFile?.name}
                      {vFile ? ` · ${(vFile.size/1024).toFixed(0)} KB` : ''}
                    </div>
                    <div style={{ fontSize:11, color:'var(--primary)', marginTop:2, fontWeight:500 }}>
                      Click to change image
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize:44, marginBottom:10 }}>📷</div>
                    <div style={{ fontSize:14, color:'var(--text2)', marginBottom:4, fontWeight:600 }}>Drop product photo here</div>
                    <div style={{ fontSize:12, color:'var(--text3)' }}>or click to browse · JPG, PNG, WebP</div>
                  </>
                )}
              </div>
              <input
                ref={vInputRef} type="file" accept="image/*"
                style={{ display:'none' }}
                onChange={e => handleVFile(e.target.files[0])}
              />

              <div style={{ display:'flex', gap:8, marginBottom:14 }}>
                <button
                  onClick={() => { setVFile(null); if(vPreview) URL.revokeObjectURL(vPreview); setVPreview(null); setVResult(null); setVError(''); }}
                  style={{ flex:1, padding:9, background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text2)', fontSize:13, cursor:'pointer' }}
                >Clear</button>
                <button
                  onClick={analyzePhoto} disabled={!vFile||vLoading}
                  style={{
                    flex:2, padding:9, borderRadius:8, border:'none', fontWeight:700, fontSize:13,
                    background: !vFile||vLoading ? 'var(--bg3)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    color: !vFile||vLoading ? 'var(--text3)' : '#fff',
                    cursor: !vFile||vLoading ? 'not-allowed' : 'pointer',
                    boxShadow: !vFile||vLoading ? 'none' : '0 4px 14px rgba(99,102,241,0.35)',
                  }}
                >{vLoading ? '⏳ Analyzing…' : '⚡ Analyze with AI Vision'}</button>
              </div>

              {vError && (
                <div style={{ padding:'10px 12px', background:'#ef444415', border:'1px solid #ef444433', borderRadius:8, fontSize:12, color:'#ef4444' }}>
                  ❌ {vError}
                </div>
              )}
            </Card>
          </div>

          {/* ── Right: result ── */}
          <div>
            {vLoading && (
              <Card style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:420 }}>
                <div style={{ fontSize:44, marginBottom:16, animation:'spin 2s linear infinite', display:'inline-block' }}>⟳</div>
                <div style={{ fontSize:14, color:'var(--text2)', fontWeight:600 }}>AI Vision is analyzing your photo…</div>
                <div style={{ fontSize:12, color:'var(--text3)', marginTop:6 }}>Detecting product, category, and generating description</div>
              </Card>
            )}

            {!vLoading && !vResult && !vError && (
              <Card style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:420, textAlign:'center' }}>
                <div style={{ fontSize:52, marginBottom:16 }}>📷</div>
                <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>AI Photo Cataloging</div>
                <div style={{ fontSize:13, color:'var(--text2)', maxWidth:300, lineHeight:1.8 }}>
                  Upload a product image and AI Vision will auto-detect the product name, category, and generate a full description.
                </div>
              </Card>
            )}

            {vResult && !vLoading && (
              <Card>
                {/* Result header with thumbnail */}
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20, padding:'12px 14px', background:'linear-gradient(135deg,#6366f111,#8b5cf611)', borderRadius:10, border:'1px solid #6366f133' }}>
                  {vPreview && (
                    <img
                      src={vPreview} alt=""
                      style={{ width:56, height:56, objectFit:'cover', borderRadius:8, flexShrink:0, border:'1px solid var(--border)' }}
                      onError={e => e.target.style.display='none'}
                    />
                  )}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700 }}>
                      {vResult._fallback ? '⚡ Auto-detected: ' : '✦ AI detected: '}
                      <span style={{ color:'var(--primary)' }}>{vResult.product_name}</span>
                    </div>
                    <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
                      Confidence: {vResult.confidence} · Category: {vResult.category}
                    </div>
                  </div>
                  <span style={{ background:vResult.confidence==='high'?'#10b98122':'#f59e0b22', color:vResult.confidence==='high'?'#10b981':'#f59e0b', fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, flexShrink:0 }}>
                    {vResult.confidence==='high' ? '✓ High' : '~ Medium'}
                  </span>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', letterSpacing:0.8, marginBottom:6 }}>PRODUCT NAME</div>
                    <div style={{ fontSize:14, fontWeight:700, background:'var(--bg3)', padding:'10px 12px', borderRadius:8 }}>{vResult.product_name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', letterSpacing:0.8, marginBottom:6 }}>CATEGORY</div>
                    <div style={{ fontSize:14, fontWeight:700, color:'var(--primary)', background:'var(--bg3)', padding:'10px 12px', borderRadius:8 }}>{vResult.category}</div>
                  </div>
                </div>

                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', letterSpacing:0.8, marginBottom:6 }}>SHORT DESCRIPTION</div>
                  <div style={{ fontSize:13, color:'var(--text2)', background:'var(--bg3)', padding:'10px 12px', borderRadius:8, lineHeight:1.6 }}>{vResult.short_description}</div>
                </div>

                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', letterSpacing:0.8, marginBottom:6 }}>KEY FEATURES</div>
                  <div style={{ background:'var(--bg3)', padding:'10px 12px', borderRadius:8 }}>
                    {vResult.bullet_points?.map((b,i) => (
                      <div key={i} style={{ display:'flex', gap:8, marginBottom:i<vResult.bullet_points.length-1?8:0 }}>
                        <span style={{ color:'#10b981', fontWeight:700 }}>✓</span>
                        <span style={{ fontSize:13, color:'var(--text2)' }}>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', letterSpacing:0.8, marginBottom:6 }}>TAGS</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {vResult.tags?.map((t,i) => (
                      <span key={i} style={{ background:'#6366f118', color:'var(--primary)', padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600 }}>#{t}</span>
                    ))}
                  </div>
                </div>

                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', background:'var(--bg3)', borderRadius:8, marginBottom:14 }}>
                  <span style={{ fontSize:12, color:'var(--text2)' }}>💰 Suggested price range</span>
                  <span style={{ fontSize:14, fontWeight:700, color:'#10b981' }}>{vResult.suggested_price_range}</span>
                </div>

                <button onClick={() => {
                  setTab('description');
                  setSelectedPid('');
                  setDForm(p => ({ ...p, product_name:vResult.product_name, category:vResult.category, key_features:vResult.bullet_points?.join(', ')||'' }));
                  toast.success('Fields pre-filled from vision analysis!');
                }} style={{ width:'100%', padding:11, borderRadius:9, border:'none', background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                  → Use This Data in Description Generator
                </button>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ══ IMAGE TAB ═══════════════════════════════════════════════════════════ */}
      {tab === 'image' && (
        <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:20 }}>
          <div>
            <Card style={{ marginBottom:14 }}>
              <div style={{ fontSize:15, fontWeight:600, marginBottom:16 }}>Search Product Images</div>
              <Field label="Product Name *">
                <input placeholder="e.g. Coffee Maker, Headphones…" value={iForm.product_name}
                  onChange={e => setIForm(p=>({...p,product_name:e.target.value}))}
                  onKeyDown={e => e.key==='Enter' && searchImgs()} />
              </Field>
              <Field label="Category" mb={16}>
                <select value={iForm.category} onChange={e => setIForm(p=>({...p,category:e.target.value}))}>
                  <option value="">All categories</option>
                  {CATS.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <button onClick={searchImgs} disabled={iLoading} style={{
                width:'100%', padding:12, borderRadius:10, border:'none',
                background: iLoading ? 'var(--bg3)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color: iLoading ? 'var(--text3)' : '#fff',
                fontWeight:700, fontSize:14, cursor: iLoading?'not-allowed':'pointer',
                boxShadow: iLoading ? 'none' : '0 4px 14px rgba(99,102,241,0.3)',
              }}>{iLoading ? '⏳ Searching…' : '🔍 Search Images'}</button>
            </Card>

            {selected && !iLoading && (
              <Card>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--text2)', marginBottom:10 }}>SELECTED IMAGE</div>
                <img src={selected.url} alt={selected.label} style={{ width:'100%', borderRadius:10, marginBottom:10, display:'block', maxHeight:180, objectFit:'cover', background:'var(--bg3)' }} onError={e => e.target.style.display='none'} />
                <div style={{ fontSize:11, color:'var(--text3)', marginBottom:10 }}>📷 {selected.by} · {selected.label?.slice(0,28)}</div>
                <a href={selected.url} download target="_blank" rel="noreferrer" style={{ display:'block', textAlign:'center', padding:9, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', borderRadius:8, fontSize:13, fontWeight:600, textDecoration:'none' }}>
                  ⬇️ Download Image
                </a>
              </Card>
            )}
          </div>

          <div>
            {iLoading && (
              <Card style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:420 }}>
                <Spinner />
                <div style={{ marginTop:12, color:'var(--text2)', fontSize:14 }}>Searching for "{iForm.product_name}"…</div>
              </Card>
            )}
            {!iLoading && !iResults && (
              <Card style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:420, textAlign:'center' }}>
                <div style={{ fontSize:56, marginBottom:16 }}>🖼️</div>
                <div style={{ fontSize:16, fontWeight:600, marginBottom:8 }}>Image Search</div>
                <div style={{ fontSize:13, color:'var(--text2)', maxWidth:280, lineHeight:1.8 }}>Enter a product name and find AI-generated product images.</div>
              </Card>
            )}
            {iResults && !iLoading && (
              <>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:14, color:'var(--text2)' }}>
                  🖼️ {iResults.length} results for <span style={{ color:'var(--primary)' }}>"{iForm.product_name}"</span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                  {iResults.map(img => (
                    <div key={img.id} onClick={() => setSelected(img)} style={{
                      borderRadius:12, overflow:'hidden', cursor:'pointer',
                      border:`2px solid ${selected?.id===img.id ? 'var(--primary)' : 'var(--border)'}`,
                      position:'relative', background:'var(--bg3)',
                      boxShadow: selected?.id===img.id ? '0 0 0 3px rgba(99,102,241,0.2)' : 'none',
                    }}>
                      <img src={img.thumb} alt={img.label} style={{ width:'100%', aspectRatio:'1', objectFit:'cover', display:'block' }} loading="lazy" onError={e => e.target.parentElement.style.display='none'} />
                      {selected?.id===img.id && (
                        <div style={{ position:'absolute', top:6, right:6, width:26, height:26, borderRadius:'50%', background:'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>✓</div>
                      )}
                    </div>
                  ))}
                </div>
                {selected && (
                  <div style={{ marginTop:14, display:'flex', gap:10 }}>
                    <button onClick={searchImgs} style={{ ...ghostBtn, flex:1, textAlign:'center' }}>🔄 Search Again</button>
                    <a href={selected.url} target="_blank" rel="noreferrer" style={{ flex:2, padding:10, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', borderRadius:8, fontSize:13, fontWeight:600, textDecoration:'none', textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      ⬇️ Download Selected
                    </a>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
