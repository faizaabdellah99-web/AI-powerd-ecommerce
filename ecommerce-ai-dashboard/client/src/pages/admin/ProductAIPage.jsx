import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Layout from '../../components/shared/Layout';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import Spinner from '../../components/shared/Spinner';
import api from '../../services/api';
import toast from 'react-hot-toast';

const CATS = ['Electronics','Clothing','Home & Garden','Food & Beverage',
              'Sports & Fitness','Beauty & Care','Books','Toys','Automotive','Health','General Merchandise'];

// ── Description via server (AI) ──────────────────────────────────────────
async function generateDescriptionAPI(form) {
  const features = form.key_features.split(',').map(s => s.trim()).filter(Boolean);
  const { data } = await api.post('/ai/generate-description', {
    product_name:    form.product_name,
    category:        form.category,
    key_features:    features,
    target_audience: form.target_audience,
    tone:            form.tone,
  });
  return data;
}

// ── Auto-detect category & features from product name via AI ──────────────
async function autoDetectProduct(productName) {
  const { data } = await api.post('/ai/chat', {
    message: `For the product "${productName}", return ONLY a JSON object with no extra text:
{"category":"one of: Electronics|Clothing|Home & Garden|Food & Beverage|Sports & Fitness|Beauty & Care|Books|Toys|Automotive|Health","features":["3 to 5 real specific features of this product as short phrases"]}`,
    history: [],
    context: 'product categorization',
  });
  const match = data.reply.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('parse error');
  return JSON.parse(match[0]);
}

