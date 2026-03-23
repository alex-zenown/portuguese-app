// lib/html.js
// Generates a self-contained HTML report file.
//
// Design: dark theme (#0e0e12 background), Fraunces serif + Azeret Mono fonts
// from Google Fonts CDN (the only external dependency), green/red/amber accents.
// All data is embedded inline as JSON and rendered via vanilla JS — no external
// chart libraries. Charts use CSS progress bars and inline SVG.
//
// Decision: the daily timeline SVG is generated server-side (as a static SVG
// string) so the report works without JavaScript. The transaction table filter
// and sort controls do require JS but degrade gracefully to a full unfiltered
// table without it.

import { formatDate, formatMoney, formatMonthLong } from './config.js';
import { CATEGORIES } from './categorise.js';

/**
 * Generate a fully self-contained HTML report.
 *
 * @param {object} p
 * @param {string}   p.month
 * @param {object}   p.summary           { total, personal, joint }
 * @param {object}   p.catTotals         { category: amount }
 * @param {object}   p.budget            { category: budgetAmount } | null
 * @param {object}   p.fixedAmounts      { 'Credit Card': n, ... }
 * @param {Array}    p.transactions
 * @param {string[]} p.insights
 * @param {string[]} p.considerations
 * @param {object}   p.goalsResult       | null
 * @returns {string}  Complete HTML
 */
export function generateHTML({
  month,
  summary,
  catTotals,
  budget,
  fixedAmounts,
  transactions,
  insights,
  considerations,
  goalsResult,
}) {
  const monthLabel  = formatMonthLong(month);
  const grandTotal  = summary.total;
  const budgetTotal = budget ? Object.values(budget).reduce((s, v) => s + v, 0) : null;
  const dailyAvg    = (() => {
    // Days in the month
    const [y, m] = month.split('-').map(Number);
    const days   = new Date(y, m, 0).getDate();
    return grandTotal / days;
  })();

  // Per-day totals for timeline
  const dayTotals = {};
  for (const tx of transactions) {
    if (tx.excluded) continue;
    const day = tx.date;
    if (!dayTotals[day]) dayTotals[day] = { personal: 0, joint: 0 };
    dayTotals[day][tx.account] = (dayTotals[day][tx.account] || 0) + tx.amount;
  }

  // Top merchants
  const merchantMap = {};
  for (const tx of transactions) {
    if (tx.excluded) continue;
    const k = tx.merchant;
    if (!merchantMap[k]) merchantMap[k] = { total: 0, account: tx.account, count: 0 };
    merchantMap[k].total  += tx.amount;
    merchantMap[k].count  += 1;
    // If mixed accounts, mark as 'both'
    if (merchantMap[k].account !== tx.account) merchantMap[k].account = 'both';
  }
  const topMerchants = Object.entries(merchantMap)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 12);

  const maxDaySpend = Math.max(...Object.values(dayTotals).map(d => d.personal + d.joint), 1);

  // All days in month sorted
  const [yr, mo] = month.split('-').map(Number);
  const daysInMonth = new Date(yr, mo, 0).getDate();
  const allDays = Array.from({ length: daysInMonth }, (_, i) => {
    const d = String(i + 1).padStart(2, '0');
    return `${month}-${d}`;
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Household Report · ${monthLabel}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,700;1,9..144,400&family=Azeret+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root {
  --bg:       #0e0e12;
  --card:     #16161c;
  --card2:    #1c1c24;
  --border:   #2a2a35;
  --text:     #e8e8f0;
  --muted:    #888899;
  --green:    #3ddc84;
  --red:      #ff5c5c;
  --amber:    #ffb547;
  --personal: #ff5c5c;
  --joint:    #3ddc84;
  --serif:    'Fraunces', Georgia, serif;
  --mono:     'Azeret Mono', 'Courier New', monospace;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--mono);
  font-size: 14px;
  line-height: 1.6;
  padding: 2rem 1rem 4rem;
}
.wrap { max-width: 1100px; margin: 0 auto; }

/* ── Header ── */
.header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 2.5rem;
}
.header h1 {
  font-family: var(--serif);
  font-size: 2.4rem;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.5px;
}
.legend {
  display: flex;
  gap: 1.5rem;
  color: var(--muted);
  font-size: 12px;
}
.dot {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 50%;
  margin-right: 5px;
}
.dot-personal { background: var(--personal); }
.dot-joint    { background: var(--joint); }

