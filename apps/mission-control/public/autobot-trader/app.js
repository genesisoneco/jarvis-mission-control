function buildSparklineValues(data) {
  const equity = Number(data.equityUsd || 0);
  const pnl = Number(data.pnlUsd || 0);
  const trades = Number(data.tradeCount || 0);
  const netSol = Number(data.netSolAccumulated || 0);

  const base = equity - pnl;
  const values = [
    Math.max(base || 0, 1),
    Math.max(base + pnl * 0.25, 1),
    Math.max(base + pnl * 0.5 + trades * 0.08, 1),
    Math.max(base + pnl * 0.75 + netSol * 8, 1),
    Math.max(equity, 1),
  ];
  return values;
}

function drawSparkline(values) {
  const svgWidth = 320;
  const svgHeight = 120;
  const padding = 8;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const points = values.map((value, index) => {
    const x = padding + (index * (svgWidth - padding * 2)) / (values.length - 1);
    const y = svgHeight - padding - ((value - min) / span) * (svgHeight - padding * 2);
    return [x, y];
  });

  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  const area = `${line} L ${points[points.length - 1][0]} ${svgHeight - padding} L ${points[0][0]} ${svgHeight - padding} Z`;

  document.getElementById('sparkPath').setAttribute('d', line);
  document.getElementById('sparkArea').setAttribute('d', area);
}

async function main(trigger = 'auto') {
  const refreshBtn = document.getElementById('refreshBtn');
  const updatedAtBadge = document.getElementById('updatedAt');
  const statusPulse = document.getElementById('statusPulse');

  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.textContent = 'Refreshing…';
  }
  if (updatedAtBadge && trigger === 'manual') {
    updatedAtBadge.textContent = 'Refreshing now…';
  }

  const res = await fetch(`./status.json?t=${Date.now()}`, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, max-age=0',
      Pragma: 'no-cache',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch status (${res.status})`);
  }

  const data = await res.json();
  const pnlEl = document.getElementById('pnlUsd');
  const pnlPctEl = document.getElementById('pnlPct');
  const pnl = Number(data.pnlUsd || 0);
  pnlEl.textContent = `$${pnl.toFixed(2)}`;
  pnlEl.className = pnl >= 0 ? 'positive' : 'negative';
  pnlPctEl.textContent = `${Number(data.pnlPct || 0).toFixed(2)}% vs base`;
  pnlPctEl.className = pnl >= 0 ? 'positive' : 'negative';

  const equity = Number(data.equityUsd || 0);
  const solBalance = Number(data.solBalance || 0);
  const usdcBalance = Number(data.usdcBalance || 0);
  const tradeCount = Number(data.tradeCount || 0);
  const netSol = Number(data.netSolAccumulated || 0);

  document.getElementById('equityUsd').textContent = `$${equity.toFixed(2)}`;
  document.getElementById('solBalance').textContent = solBalance.toFixed(6);
  document.getElementById('usdcBalance').textContent = usdcBalance.toFixed(2);
  document.getElementById('tradeCount').textContent = String(tradeCount);
  document.getElementById('netSol').textContent = netSol.toFixed(6);

  const total = Math.max(solBalance + usdcBalance, 0.000001);
  const solPct = Math.max(0, Math.min(100, (solBalance / total) * 100));
  const usdcPct = Math.max(0, 100 - solPct);
  document.getElementById('allocationSol').style.width = `${solPct}%`;
  document.getElementById('allocationUsdc').style.width = `${usdcPct}%`;

  const fetchedAt = new Date();
  if (updatedAtBadge) {
    const statusTime = data.updatedAt ? new Date(data.updatedAt).toLocaleString() : 'recently';
    updatedAtBadge.textContent = `Status ${statusTime} · Refreshed ${fetchedAt.toLocaleTimeString()}`;
  }
  if (statusPulse) {
    statusPulse.textContent = trigger === 'manual' ? 'MANUAL REFRESH OK' : 'SYNCED';
  }

  const notes = Array.isArray(data.recommendations) ? data.recommendations : [];
  const strategyBadge = document.getElementById('strategyBadge');
  if (strategyBadge) {
    const strategyText = notes.find((note) => /champion|moderate|aggressive|baseline/i.test(note)) || 'Active Strategy';
    strategyBadge.textContent = strategyText.length > 42 ? `${strategyText.slice(0, 39)}…` : strategyText;
  }

  const trade = data.latestTrade || {};
  const tradeRoot = document.getElementById('latestTrade');
  const rows = [
    ['Time', trade.timestamp ? new Date(trade.timestamp).toLocaleString() : '—'],
    ['Side', trade.baseSymbol ? `Buy ${trade.baseSymbol}` : '—'],
    ['Spent', trade.notionalUsdExecuted != null ? `$${Number(trade.notionalUsdExecuted).toFixed(2)}` : '—'],
    ['Size', trade.sizeSolExecuted != null ? Number(trade.sizeSolExecuted).toFixed(6) : '—'],
    ['Avg price', trade.avgPriceUsd != null ? `$${Number(trade.avgPriceUsd).toFixed(4)}` : '—'],
  ];
  tradeRoot.innerHTML = rows.map(([k, v]) => `<div class="kv"><span>${k}</span><b>${v}</b></div>`).join('');

  document.getElementById('recommendations').innerHTML = notes.map((n) => `<li>${n}</li>`).join('');

  drawSparkline(buildSparklineValues(data));

  if (refreshBtn) {
    refreshBtn.disabled = false;
    refreshBtn.textContent = 'Refresh';
  }
}

document.getElementById('refreshBtn')?.addEventListener('click', () => {
  main('manual').catch((err) => {
    document.body.innerHTML = `<pre style="padding:20px;color:white">${String(err)}</pre>`;
  });
});

main().catch((err) => {
  document.body.innerHTML = `<pre style="padding:20px;color:white">${String(err)}</pre>`;
});
