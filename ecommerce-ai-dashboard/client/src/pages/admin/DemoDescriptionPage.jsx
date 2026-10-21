import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout';
import Card from '../../components/shared/Card';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function DemoDescriptionPage() {
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [keyFeatures, setKeyFeatures] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [similarProducts, setSimilarProducts] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  // Fetch similar products when category changes
  useEffect(() => {
    if (category) {
      fetchSimilarProducts();
    } else {
      setSimilarProducts([]);
    }
  }, [category]);

  const fetchSimilarProducts = async () => {
    if (!category) return;
    
    setLoadingSimilar(true);
    try {
      const { data } = await api.get(`/products?category=${encodeURIComponent(category)}&limit=5`);
      setSimilarProducts(data.products || []);
    } catch (err) {
      console.error('Error fetching similar products:', err);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const useProductTemplate = (product) => {
    setProductName(product.name);
    setCategory(product.category);
    setGeneratedDescription(product.description || '');
    toast.success('Product template loaded!');
  };

  const generateDescription = async () => {
    if (!productName || !category) {
      toast.error('Please enter product name and category');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/ai/generate-description', {
        product_name: productName,
        category: category,
        key_features: keyFeatures ? keyFeatures.split(',').map(f => f.trim()) : [],
        target_audience: targetAudience || 'General customers',
        tone: 'professional',
      });

      // Use the long_description from the AI response
      const description = data.long_description || data.short_description || '';
      setGeneratedDescription(description);
      toast.success('Description generated successfully!');
    } catch (err) {
      console.error('Description generation error:', err);
      toast.error('Failed to generate description. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedDescription);
    toast.success('Description copied to clipboard!');
  };

  return (
    <Layout title="Demo Description Generator" subtitle="AI-powered product descriptions">
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Input Form */}
        <Card style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            Product Information
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                Product Name *
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g., Wireless Bluetooth Headphones"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg3)',
                  color: 'var(--text)',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg3)',
                  color: 'var(--text)',
                  fontSize: 14,
                  outline: 'none',
                }}
              >
                <option value="">Select a category</option>
                <option value="Electronics">Electronics</option>
                <option value="Clothing">Clothing</option>
                <option value="Home & Garden">Home & Garden</option>
                <option value="Sports & Fitness">Sports & Fitness</option>
                <option value="Books">Books</option>
                <option value="Beauty & Care">Beauty & Care</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                Key Features (Optional)
              </label>
              <textarea
                value={keyFeatures}
                onChange={(e) => setKeyFeatures(e.target.value)}
                placeholder="e.g., Noise cancellation, 30-hour battery life, Bluetooth 5.0"
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg3)',
                  color: 'var(--text)',
                  fontSize: 14,
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                Target Audience (Optional)
              </label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g., Music enthusiasts, commuters, professionals"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg3)',
                  color: 'var(--text)',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>

            <button
              onClick={generateDescription}
              disabled={loading}
              style={{
                padding: '12px 24px',
                borderRadius: 10,
                border: 'none',
                fontWeight: 700,
                fontSize: 14,
                cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? 'var(--bg3)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color: loading ? 'var(--text3)' : '#fff',
                transition: 'all 0.2s',
              }}
            >
              {loading ? '⏳ Generating...' : '✨ Generate Description'}
            </button>
          </div>
        </Card>

        {/* Similar Products from Database */}
        {similarProducts.length > 0 && (
          <Card>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
              Similar Products in Database
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {similarProducts.map((product) => (
                <div
                  key={product._id}
                  onClick={() => useProductTemplate(product)}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--bg3)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.background = 'var(--bg4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.background = 'var(--bg3)';
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                    {product.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>
                    {product.category} • ${product.price}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.5 }}>
                    {product.description || 'No description available'}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Generated Description */}
        {generatedDescription && (
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Generated Description</div>
              <button
                onClick={copyToClipboard}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer',
                  background: 'transparent',
                  color: 'var(--text2)',
                }}
              >
                📋 Copy
              </button>
            </div>
            <div
              style={{
                padding: 16,
                borderRadius: 8,
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                fontSize: 14,
                lineHeight: 1.8,
                color: 'var(--text)',
              }}
            >
              {generatedDescription}
            </div>
          </Card>
        )}

        {/* Info Section */}
        {!generatedDescription && (
          <Card>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>How it works</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 24 }}>1️⃣</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                    Enter product details
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                    Provide the product name, category, and optional features
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 24 }}>2️⃣</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                    AI generates description
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                    Our AI creates compelling, benefit-focused descriptions
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 24 }}>3️⃣</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                    Copy and use
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                    Copy the generated description to your product listings
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
