import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout';
import Card from '../../components/shared/Card';
import api from '../../services/api';
import toast from 'react-hot-toast';

const segmentColors = {
  vip:        { bg: '#f59e0b22', text: '#f59e0b', label: '👑 VIP Customer',       icon: '👑' },
  regular:    { bg: '#10b98122', text: '#10b981', label: '⭐ Regular Customer',    icon: '⭐' },
  occasional: { bg: '#f59e0b22', text: '#f59e0b', label: '🔄 Occasional Shopper', icon: '🔄' },
  new:        { bg: '#6366f122', text: '#6366f1', label: '🆕 New Customer',        icon: '🆕' },
  atrisk:     { bg: '#ef444422', text: '#ef4444', label: '⚠️ At Risk',             icon: '⚠️' },
  inactive:   { bg: '#64748b22', text: '#64748b', label: '😴 Inactive',            icon: '😴' },
};

const defaultSegments = [
  {
    key: 'vip',
    name: 'VIP Customer',
    icon: '👑',
    description: 'High-value customers who spend frequently and have high lifetime value.',
    benefits: [
      '15% discount on all orders',
      'Free express shipping',
      'Priority customer support',
      'Exclusive early access to new products',
      'Birthday bonus (20% off)',
      'Loyalty points multiplier (2x)',
    ],
    marketingStrategy: {
      channel: 'Email + SMS',
      frequency: 'Weekly',
      offers: 'Exclusive deals, early access',
      tone: 'Premium, appreciative',
    },
  },
  {
    key: 'regular',
    name: 'Regular Customer',
    icon: '⭐',
    description: 'Consistent shoppers who purchase regularly but may not be high spenders.',
    benefits: [
      '10% discount on orders over $50',
      'Free shipping on orders over $100',
      'Loyalty points on every purchase',
      'Monthly special offers',
      'Personalized product recommendations',
    ],
    marketingStrategy: {
      channel: 'Email',
      frequency: 'Bi-weekly',
      offers: 'Seasonal promotions, bundle deals',
      tone: 'Friendly, encouraging',
    },
  },
  {
    key: 'occasional',
    name: 'Occasional Shopper',
    icon: '🔄',
    description: 'Customers who shop infrequently but have potential to become regular customers.',
    benefits: [
      '5% discount on next order',
      'Free shipping on orders over $75',
      'Welcome back offers',
      'Product recommendations based on past purchases',
    ],
    marketingStrategy: {
      channel: 'Email + Push notifications',
      frequency: 'Monthly',
      offers: 'Re-engagement campaigns, limited-time deals',
      tone: 'Helpful, reminder-focused',
    },
  },
  {
    key: 'new',
    name: 'New Customer',
    icon: '🆕',
    description: 'Recently registered customers who have made few or no purchases yet.',
    benefits: [
      'Welcome discount (15% off first order)',
      'Free shipping on first order',
      'New customer product bundles',
      'Onboarding guide and tips',
    ],
    marketingStrategy: {
      channel: 'Email + In-app',
      frequency: 'Daily (first week), then weekly',
      offers: 'First-order discounts, free trials',
      tone: 'Welcoming, educational',
    },
  },
  {
    key: 'atrisk',
    name: 'At Risk',
    icon: '⚠️',
    description: 'Customers who have not purchased in a while and may churn.',
    benefits: [
      '20% win-back discount',
      'Free express shipping on next purchase',
      'Exclusive returning customer deals',
      'Personal support to resolve concerns',
      'Reorder AI reminders',
    ],
    marketingStrategy: {
      channel: 'Email + SMS',
      frequency: 'Weekly',
      offers: 'Win-back campaigns, exclusive deals',
      tone: 'Concerned, supportive',
    },
  },
  {
    key: 'inactive',
    name: 'Inactive',
    icon: '😴',
    description: 'Customers who have not engaged with the platform for an extended period.',
    benefits: [
      '25% reactivation discount',
      'Free shipping on reactivation order',
      'Special reactivation bundles',
    ],
    marketingStrategy: {
      channel: 'Email',
      frequency: 'Monthly',
      offers: 'Reactivation campaigns, flash sales',
      tone: 'Direct, urgent',
    },
  },
];

