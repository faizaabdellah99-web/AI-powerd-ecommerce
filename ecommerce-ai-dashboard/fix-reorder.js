const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client/src/pages/admin/DemandForecastPage.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add currentStock, reorderQty, stockCoverageDays after peakForecast
const oldPeak = `  const peakForecast = safeForecast.length
    ? Math.max(0, ...safeForecast.map(f => Number(f.forecast) || 0))
    : 0;

  // Average per-row confidence — 0% when no sales history`;

const newPeak = `  const peakForecast = safeForecast.length
    ? Math.max(0, ...safeForecast.map(f => Number(f.forecast) || 0))
    : 0;

  // ── Current stock & Reorder Quantity (the core fix) ─────────────────────────
  // Reorder Qty = Forecast Total − Current Stock (never negative)
  const currentStock = Number(products.find(p => p._id === productId)?.stock) || 0;
  const reorderQty   = Math.max(0, forecastTotal - currentStock);
  const stockCoverageDays = avgSales > 0 ? Math.round(currentStock / avgSales) : 0;

  // Average per-row confidence — 0% when no sales history`;

if (content.includes(oldPeak)) {
  content = content.replace(oldPeak, newPeak);
  console.log('✓ Added currentStock/reorderQty/stockCoverageDays');
} else {
  console.log('✗ Could not find peakForecast block');
}

// 2. Fix activeRec to use reorderQty formula
const oldRec = `  const activeRec = !hasSalesHistory
    ? NO_SALES_RECOMMENDATION
    : (aiResult?.recommendation ?? (() => {
        const total = safeForecast.reduce((s,f)=>s+(Number(f.forecast)||0),0);
        if (activeTrend === 'increasing')
          return \`Demand is rising. Forecast total: \${total} units over \${forecastDays} days. Reorder ~\${Math.round(total * 1.15)} units to stay ahead.\`;
        if (activeTrend === 'decreasing')
          return \`Demand is declining. Forecast total: \${total} units over \${forecastDays} days. Reduce next order by ~15% to avoid overstock.\`;
        return \`Demand is stable at ~\${avgSales} units/day. Forecast total: \${total} units. Maintain current stock levels.\`;
      })());`;

const newRec = `  const activeRec = !hasSalesHistory
    ? NO_SALES_RECOMMENDATION
    : (aiResult?.recommendation ?? (() => {
        const total = safeForecast.reduce((s,f)=>s+(Number(f.forecast)||0),0);
        if (activeTrend === 'increasing')
          return \`Demand is rising. Forecast total: \${total} units over \${forecastDays} days. Current stock: \${currentStock} units. Reorder \${reorderQty} units (Forecast Total − Current Stock) to stay ahead.\`;
        if (activeTrend === 'decreasing')
          return \`Demand is declining. Forecast total: \${total} units over \${forecastDays} days. Current stock: \${currentStock} units. Reorder \${reorderQty} units to avoid overstock.\`;
        return \`Demand is stable at ~\${avgSales} units/day. Forecast total: \${total} units. Current stock: \${currentStock} units. Reorder \${reorderQty} units to maintain stock levels.\`;
      })());`;

if (content.includes(oldRec)) {
  content = content.replace(oldRec, newRec);
  console.log('✓ Fixed activeRec with reorderQty formula');
} else {
  console.log('✗ Could not find activeRec block');
}

// 3. Add current_stock to API request
const oldApi = `        sales_history: salesHistory,
        forecast_days: forecastDays,
      });`;

const newApi = `        sales_history: salesHistory,
        forecast_days: forecastDays,
        current_stock: currentStock,
      });`;

if (content.includes(oldApi)) {
  content = content.replace(oldApi, newApi);
  console.log('✓ Added current_stock to API request');
} else {
  console.log('✗ Could not find API request block');
}