/* ── Cards & Grid ── */
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
}
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
.grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; }
.grid-kpi { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem; margin-bottom: 1.25rem; }
@media (max-width: 900px) {
  .grid2 { grid-template-columns: 1fr; }
  .grid-kpi { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 600px) {
  .grid-kpi { grid-template-columns: repeat(2, 1fr); }
}

.section-title {
  font-family: var(--serif);
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 1.2rem;
}

/* ── KPI strip ── */
.kpi-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.25rem 1rem;
}
.kpi-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; }
.kpi-value { font-family: var(--serif); font-size: 1.7rem; font-weight: 700; }
.kpi-sub   { font-size: 11px; color: var(--muted); margin-top: 4px; }
.kpi-green { color: var(--green); }
.kpi-red   { color: var(--red); }
.kpi-amber { color: var(--amber); }

/* ── Progress bars ── */
.bar-row { margin-bottom: 0.9rem; }
.bar-meta {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 5px;
}
.bar-label { font-size: 13px; }
.bar-amounts { font-size: 12px; color: var(--muted); }
.bar-amounts .over { color: var(--red); }
.bar-amounts .under { color: var(--green); }
.bar-track {
  height: 8px;
  background: var(--card2);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}
.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}
.bar-fill.green { background: var(--green); }
.bar-fill.red   { background: var(--red); }
.bar-fill.none  { background: var(--muted); }

/* ── Account split bar ── */
.split-bar {
  height: 24px;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  margin-bottom: 0.75rem;
}
.split-personal { background: var(--personal); }
.split-joint    { background: var(--joint); }

/* ── Daily timeline SVG ── */
.timeline-wrap { overflow-x: auto; }
svg.timeline { display: block; }

/* ── Top merchants ── */
.merchant-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
}
.merchant-row:last-child { border-bottom: none; }
.merchant-left { display: flex; align-items: center; gap: 0.5rem; }
.merchant-name { font-size: 13px; }
.merchant-count { font-size: 11px; color: var(--muted); }
.merchant-amount { font-weight: 600; font-size: 13px; }

/* ── Insights ── */
.insight-card {
  background: var(--card2);
  border-left: 3px solid var(--amber);
  border-radius: 0 8px 8px 0;
  padding: 0.75rem 1rem;
  margin-bottom: 0.6rem;
  font-size: 13px;
  line-height: 1.5;
}

/* ── Goals ── */
.goal-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1rem;
}
.goal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}
.goal-title { font-family: var(--serif); font-size: 1rem; font-weight: 600; }
.badge {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 20px;
  background: var(--card2);
  color: var(--muted);
}
.goal-amounts {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}
.goal-contrib { font-family: var(--serif); font-size: 1.4rem; font-weight: 700; }
.goal-status-met { color: var(--green); font-weight: 600; }
.goal-status-short { color: var(--red); font-weight: 600; }
.goal-streak { font-size: 12px; margin-top: 0.5rem; }
.goal-note { font-size: 12px; color: var(--muted); margin-top: 0.4rem; font-style: italic; }

/* ── Considerations ── */
.consideration {
  background: var(--card2);
  border-left: 3px solid var(--amber);
  border-radius: 0 8px 8px 0;
  padding: 0.75rem 1rem;
  margin-bottom: 0.5rem;
  font-size: 13px;
  color: var(--amber);
}

/* ── Transaction table ── */
.table-controls {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
  align-items: center;
}
.table-controls input, .table-controls select {
  background: var(--card2);
  border: 1px solid var(--border);
  color: var(--text);
  font-family: var(--mono);
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 6px;
  outline: none;
}
.table-controls input:focus, .table-controls select:focus {
  border-color: var(--green);
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
thead th {
  text-align: left;
  padding: 8px 12px;
  color: var(--muted);
  border-bottom: 1px solid var(--border);
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}
thead th:hover { color: var(--text); }
tbody td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}
tbody tr:last-child td { border-bottom: none; }
tbody tr:hover { background: var(--card2); }
.acc-personal { color: var(--personal); }
.acc-joint    { color: var(--joint); }
.tx-amount    { font-weight: 600; text-align: right; }
.tx-cat       { font-size: 11px; color: var(--muted); }

section { margin-bottom: 2rem; }
</style>
</head>
<body>
<div class="wrap">

<!-- ── Header ── -->
<div class="header">
  <h1>Household Report · ${monthLabel}</h1>
  <div class="legend">
    <span><span class="dot dot-personal"></span>Alex · Personal</span>
    <span><span class="dot dot-joint"></span>Alex &amp; Chloe · Joint</span>
  </div>
