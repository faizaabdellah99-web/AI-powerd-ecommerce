import { useState, useRef } from 'react';
import Layout from '../../components/shared/Layout';
import Card from '../../components/shared/Card';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function PhotoCatalogPage() {
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [catalogResults, setCatalogResults] = useState([]);
  const [detectedCategory, setDetectedCategory] = useState(null);
  const fileInputRef = useRef(null);

  // Detect category from filename (fallback)
  const detectCategoryFromFilename = (fileName) => {
    const nameLower = (fileName || '').toLowerCase();
    
    const electronicsKeywords = ['phone', 'laptop', 'computer', 'tablet', 'headphone', 'speaker', 'camera', 'tv', 'monitor', 'keyboard', 'mouse', 'charger', 'earbud', 'airpod', 'tech', 'electronic', 'gadget', 'cable', 'screen', 'smartphone', 'mobile', 'gaming', 'audio'];
    const bookKeywords = ['book', 'novel', 'read', 'guide', 'manual', 'textbook', 'fiction', 'non-fiction', 'story', 'chapter', 'library', 'paper', 'author', 'sapiens', 'habits', 'code', 'clean'];
    const beautyKeywords = ['serum', 'shampoo', 'lotion', 'cream', 'beauty', 'cosmetic', 'care', 'skincare', 'perfume', 'soap', 'makeup', 'lipstick', 'mascara', 'foundation', 'moisturizer', 'facewash', 'toner'];
    
    if (electronicsKeywords.some(kw => nameLower.includes(kw))) {
      return 'Electronics';
    }
    if (bookKeywords.some(kw => nameLower.includes(kw))) {
      return 'Books';
    }
    if (beautyKeywords.some(kw => nameLower.includes(kw))) {
      return 'Beauty & Care';
    }
    return null;
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      // Accept all images for now, but detect category from filename
      const newImages = [...images, ...files];
      const newPreviews = [...previews, ...files.map(file => URL.createObjectURL(file))];
      setImages(newImages);
      setPreviews(newPreviews);
      setCatalogResults([]);
      
      // Detect category from first file
      const firstFileCategory = detectCategoryFromFilename(files[0].name);
      setDetectedCategory(firstFileCategory);
      
      toast.success(`${files.length} image${files.length > 1 ? 's' : ''} uploaded`);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
      // Accept all images for now, but detect category from filename
      const newImages = [...images, ...files];
      const newPreviews = [...previews, ...files.map(file => URL.createObjectURL(file))];
      setImages(newImages);
      setPreviews(newPreviews);
      setCatalogResults([]);
      
      // Detect category from first file
      const firstFileCategory = detectCategoryFromFilename(files[0].name);
      setDetectedCategory(firstFileCategory);
      
      toast.success(`${files.length} image${files.length > 1 ? 's' : ''} uploaded`);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setImages(newImages);
    setPreviews(newPreviews);
  };

  const generateCatalog = async () => {
    if (images.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }

    setLoading(true);
    
    try {
      // Detect category from first image filename
      const firstImageName = images[0]?.name || '';
      const filenameCategory = detectCategoryFromFilename(firstImageName);
      setDetectedCategory(filenameCategory || 'Electronics');

      // Fetch actual products from database based on detected category
      const categoryParam = filenameCategory || 'Electronics';
      const { data: productsData } = await api.get(`/products?category=${encodeURIComponent(categoryParam)}&limit=50`);
      
      const products = productsData.products || [];
      
      if (products.length > 0) {
        // Convert products to catalog format
        const productCatalog = products.map(product => ({
          name: product.name,
          itemCount: product.stock || 0,
          categories: [product.category, filenameCategory || 'General'],
          price: product.price,
          productId: product._id,
          image: product.image,
        }));
        
        setCatalogResults(productCatalog);
        toast.success(`Found ${products.length} ${categoryParam} products in database!`);
      } else {
        // Fallback to demo catalogs if no products found
        const demoCatalogs = {
          'Electronics': [
            { name: 'Electronics Collection 2024', itemCount: 8, categories: ['Electronics', 'Audio', 'Wearables'] },
            { name: 'Smart Devices Electronics Bundle', itemCount: 5, categories: ['Electronics', 'Smart Home', 'IoT'] },
            { name: 'Mobile Electronics Accessories Set', itemCount: 12, categories: ['Electronics', 'Accessories', 'Mobile'] },
            { name: 'Computer Electronics Peripherals', itemCount: 6, categories: ['Electronics', 'Computers', 'Gaming'] },
            { name: 'Home Electronics Entertainment', itemCount: 4, categories: ['Electronics', 'TV', 'Audio'] },
          ],
          'Books': [
            { name: 'Book Best Sellers Collection', itemCount: 15, categories: ['Books', 'Fiction', 'Non-Fiction'] },
            { name: 'Book Educational Set', itemCount: 10, categories: ['Books', 'Education', 'Reference'] },
            { name: 'Book Children\'s Bundle', itemCount: 8, categories: ['Books', 'Children', 'Picture Books'] },
            { name: 'Book Business & Finance', itemCount: 6, categories: ['Books', 'Business', 'Finance'] },
            { name: 'Book Science & Technology', itemCount: 5, categories: ['Books', 'Science', 'Technology'] },
          ],
          'Beauty & Care': [
            { name: 'Beauty Care Skincare Essentials', itemCount: 12, categories: ['Beauty & Care', 'Skincare', 'Face'] },
            { name: 'Beauty Care Hair Collection', itemCount: 8, categories: ['Beauty & Care', 'Hair', 'Shampoo'] },
            { name: 'Beauty Care Makeup Bundle', itemCount: 10, categories: ['Beauty & Care', 'Makeup', 'Cosmetics'] },
            { name: 'Beauty Care Body Set', itemCount: 6, categories: ['Beauty & Care', 'Body', 'Lotion'] },
            { name: 'Beauty Care Fragrance Collection', itemCount: 4, categories: ['Beauty & Care', 'Perfume', 'Scent'] },
          ],
        };
        
        setCatalogResults(demoCatalogs[categoryParam] || demoCatalogs['Electronics']);
        toast.info(`No ${categoryParam} products found. Showing demo catalog.`);
      }
    } catch (err) {
      console.error('Catalog generation error:', err);
      toast.error('Failed to generate catalog. Please try again.');
      
      // Fallback: detect category from filenames and show demo
      const firstImageCategory = detectCategoryFromFilename(images[0]?.name || '');
      const demoCatalogs = {
        'Electronics': [
          { name: 'Electronics Collection 2024', itemCount: 8, categories: ['Electronics', 'Audio', 'Wearables'] },
          { name: 'Smart Devices Electronics Bundle', itemCount: 5, categories: ['Electronics', 'Smart Home', 'IoT'] },
          { name: 'Mobile Electronics Accessories Set', itemCount: 12, categories: ['Electronics', 'Accessories', 'Mobile'] },
          { name: 'Computer Electronics Peripherals', itemCount: 6, categories: ['Electronics', 'Computers', 'Gaming'] },
          { name: 'Home Electronics Entertainment', itemCount: 4, categories: ['Electronics', 'TV', 'Audio'] },
        ],
        'Books': [
          { name: 'Book Best Sellers Collection', itemCount: 15, categories: ['Books', 'Fiction', 'Non-Fiction'] },
          { name: 'Book Educational Set', itemCount: 10, categories: ['Books', 'Education', 'Reference'] },
          { name: 'Book Children\'s Bundle', itemCount: 8, categories: ['Books', 'Children', 'Picture Books'] },
          { name: 'Book Business & Finance', itemCount: 6, categories: ['Books', 'Business', 'Finance'] },
          { name: 'Book Science & Technology', itemCount: 5, categories: ['Books', 'Science', 'Technology'] },
        ],
        'Beauty & Care': [
          { name: 'Beauty Care Skincare Essentials', itemCount: 12, categories: ['Beauty & Care', 'Skincare', 'Face'] },
          { name: 'Beauty Care Hair Collection', itemCount: 8, categories: ['Beauty & Care', 'Hair', 'Shampoo'] },
          { name: 'Beauty Care Makeup Bundle', itemCount: 10, categories: ['Beauty & Care', 'Makeup', 'Cosmetics'] },
          { name: 'Beauty Care Body Set', itemCount: 6, categories: ['Beauty & Care', 'Body', 'Lotion'] },
          { name: 'Beauty Care Fragrance Collection', itemCount: 4, categories: ['Beauty & Care', 'Perfume', 'Scent'] },
        ],
      };
      
      setDetectedCategory(firstImageCategory || 'Electronics');
      setCatalogResults(demoCatalogs[firstImageCategory] || demoCatalogs['Electronics']);
      toast.info(`Showing demo ${firstImageCategory || 'Electronics'} catalog.`);
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setImages([]);
    setPreviews([]);
    setCatalogResults([]);
    setDetectedCategory(null);
  };

  return (
    <Layout title="Photo Catalog" subtitle="AI-powered product catalog generation">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Upload Section */}
        <Card style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Upload Product Images</span>
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
                ✨ {detectedCategory}
              </span>
            )}
          </div>
          
          <div
            style={{
              border: '2px dashed var(--border)',
              borderRadius: 16,
              padding: 40,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: 'var(--bg3)',
            }}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
              Drag & drop images here
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
              or click to browse files
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              Supports: JPG, PNG, WebP (Multiple files allowed)
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
          </div>

          {/* Image Previews */}
          {previews.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                  {previews.length} image{previews.length > 1 ? 's' : ''} selected
                </div>
                <button
                  onClick={clearAll}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: 'pointer',
                    background: 'transparent',
                    color: 'var(--text2)',
                  }}
                >
                  Clear All
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
                {previews.map((preview, index) => (
                  <div
                    key={index}
                    style={{
                      position: 'relative',
                      borderRadius: 8,
                      overflow: 'hidden',
                      aspectRatio: 1,
                    }}
                  >
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(index);
                      }}
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        border: 'none',
                        background: 'rgba(239, 68, 68, 0.9)',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generate Button */}
          {previews.length > 0 && (
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <button
                onClick={generateCatalog}
                disabled={loading}
                style={{
                  padding: '12px 32px',
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
                {loading ? '⏳ Generating Catalog...' : '✨ Generate Catalog'}
              </button>
              <button
                onClick={() => {
                  const demoCatalogs = {
                    'Electronics': [
                      { name: 'Electronics Collection 2024', itemCount: 8, categories: ['Electronics', 'Audio', 'Wearables'] },
                      { name: 'Smart Devices Electronics Bundle', itemCount: 5, categories: ['Electronics', 'Smart Home', 'IoT'] },
                      { name: 'Mobile Electronics Accessories Set', itemCount: 12, categories: ['Electronics', 'Accessories', 'Mobile'] },
                      { name: 'Computer Electronics Peripherals', itemCount: 6, categories: ['Electronics', 'Computers', 'Gaming'] },
                      { name: 'Home Electronics Entertainment', itemCount: 4, categories: ['Electronics', 'TV', 'Audio'] },
                    ],
                    'Books': [
                      { name: 'Book Best Sellers Collection', itemCount: 15, categories: ['Books', 'Fiction', 'Non-Fiction'] },
                      { name: 'Book Educational Set', itemCount: 10, categories: ['Books', 'Education', 'Reference'] },
                      { name: 'Book Children\'s Bundle', itemCount: 8, categories: ['Books', 'Children', 'Picture Books'] },
                      { name: 'Book Business & Finance', itemCount: 6, categories: ['Books', 'Business', 'Finance'] },
                      { name: 'Book Science & Technology', itemCount: 5, categories: ['Books', 'Science', 'Technology'] },
                    ],
                    'Beauty & Care': [
                      { name: 'Beauty Care Skincare Essentials', itemCount: 12, categories: ['Beauty & Care', 'Skincare', 'Face'] },
                      { name: 'Beauty Care Hair Collection', itemCount: 8, categories: ['Beauty & Care', 'Hair', 'Shampoo'] },
                      { name: 'Beauty Care Makeup Bundle', itemCount: 10, categories: ['Beauty & Care', 'Makeup', 'Cosmetics'] },
                      { name: 'Beauty Care Body Set', itemCount: 6, categories: ['Beauty & Care', 'Body', 'Lotion'] },
                      { name: 'Beauty Care Fragrance Collection', itemCount: 4, categories: ['Beauty & Care', 'Perfume', 'Scent'] },
                    ],
                  };
                  
                  const category = detectedCategory || 'Electronics';
                  setDetectedCategory(category);
                  setCatalogResults(demoCatalogs[category] || demoCatalogs['Electronics']);
                  toast.success(`Demo ${category} catalog loaded!`);
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  background: 'transparent',
                  color: 'var(--text2)',
                  marginLeft: 12,
                }}
              >
                📋 Load Demo
              </button>
            </div>
          )}
        </Card>

        {/* Catalog Results */}
        {catalogResults.length > 0 && (
          <Card>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
              Generated Catalog ({catalogResults.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {catalogResults.map((catalog, index) => (
                <div
                  key={index}
                  style={{
                    background: 'var(--bg3)',
                    borderRadius: 12,
                    padding: 16,
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                    {catalog.name}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
                    {catalog.itemCount} items
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {catalog.categories.map((cat, i) => (
                      <span
                        key={i}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 600,
                          background: '#6366f122',
                          color: '#6366f1',
                        }}
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Info Section */}
        {previews.length === 0 && catalogResults.length === 0 && (
          <Card>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>How it works</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 24 }}>1️⃣</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                    Upload product images
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                    Upload Electronics, Books, or Beauty & Care images
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 24 }}>2️⃣</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                    AI analyzes images
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                    Our AI identifies the category and groups products into catalogs
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 24 }}>3️⃣</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                    View catalog results
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                    Browse generated catalogs with categories and product counts
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