// 4. Update summary stats grid to 7 columns with Current Stock & Reorder Qty
const oldStats = `      {/* ── Summary Stats — update when slider changes ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:20 }}>
        {[
          ['Trend',          (trendIcon[activeTrend]||'➡️')+' '+(activeTrend||'stable'),   trendColor[activeTrend]||'#f59e0b'],
          ['Avg Sales/day',  \`\${avgSales} units\`,                                            'var(--primary)'                ],
          ['Forecast Total', \`\${forecastTotal.toLocaleString()} units\`,                      '#10b981'                       ],
          ['Peak Forecast',  \`\${peakForecast} units/day\`,                                   '#f59e0b'                       ],
          ['Confidence Rate', \`\${confidenceRate}%\`,                                          '#8b5cf6'                       ],
        ].map(([l,v,c])=>(
          <div key={l} style={{ background:'var(--card)', border:\`1px solid \${c}33\`, borderRadius:12, padding:'14px 18px', transition:'all 0.2s' }}>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:4 }}>{l}</div>
            <div style={{ fontSize:16, fontWeight:800, color:c, textTransform:'capitalize' }}>{v}</div>
          </div>
        ))}
      </div>`;

const newStats = `      {/* ── Summary Stats — update when slider changes ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:14, marginBottom:20 }}>
        {[
          ['Trend',          (trendIcon[activeTrend]||'➡️')+' '+(activeTrend||'stable'),   trendColor[activeTrend]||'#f59e0b'],
          ['Avg Sales/day',  \`\${avgSales} units\`,                                            'var(--primary)'                ],
          ['Forecast Total', \`\${forecastTotal.toLocaleString()} units\`,                      '#10b981'                       ],
          ['Current Stock',  \`\${currentStock} units\`,                                        '#6366f1'                       ],
          ['Reorder Qty',    \`\${reorderQty} units\`,                                          reorderQty > 0 ? '#ef4444' : '#10b981' ],
          ['Peak Forecast',  \`\${peakForecast} units/day\`,                                   '#f59e0b'                       ],
          ['Confidence Rate', \`\${confidenceRate}%\`,                                          '#8b5cf6'                       ],
        ].map(([l,v,c])=>(
          <div key={l} style={{ background:'var(--card)', border:\`1px solid \${c}33\`, borderRadius:12, padding:'14px 18px', transition:'all 0.2s' }}>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:4 }}>{l}</div>
            <div style={{ fontSize:16, fontWeight:800, color:c, textTransform:'capitalize' }}>{v}</div>
          </div>
        ))}
      </div>`;

if (content.includes(oldStats)) {
  content = content.replace(oldStats, newStats);
  console.log('✓ Updated summary stats grid');
} else {
  console.log('✗ Could not find summary stats block');
}

// 5. Update mini stats in recommendation card
const oldMini = `          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            {[
              ['Next 7 days',  \`\${next7} units\`,                             '#6366f1'],
              ['Next 30 days', \`\${next30} units\`,                            '#10b981'],
              ['Peak day',     \`\${peakForecast} units\`,                      '#f59e0b'],
            ].map(([l,v,c])=>(
              <div key={l} style={{ background:'var(--bg3)', borderRadius:9, padding:'10px 12px', textAlign:'center' }}>
                <div style={{ fontSize:10, color:'var(--text3)', marginBottom:4 }}>{l}</div>
                <div style={{ fontSize:14, fontWeight:800, color:c }}>{v}</div>
              </div>
            ))}
          </div>`;

const newMini = `          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10 }}>
            {[
              ['Next 7 days',  \`\${next7} units\`,                             '#6366f1'],
              ['Next 30 days', \`\${next30} units\`,                            '#10b981'],
              ['Reorder Qty',  \`\${reorderQty} units\`,                        reorderQty > 0 ? '#ef4444' : '#10b981'],
              ['Stock Coverage', \`\${stockCoverageDays} days\`,                '#f59e0b'],
            ].map(([l,v,c])=>(
              <div key={l} style={{ background:'var(--bg3)', borderRadius:9, padding:'10px 12px', textAlign:'center' }}>
                <div style={{ fontSize:10, color:'var(--text3)', marginBottom:4 }}>{l}</div>
                <div style={{ fontSize:14, fontWeight:800, color:c }}>{v}</div>
              </div>
            ))}
          </div>`;

if (content.includes(oldMini)) {
  content = content.replace(oldMini, newMini);
  console.log('✓ Updated mini stats');
} else {
  console.log('✗ Could not find mini stats block');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ File written successfully!');