</div>

<!-- ── KPI Strip ── -->
<section>
  <div class="grid-kpi">
    <div class="kpi-card">
      <div class="kpi-label">Total Spent</div>
      <div class="kpi-value">${formatMoney(grandTotal)}</div>
      ${budgetTotal ? `<div class="kpi-sub">Budget: ${formatMoney(budgetTotal)}</div>` : ''}
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Personal (Alex)</div>
      <div class="kpi-value kpi-red">${formatMoney(summary.personal)}</div>
      <div class="kpi-sub">${grandTotal > 0 ? Math.round((summary.personal / grandTotal) * 100) : 0}% of total</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Joint</div>
      <div class="kpi-value kpi-green">${formatMoney(summary.joint)}</div>
      <div class="kpi-sub">${grandTotal > 0 ? Math.round((summary.joint / grandTotal) * 100) : 0}% of total</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Daily Average</div>
      <div class="kpi-value">${formatMoney(dailyAvg)}</div>
      <div class="kpi-sub">per day</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">vs Budget</div>
      ${budgetTotal
        ? (() => {
            const diff = grandTotal - budgetTotal;
            const pct  = Math.round((grandTotal / budgetTotal) * 100);
            return diff >= 0
              ? `<div class="kpi-value kpi-red">+${formatMoney(diff)}</div><div class="kpi-sub">${pct}% of budget</div>`
              : `<div class="kpi-value kpi-green">${formatMoney(diff)}</div><div class="kpi-sub">${pct}% of budget</div>`;
          })()
        : `<div class="kpi-value" style="color:var(--muted)">—</div><div class="kpi-sub">no budget set</div>`
      }
    </div>
  </div>
</section>

