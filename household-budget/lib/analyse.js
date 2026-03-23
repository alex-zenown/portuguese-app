// lib/analyse.js
// Main `budget analyse` command — orchestrates all 7 steps described in spec.
//
// Decision: all user-facing prompts are in this file so the UX flow is easy
// to follow in one place. Helper modules (csv, goals, html, insights) are pure
// functions with no side effects.
//
// Decision: merchant grouping for clarification deduplicates by lowercased
// merchant name so "Pingo Doce" and "pingo doce" are treated as one group.

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import openBrowser from 'open';

import {
  loadConfig, saveConfig, loadHistory, saveHistory,
  prevMonth, currentMonth, formatMonthLong, formatDate, formatMoney,
  REPORTS_DIR,
} from './config.js';
import { parseRevolut, parseSavingsTransfers } from './csv.js';
import { categorise, VARIABLE_CATEGORIES, FIXED_CATEGORIES, isDelivery } from './categorise.js';
import { generateInsights } from './insights.js';
import { generateHTML } from './html.js';
import { evaluateGoal, formatGoalsTerminal } from './goals.js';

/**
 * Entry point for `budget analyse`.
 * @param {object} args  { personal, joint, month }
 */
export async function runAnalyse({ personal: personalFile, joint: jointFile, month }) {
  month = month || currentMonth();

  const config = loadConfig();

  // ── Step 1: Parse CSVs ──────────────────────────────────────────────────
  console.log(chalk.dim('\n  Parsing CSVs…'));

  let personalTx = [];
  let jointTx    = [];
  let personalRaw = '';

  if (!fs.existsSync(personalFile)) {
    throw new Error(`File not found: ${personalFile}. Check the path and try again.`);
  }
  if (!fs.existsSync(jointFile)) {
    throw new Error(`File not found: ${jointFile}. Check the path and try again.`);
  }

  personalRaw = fs.readFileSync(personalFile, 'utf8');
  const jointRaw = fs.readFileSync(jointFile, 'utf8');

  personalTx = parseRevolut(personalRaw, 'personal', month, config.merchantRules);
  jointTx    = parseRevolut(jointRaw,    'joint',    month, config.merchantRules);

  const allTx = [...personalTx, ...jointTx];
  console.log(chalk.dim(`  Found ${personalTx.length} personal + ${jointTx.length} joint transactions for ${formatMonthLong(month)}.`));

  // ── Step 2: Auto-categorise already done in parseRevolut ────────────────
  // Transactions with category === null need clarification.

  // ── Step 3: Conversational clarification ────────────────────────────────
  // Group null-category transactions by merchant name (case-insensitive key)
  const unknownGroups = {};
  for (const tx of allTx) {
    if (tx.category !== null) continue;
    const key = tx.merchant.toLowerCase();
    if (!unknownGroups[key]) unknownGroups[key] = [];
    unknownGroups[key].push(tx);
  }

  const unknownKeys = Object.keys(unknownGroups);
  if (unknownKeys.length > 0) {
    console.log('');
    for (const key of unknownKeys) {
      const group  = unknownGroups[key];
      const sample = group[0];
      const totalAmt = group.reduce((s, t) => s + t.amount, 0);

      console.log(chalk.dim('────────────────────────────────────────────'));
      console.log(chalk.bold.yellow('  ❓ Unknown merchant found'));
      console.log(chalk.dim('────────────────────────────────────────────'));
      console.log(`  Merchant : ${chalk.white(sample.merchant)}`);
      console.log(`  Account  : ${sample.account === 'personal' ? chalk.red('Personal') : chalk.green('Joint')}`);
      if (group.length === 1) {
        console.log(`  Amount   : ${chalk.white(formatMoney(sample.amount))}`);
        console.log(`  Date     : ${chalk.white(formatDate(sample.date))}`);
      } else {
        console.log(`  Amounts  : ${chalk.white(group.map(t => formatMoney(t.amount)).join(', '))} (${group.length} transactions, total ${formatMoney(totalAmt)})`);
      }
      console.log('');

      const catChoices = VARIABLE_CATEGORIES.map((c, i) => ({ name: `${i + 1}. ${c}`, value: c }));
      catChoices.push({ name: '10. Skip (exclude from report)', value: '__skip' });

      const { pickedCat } = await inquirer.prompt([{
        type:    'list',
        name:    'pickedCat',
        message: 'What category is this?',
        choices: catChoices,
        pageSize: 12,
      }]);

      if (pickedCat === '__skip') {
        for (const tx of group) tx.excluded = true;
        continue;
      }

      // Apply category to all transactions in this group
      for (const tx of group) tx.category = pickedCat;

      // Offer to save rule permanently
      const { saveRule } = await inquirer.prompt([{
        type:    'confirm',
        name:    'saveRule',
        message: `Save rule permanently? "${sample.merchant}" → ${pickedCat}`,
        default: true,
      }]);

      if (saveRule) {
        config.merchantRules[sample.merchant.toLowerCase()] = pickedCat;
        saveConfig(config);
        console.log(chalk.green(`  ✅ Rule saved.`));
      }

      console.log('');
    }
  }

  // ── Savings goal detection (runs before considerations) ─────────────────
  const goalsResult = await evaluateGoalsInteractive(config, month, personalRaw);

  // ── Step 4: Considerations ───────────────────────────────────────────────
  const considerations = [];
  console.log('');
  console.log(chalk.dim('────────────────────────────────────────────'));
  console.log(chalk.bold('  📝 Any considerations to flag this month?'));
  console.log(chalk.dim('────────────────────────────────────────────'));
  console.log(chalk.dim('  These are noted in the report but NOT excluded from totals.'));
  console.log(chalk.dim('  (Use Skip in clarification to fully exclude a transaction.)\n'));

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const prompt = considerations.length === 0
      ? 'Add a note (or press Enter to skip)'
      : 'Add another? (or Enter to finish)';

    const { note } = await inquirer.prompt([{
      type:    'input',
      name:    'note',
      message: prompt,
    }]);

    const trimmed = note.trim();
    if (!trimmed) break;
    considerations.push(trimmed);
  }

  // ── Step 5: Build summary ────────────────────────────────────────────────
  const catTotals = {};
  for (const cat of VARIABLE_CATEGORIES) catTotals[cat] = 0;

  for (const tx of allTx) {
    if (tx.excluded) continue;
    if (!tx.category) continue;
    if (FIXED_CATEGORIES.includes(tx.category)) continue;
    catTotals[tx.category] = (catTotals[tx.category] || 0) + tx.amount;
  }

  const fixedAmounts = config.fixedAmounts || {};
  const budget       = config.budgets?.[month] || null;

  // Grand total = variable categories + fixed amounts
  const variableTotal = Object.values(catTotals).reduce((s, v) => s + v, 0);
  const fixedTotal    = Object.values(fixedAmounts).reduce((s, v) => s + v, 0);
  const grandTotal    = variableTotal + fixedTotal;

  const personalTotal = allTx
    .filter(t => !t.excluded && t.account === 'personal')
    .reduce((s, t) => s + t.amount, 0);
  const jointTotal = allTx
    .filter(t => !t.excluded && t.account === 'joint')
    .reduce((s, t) => s + t.amount, 0);

  const summary = {
    total:    grandTotal,
    personal: personalTotal,
    joint:    jointTotal,
  };

  // ── Step 6: Terminal summary ─────────────────────────────────────────────
  printTerminalReport({
    month, summary, catTotals, budget, fixedAmounts, allTx,
    considerations, goalsResult,
  });

  // ── Step 7: Generate HTML + save history ─────────────────────────────────
  const priorHistory = loadHistory(prevMonth(month));
  const insights     = generateInsights({
    month, catTotals, budget, fixedAmounts, transactions: allTx,
    goals: goalsResult, priorHistory,
  });

  const htmlContent = generateHTML({
    month, summary, catTotals, budget, fixedAmounts,
    transactions: allTx, insights, considerations, goalsResult,
  });

  const reportPath = path.join(REPORTS_DIR, `${month}.html`);
  fs.writeFileSync(reportPath, htmlContent, 'utf8');

  // Save history
  const historyData = {
    month,
    generatedAt: new Date().toISOString(),
    summary,
    budget:      budget || {},
    catTotals,
    fixedAmounts,
    considerations,
    goals:       goalsResult
      ? Object.fromEntries(
          Object.entries(goalsResult).map(([k, g]) => [
            k,
            g
              ? { target: g.target, contributed: g.contributed, met: g.met, streak: g.streak, note: g.note || null }
              : null,
          ])
        )
      : {},
    transactions: allTx,
  };
  saveHistory(month, historyData);

  const line = chalk.dim('════════════════════════════════════════════');
  console.log(`\n  ${chalk.dim('Report saved →')} ${chalk.cyan(reportPath)}`);
  console.log(line + '\n');

  // Open HTML in browser
  try {
    await openBrowser(reportPath);
  } catch {
    console.log(chalk.dim('  (Could not auto-open browser — open the file manually.)'));
  }
}

