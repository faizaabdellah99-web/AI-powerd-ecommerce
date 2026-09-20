const fs = require('fs');
const path = 'ecommerce-ai-dashboard/client/src/pages/customer/CustomerDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove aiSuggestions state declarations
content = content.replace(
  "  const [aiSuggestions, setAiSuggestions] = useState(null);\n  const [aiSuggestionsLoading, setAiSuggestionsLoading] = useState(false);\n",
  ""
);

// 2. Remove the "Load AI suggestions from user data" useEffect
content = content.replace(
  "  // Load AI suggestions from user data if available\n  useEffect(() => {\n    if (user?.aiSuggestions && user.aiSuggestions.length > 0) {\n      setAiSuggestions(user.aiSuggestions);\n    }\n  }, [user]);\n\n",
  ""
);

// 3. Remove the fetchAISuggestions function and auto-generate useEffect
const aiStart = content.indexOf("  // ── AI Suggestions (same for all customers) ─────────────────────────────");
const aiEnd = content.indexOf("  return (");
if (aiStart !== -1 && aiEnd !== -1) {
  content = content.slice(0, aiStart) + content.slice(aiEnd);
}

// 4. Replace the "Stats & AI Suggestions Combined Card" header with "Stats Card"
content = content.replace(
  `      {/* ── Stats & AI Suggestions Combined Card ── */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>🤖 AI Suggestions For You</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>
              General shopping tips for all customers
            </div>
          </div>
          <button onClick={fetchAISuggestions} disabled={aiSuggestionsLoading} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            borderRadius: 8, border: 'none', cursor: aiSuggestionsLoading ? 'not-allowed' : 'pointer',
            background: aiSuggestionsLoading ? 'var(--bg3)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color: aiSuggestionsLoading ? 'var(--text3)' : '#fff',
            fontSize: 12, fontWeight: 700, transition: 'opacity 0.2s',
          }}>
            {aiSuggestionsLoading ? '⏳ Generating…' : aiSuggestions ? '⚡ Refresh' : '⚡ Generate'}
          </button>
        </div>

        {/* Stats Row */}`,
  `      {/* ── Stats Card ── */}
      <Card style={{ marginBottom: 20 }}>
        {/* Stats Row */}`
);

// 5. Remove the AI Suggestions rendering blocks
const aiSuggestionsBlockStart = content.indexOf("        {/* AI Suggestions */}");
const aiSuggestionsBlockEnd = content.indexOf("      </Card>", aiSuggestionsBlockStart);
if (aiSuggestionsBlockStart !== -1 && aiSuggestionsBlockEnd !== -1) {
  content = content.slice(0, aiSuggestionsBlockStart) + content.slice(aiSuggestionsBlockEnd);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Done!');
console.log('Has aiSuggestions:', content.includes('aiSuggestions'));
console.log('Has AI Suggestions For You:', content.includes('AI Suggestions For You'));
console.log('Has fetchAISuggestions:', content.includes('fetchAISuggestions'));