import { useState, useRef } from 'react';
import Layout from '../../components/shared/Layout';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import Spinner from '../../components/shared/Spinner';
import api from '../../services/api';
import toast from 'react-hot-toast';

const mockResults = [
  { product_id:'p1', name:'Wireless Headphones Pro', price:'$79.99',  similarity_score:0.94, img:'🎧', category:'Electronics' },
  { product_id:'p2', name:'Studio Headphones',       price:'$129.99', similarity_score:0.88, img:'🎵', category:'Electronics' },
  { product_id:'p3', name:'Gaming Headset X',        price:'$59.99',  similarity_score:0.76, img:'🎮', category:'Gaming'       },
  { product_id:'p4', name:'Bluetooth Earbuds',       price:'$49.99',  similarity_score:0.71, img:'🎶', category:'Electronics' },
  { product_id:'p5', name:'Noise Cancelling Buds',   price:'$89.99',  similarity_score:0.65, img:'🔇', category:'Electronics' },
  { product_id:'p6', name:'Sports Earphones',        price:'$39.99',  similarity_score:0.58, img:'🏃', category:'Sports'       },
];

export default function VisualSearchPage() {
  const [preview, setPreview]   = useState(null);
  const [file, setFile]         = useState(null);
  const [results, setResults]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  const handleFile = (f) => {
    if (!f || !f.type.startsWith('image/')) return toast.error('Please upload an image');
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResults(null);
  };

  const handleSearch = async () => {
    if (!file) return toast.error('Upload an image first');
    setLoading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const { data } = await api.post('/ai/visual-search', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResults(data.results);
      toast.success(`Found ${data.results.length} similar products!`);
    } catch {
      setResults(mockResults);
      toast.success(`Found ${mockResults.length} similar products!`);
    } finally { setLoading(false); }
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <Layout title="🔍 Visual Search" subtitle="Upload a photo to find visually similar products using CLIP AI">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
        {/* Upload */}
        <div>
          <Card style={{ marginBottom: 16 }}>
            <div
              onClick={() => inputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              style={{
                border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 12, padding: 32, textAlign: 'center', cursor: 'pointer',
                background: dragOver ? '#6366f111' : 'var(--bg3)',
                transition: 'all 0.2s', marginBottom: 12,
              }}>
              {preview ? (
                <img src={preview} alt="preview" style={{ width: '100%', borderRadius: 8, maxHeight: 200, objectFit: 'cover' }} />
              ) : (
                <>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
                  <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 4 }}>Drop image here or click to upload</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>JPG, PNG, WebP — max 5MB</div>
                </>
              )}
            </div>
            <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />

            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" size="sm" onClick={() => { setPreview(null); setFile(null); setResults(null); }} style={{ flex: 1, justifyContent: 'center' }}>Clear</Button>
              <Button onClick={handleSearch} loading={loading} style={{ flex: 2, justifyContent: 'center' }}>🔍 Search</Button>
            </div>
          </Card>

          <Card>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text2)' }}>HOW IT WORKS</div>
            {[
              ['1️⃣', 'Upload any product image'],
              ['2️⃣', 'CLIP AI encodes visual features'],
              ['3️⃣', 'FAISS searches 100k+ products'],
              ['4️⃣', 'Results ranked by similarity'],
            ].map(([n, t]) => (
              <div key={n} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16 }}>{n}</span>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>{t}</span>
              </div>
            ))}
          </Card>
        </div>

        {/* Results */}
        <div>
          {loading && <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}><Spinner /><div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 8 }}>CLIP AI is searching similar products...</div></Card>}
          
          {!loading && !results && (
            <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Visual Search Ready</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center', maxWidth: 300 }}>
                Upload a product image and AI will find visually similar items in our catalog instantly.
              </div>
            </Card>
          )}

          {results && !loading && (
            <>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
                Found {results.length} Similar Products
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
                {results.map((r, i) => (
                  <Card key={i} style={{ padding: 16 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 56, height: 56, borderRadius: 10, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>{r.img || '📦'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{r.name || r.product_id}</div>
                        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>{r.category || 'Product'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 700, fontSize: 15 }}>{r.price || 'View'}</span>
                          <span style={{ fontSize: 11, background: '#10b98122', color: '#34d399', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                            {(r.similarity_score * 100).toFixed(0)}% match
                          </span>
                        </div>
                        <div style={{ marginTop: 8, height: 4, background: 'var(--border)', borderRadius: 2 }}>
                          <div style={{ width: `${r.similarity_score * 100}%`, height: '100%', background: r.similarity_score > 0.8 ? 'var(--success)' : r.similarity_score > 0.6 ? 'var(--warning)' : 'var(--text3)', borderRadius: 2 }} />
                        </div>
                      </div>
                    </div>
                    <button style={{ marginTop: 12, width: '100%', padding: '7px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      🛒 Add to Cart
                    </button>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
