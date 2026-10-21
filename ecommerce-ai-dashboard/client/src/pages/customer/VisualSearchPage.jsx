import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/shared/Layout';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import Spinner from '../../components/shared/Spinner';
import ProductImage from '../../components/shared/ProductImage';
import api from '../../services/api';
import toast from 'react-hot-toast';

const SAMPLE_ITEMS = [
  { label: '🎧 Headphones', category: 'Electronics', query: 'wireless_headphones.jpg', emoji: '🎧' },
  { label: '� Smartphone', category: 'Electronics', query: 'smartphone_phone.jpg', emoji: '�' },
  { label: '💻 Laptop', category: 'Electronics', query: 'laptop_computer.jpg', emoji: '💻' },
  { label: '� TV', category: 'Electronics', query: 'television_tv.jpg', emoji: '�' },
  { label: '� Gaming Console', category: 'Electronics', query: 'gaming_console.jpg', emoji: '�' },
  { label: '🎧 Earbuds', category: 'Electronics', query: 'wireless_earbuds.jpg', emoji: '🎧' },
];

// Helper to create sample image canvas for instant testing
function createSampleImageBlob(text, emoji, callback) {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 400, 400);
  ctx.font = '100px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 200, 180);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(text, 200, 290);
  canvas.toBlob(blob => {
    callback(blob);
  }, 'image/jpeg');
}

// Detect category hints from filename if user kept a meaningful product filename
function getFilenameCategoryHint(fileName) {
  const nameLower = (fileName || '')
    .toLowerCase()
    .replace(/[-_.]/g, ' ')
    .replace(/\b(camera|photo|image|img|pic|picture|screenshot|capture|download|whatsapp|file|upload|jpg|jpeg|png|webp)\b/g, '')
    .trim();

  if (!nameLower || /^\d+$/.test(nameLower)) return null;

  if (/\b(?:shoe|sneaker|boot|sandal|coat|jacket|hoodie|jean|denim|dress|shirt|wear|pant|cloth|wallet|sunglass|fashion|apparel|heel|loafer)s?\b/i.test(nameLower)) {
    return 'Fashion';
  }
  if (/\b(?:phone|laptop|macbook|computer|keyboard|mouse|headphone|earbud|screen|cable|tech|electronic|charger|gadget|airpod)s?\b/i.test(nameLower)) {
    return 'Electronics';
  }
  if (/\b(?:food|drink|milk|coffee|juice|tea|oil|honey|snack|yoghurt|grocery|bottle|fruit|beverage|apple|banana|pizza|bread)s?\b/i.test(nameLower)) {
    return 'Food & Beverage';
  }
  if (/\b(?:gym|sport|fitness|dumbbell|weight|yoga|racket|tennis|workout|running|jump|ball)s?\b/i.test(nameLower)) {
    return 'Sports & Fitness';
  }
  if (/\b(?:book|read|novel|habits|code|sapiens|page|library|paper|clean code|author|textbook)s?\b/i.test(nameLower)) {
    return 'Books';
  }
  if (/\b(?:pillow|candle|knife|board|purifier|living|home|chair|table|herb|garden|lamp|mug|cup)s?\b/i.test(nameLower)) {
    return 'Home & Living';
  }
  if (/\b(?:serum|shampoo|lotion|cream|beauty|cosmetic|care|skincare|perfume|soap)s?\b/i.test(nameLower)) {
    return 'Beauty & Care';
  }
  if (/\b(?:toy|lego|doll|game|kitty|plush|puppet)s?\b/i.test(nameLower)) {
    return 'Toys';
  }
  return null;
}

