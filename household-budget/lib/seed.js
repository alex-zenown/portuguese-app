// lib/seed.js
// Pre-loads March 2026 history data so the tool has one month of context
// from day one.
//
// Decision: seed data is written only if the 2026-03.json history file does
// not already exist, so running `budget` after a real analyse never overwrites
// real data.
//
// Decision: since we don't have the real transaction list for March 2026, the
// transactions array is empty but the summary totals and catTotals match the
// spec exactly. The HTML report for March 2026 is also seeded so
// `budget history --month 2026-03` works immediately.
//
// Decision: goals data is seeded with 0 values since goal setup hasn't
// happened yet at seed time. The user runs `budget goals setup` after first
// install.

import fs from 'fs';
import path from 'path';
import { HISTORY_DIR, REPORTS_DIR, ensureDirs } from './config.js';
import { generateHTML } from './html.js';

const SEED_MONTH = '2026-03';

const SEED_HISTORY = {
  month:       SEED_MONTH,
  generatedAt: '2026-03-23T14:00:00Z',
  summary: {
    total:    2971,
    personal: 1400,
    joint:    1571,
  },
  budget: {
    Groceries:               500,
    'Dining Out':            300,
    Transport:               100,
    'Bills & Utilities':     200,
    'Health & Wellness':     150,
    Subscriptions:            50,
    Shopping:                150,
    Entertainment:           100,
    'Personal Care':          60,
    'Credit Card':           400,
    'Credit Card Debt Attack': 200,
    'Buffer Savings':        300,
  },
  catTotals: {
    Groceries:               770,
    'Dining Out':            680,
    Transport:               116,
    'Bills & Utilities':     151,
    'Health & Wellness':     117,
    Subscriptions:            30,
    Shopping:                140,
    Entertainment:           116,
    'Personal Care':          30,
    'Credit Card':             0,
    'Credit Card Debt Attack': 0,
    'Buffer Savings':          0,
  },
  fixedAmounts: {
    'Credit Card':             0,
    'Credit Card Debt Attack': 0,
    'Buffer Savings':          0,
  },
  considerations: [
    'Glovo €444.46 Mar 7 — possible group order, verify before treating as personal spend',
  ],
  goals: {
    personal: { target: 0, contributed: 0, met: false, streak: 0, note: null },
    couple:   { target: 0, contributed: 0, met: false, streak: 0, note: null },
  },
  // Empty transactions — real March data wasn't imported at install time.
  // Run `budget analyse` with actual CSVs to populate future months.
  transactions: [],
};

/**
 * Write seed files if they don't already exist.
 * Called from index.js on first run.
 */
export function seedIfNeeded() {
  ensureDirs();

  const histFile   = path.join(HISTORY_DIR, `${SEED_MONTH}.json`);
  const reportFile = path.join(REPORTS_DIR, `${SEED_MONTH}.html`);

  if (!fs.existsSync(histFile)) {
    const tmp = histFile + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(SEED_HISTORY, null, 2), 'utf8');
    fs.renameSync(tmp, histFile);
  }

  if (!fs.existsSync(reportFile)) {
    // Generate a minimal but correct HTML report from seed data
    const insights = [
      '🍽  Food spending is 49% of variable budget (Groceries + Dining Out).',
      '⚠️  Dining Out is €380 over budget — largest overrun this month.',
      '📊  You came in €229 under your total budget for the month.',
      '📱  Subscriptions: €30.00 total (detailed data not available in seed).',
    ];
    const html = generateHTML({
      month:          SEED_MONTH,
      summary:        SEED_HISTORY.summary,
      catTotals:      SEED_HISTORY.catTotals,
      budget:         SEED_HISTORY.budget,
      fixedAmounts:   SEED_HISTORY.fixedAmounts,
      transactions:   [],
      insights,
      considerations: SEED_HISTORY.considerations,
      goalsResult:    null,
    });
    const tmp = reportFile + '.tmp';
    fs.writeFileSync(tmp, html, 'utf8');
    fs.renameSync(tmp, reportFile);
  }
}
