const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const { protect, authorize } = require('../middleware/auth.middleware');

// ── Scrape competitor price from URL ─────────────────────────────────────────
router.post('/scrape-price', protect, authorize('admin', 'vendor'), async (req, res) => {
  const { url } = req.body;

  // ── Validate URL ─────────────────────────────────────────────────────────────
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url.trim());
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ success: false, error: 'URL must start with http:// or https://' });
    }
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid URL format — please enter a valid URL' });
  }

  try {
    // Fetch the page with browser-like headers to avoid bot detection
    const response = await axios.get(url.trim(), {
      timeout: 12000,
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection':      'keep-alive',
      },
      maxRedirects: 5,
    });

    const html = response.data || '';

    // ── Extract price using multiple regex patterns ───────────────────────────
    const pricePatterns = [
      // JSON-LD structured data (most reliable)
      /"price"\s*:\s*"?([\d,]+\.?\d*)"?/i,
      /"lowPrice"\s*:\s*"?([\d,]+\.?\d*)"?/i,
      /"highPrice"\s*:\s*"?([\d,]+\.?\d*)"?/i,
      // Open Graph
      /property="product:price:amount"[^>]*content="([\d,]+\.?\d*)"/i,
      /content="([\d,]+\.?\d*)"[^>]*property="product:price:amount"/i,
      // Meta tags
      /itemprop="price"[^>]*content="([\d,]+\.?\d*)"/i,
      /content="([\d,]+\.?\d*)"[^>]*itemprop="price"/i,
      // Common price class patterns
      /class="[^"]*price[^"]*"[^>]*>\s*\$?\s*([\d,]+\.?\d*)/i,
      /class="[^"]*Price[^"]*"[^>]*>\s*[^\d]*([\d,]+\.?\d*)/,
      // Data attributes
      /data-price="([\d,]+\.?\d*)"/i,
      /data-product-price="([\d,]+\.?\d*)"/i,
      /data-current-price="([\d,]+\.?\d*)"/i,
      // Currency symbols
      /\$\s*([\d,]+\.?\d{0,2})(?:\s*USD)?/,
      /USD\s*([\d,]+\.?\d{0,2})/i,
      /Price[:\s]+\$?\s*([\d,]+\.?\d{0,2})/i,
    ];

    let extractedPrice = null;
    for (const pattern of pricePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const raw = parseFloat(match[1].replace(/,/g, ''));
        // Sanity check: price should be between $0.01 and $99,999
        if (!isNaN(raw) && raw > 0.01 && raw < 99999) {
          extractedPrice = raw;
          break;
        }
      }
    }

    // ── Extract product name ─────────────────────────────────────────────────
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
      || html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
      || html.match(/itemprop="name"[^>]*>([^<]+)</i);
    const productName = titleMatch
      ? titleMatch[1].trim().slice(0, 80).replace(/\s*[|–—-].*$/, '').trim()
      : parsedUrl.hostname;

    // ── Extract currency ─────────────────────────────────────────────────────
    const currencyMatch = html.match(/"priceCurrency"\s*:\s*"([A-Z]{3})"/i)
      || html.match(/property="product:price:currency"[^>]*content="([A-Z]{3})"/i);
    const currency = currencyMatch ? currencyMatch[1] : 'USD';

    if (!extractedPrice) {
      return res.json({
        success: false,
        url,
        hostname: parsedUrl.hostname,
        error:    'Could not extract price from this page. The site may require login or block scrapers.',
        tip:      'Try entering the price manually in the competitor price field.',
      });
    }

    return res.json({
      success:     true,
      url,
      hostname:    parsedUrl.hostname,
      price:       extractedPrice,
      currency,
      productName,
      scrapedAt:   new Date().toISOString(),
    });

  } catch (err) {
    // Classify error type for helpful message
    let errorMsg = 'Failed to fetch the page.';
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      errorMsg = 'Could not reach this website. Check the URL and try again.';
    } else if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
      errorMsg = 'Request timed out. The website may be slow or blocking scrapers.';
    } else if (err.response?.status === 403) {
      errorMsg = 'Access denied (403). This website blocks automated requests.';
    } else if (err.response?.status === 404) {
      errorMsg = 'Page not found (404). Check the URL is correct.';
    } else if (err.response?.status === 429) {
      errorMsg = 'Too many requests (429). Try again in a few minutes.';
    } else if (err.response?.status >= 500) {
      errorMsg = `Server error (${err.response.status}). The website may be down.`;
    }

    return res.json({
      success:  false,
      url,
      hostname: parsedUrl?.hostname || url,
      error:    errorMsg,
      tip:      'You can enter the price manually in the competitor field.',
    });
  }
});

module.exports = router;
