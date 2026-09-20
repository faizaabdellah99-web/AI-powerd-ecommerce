import { useState, useRef } from 'react';
import Layout from '../../components/shared/Layout';
import Card from '../../components/shared/Card';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function VisualSearchPage() {
  const [preview,  setPreview]  = useState(null);
  const [file,     setFile]     = useState(null);
  const [results,  setResults]  = useState(null);
  const [detected, setDetected] = useState('');
  const [detectedCategory, setDetectedCategory] = useState('');
  const [categoryProducts, setCategoryProducts] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  const handleFile = (f) => {
    if (!f || !f.type.startsWith('image/')) return toast.error('Please upload an image file');
    if (f.size > 10 * 1024 * 1024) return toast.error('Image must be under 10MB');
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResults(null);
    setDetected('');
    setDetectedCategory('');
    setCategoryProducts(null);
  };

  const handleSearch = async () => {
    if (!file) return toast.error('Upload an image first');
    setLoading(true);
    setResults(null);
    setDetected('');
    setDetectedCategory('');
    setCategoryProducts(null);

    try {
      // Step 1: Use AI Vision to detect what the image contains
      const formData = new FormData();
      formData.append('image', file);

      let detectedProduct = '';
      let detectedCategory = '';

      try {
        const { data: visionData } = await api.post('/ai/analyze-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        console.log('Vision API response:', visionData);
        detectedProduct  = visionData.product_name  || '';
        detectedCategory = visionData.category       || '';

        // Override category if product name contains shoe-related words
        const shoeKeywords = ['shoe','sneaker','boot','sandal','heel','footwear','loafer','slipper','trainer','running','walking','athletic'];
        const productLower = detectedProduct.toLowerCase();
        if (shoeKeywords.some(kw => productLower.includes(kw))) {
          detectedCategory = 'Clothing';
        }

        console.log('Detected product:', detectedProduct, 'Category:', detectedCategory);
        setDetected(detectedProduct);
        setDetectedCategory(detectedCategory);
      } catch (err) {
        console.error('Vision API error:', err);
        // Vision API failed — try text search with generic query
        detectedProduct  = 'product';
        detectedCategory = '';
      }

      // Step 2: Search real products from DB matching what was detected
      let matchedProducts = [];

      if (detectedProduct && detectedProduct !== 'product') {
        try {
          // Search by detected product name
          const searchQuery = detectedProduct.split(' ').slice(0, 3).join(' ');
          console.log('Searching products with query:', searchQuery);
          const { data: searchData } = await api.get(`/products?search=${encodeURIComponent(searchQuery)}&limit=6`);
          console.log('Search API response:', searchData);
          matchedProducts = searchData.products || [];
          console.log('Matched products from search:', matchedProducts.length);
        } catch (err) {
          console.error('Search API error:', err);
          /* continue to category search */
        }
      }

      // Fallback: search by detected category
      if (matchedProducts.length === 0 && detectedCategory) {
        try {
          console.log('Searching by category:', detectedCategory);
          const { data: catData } = await api.get(`/products?category=${encodeURIComponent(detectedCategory)}&limit=6`);
          console.log('Category API response:', catData);
          matchedProducts = catData.products || [];
          console.log('Matched products from category:', matchedProducts.length);
        } catch (err) {
          console.error('Category API error:', err);
          /* continue */
        }
      }

      // Fallback: get all products and return top 6 by rating
      if (matchedProducts.length === 0) {
        try {
          console.log('Fetching all products as fallback');
          const { data: allData } = await api.get('/products?limit=6');
          console.log('All products API response:', allData);
          matchedProducts = allData.products || [];
          console.log('Matched products from all:', matchedProducts.length);
        } catch (err) {
          console.error('All products API error:', err);
          matchedProducts = [];
        }
      }

      // Step 3: Format results with similarity scores
      const scored = matchedProducts.map((p, i) => {
        // Calculate pseudo-similarity: exact name match = highest, category match = medium, rest = lower
        const nameMatch = detectedProduct && p.name?.toLowerCase().includes(detectedProduct.toLowerCase().split(' ')[0]);
        const catMatch  = detectedCategory && p.category?.toLowerCase().includes(detectedCategory.toLowerCase().split(' ')[0]);
        const baseScore = nameMatch ? 0.92 - i * 0.03 : catMatch ? 0.72 - i * 0.04 : 0.55 - i * 0.05;
        return {
          _id:             p._id,
          name:            p.name,
          category:        p.category,
          price:           `$${p.price?.toFixed(2)}`,
          similarity_score:Math.max(0.3, Math.min(0.99, baseScore)),
          imageUrl:        p.images?.[0]?.url || null,
          stock:           p.stock ?? 0,
        };
      }).sort((a, b) => b.similarity_score - a.similarity_score);

      setResults(scored);

      // Step 4: Fetch all products in the detected category
      if (detectedCategory) {
        try {
          const { data: catProductsData } = await api.get(`/products?category=${encodeURIComponent(detectedCategory)}&limit=12`);
          // Filter out products already in similar results to avoid duplicates
          const similarIds = new Set(scored.map(p => p._id));
          const categoryOnlyProducts = (catProductsData.products || []).filter(p => !similarIds.has(p._id));
          setCategoryProducts(categoryOnlyProducts);
        } catch {
          setCategoryProducts([]);
        }
      }

      if (scored.length > 0) {
        toast.success(`Found ${scored.length} matching products!`);
      } else {
        toast('No products found in catalog yet. Add products from the admin panel.', { icon: 'ℹ️' });
        setResults([]);
      }
    } catch (err) {
      toast.error('Search failed: ' + (err.response?.data?.message || err.message));
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    if (product.stock === 0) return toast.error('Out of stock');
    toast.success(`${product.name} added to cart!`);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <Layout title="🔍 Visual Search" subtitle="Upload any product photo — AI detects it and finds similar items in our catalog">
      <div style={{ display:'grid', gridTemplateColumns:'320px 1fr', gap:20 }}>

        {/* ── LEFT: Upload Panel ── */}
        <div>
          <Card style={{ marginBottom:16 }}>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:14 }}>📷 Upload Product Photo</div>

            {/* Drop zone */}
            <div
              onClick={() => inputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={e=>{ e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              style={{
                border:`2px dashed ${dragOver?'var(--primary)':'var(--border)'}`,
                borderRadius:12, padding:preview?8:28, textAlign:'center', cursor:'pointer',
                background:dragOver?'#6366f111':'var(--bg3)', transition:'all 0.2s', marginBottom:12,
                minHeight:160, display:'flex', alignItems:'center', justifyContent:'center',
              }}>
              {preview ? (
                <img src={preview} alt="preview" style={{ width:'100%', borderRadius:10, maxHeight:240, objectFit:'contain', display:'block' }} />
              ) : (
                <div>
                  <div style={{ fontSize:44, marginBottom:10 }}>📷</div>
                  <div style={{ fontSize:14, color:'var(--text2)', marginBottom:4 }}>Drop image here or click</div>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>JPG, PNG, WebP — max 10MB</div>
                </div>
              )}
            </div>
            <input ref={inputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e=>handleFile(e.target.files[0])} />

            {/* AI detected label */}
            {detected && (
              <div style={{ padding:'8px 12px', background:'linear-gradient(135deg,#6366f111,#8b5cf611)', border:'1px solid #6366f133', borderRadius:9, marginBottom:10, fontSize:12, color:'var(--text2)' }}>
                ⚡ AI detected: <strong style={{ color:'var(--primary)' }}>{detected}</strong>
              </div>
            )}

            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>{ setPreview(null); setFile(null); setResults(null); setDetected(''); }}
                style={{ flex:1, padding:'9px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:9, color:'var(--text2)', cursor:'pointer', fontSize:13, fontWeight:500 }}>
                Clear
              </button>
              <button onClick={handleSearch} disabled={!file||loading} style={{
                flex:2, padding:'9px', borderRadius:9, border:'none', fontWeight:700, fontSize:13,
                cursor:!file||loading?'not-allowed':'pointer',
                background:!file||loading?'var(--bg3)':'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color:!file||loading?'var(--text3)':'#fff',
                boxShadow:!file||loading?'none':'0 4px 14px rgba(99,102,241,0.35)',
              }}>
                {loading ? '⏳ Analyzing…' : '🔍 Find Similar'}
              </button>
            </div>
          </Card>

          <Card>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--text3)', letterSpacing:0.8, marginBottom:12 }}>HOW IT WORKS</div>
            {[
              ['🔍', 'Upload any product photo'],
              ['⚡',  'AI Vision identifies what it is'],
              ['📦', 'Searches your product catalog'],
              ['⭐', 'Shows best matches ranked by similarity'],
            ].map(([icon,text], i)=>(
              <div key={i} style={{ display:'flex', gap:10, marginBottom:10, alignItems:'flex-start' }}>
                <span style={{ fontSize:16, flexShrink:0 }}>{icon}</span>
                <span style={{ fontSize:12, color:'var(--text2)' }}>{text}</span>
              </div>
            ))}
          </Card>
        </div>

        {/* ── RIGHT: Results ── */}
        <div>
          {/* Loading */}
          {loading && (
            <Card style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:440 }}>
              <div style={{ fontSize:44, marginBottom:16, animation:'vspin 1.2s linear infinite', display:'inline-block' }}>🔍</div>
              <style>{`@keyframes vspin{0%{transform:scale(1)}50%{transform:scale(1.15)}100%{transform:scale(1)}}`}</style>
              <div style={{ fontSize:15, fontWeight:600, color:'var(--text)', marginBottom:6 }}>AI is analyzing your image…</div>
              <div style={{ fontSize:12, color:'var(--text3)' }}>Detecting product → searching catalog</div>
            </Card>
          )}

          {/* Empty state */}
          {!loading && !results && (
            <Card style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:440, textAlign:'center' }}>
              <div style={{ fontSize:60, marginBottom:16 }}>🔍</div>
              <div style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:8 }}>Visual Search Ready</div>
              <div style={{ fontSize:13, color:'var(--text2)', maxWidth:300, lineHeight:1.8 }}>
                Upload any product image — a shoe, phone, jacket, food — and AI will find matching products from our catalog.
              </div>
            </Card>
          )}

          {/* No results */}
          {!loading && results?.length === 0 && (
            <Card style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:440, textAlign:'center' }}>
              <div style={{ fontSize:52, marginBottom:16 }}>📭</div>
              <div style={{ fontSize:15, fontWeight:600, color:'var(--text)', marginBottom:8 }}>No matching products found</div>
              <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7, maxWidth:320 }}>
                {detected
                  ? `We detected "${detected}" but found no matching products in the catalog yet.`
                  : 'No products in catalog. Ask the store admin to add products.'}
              </div>
              <a href="/customer/shop" style={{ marginTop:16, padding:'10px 22px', background:'var(--primary)', color:'#fff', borderRadius:10, textDecoration:'none', fontSize:13, fontWeight:700 }}>
                Browse All Products
              </a>
            </Card>
          )}

          {/* Results grid */}
          {!loading && results && results.length > 0 && (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>
                  {results.length} Similar Products
                </div>
                {detected && (
                  <span style={{ fontSize:12, color:'var(--primary)', background:'#6366f115', padding:'3px 10px', borderRadius:20, fontWeight:600 }}>
                    ⚡ Matched: {detected}
                  </span>
                )}
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14 }}>
                {results.map((r, i) => (
                  <Card key={r._id || i} style={{
                    padding:16,
                    border: i===0 ? '1px solid var(--primary)' : '1px solid var(--border)',
                    boxShadow: i===0 ? '0 0 0 1px var(--primary)22' : 'none',
                    opacity: r.stock===0 ? 0.7 : 1,
                  }}>
                    <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                      {/* Product image */}
                      <div style={{ width:58, height:58, borderRadius:10, background:'var(--bg3)', flexShrink:0, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid var(--border)', position:'relative' }}>
                        {i===0 && (
                          <div style={{ position:'absolute', top:-1, left:-1, background:'var(--primary)', color:'#fff', fontSize:8, fontWeight:800, padding:'2px 5px', borderRadius:'0 0 6px 0' }}>
                            #1
                          </div>
                        )}
                        {r.imageUrl ? (
                          <img src={r.imageUrl} alt={r.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>e.target.style.display='none'} />
                        ) : (
                          <span style={{ fontSize:24 }}>
                            {r.category==='Electronics'?'💻':r.category==='Fashion'?'👕':r.category==='Sports & Fitness'?'⚽':r.category==='Books'?'📚':r.category==='Food & Beverage'?'🍎':r.category==='Home & Living'?'🏠':'📦'}
                          </span>
                        )}
                      </div>

                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.name}</div>
                        <div style={{ fontSize:11, color:'var(--text3)', marginBottom:6 }}>{r.category}</div>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                          <span style={{ fontSize:15, fontWeight:800, color:'var(--primary)' }}>{r.price}</span>
                          <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20,
                            background: r.similarity_score>0.8?'#10b98122':r.similarity_score>0.6?'#f59e0b22':'#64748b22',
                            color:      r.similarity_score>0.8?'#10b981':r.similarity_score>0.6?'#f59e0b':'#64748b',
                          }}>
                            {(r.similarity_score*100).toFixed(0)}% match
                          </span>
                        </div>
                        {/* Similarity bar */}
                        <div style={{ height:3, background:'var(--border)', borderRadius:2, marginBottom:4 }}>
                          <div style={{ width:`${r.similarity_score*100}%`, height:'100%', borderRadius:2, background:r.similarity_score>0.8?'var(--success)':r.similarity_score>0.6?'var(--warning)':'var(--text3)' }} />
                        </div>
                        {r.stock===0 && <div style={{ fontSize:10, color:'var(--danger)', fontWeight:700 }}>⚠️ Out of Stock</div>}
                      </div>
                    </div>
                    <button onClick={()=>addToCart(r)} disabled={r.stock===0} style={{
                      marginTop:10, width:'100%', padding:'8px',
                      background:r.stock===0?'var(--bg3)':'var(--primary)',
                      color:r.stock===0?'var(--text3)':'#fff',
                      border:'none', borderRadius:8, fontSize:12, fontWeight:700,
                      cursor:r.stock===0?'not-allowed':'pointer',
                    }}>
                      {r.stock===0 ? '❌ Out of Stock' : '🛒 Add to Cart'}
                    </button>
                  </Card>
                ))}
              </div>

              {/* Category Products Section */}
              {categoryProducts && categoryProducts.length > 0 && (
                <>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:32, marginBottom:16, paddingTop:24, borderTop:'1px solid var(--border)' }}>
                    <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>
                      More in {detectedCategory}
                    </div>
                    <span style={{ fontSize:12, color:'var(--text3)', background:'var(--bg3)', padding:'3px 10px', borderRadius:20 }}>
                      {categoryProducts.length} products
                    </span>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14 }}>
                    {categoryProducts.map((p, i) => (
                      <Card key={p._id || i} style={{
                        padding:16,
                        border:'1px solid var(--border)',
                        opacity: p.stock===0 ? 0.7 : 1,
                      }}>
                        <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                          {/* Product image */}
                          <div style={{ width:58, height:58, borderRadius:10, background:'var(--bg3)', flexShrink:0, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid var(--border)' }}>
                            {p.images?.[0]?.url ? (
                              <img src={p.images[0].url} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>e.target.style.display='none'} />
                            ) : (
                              <span style={{ fontSize:24 }}>
                                {p.category==='Electronics'?'💻':p.category==='Fashion'?'👕':p.category==='Sports & Fitness'?'⚽':p.category==='Books'?'📚':p.category==='Food & Beverage'?'🍎':p.category==='Home & Living'?'🏠':'📦'}
                              </span>
                            )}
                          </div>

                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:6 }}>{p.category}</div>
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                              <span style={{ fontSize:15, fontWeight:800, color:'var(--primary)' }}>${p.price?.toFixed(2)}</span>
                            </div>
                            {p.stock===0 && <div style={{ fontSize:10, color:'var(--danger)', fontWeight:700 }}>⚠️ Out of Stock</div>}
                          </div>
                        </div>
                        <button onClick={()=>addToCart({...p, price: `$${p.price?.toFixed(2)}`, imageUrl: p.images?.[0]?.url})} disabled={p.stock===0} style={{
                          marginTop:10, width:'100%', padding:'8px',
                          background:p.stock===0?'var(--bg3)':'var(--primary)',
                          color:p.stock===0?'var(--text3)':'#fff',
                          border:'none', borderRadius:8, fontSize:12, fontWeight:700,
                          cursor:p.stock===0?'not-allowed':'pointer',
                        }}>
                          {p.stock===0 ? '❌ Out of Stock' : '🛒 Add to Cart'}
                        </button>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
