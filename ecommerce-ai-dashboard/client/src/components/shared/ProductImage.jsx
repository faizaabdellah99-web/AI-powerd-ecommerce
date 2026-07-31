import { useState, useEffect, useRef } from 'react';

// Category emoji fallbacks
const CAT_EMOJI = {
  electronics: '💻', books: '📚', fashion: '👕', clothing: '👔',
  home: '🏠', sports: '⚽', food: '🍎', beauty: '💄',
  toys: '🧸', automotive: '🚗', health: '💊', default: '📦',
};

function getCatEmoji(category = '', name = '') {
  const s = (category + ' ' + name).toLowerCase();
  if (s.includes('book') || s.includes('novel'))         return '📚';
  if (s.includes('headphone') || s.includes('earbud'))   return '🎧';
  if (s.includes('laptop') || s.includes('macbook'))     return '💻';
  if (s.includes('phone') || s.includes('iphone'))       return '📱';
  if (s.includes('watch'))                               return '⌚';
  if (s.includes('speaker') || s.includes('audio'))      return '🔊';
  if (s.includes('camera'))                              return '📷';
  if (s.includes('keyboard') || s.includes('mouse'))     return '⌨️';
  if (s.includes('shoe') || s.includes('sneaker'))       return '👟';
  if (s.includes('coat') || s.includes('jacket') || s.includes('shirt')) return '👕';
  if (s.includes('coffee') || s.includes('espresso'))    return '☕';
  if (s.includes('pillow') || s.includes('bed'))         return '🛏️';
  if (s.includes('yoga') || s.includes('dumbbell') || s.includes('gym')) return '🏋️';
  if (s.includes('bottle') || s.includes('water'))       return '💧';
  if (s.includes('electronics'))                         return '🔌';
  if (s.includes('fashion') || s.includes('clothing'))   return '👗';
  if (s.includes('home') || s.includes('living'))        return '🏠';
  if (s.includes('sport'))                               return '⚽';
  return CAT_EMOJI.default;
}

// Cache to avoid re-fetching same product
const imgCache = {};

// Disabled Wikimedia API calls due to CORS errors and rate limiting
// Using emoji fallbacks only
async function fetchWikimediaImage(productName) {
  // Always return null to use emoji fallbacks
  return null;
}

export default function ProductImage({ name, category, size = 80, borderRadius = 12, style = {} }) {
  const [src, setSrc]       = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError]   = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    setSrc(null); setLoaded(false); setError(false);

    fetchWikimediaImage(name).then(url => {
      if (mounted.current) { setSrc(url); if (!url) setError(true); }
    });

    return () => { mounted.current = false; };
  }, [name]);

  const emoji = getCatEmoji(category, name);

  return (
    <div style={{
      width: size, height: size, borderRadius,
      background: 'var(--bg3)', overflow: 'hidden', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', ...style,
    }}>
      {/* Emoji fallback always rendered behind */}
      <span style={{ fontSize: size * 0.45, position: 'absolute', opacity: loaded ? 0 : 1, transition: 'opacity 0.3s' }}>
        {emoji}
      </span>

      {/* Real image */}
      {src && !error && (
        <img
          src={src}
          alt={name}
          onLoad={() => setLoaded(true)}
          onError={() => { setError(true); setLoaded(false); }}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            position: 'absolute', top: 0, left: 0,
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}
        />
      )}
    </div>
  );
}