<!-- ── Budget vs Actual + Account Split ── -->
<section>
  <div class="grid2">
    <div class="card">
      <div class="section-title">Budget vs Actual</div>
      ${CATEGORIES.map(cat => {
        const actual  = (catTotals[cat] || 0) + (cat === 'Credit Card' || cat === 'Credit Card Debt Attack' || cat === 'Buffer Savings' ? (fixedAmounts[cat] || 0) : 0);
        const bud     = budget ? (budget[cat] || 0) : 0;
        const useAmt  = ['Credit Card', 'Credit Card Debt Attack', 'Buffer Savings'].includes(cat)
          ? (fixedAmounts[cat] || 0)
          : (catTotals[cat] || 0);
        const pct     = bud > 0 ? Math.min((useAmt / bud) * 100, 100) : (useAmt > 0 ? 100 : 0);
        const over    = bud > 0 && useAmt > bud;
        const color   = over ? 'red' : (useAmt > 0 ? 'green' : 'none');
        const label   = cat === 'Credit Card Debt Attack' ? 'CC Debt Attack' : cat;
        let amtLabel  = '';
        if (bud > 0 && over) {
          amtLabel = `<span class="over">${formatMoney(useAmt)} / ${formatMoney(bud)}</span>`;
        } else if (bud > 0) {
          amtLabel = `<span class="under">${formatMoney(useAmt)} / ${formatMoney(bud)}</span>`;
        } else {
          amtLabel = `<span>${formatMoney(useAmt)}</span>`;
        }
        return `
      <div class="bar-row">
        <div class="bar-meta">
          <span class="bar-label">${label}</span>
          <span class="bar-amounts">${amtLabel}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill ${color}" style="width:${pct.toFixed(1)}%"></div>
        </div>
      </div>`;
      }).join('')}
    </div>

    <div class="card">
      <div class="section-title">Account Split</div>
      ${grandTotal > 0 ? `
      <div class="split-bar" style="margin-bottom:1rem;">
        <div class="split-personal" style="width:${((summary.personal / grandTotal) * 100).toFixed(1)}%;"></div>
        <div class="split-joint" style="flex:1;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:1.5rem;">
        <span><span class="dot dot-personal"></span>${formatMoney(summary.personal)} personal (${Math.round((summary.personal / grandTotal) * 100)}%)</span>
        <span><span class="dot dot-joint"></span>${formatMoney(summary.joint)} joint (${Math.round((summary.joint / grandTotal) * 100)}%)</span>
      </div>` : '<p style="color:var(--muted)">No transactions</p>'}

      <div class="section-title" style="margin-top:1.5rem;">Top Merchants</div>
      ${topMerchants.map(([name, data], i) => `
      <div class="merchant-row">
        <div class="merchant-left">
          <span style="color:var(--muted);font-size:11px;width:18px">#${i + 1}</span>
          <span class="dot" style="background:${data.account === 'personal' ? 'var(--personal)' : data.account === 'joint' ? 'var(--joint)' : 'var(--amber)'};"></span>
          <span class="merchant-name">${escapeHTML(name)}</span>
          <span class="merchant-count">${data.count}×</span>
        </div>
        <span class="merchant-amount">${formatMoney(data.total)}</span>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- ── Daily Timeline ── -->
<section>
  <div class="card">
    <div class="section-title">Daily Activity</div>
    <div class="timeline-wrap">
      ${generateTimelineSVG(allDays, dayTotals, maxDaySpend)}
    </div>
  </div>
</section>

<!-- ── Insights ── -->
<section>
  <div class="card">
    <div class="section-title">Insights</div>
    ${insights.length
      ? insights.map(i => `<div class="insight-card">${escapeHTML(i)}</div>`).join('')
      : '<p style="color:var(--muted)">No insights this month.</p>'
    }
  </div>
</section>

<!-- ── Savings Goals ── -->
${goalsResult ? `
<section>
  <div class="section-title" style="margin-bottom:1rem;">Savings Goals</div>
  <div class="grid2">
    ${Object.entries(goalsResult).map(([key, g]) => {
      if (!g) return '';
      const pct   = g.target > 0 ? Math.min((g.contributed / g.target) * 100, 100) : 0;
      const badge = key === 'personal' ? 'Alex' : 'Alex + Chloe';
      return `
    <div class="goal-card">
      <div class="goal-header">
        <span class="goal-title">🎯 ${escapeHTML(g.label)}</span>
        <span class="badge">${badge}</span>
      </div>
      <div class="goal-amounts">
        <span class="goal-contrib" style="color:${g.met ? 'var(--green)' : 'var(--red)'}">
          ${formatMoney(g.contributed)}
        </span>
        <span style="color:var(--muted);font-size:12px">/ ${formatMoney(g.target)} target</span>
        <span class="${g.met ? 'goal-status-met' : 'goal-status-short'}">
          ${g.met ? '✅ MET' : '⚠️ SHORT'}
        </span>
      </div>
      <div class="bar-track" style="height:10px;margin-bottom:0.5rem;">
        <div class="bar-fill ${g.met ? 'green' : 'red'}" style="width:${pct.toFixed(1)}%"></div>
      </div>
      <div style="font-size:11px;color:var(--muted);text-align:right;margin-bottom:0.5rem">${pct.toFixed(0)}%</div>
      <div class="goal-streak">
        ${g.streak > 0
          ? `🔥 ${g.streak} month${g.streak > 1 ? 's' : ''} in a row`
          : `<span style="color:var(--red)">Streak broken${g.lastMetMonth ? ` — last met ${g.lastMetMonth}` : ''}</span>`
        }
      </div>
      ${g.note ? `<div class="goal-note">${escapeHTML(g.note)}</div>` : ''}
    </div>`;
    }).join('')}
  </div>
</section>` : ''}

<!-- ── Considerations ── -->
${considerations && considerations.length ? `
<section>
  <div class="card">
    <div class="section-title">Considerations</div>
    ${considerations.map(c => `<div class="consideration">• ${escapeHTML(c)}</div>`).join('')}
  </div>
</section>` : ''}

<!-- ── Transaction Table ── -->
<section>
  <div class="card">
    <div class="section-title">All Transactions</div>
    <div class="table-controls">
      <input type="text" id="txSearch" placeholder="Search merchant…" oninput="filterTx()">
      <select id="txCat" onchange="filterTx()">
        <option value="">All categories</option>
        ${CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
        <option value="__unknown">Unknown</option>
        <option value="__excluded">Excluded</option>
      </select>
      <select id="txAcc" onchange="filterTx()">
        <option value="">All accounts</option>
        <option value="personal">Personal</option>
        <option value="joint">Joint</option>
      </select>
      <span id="txCount" style="color:var(--muted);font-size:11px;margin-left:auto;"></span>
    </div>
    <div style="overflow-x:auto;">
      <table id="txTable">
        <thead>
          <tr>
            <th onclick="sortTx('date')">Date ↕</th>
            <th onclick="sortTx('merchant')">Merchant ↕</th>
            <th onclick="sortTx('amount')">Amount ↕</th>
            <th>Category</th>
            <th>Account</th>
          </tr>
        </thead>
        <tbody id="txBody"></tbody>
      </table>
    </div>
  </div>
</section>

</div><!-- /wrap -->

<script>
const TX_DATA = ${JSON.stringify(
  transactions.map(t => ({
    date:     t.date,
    merchant: t.merchant,
    amount:   t.amount,
    category: t.category || '__unknown',
    account:  t.account,
    excluded: t.excluded,
  }))
)};

let sortKey = 'date';
let sortDir = -1;

function filterTx() {
  const q   = document.getElementById('txSearch').value.toLowerCase();
  const cat = document.getElementById('txCat').value;
  const acc = document.getElementById('txAcc').value;
  const filtered = TX_DATA.filter(t => {
    if (q && !t.merchant.toLowerCase().includes(q)) return false;
    if (cat === '__excluded') return t.excluded;
    if (cat === '__unknown')  return !t.excluded && t.category === '__unknown';
    if (cat && t.category !== cat) return false;
    if (acc && t.account !== acc) return false;
    if (!cat && !acc && t.excluded) return false; // hide excluded by default
    return true;
  });
  renderTx(filtered);
}

function sortTx(key) {
  if (sortKey === key) sortDir *= -1;
  else { sortKey = key; sortDir = key === 'amount' ? -1 : 1; }
  filterTx();
}

function renderTx(rows) {
  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey]; const bv = b[sortKey];
    if (av < bv) return -sortDir;
    if (av > bv) return  sortDir;
    return 0;
  });
  const tbody = document.getElementById('txBody');
  tbody.innerHTML = sorted.map(t => {
    const accClass = t.account === 'personal' ? 'acc-personal' : 'acc-joint';
    const catLabel = t.excluded ? '<em style="color:var(--muted)">excluded</em>'
      : (t.category === '__unknown' ? '<em style="color:var(--amber)">unknown</em>' : t.category);
    return \`<tr>
      <td>\${fmtDate(t.date)}</td>
      <td>\${esc(t.merchant)}</td>
      <td class="tx-amount">€\${t.amount.toFixed(2)}</td>
      <td class="tx-cat">\${catLabel}</td>
      <td class="\${accClass}">\${t.account}</td>
    </tr>\`;
  }).join('');
  document.getElementById('txCount').textContent = sorted.length + ' transactions';
}

function fmtDate(s) {
  if (!s) return '';
  const d = new Date(s + 'T00:00:00');
  return d.toLocaleString('en-GB', { day:'numeric', month:'short', year:'numeric' });
}
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

filterTx();
</script>
</body>
</html>`;
}

// ── helpers ──

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Generate an inline SVG daily stacked bar chart.
 * Personal spend = red (bottom), joint = green (stacked on top).
 */
function generateTimelineSVG(allDays, dayTotals, maxDaySpend) {
  const barW   = 22;
  const gap    = 4;
  const svgH   = 120;
  const labelH = 20;
  const totalH = svgH + labelH;
  const svgW   = allDays.length * (barW + gap) + gap;

  let bars = '';
  allDays.forEach((day, i) => {
    const data     = dayTotals[day] || { personal: 0, joint: 0 };
    const total    = data.personal + data.joint;
    if (total === 0) return;

    const totalH_bar = Math.max(2, (total / maxDaySpend) * svgH);
    const persH      = total > 0 ? (data.personal / total) * totalH_bar : 0;
    const jointH     = totalH_bar - persH;

    const x = gap + i * (barW + gap);
    const y = svgH - totalH_bar;

    if (persH > 0) {
      bars += `<rect x="${x}" y="${y + jointH}" width="${barW}" height="${persH.toFixed(1)}" fill="#ff5c5c" rx="2"/>`;
    }
    if (jointH > 0) {
      bars += `<rect x="${x}" y="${y}" width="${barW}" height="${jointH.toFixed(1)}" fill="#3ddc84" rx="2"/>`;
    }

    // Day label every 5 days
    const dayNum = parseInt(day.slice(-2));
    if (dayNum % 5 === 1 || dayNum === 1) {
      bars += `<text x="${x + barW / 2}" y="${totalH - 2}" text-anchor="middle" font-family="'Azeret Mono',monospace" font-size="9" fill="#888899">${dayNum}</text>`;
    }
  });

  return `<svg class="timeline" width="${svgW}" height="${totalH}" viewBox="0 0 ${svgW} ${totalH}">
  <rect width="${svgW}" height="${svgH}" fill="#16161c" rx="4"/>
  ${bars}
</svg>`;
}
