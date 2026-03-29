async function main() {
  const res = await fetch('./status.json', { cache: 'no-store' });
  const data = await res.json();
  const pnlEl = document.getElementById('pnlUsd');
  const pnlPctEl = document.getElementById('pnlPct');
  const pnl = Number(data.pnlUsd || 0);
  pnlEl.textContent = `$${pnl.toFixed(2)}`;
  pnlEl.className = pnl >= 0 ? 'positive' : 'negative';
  pnlPctEl.textContent = `${Number(data.pnlPct || 0).toFixed(2)}% vs base`;
  pnlPctEl.className = pnl >= 0 ? 'positive' : 'negative';
  document.getElementById('equityUsd').textContent = `$${Number(data.equityUsd || 0).toFixed(2)}`;
  document.getElementById('solBalance').textContent = Number(data.solBalance || 0).toFixed(6);
  document.getElementById('usdcBalance').textContent = Number(data.usdcBalance || 0).toFixed(2);
  document.getElementById('tradeCount').textContent = String(data.tradeCount || 0);
  document.getElementById('netSol').textContent = Number(data.netSolAccumulated || 0).toFixed(6);
  document.getElementById('updatedAt').textContent = data.updatedAt ? `Updated ${new Date(data.updatedAt).toLocaleString()}` : 'Updated recently';

  const trade = data.latestTrade || {};
  const tradeRoot = document.getElementById('latestTrade');
  const rows = [
    ['Time', trade.timestamp || '—'],
    ['Side', trade.baseSymbol ? `Buy ${trade.baseSymbol}` : '—'],
    ['Spent', trade.notionalUsdExecuted != null ? `$${Number(trade.notionalUsdExecuted).toFixed(2)}` : '—'],
    ['Size', trade.sizeSolExecuted != null ? Number(trade.sizeSolExecuted).toFixed(6) : '—'],
    ['Avg price', trade.avgPriceUsd != null ? `$${Number(trade.avgPriceUsd).toFixed(4)}` : '—'],
  ];
  tradeRoot.innerHTML = rows.map(([k,v]) => `<div class="kv"><span>${k}</span><b>${v}</b></div>`).join('');

  const notes = Array.isArray(data.recommendations) ? data.recommendations : [];
  document.getElementById('recommendations').innerHTML = notes.map((n) => `<li>${n}</li>`).join('');
}
main().catch((err) => {
  document.body.innerHTML = `<pre style="padding:20px;color:white">${String(err)}</pre>`;
});