// ── Terminal report printer ────────────────────────────────────────────────

function printTerminalReport({ month, summary, catTotals, budget, fixedAmounts, allTx, considerations, goalsResult }) {
  const grandTotal  = summary.total;
  const budgetTotal = budget ? Object.values(budget).reduce((s, v) => s + v, 0) : null;

  const line    = chalk.dim('════════════════════════════════════════════');
  const divider = chalk.dim('  ─────────────────────────────────────────');

  console.log('\n' + line);
  console.log(chalk.bold(`  HOUSEHOLD REPORT · ${formatMonthLong(month).toUpperCase()}`));
  console.log(line);

  // Overall bar
  const budBar = budgetTotal
    ? ' ' + progressBar(grandTotal, budgetTotal, 16) + ` Budget: ${formatMoney(budgetTotal)}`
    : '';
  console.log(`\n  Total Spent     ${chalk.bold.white(formatMoney(grandTotal).padEnd(10))}${budBar}`);
  console.log(`  PERSONAL (Alex) ${chalk.red(formatMoney(summary.personal).padEnd(10))} (${Math.round((summary.personal / grandTotal) * 100)}%)`);
  console.log(`  JOINT           ${chalk.green(formatMoney(summary.joint).padEnd(10))} (${Math.round((summary.joint / grandTotal) * 100)}%)`);

  console.log('\n' + chalk.dim('  ── BY CATEGORY ──────────────────────────') + '\n');

  // All 12 categories
  const allCats = [...Object.keys(catTotals), ...Object.keys(fixedAmounts)];
  const catOrder = [
    'Groceries', 'Dining Out', 'Transport', 'Bills & Utilities',
    'Health & Wellness', 'Subscriptions', 'Shopping', 'Entertainment',
    'Personal Care', 'Credit Card', 'Credit Card Debt Attack', 'Buffer Savings',
  ];

  for (const cat of catOrder) {
    const actual  = FIXED_CATEGORIES.includes(cat)
      ? (fixedAmounts[cat] || 0)
      : (catTotals[cat] || 0);
    const bud     = budget?.[cat] || 0;
    const label   = (cat === 'Credit Card Debt Attack' ? 'CC Debt Attack' : cat).padEnd(17);
    const amtStr  = formatMoney(actual).padEnd(7);

    if (bud > 0) {
      const diff   = actual - bud;
      const icon   = diff > 0 ? chalk.red('⚠️  OVER') : chalk.green('✅  under');
      const diffStr = diff > 0
        ? chalk.red(`by ${formatMoney(diff)}`)
        : chalk.green(`by ${formatMoney(Math.abs(diff))}`);
      if (Math.abs(diff) < 0.01) {
        console.log(`  ${label} ${chalk.white(amtStr)} / ${formatMoney(bud).padEnd(7)} ${chalk.green('✅  on budget')}`);
      } else {
        console.log(`  ${label} ${chalk.white(amtStr)} / ${formatMoney(bud).padEnd(7)} ${icon} ${diffStr}`);
      }
    } else {
      console.log(`  ${label} ${chalk.white(amtStr)}`);
    }
  }

  // Insights
  const priorHistory = loadHistory(prevMonth(month));
  const insights     = generateInsights({
    month, catTotals, budget, fixedAmounts, transactions: allTx,
    goals: goalsResult, priorHistory,
  });

  if (insights.length) {
    console.log('\n' + chalk.dim('  ── INSIGHTS ─────────────────────────────') + '\n');
    for (const ins of insights) {
      console.log(`  ${ins}`);
    }
  }

  // Goals
  if (goalsResult) {
    const goalLines = formatGoalsTerminal(goalsResult);
    if (goalLines.length) {
      console.log('');
      for (const l of goalLines) console.log(l);
    }
  }

  // Considerations
  if (considerations.length) {
    console.log('\n' + chalk.dim('  ── CONSIDERATIONS ───────────────────────') + '\n');
    for (const c of considerations) {
      console.log(chalk.yellow(`  • ${c}`));
    }
  }

  console.log('\n' + line);
}

