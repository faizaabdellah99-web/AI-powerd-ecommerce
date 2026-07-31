require('dotenv').config();
const axios = require('axios');

const key = process.env.GEMINI_API_KEY || '';
console.log('Key prefix:', key.substring(0, 8) + '...');
console.log('Key length:', key.length);

const MODELS_TO_TRY = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-pro'];
const body = { contents: [{ parts: [{ text: 'Reply with exactly: WORKS' }] }] };

async function test() {
  for (const model of MODELS_TO_TRY) {
    // Try x-goog-api-key header
    try {
      const r = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        body,
        { headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' }, timeout: 10000 }
      );
      const text = r.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log(`✅ SUCCESS model=${model} header=x-goog-api-key → "${text}"`);
      return;
    } catch (e) {
      console.log(`❌ FAIL model=${model} x-goog-api-key: ${e.response?.status} ${e.response?.data?.error?.message || e.message}`);
    }

    // Try ?key= query param
    try {
      const r = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        body,
        { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
      );
      const text = r.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log(`✅ SUCCESS model=${model} header=?key= → "${text}"`);
      return;
    } catch (e) {
      console.log(`❌ FAIL model=${model} ?key=: ${e.response?.status} ${e.response?.data?.error?.message || e.message}`);
    }
  }
  console.log('\n⚠️  All attempts failed. The API key may be invalid or not yet active.');
}

test();
