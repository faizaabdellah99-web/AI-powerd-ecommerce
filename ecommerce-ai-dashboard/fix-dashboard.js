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
const aiStart = content.indexOf("  // \u2500\u2500 AI Suggestions (same for all customers)");
const aiEnd = content.indexOf("  return (");
if (aiStart !== -1 && aiEnd !== -1) {
  content = content.slice(0, aiStart) + content.slice(aiEnd);
}

// 4. Replace the "Stats & AI Suggestions Combined Card" header with "Stats Card"
const oldHeaderStart = content.indexOf("      {/* \u2500\u2500 Stats & AI Suggestions Combined Card \u2500\u2500 */}");
const oldHeaderEnd = content.indexOf("        {/* Stats Row */}");
if (oldHeaderStart !== -1 && oldHeaderEnd !== -1) {
  const newHeader = "      {/* \u2500\u2500 Stats Card \u2500\u2500 */}\n      <Card style={{ marginBottom: 20 }}>\n        {/* Stats Row */}";
  content = content.slice(0, oldHeaderStart) + newHeader + content.slice(oldHeaderEnd + "        {/* Stats Row */}".length);
}

// 5. Remove the AI Suggestions rendering blocks
const aiBlockStart = content.indexOf("        {/* AI Suggestions */}");
const aiBlockEnd = content.indexOf("      </Card>", aiBlockStart);
if (aiBlockStart !== -1 && aiBlockEnd !== -1) {
  content = content.slice(0, aiBlockStart) + content.slice(aiBlockEnd);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Done!');
console.log('Has aiSuggestions:', content.includes('aiSuggestions'));
console.log('Has AI Suggestions For You:', content.includes('AI Suggestions For You'));
console.log('Has fetchAISuggestions:', content.includes('fetchAISuggestions'));