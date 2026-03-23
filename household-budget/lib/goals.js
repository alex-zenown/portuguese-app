// lib/goals.js
// Savings goal evaluation and setup.
//
// Decision: goals are evaluated AFTER savings transfer detection and the
// withdrawal clarification prompt in analyse.js. This file provides helpers
// that analyse.js calls; the actual inquirer prompts are in analyse.js so
// all user interaction stays in one place.
//
// Decision: "streak" counts consecutive calendar months where the goal was met.
// If the user runs analyse for a month that is not immediately after
// lastMetMonth, the streak resets to 1 (not 0+1) if the current month is met.

import { prevMonth } from './config.js';

/**
 * Evaluate a single goal against the confirmed contribution amount.
 *
 * @param {object} goalConfig    Goal config from config.goals.personal / couple
 * @param {string} month         YYYY-MM being analysed
 * @param {number} contributed   Confirmed contribution amount
 * @returns {{ met, streak, lastMetMonth }}  Updated values to persist
 */
export function evaluateGoal(goalConfig, month, contributed) {
  const met = goalConfig.monthlyTarget > 0 && contributed >= goalConfig.monthlyTarget;

  let streak = goalConfig.streak || 0;
  const lastMet = goalConfig.lastMetMonth;

  if (met) {
    if (lastMet === prevMonth(month)) {
      streak += 1;
    } else {
      streak = 1; // new streak (gap in history or first time)
    }
  } else {
    streak = 0;
  }

  return {
    met,
    streak,
    lastMetMonth: met ? month : (goalConfig.lastMetMonth || null),
  };
}

/**
 * Build the goals summary block for the terminal report.
 * @param {object} goalsResult   { personal: {...}, couple: {...} }
 * @returns {string[]}  Lines to print
 */
export function formatGoalsTerminal(goalsResult) {
  if (!goalsResult) return [];
  const lines = ['  ── SAVINGS GOALS ────────────────────────', ''];
  for (const [, g] of Object.entries(goalsResult)) {
    if (!g) continue;
    lines.push(`  ${g.label}`);
    lines.push(`    Target     : €${g.target.toFixed(2)} / month`);
    const metIcon = g.met ? '✅  Goal met!' : `⚠️  Short by €${(g.target - g.contributed).toFixed(2)}`;
    lines.push(`    Contributed: €${g.contributed.toFixed(2)}  ${metIcon}`);
    if (g.streak > 0) {
      lines.push(`    Streak     : 🔥 ${g.streak} month${g.streak > 1 ? 's' : ''} in a row`);
    } else {
      const last = g.lastMetMonth
        ? `last met: ${g.lastMetMonth}`
        : 'never met yet';
      lines.push(`    Streak     : 0 (${last})`);
    }
    if (g.note) lines.push(`    Note       : ${g.note}`);
    lines.push('');
  }
  return lines;
}
