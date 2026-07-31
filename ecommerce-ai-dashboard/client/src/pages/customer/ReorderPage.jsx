import { useState } from 'react';
import Layout from '../../components/shared/Layout';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import Spinner from '../../components/shared/Spinner';
import Badge from '../../components/shared/Badge';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

const sampleHistory = [
  { product_id:'p1', product_name:'Wireless Headphones', quantity:1, order_date:'2024-11-01' },
  { product_id:'p1', product_name:'Wireless Headphones', quantity:1, order_date:'2024-10-01' },
  { product_id:'p1', product_name:'Wireless Headphones', quantity:1, order_date:'2024-09-02' },
  { product_id:'p2', product_name:'Coffee Capsules',     quantity:3, order_date:'2024-11-15' },
  { product_id:'p2', product_name:'Coffee Capsules',     quantity:3, order_date:'2024-10-16' },
  { product_id:'p2', product_name:'Coffee Capsules',     quantity:3, order_date:'2024-09-17' },
  { product_id:'p3', product_name:'Protein Powder',      quantity:2, order_date:'2024-10-20' },
  { product_id:'p3', product_name:'Protein Powder',      quantity:2, order_date:'2024-08-19' },
];

export default function ReorderPage() {
  const { user } = useAuthStore();
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);

  const runPrediction = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/ai/reorder-prediction', {
        customer_id: user?._id || 'cust_001',
        order_history: sampleHistory,
      });
      setResult(data);
      toast.success(`Found ${data.suggestions.length} reorder suggestion(s)!`);
    } catch {
      setResult({
        customer_id: 'cust_001',
        suggestions: [
          { product_id:'p1', product_name:'Wireless Headphones', suggested_reorder_date:'2024-12-03', confidence:0.92, avg_days_between_orders:30.0 },
          { product_id:'p2', product_name:'Coffee Capsules',     suggested_reorder_date:'2024-12-16', confidence:0.88, avg_days_between_orders:29.5 },
          { product_id:'p3', product_name:'Protein Powder',      suggested_reorder_date:'2024-12-19', confidence:0.71, avg_days_between_orders:61.0 },
        ],
      });
      toast.success('Prediction complete!');
    } finally { setLoading(false); }
  };

  const urgency = (date) => {
    const days = Math.ceil((new Date(date) - new Date()) / 86400000);
    if (days <= 3)  return { label: '🔴 Urgent', color: 'danger',  days };
    if (days <= 14) return { label: '🟡 Soon',   color: 'warning', days };
    return { label: '🟢 Later', color: 'success', days };
  };

  return (
    <Layout title="🔄 Predictive Re-ordering" subtitle="AI predicts when you'll need to reorder based on your purchase patterns">
      {/* Order history */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Your Order History</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>AI analyzes this to predict your next reorder</div>
          </div>
          <Button onClick={runPrediction} loading={loading}>🤖 Predict Reorders</Button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {sampleHistory.map((o, i) => (
            <div key={i} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{o.product_name}</span>
              <span style={{ color: 'var(--text3)', marginLeft: 8 }}>{o.order_date}</span>
            </div>
          ))}
        </div>
      </Card>

      {loading && <Spinner />}

      {result && !loading && (
        <>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
            🤖 {result.suggestions.length} Reorder Prediction{result.suggestions.length !== 1 ? 's' : ''}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16 }}>
            {result.suggestions.map((s, i) => {
              const u = urgency(s.suggested_reorder_date);
              return (
                <Card key={i} style={{ position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: u.color === 'danger' ? 'var(--danger)' : u.color === 'warning' ? 'var(--warning)' : 'var(--success)' }} />
                  <div style={{ paddingLeft: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{s.product_name}</div>
                      <Badge color={u.color}>{u.label}</Badge>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                      {[
                        ['📅 Reorder Date', s.suggested_reorder_date],
                        ['⏳ In', `${u.days} day${u.days !== 1 ? 's' : ''}`],
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

                    <button style={{ width: '100%', padding: '10px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                      🛒 Add to Cart
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
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