export default function VisualSearchPage() {
  const navigate = useNavigate();
  const [preview, setPreview]             = useState(null);
  const [file, setFile]                   = useState(null);
  const [results, setResults]             = useState(null);
  const [loading, setLoading]             = useState(false);
  const [dragOver, setDragOver]           = useState(false);
  const [activeQuery, setActiveQuery]     = useState('');
  const [detectedCategory, setDetectedCategory] = useState(null);
  const [cart, setCart]                   = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('customer_cart') || '{}');
    } catch { return {}; }
  });
  const inputRef = useRef();

  // Automatic search function powered by AI Vision
  const searchWithFile = async (f, explicitCategory = '', queryHint = '', isExplicit = false) => {
    if (!f) return;
    setLoading(true);

    // If explicit category chosen (by sample click or category filter button), set it
    if (isExplicit && explicitCategory && explicitCategory !== 'All' && explicitCategory !== 'All Categories') {
      setDetectedCategory(explicitCategory);
    } else if (!isExplicit) {
      setDetectedCategory(null); // Clear until AI identifies the image
    }

    setActiveQuery(queryHint || f.name || 'Uploaded photo');

    try {
      const form = new FormData();
      form.append('image', f, f.name || 'image.jpg');

      if (isExplicit && explicitCategory && explicitCategory !== 'All' && explicitCategory !== 'All Categories') {
        form.append('category_hint', explicitCategory);
        form.append('is_explicit_hint', 'true');
      } else {
        // Check if filename has a specific hint
        const fileHint = getFilenameCategoryHint(f.name);
        if (fileHint) {
          form.append('category_hint', fileHint);
        }
      }

      const { data } = await api.post('/ai/visual-search', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 20000,
      });

      if (data && data.results && data.results.length > 0) {
        setResults(data.results);
        const resolvedCategory = data.detected_category || explicitCategory || 'General';
        setDetectedCategory(resolvedCategory);
        const labelText = data.top_label && data.top_label !== resolvedCategory ? ` (${data.top_label})` : '';
        toast.success(`✨ Identified as ${resolvedCategory}${labelText}! Found ${data.results.length} similar products.`);
      } else {
        toast.error('No matching products found in catalog');
      }
    } catch (err) {
      console.warn('Visual search API error:', err.message);
      toast.error('Could not complete visual search');
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (f) => {
    if (!f || !f.type.startsWith('image/')) {
      return toast.error('Please upload an image file (JPG, PNG, WebP)');
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setDetectedCategory(null);
    setResults(null);

    // Automatically analyze image and find matching products via AI
    searchWithFile(f, '', '', false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSampleClick = (item) => {
    createSampleImageBlob(item.label, item.emoji, (blob) => {
      const sampleFile = new File([blob], item.query, { type: 'image/jpeg' });
      setFile(sampleFile);
      setPreview(URL.createObjectURL(sampleFile));
      searchWithFile(sampleFile, item.category, item.label, true);
    });
  };

  const handleAddToCart = (product) => {
    const id = product.product_id || product._id || product.name;
    const priceNum = typeof product.rawPrice === 'number'
      ? product.rawPrice
      : parseFloat(String(product.price).replace(/[^0-9.]/g, '')) || 0;

    const cartItem = {
      id,
      name: product.name,
      category: product.category,
      price: priceNum,
      qty: (cart[id]?.qty || 0) + 1,
    };

    const nextCart = { ...cart, [id]: cartItem };
    setCart(nextCart);
    try {
      localStorage.setItem('customer_cart', JSON.stringify(nextCart));
    } catch { /* ignore */ }
    toast.success(`${product.name} added to cart!`);
  };

  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((s, i) => s + (Number(i.qty) || 1), 0);

  return (
    <Layout title="🔍 Visual Search" subtitle="Upload any product photo — AI automatically identifies the item and brings matching products">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(330px, 1fr) 2fr', gap: 20 }}>
        {/* Upload Column */}
        <div>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Upload Image</span>
              {detectedCategory && (
                <span style={{
                  fontSize: 12,
                  background: 'var(--primary)',
                  color: '#fff',
                  padding: '3px 10px',
                  borderRadius: 14,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  ✨ AI Detected: {detectedCategory}
                </span>
              )}
            </div>

            <div
              onClick={() => inputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              style={{
                border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 12,
                padding: preview ? 12 : 32,
                textAlign: 'center',
                cursor: 'pointer',
                background: dragOver ? '#6366f115' : 'var(--bg3)',
                transition: 'all 0.2s',
                marginBottom: 14,
                position: 'relative',
              }}>
              {preview ? (
                <div>
                  <img
                    src={preview}
                    alt="preview"
                    style={{
                      width: '100%',
                      borderRadius: 8,
                      maxHeight: 220,
                      objectFit: 'contain',
                      background: '#00000022',
                    }}
                  />
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text2)' }}>
                    Click or drop another image to replace
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 44, marginBottom: 10 }}>📷</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)', marginBottom: 4 }}>
                    Drop product photo here
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>
                    or click to browse from device
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                    AI automatically analyzes the photo and finds similar products
                  </div>
                </>
              )}
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
            />

            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setPreview(null);
                  setFile(null);
                  setResults(null);
                  setActiveQuery('');
                  setDetectedCategory(null);
                }}
                style={{ flex: 1, justifyContent: 'center' }}>
                Clear
              </Button>
              <Button
                onClick={() => {
                  if (!file) return toast.error('Upload an image first');
                  searchWithFile(file, '', '', false);
                }}
                loading={loading}
                disabled={!file}
                style={{ flex: 2, justifyContent: 'center' }}>
                🔍 Re-Analyze
              </Button>
            </div>

            {/* Quick Sample Photos */}
            <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>
                Or test with sample items:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {SAMPLE_ITEMS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSampleClick(item)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 16,
                      fontSize: 11,
                      background: 'var(--bg2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text1)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {cartCount > 0 && (
            <Card style={{ marginBottom: 16, background: '#6366f111', borderColor: 'var(--primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>🛒 Cart ({cartCount} items)</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>Ready for checkout</div>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate('/customer/checkout', { state: { cartItems: Object.values(cart) } })}>
                  Checkout →
                </Button>
              </div>
            </Card>
          )}

          <Card>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text2)' }}>
              HOW AI VISUAL SEARCH WORKS
            </div>
            {[
              ['🎯', 'Visual Understanding', 'AI analyzes image pixels, colors, and shapes directly'],
              ['🏷️', 'Automatic Classification', 'Automatically detects the product category without asking you'],
              ['📦', 'Catalog Matching', 'Pulls similar real items from inventory with match %'],
              ['🛒', '1-Click Add to Cart', 'Easily purchase discovered items immediately'],
            ].map(([icon, title, desc]) => (
              <div key={title} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16, lineHeight: 1.2 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{desc}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* Results Column */}
        <div>
          {loading && (
            <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
              <Spinner />
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 14 }}>
                Understanding Image with AI...
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
                Analyzing visual features and identifying the correct category
              </div>
            </Card>
          )}

          {!loading && !results && (
            <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Visual Search Ready</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center', maxWidth: 360, lineHeight: 1.5 }}>
                Upload any product photo (clothes, shoes, tech, books, food, etc.). The AI automatically understands the image and immediately displays similar products.
              </div>
            </Card>
          )}

          {results && !loading && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>
                    Found {results.length} Similar Products
                  </span>
                  {detectedCategory && (
                    <span style={{
                      fontSize: 12,
                      background: '#10b98122',
                      color: '#10b981',
                      padding: '3px 10px',
                      borderRadius: 12,
                      marginLeft: 8,
                      fontWeight: 600,
                    }}>
                      ✨ Category: {detectedCategory}
                    </span>
                  )}
                  {activeQuery && (
                    <span style={{ fontSize: 13, color: 'var(--text2)', marginLeft: 8 }}>
                      for “{activeQuery}”
                    </span>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/customer/shop')}>
                  Browse All Shop →
                </Button>
              </div>

              {/* Category Filter Pills */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                {['All', 'Fashion', 'Electronics', 'Food & Beverage', 'Sports & Fitness', 'Books', 'Home & Living', 'Beauty & Care', 'Toys'].map(cat => {
                  const isSelected = (cat === 'All' && !detectedCategory) || detectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        if (!file) return;
                        if (cat === 'All') {
                          searchWithFile(file, '', '', false);
                        } else {
                          searchWithFile(file, cat, activeQuery, true);
                        }
                      }}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 16,
                        fontSize: 12,
                        fontWeight: isSelected ? 700 : 500,
                        background: isSelected ? 'var(--primary)' : 'var(--bg2)',
                        color: isSelected ? '#fff' : 'var(--text2)',
                        border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                        cursor: file ? 'pointer' : 'default',
                        transition: 'all 0.15s',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}>
                      {cat} {isSelected && detectedCategory === cat ? '✨' : ''}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                {results.map((r, i) => {
                  const score = typeof r.similarity_score === 'number' ? r.similarity_score : 0.85;
                  const matchPercent = Math.round(score * 100);
                  const isHighMatch = matchPercent >= 85;
                  const isMediumMatch = matchPercent >= 70;

                  return (
                    <Card key={r.product_id || i} style={{ padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                          <ProductImage
                            name={r.name}
                            category={r.category}
                            size={64}
                            borderRadius={10}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: 14,
                                marginBottom: 4,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              title={r.name}>
                              {r.name || 'Product'}
                            </div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                              <span style={{ fontSize: 11, background: 'var(--bg2)', padding: '2px 6px', borderRadius: 4, color: 'var(--text2)' }}>
                                {r.category || 'General'}
                              </span>
                              {r.stock !== undefined && (
                                <span style={{ fontSize: 11, color: r.stock > 0 ? '#10b981' : '#ef4444' }}>
                                  {r.stock > 0 ? `${r.stock} in stock` : 'Out of stock'}
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text1)' }}>
                                {r.price || (r.rawPrice ? `$${Number(r.rawPrice).toFixed(2)}` : 'View')}
                              </span>
                              <span style={{
                                fontSize: 11,
                                background: isHighMatch ? '#10b98122' : isMediumMatch ? '#f59e0b22' : '#6366f122',
                                color: isHighMatch ? '#34d399' : isMediumMatch ? '#fbbf24' : '#818cf8',
                                padding: '2px 8px',
                                borderRadius: 20,
                                fontWeight: 700,
                              }}>
                                {matchPercent}% match
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Match Bar */}
                        <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
                          <div
                            style={{
                              width: `${matchPercent}%`,
                              height: '100%',
                              background: isHighMatch ? 'var(--success)' : isMediumMatch ? 'var(--warning)' : 'var(--primary)',
                              borderRadius: 2,
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </div>

                        {r.description && (
                          <div style={{
                            fontSize: 12,
                            color: 'var(--text3)',
                            marginBottom: 10,
                            lineHeight: 1.4,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}>
                            {r.description}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button
                          type="button"
                          onClick={() => handleAddToCart(r)}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            background: 'var(--primary)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            transition: 'opacity 0.2s',
                          }}>
                          🛒 Add to Cart
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