// ── AI Image search: Pollinations AI generates images on-the-fly ──────────────
async function findImages(productName, category) {
  const results = [];
  const seen    = new Set();
  const add = img => {
    if (img.url && !seen.has(img.url)) {
      seen.add(img.url);
      results.push(img);
    }
  };

  // Generate 6 AI images via Pollinations (free, no API key, always works)
  const styles = [
    'professional product photography, studio lighting, white background',
    'ecommerce product photo, high detail, sharp focus',
    'product on gradient background, commercial photography',
    'lifestyle product photo, natural lighting, modern setting',
    'product close-up, macro photography, detailed texture',
    'product packaging shot, clean composition, retail ready',
  ];

  styles.forEach((style, i) => {
    const prompt = `${productName}, ${category || 'product'}, ${style}`;
    const encoded = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=400&height=400&nologo=true`;
    add({ id: `ai-${i}`, thumb: url, url, label: `${productName} ${i+1}`, by: 'AI Generated' });
  });

  return results.slice(0, 9);
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function Field({ label, children, mb = 14 }) {
  return (
    <div style={{ marginBottom: mb }}>
      <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 5, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

function Section({ label, color, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: 0.8, marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

function CopyBtn({ text, id, copied, onCopy }) {
  return (
    <button onClick={() => onCopy(text, id)} style={{
      marginTop: 6, padding: '4px 12px', background: 'transparent',
      border: '1px solid var(--border)', borderRadius: 6,
      color: copied === id ? 'var(--success)' : 'var(--text3)',
      fontSize: 11, cursor: 'pointer', fontWeight: 500, transition: 'color 0.15s',
    }}>
      {copied === id ? '✅ Copied' : '📋 Copy'}
    </button>
  );
}

const ghostBtn = { padding:'8px 14px', background:'transparent', border:'1px solid var(--border)', borderRadius:7, color:'var(--text2)', fontSize:13, cursor:'pointer', fontWeight:500 };
const primBtn  = { padding:'8px 14px', background:'var(--primary)', border:'none', borderRadius:7, color:'#fff', fontSize:13, cursor:'pointer', fontWeight:600 };

// ── Main Component ────────────────────────────────────────────────────────────
export default function ProductAIPage() {
  const location = useLocation();
  const validTabs = ['description', 'vision', 'image'];

  // Read tab from URL query parameter (e.g. ?tab=vision)
  const [tab, setTab]         = useState(() => {
    const params = new URLSearchParams(location.search);
    const urlTab = params.get('tab') || 'description';
    return validTabs.includes(urlTab) ? urlTab : 'description';
  });

  // Sync tab when URL changes (e.g. sidebar sub-item clicks)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlTab = params.get('tab') || 'description';
    if (validTabs.includes(urlTab) && urlTab !== tab) {
      setTab(urlTab);
    }
  }, [location.search]);

  // Description state
  const [dForm, setDForm]     = useState({ product_name:'', category:'', key_features:'', target_audience:'general shoppers', tone:'professional' });
  const [dResult, setDResult] = useState(null);
  const [dLoading, setDLoading] = useState(false);
  const [dError, setDError]   = useState('');
  const [copied, setCopied]   = useState('');

  // Image search state
  const [iForm, setIForm]     = useState({ product_name:'', category:'' });
  const [iResults, setIResults] = useState(null);
  const [selected, setSelected] = useState(null);
  const [iLoading, setILoading] = useState(false);

  // Vision cataloging state
  const [vFile,    setVFile]    = useState(null);
  const [vPreview, setVPreview] = useState(null);
  const [vResult,  setVResult]  = useState(null);
  const [vLoading, setVLoading] = useState(false);
  const [vError,   setVError]   = useState('');
  const vInputRef = useRef(null);

  const copy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(''), 2000);
  };

  // ── Generate description ──────────────────────────────────────────────────
  const genDesc = async () => {
    if (!dForm.product_name.trim()) return toast.error('Product name is required');
    setDLoading(true); setDResult(null); setDError('');
    try {
      const result = await generateDescriptionAPI(dForm);
      setDResult(result);
      if (result._fallback) {
        toast('⚡ Quota exceeded — showing smart template. Add features for better results.', { icon: '⚡', duration: 4000 });
      } else {
        toast.success('Description generated!');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || '';
      const isQuota = msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('429') || err.response?.status === 429 || err.response?.status === 500;

      if (isQuota) {
        // Build smart local description without AI quota
        const name  = dForm.product_name.trim();
        const feats = dForm.key_features.split(',').map(s=>s.trim()).filter(Boolean);
        const cat   = dForm.category || 'product';
        const aud   = dForm.target_audience || 'everyday users';
        const brand = name.split(' ')[0];
        const nl    = name.toLowerCase();

        const isHeadphone = nl.includes('headphone')||nl.includes('wh-')||nl.includes('earphone')||nl.includes('earbud')||nl.includes('airpod');
        const isPhone     = nl.includes('phone')||nl.includes('iphone')||nl.includes('galaxy')||nl.includes('pixel');
        const isLaptop    = nl.includes('laptop')||nl.includes('macbook')||nl.includes('notebook')||nl.includes('thinkpad');
        const isSpeaker   = nl.includes('speaker')||nl.includes('soundbar')||nl.includes('jbl')||nl.includes('bose');
        const isShoe      = nl.includes('shoe')||nl.includes('sneaker')||nl.includes('air max')||nl.includes('jordan');

        let intro, features, usecases, bullets;
        const hasF = feats.length >= 1;

        if (isHeadphone) {
          intro    = `The ${name} is a headphone designed for ${aud} who want clear, immersive audio.`;
          features = hasF ? `It features ${feats.join(', ')}.` : `The ${name} delivers balanced stereo sound, includes a built-in microphone for calls, and connects via Bluetooth and 3.5mm jack. It has padded ear cups and a foldable design for portability.`;
          usecases = `The ${name} works well for commuting, working from home, and gym sessions.`;
          bullets  = hasF ? feats.map(f=>`${f} — built into the ${name}`) : [`Stereo sound — the ${name} covers full frequency range`,`Built-in mic — take hands-free calls with the ${name}`,`Bluetooth connectivity — the ${name} pairs wirelessly`,`Foldable design — the ${name} packs flat for travel`,`Padded ear cups — the ${name} is comfortable for long sessions`];
        } else if (isPhone) {
          intro    = `The ${name} is a smartphone for ${aud} who want a reliable all-day device.`;
          features = hasF ? `It comes with ${feats.join(', ')}.` : `The ${name} includes a multi-lens camera, a high-resolution display, fast charging, and enough storage for apps and media.`;
          usecases = `The ${name} handles browsing, streaming, photography, and daily communication without friction.`;
          bullets  = hasF ? feats.map(f=>`${f} — a standout feature of the ${name}`) : [`Multi-lens camera — the ${name} captures sharp photos`,`Fast charging — the ${name} powers up quickly`,`High-res display — the ${name} delivers clear visuals`,`Ample storage — the ${name} holds apps and media`,`All-day battery — the ${name} lasts a full day`];
        } else if (isLaptop) {
          intro    = `The ${name} is a laptop for ${aud} who need reliable computing for work or study.`;
          features = hasF ? `It is equipped with ${feats.join(', ')}.` : `The ${name} comes with a fast processor, SSD storage, enough RAM for multitasking, and a battery rated for hours of unplugged use.`;
          usecases = `The ${name} handles document editing, video calls, web browsing, and everyday computing tasks.`;
          bullets  = hasF ? feats.map(f=>`${f} — a core spec of the ${name}`) : [`Fast processor — the ${name} handles multitasking smoothly`,`SSD storage — the ${name} boots and loads files quickly`,`Portable build — the ${name} is light enough to carry daily`,`Long battery — the ${name} runs for hours unplugged`,`Clear display — the ${name} screen suits extended work sessions`];
        } else if (isSpeaker) {
          intro    = `The ${name} is a speaker designed for ${aud} who want quality sound at home or on the go.`;
          features = hasF ? `It features ${feats.join(', ')}.` : `The ${name} delivers clear, full-range audio with deep bass. It connects via Bluetooth, has a built-in battery for portable use, and is durable enough for outdoor settings.`;
          usecases = `The ${name} works well for indoor listening, outdoor gatherings, and travel.`;
          bullets  = hasF ? feats.map(f=>`${f} — a key feature of the ${name}`) : [`Clear audio — the ${name} delivers full-range sound`,`Bluetooth — the ${name} connects wirelessly`,`Built-in battery — the ${name} plays for hours`,`Portable — the ${name} is sized for travel`,`Durable build — the ${name} handles outdoor use`];
        } else {
          intro    = hasF ? `The ${name} is a ${cat} for ${aud} built around ${feats[0]}${feats[1]?' and '+feats[1]:''}` : `The ${name} is a ${cat} for ${aud} focused on reliable, practical everyday performance.`;
          features = hasF ? `It includes ${feats.join(', ')}, making the ${name} a capable choice in its category.` : `The ${name} is built with quality materials and a user-friendly design. It is easy to set up and consistent in daily use.`;
          usecases = `The ${name} suits ${aud} who need a dependable ${cat} for regular use at home or work.`;
          bullets  = hasF ? feats.map(f=>`${f} — a defining feature of the ${name}`) : [`Reliable build — the ${name} handles regular use`,`Easy setup — the ${name} is ready to use out of the box`,`Consistent output — the ${name} performs the same every time`,`Built for ${aud} — the ${name} fits daily routines`,`Practical design — the ${name} focuses on what matters`];
        }

        while (bullets.length < 5) bullets.push(`${cat} quality — the ${name} meets ${brand} standards`);

        setDResult({
          short_description: intro,
          long_description: `${intro}\n\n${features}\n\n${usecases}`,
          bullet_points: bullets.slice(0,5),
          seo_tags: [name.toLowerCase(), `buy ${name.toLowerCase()}`, `${name.toLowerCase()} review`, `best ${cat} ${new Date().getFullYear()}`, `${name.toLowerCase()} price`, `${brand.toLowerCase()} ${cat}`],
          _fallback: true,
        });
        toast('⚡ Quota exceeded — smart template shown. Add features for better results.', { icon: '⚡', duration: 4000 });
      } else {
        setDError(msg || 'Generation failed');
        toast.error('Failed: ' + (msg || 'Unknown error'));
      }
    } finally { setDLoading(false); }
  };

  // ── Smart Fill: auto-detect category + features from product name ──────────
  const [fillLoading, setFillLoading] = useState(false);
  const smartFill = async () => {
    if (!dForm.product_name.trim()) return toast.error('Enter a product name first');
    setFillLoading(true);
    try {
      const { data } = await api.post('/ai/detect-product', {
        product_name: dForm.product_name.trim(),
      });
      setDForm(p => ({
        ...p,
        category:     data.category  || p.category,
        key_features: data.features  || p.key_features,
      }));
      toast.success('Category & features auto-filled!');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'unknown error';
      console.error('Smart Fill error:', msg);
      toast.error('Smart Fill failed: ' + msg);
    } finally { setFillLoading(false); }
  };

  // ── Vision: analyze product photo ────────────────────────────────────────
  const analyzePhoto = async () => {
    if (!vFile) return toast.error('Upload a product photo first');
    setVLoading(true); setVResult(null); setVError('');
    try {
      const formData = new FormData();
      formData.append('image', vFile);
      const { data } = await api.post('/ai/analyze-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setVResult(data);
      toast.success('Photo analyzed by AI Vision!');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Analysis failed';
      setVError(msg);
      toast.error('Analysis failed: ' + msg);
    } finally { setVLoading(false); }
  };

  const handleVFile = (f) => {
    if (!f || !f.type.startsWith('image/')) return toast.error('Please upload an image file');
    setVFile(f);
    setVPreview(URL.createObjectURL(f));
    setVResult(null); setVError('');
  };
  const searchImgs = async () => {
    if (!iForm.product_name.trim()) return toast.error('Enter a product name');
    setILoading(true); setIResults(null); setSelected(null);
    try {
      // Try AI backend search first (proxied through Express to Python FastAPI)
      let imgs = [];
      try {
        const { data } = await api.post('/ai/search-images', {
          query: iForm.product_name.trim(),
          category: iForm.category,
        });
        imgs = data.results || [];
      } catch {
        // Fallback to local Wikimedia search
        imgs = await findImages(iForm.product_name.trim(), iForm.category);
      }
      setIResults(imgs);
      if (imgs.length) setSelected(imgs[0]);
      toast.success(`${imgs.length} images found!`);
    } catch { toast.error('Image search failed'); }
    finally { setILoading(false); }
  };

  const TABS = [
    { id: 'description', icon: '✍️', label: 'Description Generator' },
    { id: 'vision',      icon: '📷', label: 'Photo Cataloging'       },
    { id: 'image',       icon: '🖼️', label: 'Image Search'           },
  ];

  return (
    <Layout title="🤖 Product AI" subtitle="AI description generator · Wikimedia image search">

      {/* Tab Bar */}
      <div style={{ display:'flex', gap:8, marginBottom:24 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:'10px 22px', borderRadius:10, fontWeight:600, fontSize:14,
            cursor:'pointer', transition:'all 0.15s',
            background: tab===t.id ? 'var(--primary)' : 'var(--card)',
            color:       tab===t.id ? '#fff'           : 'var(--text2)',
            border:      `1px solid ${tab===t.id ? 'var(--primary)' : 'var(--border)'}`,
            boxShadow:   tab===t.id ? '0 4px 14px rgba(99,102,241,0.3)' : 'none',
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── DESCRIPTION TAB ── */}
      {tab === 'description' && (
        <div style={{ display:'grid', gridTemplateColumns:'400px 1fr', gap:20 }}>

          {/* Left: inputs */}
          <div>
            <Card>
              {/* AI badge */}
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18, padding:'10px 14px', background:'linear-gradient(135deg,#6366f111,#8b5cf611)', borderRadius:10, border:'1px solid #6366f133' }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>✦</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>AI Engine · Latest Model</div>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>Powered by AI Studio</div>
                </div>
              </div>

              <Field label="Product Name *">
                <input placeholder="e.g. Sony WH-1000XM5 Headphones" value={dForm.product_name}
                  onChange={e => setDForm(p=>({...p, product_name:e.target.value}))}
                  onKeyDown={e => e.key==='Enter' && genDesc()} />
              </Field>

              {/* Smart Fill button */}
              <div style={{ marginBottom:14 }}>
                <button onClick={smartFill} disabled={fillLoading || !dForm.product_name.trim()} style={{
                  width:'100%', padding:'9px 14px', borderRadius:8, border:'1px dashed #6366f155',
                  background: fillLoading ? 'var(--bg3)' : '#6366f10d',
                  color: fillLoading || !dForm.product_name.trim() ? 'var(--text3)' : '#818cf8',
                  fontSize:12, fontWeight:600, cursor: fillLoading||!dForm.product_name.trim() ? 'not-allowed':'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                  transition:'all 0.15s',
                }}>
                  {fillLoading
                    ? <><span style={{ animation:'spin 1s linear infinite', display:'inline-block' }}>⟳</span> AI is detecting…</>
                    : <><span>✦</span> Smart Fill — auto-detect category &amp; features</>
                  }
                </button>
                <div style={{ fontSize:10, color:'var(--text3)', marginTop:4, textAlign:'center' }}>
                  Type your product name above, then click to auto-fill category and features
                </div>
              </div>
              <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

              <Field label="Category (optional — AI will detect if blank)">
                <select value={dForm.category} onChange={e => setDForm(p=>({...p, category:e.target.value}))}>
                  <option value="">— auto-detect —</option>
                  {CATS.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>

              <Field label="Key Features (comma-separated)">
                <input placeholder="e.g. noise cancelling, 30hr battery, foldable" value={dForm.key_features}
                  onChange={e => setDForm(p=>({...p, key_features:e.target.value}))} />
              </Field>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:18 }}>
                <Field label="Target Audience" mb={0}>
                  <select value={dForm.target_audience} onChange={e => setDForm(p=>({...p, target_audience:e.target.value}))}>
                    {['general shoppers','professionals','students','athletes','parents','tech enthusiasts','seniors','gamers'].map(a=><option key={a}>{a}</option>)}
                  </select>
                </Field>
                <Field label="Tone" mb={0}>
                  <select value={dForm.tone} onChange={e => setDForm(p=>({...p, tone:e.target.value}))}>
                    <option value="professional">Professional</option>
                    <option value="casual">Casual & Friendly</option>
                    <option value="luxury">Luxury & Premium</option>
                    <option value="technical">Technical</option>
                  </select>
                </Field>
              </div>

              <button onClick={genDesc} disabled={dLoading} style={{
                width:'100%', padding:13, borderRadius:10, border:'none', cursor: dLoading ? 'not-allowed' : 'pointer',
                background: dLoading ? 'var(--bg3)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color: dLoading ? 'var(--text3)' : '#fff',
                fontWeight:700, fontSize:15, transition:'opacity 0.2s',
                boxShadow: dLoading ? 'none' : '0 4px 14px rgba(99,102,241,0.35)',
              }}>
                {dLoading ? '⏳ AI is generating…' : '✨ Generate Description'}
              </button>

              <div style={{ marginTop:12, padding:'10px 12px', background:'var(--bg3)', borderRadius:8, fontSize:11, color:'var(--text3)', lineHeight:1.7 }}>
                💡 <strong>Product name is enough</strong> — AI knows most products and will write a detailed, accurate description. Use Smart Fill or add features for even better results.
              </div>            </Card>
          </div>

          {/* Right: results */}
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
              <Card style={{ borderColor:'var(--danger)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <span style={{ fontSize:18 }}>❌</span>
                  <span style={{ fontSize:14, fontWeight:600, color:'var(--danger)' }}>Generation Failed</span>
                </div>
                <div style={{ fontSize:13, color:'var(--text2)', marginBottom:12 }}>{dError}</div>
                <div style={{ fontSize:12, color:'var(--text3)', background:'var(--bg3)', padding:'10px 12px', borderRadius:8, lineHeight:1.7 }}>
                  <strong>Common fixes:</strong><br/>
                  • Check that <code>AI_API_KEY</code> is valid in <code>server/.env</code><br/>
                  • Make sure the Express server is running: <code>cd server &amp;&amp; npm run dev</code><br/>
                  • Verify the key at <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" style={{ color:'var(--primary)' }}>aistudio.google.com</a>
                </div>
              </Card>
            )}

            {!dLoading && !dResult && !dError && (
              <Card style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:480, textAlign:'center' }}>
                <div style={{ width:70, height:70, borderRadius:'50%', background:'linear-gradient(135deg,#6366f111,#8b5cf611)', border:'1px solid #6366f133', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, marginBottom:16 }}>✦</div>
                <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>AI Description Generator</div>
                <div style={{ fontSize:13, color:'var(--text2)', maxWidth:300, lineHeight:1.8 }}>
                  Just type your <strong>product name</strong> and click <strong>Generate</strong> — AI will write a detailed, accurate description. Use Smart Fill or add features for extra detail.
                </div>
              </Card>
            )}

            {dResult && !dLoading && (
              <Card>
                {/* Result header */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>✦</div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{dForm.product_name}</div>
                      <div style={{ fontSize:11, color: dResult._fallback ? '#f59e0b' : 'var(--text3)' }}>
                        {dResult._fallback ? '⚡ Template — quota exceeded, retry in 1 min' : '✦ Generated by AI'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => setDResult(null)} style={ghostBtn}>Clear</button>
                    <button onClick={() => copy([
                      dResult.short_description,'',
                      dResult.long_description,'',
                      dResult.bullet_points?.map(b=>`• ${b}`).join('\n'),'',
                      dResult.seo_tags?.map(t=>`#${t}`).join(' ')
                    ].join('\n'),'all')} style={primBtn}>
                      {copied==='all' ? '✅ Copied!' : '📋 Copy All'}
                    </button>
                  </div>
                </div>

                <Section label="SHORT DESCRIPTION" color="#6366f1">
                  <div style={{ fontSize:14, color:'var(--text)', lineHeight:1.8, background:'var(--bg3)', padding:'12px 14px', borderRadius:8, borderLeft:'3px solid #6366f1' }}>
                    {dResult.short_description}
                  </div>
                  <CopyBtn text={dResult.short_description} id="s" copied={copied} onCopy={copy} />
                </Section>

                <Section label="FULL DESCRIPTION" color="#8b5cf6">
                  <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.9, background:'var(--bg3)', padding:14, borderRadius:8, whiteSpace:'pre-line', borderLeft:'3px solid #8b5cf6' }}>
                    {dResult.long_description}
                  </div>
                  <CopyBtn text={dResult.long_description} id="l" copied={copied} onCopy={copy} />
                </Section>

                <Section label="KEY SELLING POINTS" color="#10b981">
                  <div style={{ background:'var(--bg3)', padding:'12px 14px', borderRadius:8, borderLeft:'3px solid #10b981' }}>
                    {dResult.bullet_points?.map((b,i) => (
                      <div key={i} style={{ display:'flex', gap:10, marginBottom: i < dResult.bullet_points.length-1 ? 10 : 0 }}>
                        <span style={{ color:'#10b981', fontWeight:700, flexShrink:0 }}>✓</span>
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

      {/* ── VISION TAB ── */}
      {tab === 'vision' && (
        <div style={{ display:'grid', gridTemplateColumns:'360px 1fr', gap:20 }}>
          {/* Left: upload */}
          <div>
            <Card>
              <div style={{ fontSize:15, fontWeight:600, marginBottom:16 }}>📷 AI Photo Cataloging</div>
              <div style={{ padding:'10px 14px', background:'linear-gradient(135deg,#6366f111,#8b5cf611)', border:'1px solid #6366f133', borderRadius:10, marginBottom:16, fontSize:12, color:'var(--text2)', lineHeight:1.6 }}>
                Upload a product photo — AI Vision will automatically detect the product name, category, tags, and write a full description.
              </div>

              {/* Drop zone */}
              <div onClick={() => vInputRef.current?.click()}
                onDrop={e => { e.preventDefault(); handleVFile(e.dataTransfer.files[0]); }}
                onDragOver={e => e.preventDefault()}
                style={{
                  border:'2px dashed var(--border)', borderRadius:12, padding:24,
                  textAlign:'center', cursor:'pointer', marginBottom:14,
                  background: vPreview ? 'transparent' : 'var(--bg3)',
                  transition:'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor='var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}
              >
                {vPreview ? (
                  <img src={vPreview} alt="preview" style={{ width:'100%', maxHeight:220, objectFit:'contain', borderRadius:8 }} />
                ) : (
                  <>
                    <div style={{ fontSize:40, marginBottom:10 }}>📷</div>
                    <div style={{ fontSize:14, color:'var(--text2)', marginBottom:4 }}>Drop product photo here</div>
                    <div style={{ fontSize:12, color:'var(--text3)' }}>or click to browse · JPG, PNG, WebP</div>
                  </>
                )}
              </div>
              <input ref={vInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => handleVFile(e.target.files[0])} />

              <div style={{ display:'flex', gap:8, marginBottom:14 }}>
                <button onClick={() => { setVFile(null); setVPreview(null); setVResult(null); setVError(''); }} style={{ flex:1, padding:9, background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text2)', fontSize:13, cursor:'pointer' }}>
                  Clear
                </button>
                <button onClick={analyzePhoto} disabled={!vFile || vLoading} style={{
                  flex:2, padding:9, borderRadius:8, border:'none', fontWeight:700, fontSize:13,
                  background: !vFile||vLoading ? 'var(--bg3)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  color: !vFile||vLoading ? 'var(--text3)' : '#fff', cursor: !vFile||vLoading ? 'not-allowed' : 'pointer',
                  boxShadow: !vFile||vLoading ? 'none' : '0 4px 14px rgba(99,102,241,0.35)',
                }}>
                  {vLoading ? '⏳ Analyzing…' : '✦ Analyze with AI Vision'}
                </button>
              </div>

              {vError && (
                <div style={{ padding:'10px 12px', background:'#ef444415', border:'1px solid #ef444433', borderRadius:8, fontSize:12, color:'#ef4444' }}>
                  ❌ {vError}
                </div>
              )}
            </Card>
          </div>

          {/* Right: results */}
          <div>
            {vLoading && (
              <Card style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:420 }}>
                <div style={{ fontSize:44, marginBottom:16, animation:'spin 2s linear infinite', display:'inline-block' }}>⟳</div>
                <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
                <div style={{ fontSize:14, color:'var(--text2)', fontWeight:600 }}>AI Vision is analyzing your photo…</div>
                <div style={{ fontSize:12, color:'var(--text3)', marginTop:6 }}>Detecting product, category, and generating description</div>
              </Card>
            )}

            {!vLoading && !vResult && !vError && (
              <Card style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:420, textAlign:'center' }}>
                <div style={{ fontSize:52, marginBottom:16 }}>📷</div>
                <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>AI Photo Cataloging</div>
                <div style={{ fontSize:13, color:'var(--text2)', maxWidth:300, lineHeight:1.8 }}>
                  Upload a product image and AI Vision will auto-fill the entire product listing for you.
                </div>
              </Card>
            )}

            {vResult && !vLoading && (
              <Card>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20, padding:'10px 14px', background:'linear-gradient(135deg,#6366f111,#8b5cf611)', borderRadius:10, border:'1px solid #6366f133' }}>
                  <div style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>✦</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700 }}>AI Vision detected: <span style={{ color:'var(--primary)' }}>{vResult.product_name}</span></div>
                    <div style={{ fontSize:11, color:'var(--text3)' }}>Confidence: {vResult.confidence} · Category: {vResult.category}</div>
                  </div>
                  <span style={{ marginLeft:'auto', background: vResult.confidence==='high'?'#10b98122':'#f59e0b22', color:vResult.confidence==='high'?'#10b981':'#f59e0b', fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20 }}>
                    {vResult.confidence==='high'?'✓ High confidence':'~ Medium'}
                  </span>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:18 }}>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', letterSpacing:0.8, marginBottom:6 }}>PRODUCT NAME</div>
                    <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', background:'var(--bg3)', padding:'10px 12px', borderRadius:8 }}>{vResult.product_name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', letterSpacing:0.8, marginBottom:6 }}>CATEGORY</div>
                    <div style={{ fontSize:14, fontWeight:700, color:'var(--primary)', background:'var(--bg3)', padding:'10px 12px', borderRadius:8 }}>{vResult.category}</div>
                  </div>
                </div>

                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', letterSpacing:0.8, marginBottom:6 }}>SHORT DESCRIPTION</div>
                  <div style={{ fontSize:13, color:'var(--text2)', background:'var(--bg3)', padding:'10px 12px', borderRadius:8, lineHeight:1.6 }}>{vResult.short_description}</div>
                </div>

                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', letterSpacing:0.8, marginBottom:6 }}>KEY FEATURES</div>
                  <div style={{ background:'var(--bg3)', padding:'10px 12px', borderRadius:8 }}>
                    {vResult.bullet_points?.map((b,i) => (
                      <div key={i} style={{ display:'flex', gap:8, marginBottom:i<vResult.bullet_points.length-1?8:0 }}>
                        <span style={{ color:'var(--success)', fontWeight:700 }}>✓</span>
                        <span style={{ fontSize:13, color:'var(--text2)' }}>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', letterSpacing:0.8, marginBottom:6 }}>TAGS</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {vResult.tags?.map((t,i) => (
                      <span key={i} style={{ background:'#6366f118', color:'var(--primary)', padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600 }}>#{t}</span>
                    ))}
                  </div>
                </div>

                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', background:'var(--bg3)', borderRadius:8 }}>
                  <span style={{ fontSize:12, color:'var(--text2)' }}>💰 Suggested price range</span>
                  <span style={{ fontSize:14, fontWeight:700, color:'var(--success)' }}>{vResult.suggested_price_range}</span>
                </div>

                <button onClick={() => {
                  setTab('description');
                  setDForm(p => ({ ...p, product_name: vResult.product_name, category: vResult.category, key_features: vResult.bullet_points?.join(', ') || '' }));
                  toast.success('Fields pre-filled from vision analysis!');
                }} style={{ marginTop:16, width:'100%', padding:11, borderRadius:9, border:'none', background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                  → Use This Data in Description Generator
                </button>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── IMAGE TAB ── */}
      {tab === 'image' && (
        <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:20 }}>

          {/* Left: search form */}
          <div>
            <Card style={{ marginBottom:14 }}>
              <div style={{ fontSize:15, fontWeight:600, marginBottom:16 }}>Search Product Images</div>
              <Field label="Product Name *">
                <input placeholder="e.g. Coffee Maker, Headphones…" value={iForm.product_name}
                  onChange={e => setIForm(p=>({...p, product_name:e.target.value}))}
                  onKeyDown={e => e.key==='Enter' && searchImgs()} />
              </Field>
              <Field label="Category" mb={16}>
                <select value={iForm.category} onChange={e => setIForm(p=>({...p, category:e.target.value}))}>
                  <option value="">All categories</option>
                  {CATS.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <button onClick={searchImgs} disabled={iLoading} style={{
                width:'100%', padding:12, borderRadius:10, border:'none',
                background: iLoading ? 'var(--bg3)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color: iLoading ? 'var(--text3)' : '#fff',
                fontWeight:700, fontSize:14, cursor: iLoading ? 'not-allowed' : 'pointer',
                boxShadow: iLoading ? 'none' : '0 4px 14px rgba(99,102,241,0.3)',
              }}>
                {iLoading ? '⏳ Searching…' : '🔍 Search Images'}
              </button>
              <div style={{ marginTop:10, fontSize:11, color:'var(--text3)', lineHeight:1.6 }}>
                Free images from Wikimedia Commons & Wikipedia. No API key needed.
              </div>
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

          {/* Right: results grid */}
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
                <div style={{ fontSize:13, color:'var(--text2)', maxWidth:280, lineHeight:1.8 }}>
                  Enter a product name and search for free, high-quality images from Wikimedia Commons.
                </div>
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
                      position:'relative', background:'var(--bg3)', transition:'border-color 0.15s',
                      boxShadow: selected?.id===img.id ? '0 0 0 3px rgba(99,102,241,0.2)' : 'none',
                    }}>
                      <img src={img.thumb} alt={img.label} style={{ width:'100%', aspectRatio:'1', objectFit:'cover', display:'block' }} loading="lazy" onError={e => e.target.parentElement.style.display='none'} />
                      {selected?.id===img.id && (
                        <div style={{ position:'absolute', top:6, right:6, width:26, height:26, borderRadius:'50%', background:'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>✓</div>
                      )}
                      <div style={{ padding:'5px 8px', background:'#000000bb', position:'absolute', bottom:0, left:0, right:0 }}>
                        <div style={{ fontSize:10, color:'#ffffffcc', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>📷 {img.by}</div>
                      </div>
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