// ── Goals interactive evaluation ──────────────────────────────────────────

async function evaluateGoalsInteractive(config, month, personalRaw) {
  const goals = config.goals;
  if (!goals) return null;

  const result = {};

  for (const [key, goalCfg] of Object.entries(goals)) {
    if (!goalCfg.monthlyTarget || goalCfg.monthlyTarget === 0) {
      result[key] = {
        label:       goalCfg.label,
        target:      0,
        contributed: 0,
        met:         false,
        streak:      0,
        lastMetMonth: goalCfg.lastMetMonth || null,
        note:        null,
      };
      continue;
    }

    // Only scan personal CSV for savings (spec: joint not used)
    if (!goalCfg.potKeyword) {
      // No pot keyword — manual confirm
      console.log('');
      console.log(chalk.dim('────────────────────────────────────────────'));
      console.log(chalk.bold(`  💰 ${goalCfg.label} — manual confirmation`));
      console.log(chalk.dim('────────────────────────────────────────────'));
      const { contributed } = await inquirer.prompt([{
        type:    'number',
        name:    'contributed',
        message: `How much did you contribute toward "${goalCfg.label}" this month? (€)`,
        default: 0,
        validate: v => (!isNaN(v) && v >= 0) || 'Enter a number ≥ 0',
      }]);
      const { note } = await inquirer.prompt([{
        type:    'input',
        name:    'note',
        message: 'Note (optional, press Enter to skip)',
      }]);

      const evaluated = evaluateGoal(goalCfg, month, contributed);
      config.goals[key].streak       = evaluated.streak;
      config.goals[key].lastMetMonth = evaluated.lastMetMonth;

      result[key] = {
        label:       goalCfg.label,
        target:      goalCfg.monthlyTarget,
        contributed,
        met:         evaluated.met,
        streak:      evaluated.streak,
        lastMetMonth: evaluated.lastMetMonth,
        note:        note.trim() || null,
      };
      continue;
    }

    // Pot keyword — scan CSV
    const { deposits, withdrawals } = parseSavingsTransfers(
      personalRaw, goalCfg.potKeyword, month
    );

    const totalDeposits    = deposits.reduce((s, t) => s + t.amount, 0);
    const totalWithdrawals = withdrawals.reduce((s, t) => s + t.amount, 0);
    const netContribution  = totalDeposits - totalWithdrawals;

    let confirmed = netContribution;
    let note      = null;

    if (totalDeposits > 0 || totalWithdrawals > 0) {
      console.log('');
      console.log(chalk.dim('────────────────────────────────────────────'));
      console.log(chalk.bold(`  💰 Savings pot activity detected — ${goalCfg.potKeyword}`));
      console.log(chalk.dim('────────────────────────────────────────────'));
      console.log(`  Deposits this month : ${chalk.green(formatMoney(totalDeposits))} (${deposits.length} transfer${deposits.length !== 1 ? 's' : ''})`);
      if (totalWithdrawals > 0) {
        const wdDates = withdrawals.map(w => formatDate(w.date)).join(', ');
        console.log(`  Withdrawals         : ${chalk.red(formatMoney(totalWithdrawals))} (${withdrawals.length} transfer${withdrawals.length !== 1 ? 's' : ''} on ${wdDates})`);
        console.log(`  Net contribution    : ${chalk.white(formatMoney(netContribution))}`);
        console.log('');

        const { countAs } = await inquirer.prompt([{
          type:    'list',
          name:    'countAs',
          message: 'How should we count this toward your goal?',
          choices: [
            { name: `1. Net only (${formatMoney(netContribution)}) — deposits minus withdrawals`, value: 'net' },
            { name: `2. Deposits only (${formatMoney(totalDeposits)}) — ignore the withdrawal`,  value: 'deposits' },
            { name: '3. Zero — this month was a wash, don\'t count it',                          value: 'zero' },
          ],
        }]);

        confirmed = countAs === 'net'      ? netContribution
                  : countAs === 'deposits' ? totalDeposits
                  : 0;

        const { noteText } = await inquirer.prompt([{
          type:    'input',
          name:    'noteText',
          message: 'Note to add? (e.g. "withdrew €150 for car repair") or Enter to skip',
        }]);
        note = noteText.trim() || null;
      } else {
        // Only deposits, no withdrawals
        confirmed = totalDeposits;
        console.log(`\n  ${chalk.green(formatMoney(totalDeposits))} confirmed contribution (${deposits.length} deposit${deposits.length !== 1 ? 's' : ''}).`);
      }
    } else {
      console.log(chalk.dim(`\n  No savings transfers found for "${goalCfg.potKeyword}" in ${formatMonthLong(month)}.`));
      confirmed = 0;
    }

    const evaluated = evaluateGoal(goalCfg, month, confirmed);
    config.goals[key].streak       = evaluated.streak;
    config.goals[key].lastMetMonth = evaluated.lastMetMonth;

    result[key] = {
      label:       goalCfg.label,
      target:      goalCfg.monthlyTarget,
      contributed: confirmed,
      met:         evaluated.met,
      streak:      evaluated.streak,
      lastMetMonth: evaluated.lastMetMonth,
      note,
    };
  }

  saveConfig(config); // persist updated streaks
  return result;
}

// ── Progress bar helper ────────────────────────────────────────────────────

function progressBar(actual, budget, width = 16) {
  const pct   = Math.min(actual / budget, 1);
  const filled = Math.round(pct * width);
  const empty  = width - filled;
  const bar    = '█'.repeat(filled) + '░'.repeat(empty);
  return chalk.green('[') + (actual > budget ? chalk.red(bar) : chalk.green(bar)) + chalk.green(']');
}
