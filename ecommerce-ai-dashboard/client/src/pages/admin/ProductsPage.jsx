import { useState, useEffect, useRef } from 'react';
import Layout from '../../components/shared/Layout';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import Badge from '../../components/shared/Badge';
import Spinner from '../../components/shared/Spinner';
import api from '../../services/api';
import toast from 'react-hot-toast';

const CATEGORIES = ['Electronics','Clothing','Home & Garden','Food & Beverage','Sports & Fitness','Beauty & Care','Books','Toys','Automotive','Health'];

export default function ProductsPage() {
  const [products,  setProducts]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editProd,  setEditProd]  = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const imageInputRef = useRef(null);
  const [form, setForm] = useState({
    name:'', category:'', price:'', stock:'', description:'',
    reorderPoint:'10', sizes:'', colors:'', brand:'', warranty:'',
    expiryDate:'', isPerishable:false,
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (catFilter) params.set('category', catFilter);
      if (search)    params.set('search', search);
      const { data } = await api.get(`/products?${params}&limit=100`);
      setProducts(data.products || []);
    } catch {
      setProducts([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, [catFilter]);

  const openCreate = () => {
    setEditProd(null);
    setImageFile(null);
    setImagePreview(null);
    setForm({ name:'', category:'', price:'', stock:'', description:'', reorderPoint:'10', sizes:'', colors:'', brand:'', warranty:'', expiryDate:'', isPerishable:false });
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditProd(p);
    setImageFile(null);
    setImagePreview(p.images?.[0]?.url || null);
    setForm({
      name:        p.name       || '',
      category:    p.category   || '',
      price:       p.price      || '',
      stock:       p.stock      || '',
      description: p.description|| '',
      brand:       p.brand      || '',
      warranty:    p.warranty   || '',
      reorderPoint:p.reorderPoint || '10',
      sizes:       (p.sizes||[]).join(', '),
      colors:      (p.colors||[]).join(', '),
      expiryDate:  p.expiryDate ? p.expiryDate.split('T')[0] : '',
      isPerishable:p.isPerishable || false,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.category || !form.price) return toast.error('Name, category and price are required');
    setSaving(true);
    try {
      let imageUrl = editProd?.images?.[0]?.url || null;

      // Convert image to base64 if a new file was selected
      if (imageFile) {
        imageUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(imageFile);
        });
      }

      const body = {
        name:        form.name,
        category:    form.category,
        price:       +form.price,
        stock:       +form.stock || 0,
        reorderPoint:+form.reorderPoint || 10,
        description: form.description,
        brand:       form.brand,
        warranty:    form.warranty,
        sizes:       form.sizes  ? form.sizes.split(',').map(s=>s.trim()).filter(Boolean)  : [],
        colors:      form.colors ? form.colors.split(',').map(s=>s.trim()).filter(Boolean) : [],
        expiryDate:  form.expiryDate || null,
        isPerishable:form.isPerishable,
        isActive:    true,
        images:      imageUrl ? [{ url: imageUrl }] : (editProd?.images || []),
      };

      if (editProd) {
        const { data } = await api.put(`/products/${editProd._id}`, body);
        setProducts(prev => prev.map(p => p._id === editProd._id ? data : p));
        toast.success('Product updated!');
      } else {
        const { data } = await api.post('/products', body);
        setProducts(prev => [data, ...prev]);
        toast.success('Product created — visible in Shop!');
      }
      setShowModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const toggleActive = async (p) => {
    try {
      const { data } = await api.put(`/products/${p._id}`, { isActive: !p.isActive });
      setProducts(prev => prev.map(x => x._id === p._id ? data : x));
      toast.success(`Product ${data.isActive ? 'activated' : 'deactivated'}`);
    } catch { toast.error('Update failed'); }
  };

  const deleteProduct = async (p) => {
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    try {
      await api.delete(`/products/${p._id}`);
      setProducts(prev => prev.filter(x => x._id !== p._id));
      toast.success('Product deleted');
    } catch { toast.error('Delete failed'); }
  };

  const filtered = products.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase())
  );

  const isFood = form.category === 'Food & Beverage';
  const isClothing = ['Clothing','Sports & Fitness'].includes(form.category);
  const isElectronics = ['Electronics','Automotive'].includes(form.category);

  return (
    <Layout title="🏷️ Products" subtitle="Manage your product catalog — changes appear instantly in the Shop">

      {/* Toolbar */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        <input placeholder="🔍 Search products…" value={search}
          onChange={e=>setSearch(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&fetchProducts()}
          style={{ width:260 }} />
        <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{ width:200 }}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c=><option key={c}>{c}</option>)}
        </select>
        <button onClick={fetchProducts} style={{ padding:'9px 14px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:9, color:'var(--text2)', cursor:'pointer', fontSize:13 }}>
          🔄 Refresh
        </button>
        <Button onClick={openCreate} style={{ marginLeft:'auto' }}>+ Add Product</Button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        {[
          ['Total Products', products.length,                          'var(--primary)'],
          ['Active',         products.filter(p=>p.isActive).length,   'var(--success)'],
          ['Low Stock',      products.filter(p=>p.stock>0&&p.stock<10).length, 'var(--warning)'],
          ['Out of Stock',   products.filter(p=>p.stock===0).length,  'var(--danger)'],
        ].map(([l,v,c])=>(
          <div key={l} style={{ background:'var(--card)', border:`1px solid ${c}33`, borderRadius:12, padding:'12px 16px' }}>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:4 }}>{l}</div>
            <div style={{ fontSize:20, fontWeight:800, color:c }}>{v}</div>
          </div>
        ))}
      </div>

      <Card style={{ padding:0, overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:60, textAlign:'center' }}><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:60, textAlign:'center', color:'var(--text3)' }}>
            <div style={{ fontSize:44, marginBottom:12 }}>📦</div>
            <div style={{ fontSize:15, fontWeight:600, color:'var(--text2)', marginBottom:8 }}>No products yet</div>
            <div style={{ fontSize:13, marginBottom:16 }}>Add your first product and it will appear in the customer Shop.</div>
            <Button onClick={openCreate}>+ Add First Product</Button>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)', background:'var(--bg3)' }}>
                {['Product','Category','Price','Stock','Status','Actions'].map(h=>(
                  <th key={h} style={{ textAlign:'left', padding:'10px 12px', fontSize:11, color:'var(--text3)', fontWeight:600, letterSpacing:0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p=>(
                <tr key={p._id} style={{ borderBottom:'1px solid var(--border)', transition:'background 0.1s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--bg3)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'13px 12px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      {/* Product thumbnail */}
                      <div style={{ width:44, height:44, borderRadius:8, background:'var(--bg3)', flexShrink:0, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {p.images?.[0]?.url ? (
                          <img src={p.images[0].url} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>e.target.style.display='none'} />
                        ) : (
                          <span style={{ fontSize:20 }}>
                            {p.category==='Electronics'?'💻':p.category==='Clothing'?'👕':p.category==='Food & Beverage'?'🍎':p.category==='Sports & Fitness'?'⚽':p.category==='Books'?'📚':p.category==='Home & Garden'?'🏠':'📦'}
                          </span>
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:14, color:'var(--text)', marginBottom:2 }}>{p.name}</div>
                        {p.description && <div style={{ fontSize:11, color:'var(--text3)', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.description}</div>}
                        {p.brand && <div style={{ fontSize:10, color:'var(--primary)', marginTop:1 }}>{p.brand}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:'13px 12px', fontSize:13, color:'var(--text2)' }}>{p.category}</td>
                  <td style={{ padding:'13px 12px', fontSize:14, fontWeight:700, color:'var(--text)' }}>${p.price?.toFixed(2)}</td>
                  <td style={{ padding:'13px 12px' }}>
                    <span style={{ fontSize:14, fontWeight:600, color: p.stock===0?'var(--danger)': p.stock<10?'var(--warning)':'var(--text)' }}>
                      {p.stock===0 ? '⚠️ Out of stock' : p.stock}
                    </span>
                    {p.expiryDate && (
                      <div style={{ fontSize:10, color:'var(--warning)', marginTop:2 }}>
                        ⏰ Exp: {new Date(p.expiryDate).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td style={{ padding:'13px 12px' }}>
                    <Badge color={p.isActive?'success':'danger'}>{p.isActive?'Active':'Inactive'}</Badge>
                  </td>
                  <td style={{ padding:'13px 12px' }}>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={()=>openEdit(p)} style={{ padding:'5px 12px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:7, color:'var(--text2)', fontSize:12, cursor:'pointer', fontWeight:500 }}>Edit</button>
                      <button onClick={()=>toggleActive(p)} style={{ padding:'5px 12px', background:'transparent', border:`1px solid ${p.isActive?'var(--warning)':'var(--success)'}`, borderRadius:7, color:p.isActive?'var(--warning)':'var(--success)', fontSize:12, cursor:'pointer', fontWeight:500 }}>
                        {p.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={()=>deleteProduct(p)} style={{ padding:'5px 10px', background:'transparent', border:'1px solid var(--danger)', borderRadius:7, color:'var(--danger)', fontSize:12, cursor:'pointer' }}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* ── Add/Edit Modal ── */}
      {showModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }} onClick={()=>setShowModal(false)}>
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:18, padding:28, width:520, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }} onClick={e=>e.stopPropagation()}>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
              <div>
                <div style={{ fontSize:17, fontWeight:700 }}>{editProd ? 'Edit Product' : '+ Add New Product'}</div>
                <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>Saved products appear instantly in the customer Shop</div>
              </div>
              <button onClick={()=>setShowModal(false)} style={{ background:'var(--bg3)', border:'none', borderRadius:8, padding:'6px 12px', color:'var(--text2)', cursor:'pointer', fontSize:18 }}>✕</button>
            </div>

            {/* Image Upload */}
            <div style={{ gridColumn:'1/-1', marginBottom:4 }}>
              <label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:5, fontWeight:500 }}>Product Image</label>
              <div
                onClick={() => imageInputRef.current?.click()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); } }}
                onDragOver={e => e.preventDefault()}
                style={{
                  border:'2px dashed var(--border)', borderRadius:12, padding: imagePreview ? 8 : 24,
                  textAlign:'center', cursor:'pointer', background:'var(--bg3)', transition:'border-color 0.15s',
                }}
                onMouseEnter={e=>e.currentTarget.style.borderColor='var(--primary)'}
                onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}
              >
                {imagePreview ? (
                  <div style={{ position:'relative', display:'inline-block' }}>
                    <img src={imagePreview} alt="preview"
                      style={{ maxHeight:160, maxWidth:'100%', borderRadius:9, objectFit:'contain', display:'block' }}
                      onError={e=>{ e.target.style.display='none'; }}
                    />
                    <button
                      type="button"
                      onClick={e=>{ e.stopPropagation(); setImageFile(null); setImagePreview(null); }}
                      style={{ position:'absolute', top:-8, right:-8, width:24, height:24, borderRadius:'50%', background:'var(--danger)', border:'none', color:'#fff', cursor:'pointer', fontSize:14, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}
                    >✕</button>
                    <div style={{ marginTop:8, fontSize:11, color:'var(--text3)' }}>Click to change image</div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize:36, marginBottom:8 }}>🖼️</div>
                    <div style={{ fontSize:13, color:'var(--text2)', marginBottom:4 }}>Click or drag & drop to upload image</div>
                    <div style={{ fontSize:11, color:'var(--text3)' }}>JPG, PNG, WebP — max 5MB</div>
                  </>
                )}
              </div>
              <input ref={imageInputRef} type="file" accept="image/*" style={{ display:'none' }}
                onChange={e => {
                  const f = e.target.files[0];
                  if (!f) return;
                  if (f.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
                  setImageFile(f);
                  setImagePreview(URL.createObjectURL(f));
                }}
              />
            </div>

            {/* Base fields */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              {[['Product Name *','name','text'],['Price ($) *','price','number'],['Stock Qty','stock','number'],['Reorder Point','reorderPoint','number']].map(([l,k,t])=>(
                <div key={k} style={{ gridColumn: k==='name'?'1/-1':'auto' }}>
                  <label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:5, fontWeight:500 }}>{l}</label>
                  <input type={t} value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} />
                </div>
              ))}
              <div style={{ gridColumn:'1/-1' }}>
                <label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:5, fontWeight:500 }}>Category *</label>
                <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
                  <option value="">Select category…</option>
                  {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:5, fontWeight:500 }}>Description</label>
                <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={2} style={{ resize:'vertical' }} placeholder="Short product description…" />
              </div>
            </div>

            {/* Category-specific fields */}
            {isFood && (
              <div style={{ marginTop:14, padding:14, background:'#f59e0b11', border:'1px solid #f59e0b33', borderRadius:10 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#f59e0b', marginBottom:10 }}>🍎 Food & Beverage Fields</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div>
                    <label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:5 }}>Expiry Date</label>
                    <input type="date" value={form.expiryDate} onChange={e=>setForm(p=>({...p,expiryDate:e.target.value}))} />
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, paddingTop:20 }}>
                    <input type="checkbox" id="perish" checked={form.isPerishable} onChange={e=>setForm(p=>({...p,isPerishable:e.target.checked}))} style={{ width:16, height:16 }} />
                    <label htmlFor="perish" style={{ fontSize:13, color:'var(--text2)', cursor:'pointer' }}>Perishable item</label>
                  </div>
                </div>
              </div>
            )}

            {isElectronics && (
              <div style={{ marginTop:14, padding:14, background:'#6366f111', border:'1px solid #6366f133', borderRadius:10 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#6366f1', marginBottom:10 }}>💻 Electronics Fields</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div>
                    <label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:5 }}>Brand</label>
                    <input placeholder="e.g. Samsung, Apple" value={form.brand} onChange={e=>setForm(p=>({...p,brand:e.target.value}))} />
                  </div>
                  <div>
                    <label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:5 }}>Warranty</label>
                    <input placeholder="e.g. 1 year" value={form.warranty} onChange={e=>setForm(p=>({...p,warranty:e.target.value}))} />
                  </div>
                </div>
              </div>
            )}

            {isClothing && (
              <div style={{ marginTop:14, padding:14, background:'#10b98111', border:'1px solid #10b98133', borderRadius:10 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#10b981', marginBottom:10 }}>👕 Clothing Fields</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div>
                    <label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:5 }}>Sizes (comma-separated)</label>
                    <input placeholder="S, M, L, XL, XXL" value={form.sizes} onChange={e=>setForm(p=>({...p,sizes:e.target.value}))} />
                  </div>
                  <div>
                    <label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:5 }}>Colors (comma-separated)</label>
                    <input placeholder="Black, White, Red" value={form.colors} onChange={e=>setForm(p=>({...p,colors:e.target.value}))} />
                  </div>
                </div>
              </div>
            )}

            <div style={{ display:'flex', gap:10, marginTop:22 }}>
              <button onClick={()=>setShowModal(false)} style={{ flex:1, padding:12, background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text2)', cursor:'pointer', fontWeight:600, fontSize:14 }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{
                flex:2, padding:12, background: saving?'var(--bg3)':'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color: saving?'var(--text3)':'#fff', border:'none', borderRadius:10,
                fontWeight:700, fontSize:14, cursor:saving?'not-allowed':'pointer',
              }}>
                {saving ? '⏳ Saving…' : editProd ? '✓ Update Product' : '✦ Create Product'}
              </button>
            </div>

            <div style={{ marginTop:12, fontSize:11, color:'var(--text3)', textAlign:'center', lineHeight:1.6 }}>
              ✦ Products are visible in the customer Shop immediately after saving
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