export default function AdminSegmentBenefitsPage() {
  const [segments, setSegments] = useState(defaultSegments);
  const [loading, setLoading] = useState(false);
  const [editingSegment, setEditingSegment] = useState(null);
  const [editForm, setEditForm] = useState({});

  const handleEdit = (segment) => {
    setEditingSegment(segment.key);
    setEditForm({
      ...segment,
      benefits: segment.benefits.join('\n'),
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const updatedSegments = segments.map(seg => 
        seg.key === editingSegment 
          ? {
              ...editForm,
              benefits: editForm.benefits.split('\n').filter(b => b.trim()),
            }
          : seg
      );
      setSegments(updatedSegments);
      setEditingSegment(null);
      setEditForm({});
      toast.success('Segment benefits updated successfully!');
    } catch (err) {
      toast.error('Failed to update segment benefits');
    }
  };

  const handleCancel = () => {
    setEditingSegment(null);
    setEditForm({});
  };

  return (
    <Layout title="Segment Benefits" subtitle="Manage benefits and marketing strategies for each customer segment">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 20 }}>
        {segments.map((segment) => {
          const segStyle = segmentColors[segment.key] || segmentColors.regular;
          const isEditing = editingSegment === segment.key;

          return (
            <Card key={segment.key} style={{ 
              border: `2px solid ${segStyle.text}22`,
              background: `${segStyle.bg}10`,
            }}>
              {/* Header */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 12, 
                marginBottom: 16,
                paddingBottom: 16,
                borderBottom: '1px solid var(--border)',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: segStyle.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24,
                }}>{segment.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: segStyle.text }}>
                    {segStyle.label}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>{segment.key}</div>
                </div>
                {!isEditing && (
                  <button 
                    onClick={() => handleEdit(segment)}
                    style={{
                      padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
                      background: 'transparent', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    ✏️ Edit
                  </button>
                )}
              </div>

              {isEditing ? (
                /* Edit Form */
                <form onSubmit={handleSave}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, color: 'var(--text2)', display: 'block', marginBottom: 6, fontWeight: 500 }}>
                      Description
                    </label>
                    <textarea
                      value={editForm.description}
                      onChange={e => setEditForm({...editForm, description: e.target.value})}
                      rows={2}
                      style={{
                        width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)',
                        background: 'var(--bg)', color: 'var(--text)', fontSize: 13,
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, color: 'var(--text2)', display: 'block', marginBottom: 6, fontWeight: 500 }}>
                      Benefits (one per line)
                    </label>
                    <textarea
                      value={editForm.benefits}
                      onChange={e => setEditForm({...editForm, benefits: e.target.value})}
                      rows={6}
                      style={{
                        width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)',
                        background: 'var(--bg)', color: 'var(--text)', fontSize: 13,
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, color: 'var(--text2)', display: 'block', marginBottom: 6, fontWeight: 500 }}>
                      Marketing Channel
                    </label>
                    <input
                      value={editForm.marketingStrategy?.channel || ''}
                      onChange={e => setEditForm({...editForm, marketingStrategy: {...editForm.marketingStrategy, channel: e.target.value}})}
                      style={{
                        width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)',
                        background: 'var(--bg)', color: 'var(--text)', fontSize: 13,
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="submit" style={{
                      flex: 1, padding: 10, borderRadius: 8, border: 'none',
                      background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
                      fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    }}>
                      💾 Save
                    </button>
                    <button type="button" onClick={handleCancel} style={{
                      flex: 1, padding: 10, borderRadius: 8, border: '1px solid var(--border)',
                      background: 'transparent', color: 'var(--text2)', fontSize: 13, cursor: 'pointer',
                    }}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                /* View Mode */
                <>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6, fontWeight: 600 }}>Description</div>
                    <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
                      {segment.description}
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8, fontWeight: 600 }}>Benefits</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {segment.benefits.map((benefit, i) => (
                        <div key={i} style={{ 
                          display: 'flex', alignItems: 'center', gap: 8, 
                          fontSize: 12, color: 'var(--text2)', padding: '6px 10',
                          background: 'var(--bg3)', borderRadius: 6,
                        }}>
                          <span style={{ color: segStyle.text }}>⚡</span> {benefit}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ 
                    padding: 12, background: 'var(--bg3)', borderRadius: 8,
                    border: `1px solid ${segStyle.text}22`,
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>📢 Marketing Strategy</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.8 }}>
                      <div><strong>Channel:</strong> {segment.marketingStrategy?.channel}</div>
                      <div><strong>Frequency:</strong> {segment.marketingStrategy?.frequency}</div>
                      <div><strong>Offers:</strong> {segment.marketingStrategy?.offers}</div>
                      <div><strong>Tone:</strong> {segment.marketingStrategy?.tone}</div>
                    </div>
                  </div>
                </>
              )}
            </Card>
          );
        })}
      </div>
    </Layout>
  );
}
