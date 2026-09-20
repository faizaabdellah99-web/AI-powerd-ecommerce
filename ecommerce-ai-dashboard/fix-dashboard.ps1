$path = 'ecommerce-ai-dashboard\client\src\pages\customer\CustomerDashboard.jsx'
$content = [System.IO.File]::ReadAllText($path)

# Remove aiSuggestions state declarations
$content = $content.Replace("  const [aiSuggestions, setAiSuggestions] = useState(null);`n  const [aiSuggestionsLoading, setAiSuggestionsLoading] = useState(false);`n", "")

# Remove the "Load AI suggestions from user data" useEffect
$content = $content.Replace("  // Load AI suggestions from user data if available`n  useEffect(() => {`n    if (user?.aiSuggestions && user.aiSuggestions.length > 0) {`n      setAiSuggestions(user.aiSuggestions);`n    }`n  }, [user]);`n`n", "")

# Remove the fetchAISuggestions function and auto-generate useEffect
$aiStart = $content.IndexOf("  // ── AI Suggestions (same for all customers) ─────────────────────────────")
$aiEnd = $content.IndexOf("  return (")
if ($aiStart -ge 0 -and $aiEnd -ge 0) {
    $content = $content.Substring(0, $aiStart) + $content.Substring($aiEnd)
}

# Replace the "Stats & AI Suggestions Combined Card" header with "Stats Card"
$oldHeader = "      {/* ── Stats & AI Suggestions Combined Card ── */}`n      <Card style={{ marginBottom: 20 }}>`n        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>`n          <div>`n            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>🤖 AI Suggestions For You</div>`n            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>`n              General shopping tips for all customers`n            </div>`n          </div>`n          <button onClick={fetchAISuggestions} disabled={aiSuggestionsLoading} style={{`n            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',`n            borderRadius: 8, border: 'none', cursor: aiSuggestionsLoading ? 'not-allowed' : 'pointer',`n            background: aiSuggestionsLoading ? 'var(--bg3)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',`n            color: aiSuggestionsLoading ? 'var(--text3)' : '#fff',`n            fontSize: 12, fontWeight: 700, transition: 'opacity 0.2s',`n          }}>`n            {aiSuggestionsLoading ? '⏳ Generating…' : aiSuggestions ? '⚡ Refresh' : '⚡ Generate'}`n          </button>`n        </div>`n`n        {/* Stats Row */}"
$newHeader = "      {/* ── Stats Card ── */}`n      <Card style={{ marginBottom: 20 }}>`n        {/* Stats Row */}"
$content = $content.Replace($oldHeader, $newHeader)

# Remove the AI Suggestions rendering blocks
$aiBlockStart = $content.IndexOf("        {/* AI Suggestions */}")
$aiBlockEnd = $content.IndexOf("      </Card>", $aiBlockStart)
if ($aiBlockStart -ge 0 -and $aiBlockEnd -ge 0) {
    $content = $content.Substring(0, $aiBlockStart) + $content.Substring($aiBlockEnd)
}

[System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))
Write-Host "Done!"
Write-Host "Has aiSuggestions: $($content.Contains('aiSuggestions'))"
Write-Host "Has AI Suggestions For You: $($content.Contains('AI Suggestions For You'))"
Write-Host "Has fetchAISuggestions: $($content.Contains('fetchAISuggestions'))"