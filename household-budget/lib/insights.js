// lib/insights.js
// Auto-generates insight strings from monthly report data.
//
// Decision: insights are returned as plain strings (no ANSI codes) so they can
// be embedded in both the terminal output (coloured by analyse.js) and the
// HTML report verbatim.
//
// Decision: "delivery" transactions are detected by DELIVERY_KEYWORDS against
// merchant name, not by category — Glovo etc. may land in Dining Out or
// Transport depending on exact merchant string.

import { isDelivery } from './categorise.js';
import { formatMoney, formatMonthLong, prevMonth } from './config.js';

/**
 * Generate insight strings for a monthly report.
 *
 * @param {object} p
 * @param {string} p.month              YYYY-MM
 * @param {object} p.catTotals          { category: amount }
 * @param {object} p.budget             { category: budgetAmount } or null
 * @param {object} p.fixedAmounts       { 'Credit Card': n, ... }
 * @param {Array}  p.transactions       full transaction list
 * @param {object} p.goals              evaluated goals from goals.js
 * @param {object|null} p.priorHistory  last month's history JSON, or null
 * @returns {string[]}
 */
export function generateInsights({
  month,
  catTotals,
  budget,
  fixedAmounts,
  transactions,
  goals,
  priorHistory,
}) {
  const insights = [];

  const variableTotal = Object.entries(catTotals)
    .filter(([k]) => !['Credit Card', 'Credit Card Debt Attack', 'Buffer Savings'].includes(k))
    .reduce((s, [, v]) => s + v, 0);

  const grandTotal = Object.values(catTotals).reduce((s, v) => s + v, 0)
    + Object.values(fixedAmounts).reduce((s, v) => s + v, 0);

  // --- Food dominance ---
  const groceries    = catTotals['Groceries']   || 0;
  const diningOut    = catTotals['Dining Out']  || 0;
  const deliverySpend = transactions
    .filter(t => !t.excluded && isDelivery(t.merchant))
    .reduce((s, t) => s + t.amount, 0);
  const foodTotal    = groceries + diningOut + deliverySpend;
  const foodPct      = grandTotal > 0 ? Math.round((foodTotal / grandTotal) * 100) : 0;
  if (grandTotal > 0 && (foodTotal / grandTotal) > 0.5) {
    insights.push(
      `🍽  Food spending is ${foodPct}% of your variable budget. Most households target 30–40%.`
    );
  }

  // --- Delivery vs Groceries ---
  if (deliverySpend > groceries * 0.5 && deliverySpend > 0) {
    const savingEstimate = Math.round(deliverySpend * 0.5);
    insights.push(
      `🛵  You spent ${formatMoney(deliverySpend)} on delivery vs ${formatMoney(groceries)} on groceries. ` +
      `Cooking more could save ~${formatMoney(savingEstimate)}/month.`
    );
  }

  // --- Budget overruns ---
  if (budget) {
    let biggestOverrunCat = null;
    let biggestOverrunAmt = 0;
    for (const cat of Object.keys(catTotals)) {
      const budgeted = budget[cat] || 0;
      const actual   = catTotals[cat] || 0;
      const over     = actual - budgeted;
      if (over > 0 && over > biggestOverrunAmt) {
        biggestOverrunAmt = over;
        biggestOverrunCat = cat;
      }
    }
    if (biggestOverrunCat) {
      insights.push(
        `⚠️  ${biggestOverrunCat} is ${formatMoney(biggestOverrunAmt)} over budget — your largest overrun.`
      );
    }

    // --- Budget underruns (>40% under) ---
    for (const cat of Object.keys(budget)) {
      const budgeted = budget[cat] || 0;
      const actual   = catTotals[cat] || 0;
      if (budgeted > 0 && actual < budgeted * 0.6) {
        const under = budgeted - actual;
        insights.push(
          `💡  You came ${formatMoney(under)} under on ${cat}. Consider adjusting your budget or reallocating.`
        );
      }
    }

    // --- Overall budget result ---
    const budgetTotal = Object.values(budget).reduce((s, v) => s + v, 0);
    const diff = grandTotal - budgetTotal;
    if (diff > 0) {
      insights.push(`📊  You came in ${formatMoney(diff)} over your total budget for the month.`);
    } else if (diff < 0) {
      insights.push(`📊  You came in ${formatMoney(Math.abs(diff))} under your total budget for the month.`);
    }
  }

  // --- Biggest single transaction ---
  const biggestTx = transactions
    .filter(t => !t.excluded)
    .sort((a, b) => b.amount - a.amount)[0];
  if (biggestTx && grandTotal > 0 && biggestTx.amount / grandTotal > 0.15) {
    const pct = Math.round((biggestTx.amount / grandTotal) * 100);
    insights.push(
      `💳  ${biggestTx.merchant} was your biggest single spend at ${formatMoney(biggestTx.amount)} (${pct}% of monthly total).`
    );
  }

  // --- Month-over-month delta ---
  if (priorHistory && priorHistory.summary) {
    const priorTotal = priorHistory.summary.total || 0;
    const delta      = grandTotal - priorTotal;
    const pct        = priorTotal > 0 ? Math.round(Math.abs(delta / priorTotal) * 100) : 0;
    const priorLabel = formatMonthLong(prevMonth(month));
    if (delta > 0) {
      insights.push(
        `📈  Total spend is ${formatMoney(delta)} more than ${priorLabel} (+${pct}%).`
      );
    } else if (delta < 0) {
      insights.push(
        `📉  Total spend is ${formatMoney(Math.abs(delta))} less than ${priorLabel} (-${pct}%).`
      );
    }
  }

  // --- Subscription audit ---
  const subTxns = transactions.filter(t => !t.excluded && t.category === 'Subscriptions');
  if (subTxns.length > 0) {
    const list = subTxns
      .map(t => `${t.merchant} ${formatMoney(t.amount)}`)
      .join(', ');
    insights.push(`📱  Subscriptions: ${list}`);
  }

  // --- Goals insights ---
  if (goals) {
    for (const [, goal] of Object.entries(goals)) {
      if (!goal || goal.target === 0) {
        if (goal && goal.target === 0 && goal.label) {
          insights.push(
            `🎯  Your ${goal.label} has no target set. Run: budget goals setup`
          );
        }
        continue;
      }
      if (goal.met && [3, 6, 12].includes(goal.streak)) {
        insights.push(
          `🔥  You've hit your ${goal.label} for ${goal.streak} months in a row — great consistency!`
        );
      }
      if (!goal.met && goal.target > 0) {
        const short = goal.target - goal.contributed;
        // Suggest the biggest over-budget variable category
        let suggestion = '';
        if (budget) {
          let biggestCat = null;
          let biggestOver = 0;
          for (const cat of Object.keys(catTotals)) {
            const over = (catTotals[cat] || 0) - (budget[cat] || 0);
            if (over > biggestOver) { biggestOver = over; biggestCat = cat; }
          }
          if (biggestCat) suggestion = ` Consider reducing ${biggestCat} to recover it next month.`;
        }
        insights.push(
          `🎯  You fell short of your ${goal.label} by ${formatMoney(short)} this month.${suggestion}`
        );
      }
    }
  }

  return insights;
}
