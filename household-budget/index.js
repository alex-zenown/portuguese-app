#!/usr/bin/env node

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  Household Budget Tracker — First-run instructions                  ║
// ║                                                                      ║
// ║  1. cd ~/household-budget                                            ║
// ║  2. npm install                                                      ║
// ║  3. npm link                                                         ║
// ║  4. budget setup        ← enter email + fixed amounts               ║
// ║  5. budget set          ← set budgets for the coming month          ║
// ║  6. budget remind setup ← activate monthly reminders                ║
// ║  7. budget analyse --personal personal.csv --joint joint.csv        ║
// ╚══════════════════════════════════════════════════════════════════════╝

import chalk from 'chalk';
import inquirer from 'inquirer';

import {
  loadConfig, saveConfig, loadHistory, listHistory,
  currentMonth, nextMonth, prevMonth, formatMonthLong, formatMoney,
  CONFIG_FILE, REPORTS_DIR,
} from './lib/config.js';
import { VARIABLE_CATEGORIES, FIXED_CATEGORIES } from './lib/categorise.js';
import { runAnalyse } from './lib/analyse.js';
import { setupReminder, removeReminder, fireReminder, sendTestEmail, cronFire } from './lib/remind.js';
import { seedIfNeeded } from './lib/seed.js';

import path from 'path';
import fs from 'fs';

// ── Bootstrap ──────────────────────────────────────────────────────────────

seedIfNeeded();

// ── CLI Dispatch ───────────────────────────────────────────────────────────

const [,, command, ...rawArgs] = process.argv;

// Parse --key value flags from rawArgs
function parseFlags(args) {
  const flags = {};
  const pos   = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      flags[key] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
    } else {
      pos.push(args[i]);
    }
  }
  return { flags, pos };
}

const { flags, pos } = parseFlags(rawArgs);

// ── Main switch ────────────────────────────────────────────────────────────

(async () => {
  try {
    switch (command) {

      // ── budget setup ──────────────────────────────────────────────────
      case 'setup':
        await runSetup();
        break;

      // ── budget set [--month YYYY-MM] ──────────────────────────────────
      case 'set':
        await runSet(flags.month || nextMonth(currentMonth()));
        break;

      // ── budget analyse --personal <f> --joint <f> [--month YYYY-MM] ──
      case 'analyse':
      case 'analyze': {
        if (!flags.personal) die('Missing --personal <file.csv>');
        if (!flags.joint)    die('Missing --joint <file.csv>');
        await runAnalyse({
          personal: flags.personal,
          joint:    flags.joint,
          month:    flags.month || currentMonth(),
        });
        break;
      }

      // ── budget history [--month YYYY-MM] ─────────────────────────────
      case 'history':
        await runHistory(flags.month || null);
        break;

      // ── budget remind setup | fire | test | remove ────────────────────
      case 'remind': {
        const sub = pos[0];
        const cfg = loadConfig();
        if (sub === 'setup')  { await setupReminder(cfg); break; }
        if (sub === 'fire')   { await cronFire();          break; }
        if (sub === 'test')   { await sendTestEmail(cfg);  break; }
        if (sub === 'remove') { removeReminder();          break; }
        die('Usage: budget remind [setup|fire|test|remove]');
        break;
      }

      // ── budget goals setup | set [--month YYYY-MM] ───────────────────
      case 'goals': {
        const sub = pos[0];
        if (sub === 'setup') { await runGoalsSetup();                      break; }
        if (sub === 'set')   { await runGoalsSet(flags.month || nextMonth(currentMonth())); break; }
        die('Usage: budget goals [setup|set]');
        break;
      }

      // ── budget help / default ─────────────────────────────────────────
      case undefined:
      case 'help':
      case '--help':
      case '-h':
        printHelp();
        break;

      default:
        console.error(chalk.red(`  Unknown command: ${command}`));
        printHelp();
        process.exit(1);
    }
  } catch (err) {
    console.error(chalk.red('\n  ✗ ' + err.message));
    process.exit(1);
  }
})();

// ── Commands ───────────────────────────────────────────────────────────────

async function runSetup() {
  console.log('\n' + chalk.bold('  🏠 Household Budget — First-time Setup\n'));
  const config = loadConfig();

  const answers = await inquirer.prompt([
    {
      type:    'input',
      name:    'email',
      message: 'Your email address (Outlook/Hotmail for reminders):',
      default: config.email || '',
      validate: v => v.includes('@') || 'Enter a valid email',
    },
    {
      type:    'password',
      name:    'emailPassword',
      message: 'Outlook password or app password (stored in plaintext locally — see warning):',
      mask:    '*',
    },
  ]);

  console.log(chalk.yellow('\n  ⚠️  Note: Your email password is stored in plaintext in ~/.household-budget/config.json'));
  console.log(chalk.dim('  Ensure that file has restricted permissions (chmod 600 ~/.household-budget/config.json).\n'));

  console.log(chalk.bold('  Fixed monthly amounts (these are always added to every report):\n'));

  const fixedAnswers = await inquirer.prompt([
    {
      type:    'number',
      name:    'creditCard',
      message: 'Monthly Credit Card payment (€):',
      default: config.fixedAmounts?.['Credit Card'] || 0,
    },
    {
      type:    'number',
      name:    'ccDebt',
      message: 'Monthly Credit Card Debt Attack (€):',
      default: config.fixedAmounts?.['Credit Card Debt Attack'] || 0,
    },
    {
      type:    'number',
      name:    'bufferSavings',
      message: 'Monthly Buffer Savings (€):',
      default: config.fixedAmounts?.['Buffer Savings'] || 0,
    },
  ]);

  config.email       = answers.email;
  if (answers.emailPassword) config.emailPassword = answers.emailPassword;
  config.fixedAmounts = {
    'Credit Card':             Number(fixedAnswers.creditCard)    || 0,
    'Credit Card Debt Attack': Number(fixedAnswers.ccDebt)        || 0,
    'Buffer Savings':          Number(fixedAnswers.bufferSavings) || 0,
  };

  saveConfig(config);
  console.log(chalk.green('\n  ✅ Config saved to ' + CONFIG_FILE));
  console.log(chalk.dim('  Next: run `budget set` to enter your budgets.\n'));

  // Suggest chmod
  try {
    fs.chmodSync(CONFIG_FILE, 0o600);
  } catch { /* non-critical */ }
}

async function runSet(month) {
  const config   = loadConfig();
  const prev     = prevMonth(month);
  const prevBudg = config.budgets?.[prev] || {};
  const curBudg  = config.budgets?.[month] || {};
  const monthLabel = formatMonthLong(month);

  console.log('\n' + chalk.bold(`  📋 Set budgets for ${monthLabel}\n`));
  console.log(chalk.dim('  (Press Enter to keep the current value)\n'));

  const newBudget = {};
  let runningTotal = 0;

  for (const cat of VARIABLE_CATEGORIES) {
    const currentVal = curBudg[cat] ?? prevBudg[cat] ?? 0;
    const { value } = await inquirer.prompt([{
      type:    'input',
      name:    'value',
      message: `${cat.padEnd(22)} [current: ${formatMoney(currentVal)}]`,
      default: currentVal > 0 ? String(currentVal) : '0',
      validate: v => (!isNaN(Number(v)) && Number(v) >= 0) || 'Enter a number',
    }]);
    newBudget[cat] = Number(value) || 0;
    runningTotal  += newBudget[cat];
    console.log(chalk.dim(`  Running variable total: ${formatMoney(runningTotal)}`));
  }

  const fixed = config.fixedAmounts || {};
  console.log(chalk.dim('\n  Fixed amounts (from config — edit with `budget setup`):'));
  for (const cat of FIXED_CATEGORIES) {
    console.log(chalk.dim(`    ${cat.padEnd(26)} ${formatMoney(fixed[cat] || 0)}  (fixed)`));
    newBudget[cat] = fixed[cat] || 0;
  }

  const grandTotal = runningTotal + Object.values(fixed).reduce((s, v) => s + v, 0);

  if (!config.budgets) config.budgets = {};
  config.budgets[month] = newBudget;
  saveConfig(config);

  console.log(chalk.green(`\n  ✅ Budget saved for ${monthLabel}. Total: ${formatMoney(grandTotal)}\n`));
}

async function runHistory(specificMonth) {
  if (specificMonth) {
    // Open existing report in browser
    const reportPath = path.join(REPORTS_DIR, `${specificMonth}.html`);
    if (!fs.existsSync(reportPath)) {
      die(`No report found for ${specificMonth}. Run: budget analyse first.`);
    }
    const { default: openBrowser } = await import('open');
    await openBrowser(reportPath);
    return;
  }

  const months = listHistory();
  if (months.length === 0) {
    console.log(chalk.dim('\n  No history yet. Run `budget analyse` to get started.\n'));
    return;
  }

  const line = chalk.dim('  ───────────────────────────────────────────────────────────────');
  console.log('\n');
  console.log(chalk.bold('  MONTH          TOTAL      vs BUDGET   PERSONAL    JOINT        PERSONAL GOAL   COUPLE GOAL'));
  console.log(line);

  for (const m of months) {
    const h = loadHistory(m);
    if (!h) continue;

    const label   = formatMonthLong(m).padEnd(14);
    const total   = formatMoney(h.summary?.total || 0).padEnd(10);

    let vsText = chalk.dim('—         ');
    if (h.budget && h.summary) {
      const budTotal = Object.values(h.budget).reduce((s, v) => s + v, 0);
      const diff     = (h.summary.total || 0) - budTotal;
      vsText = diff > 0
        ? chalk.red(`+${formatMoney(diff)}`).padEnd(18)
        : chalk.green(`${formatMoney(diff)}`).padEnd(18);
    }

    const personal = formatMoney(h.summary?.personal || 0).padEnd(11);
    const joint    = formatMoney(h.summary?.joint    || 0).padEnd(12);

    // Goals columns
    let pgText = chalk.dim('—          ');
    let cgText = chalk.dim('—');
    if (h.goals) {
      const pg = h.goals.personal;
      const cg = h.goals.couple;
      if (pg) {
        pgText = pg.met
          ? chalk.green(`✅ 🔥×${pg.streak}`).padEnd(15)
          : chalk.yellow(`⚠️  ${formatMoney(pg.contributed)}/${formatMoney(pg.target)}`).padEnd(15);
      }
      if (cg) {
        cgText = cg.met
          ? chalk.green(`✅ 🔥×${cg.streak}`)
          : chalk.yellow(`⚠️  ${formatMoney(cg.contributed)}/${formatMoney(cg.target)}`);
      }
    }

    console.log(`  ${label} ${total} ${vsText} ${personal} ${joint} ${pgText} ${cgText}`);
  }
  console.log(line + '\n');
}

async function runGoalsSetup() {
  const config = loadConfig();
  console.log('\n' + chalk.bold('  🎯 Savings Goals Setup\n'));

  for (const [key, goal] of Object.entries(config.goals || {})) {
    const typeLabel = key === 'personal' ? 'Personal (Alex)' : 'Couple (Alex & Chloe)';
    console.log(chalk.dim('────────────────────────────────────────────'));
    console.log(chalk.bold(`  🎯 ${typeLabel}\n`));

    const answers = await inquirer.prompt([
      {
        type:    'input',
        name:    'label',
        message: 'Goal label:',
        default: goal.label,
      },
      {
        type:    'number',
        name:    'monthlyTarget',
        message: 'Monthly contribution target (€):',
        default: goal.monthlyTarget || 0,
      },
    ]);

    let potKeyword = goal.potKeyword || null;

    if (key === 'personal') {
      const { hasPot } = await inquirer.prompt([{
        type:    'confirm',
        name:    'hasPot',
        message: 'Do you have a Revolut savings pot for this? (detected from CSV transfers)',
        default: !!goal.potKeyword,
      }]);
      if (hasPot) {
        const { kw } = await inquirer.prompt([{
          type:    'input',
          name:    'kw',
          message: 'Keyword to match in Revolut transfer Descrição (e.g. "buffer"):',
          default: goal.potKeyword || 'buffer',
          validate: v => v.trim().length > 0 || 'Required',
        }]);
        potKeyword = kw.trim().toLowerCase();
      } else {
        potKeyword = null;
      }
    } else {
      const { hasPot } = await inquirer.prompt([{
        type:    'confirm',
        name:    'hasPot',
        message: 'Do you have a savings pot for this goal?',
        default: !!goal.potKeyword,
      }]);
      if (hasPot) {
        const { kw } = await inquirer.prompt([{
          type:    'input',
          name:    'kw',
          message: 'Keyword to match in CSV:',
          default: goal.potKeyword || '',
          validate: v => v.trim().length > 0 || 'Required',
        }]);
        potKeyword = kw.trim().toLowerCase();
      } else {
        potKeyword = null;
        console.log(chalk.dim("  (You'll confirm the contribution manually each month during analyse.)"));
      }
    }

    config.goals[key] = {
      ...goal,
      label:         answers.label,
      monthlyTarget: Number(answers.monthlyTarget) || 0,
      potKeyword,
    };
  }

  saveConfig(config);
  console.log(chalk.green('\n  ✅ Goals saved.\n'));
}

async function runGoalsSet(month) {
  const config = loadConfig();
  const monthLabel = formatMonthLong(month);
  console.log('\n' + chalk.bold(`  🎯 Update goal targets for ${monthLabel}\n`));

  for (const [key, goal] of Object.entries(config.goals || {})) {
    const { target } = await inquirer.prompt([{
      type:    'number',
      name:    'target',
      message: `${goal.label} — monthly target (€):`,
      default: goal.monthlyTarget || 0,
    }]);
    config.goals[key].monthlyTarget = Number(target) || 0;
  }

  saveConfig(config);
  console.log(chalk.green('\n  ✅ Goal targets updated.\n'));
}

// ── Help ───────────────────────────────────────────────────────────────────

function printHelp() {
  console.log(`
${chalk.bold('  🏠 Household Budget Tracker')} ${chalk.dim('— Alex & Chloe · Lisbon')}

${chalk.bold('  COMMANDS')}

  ${chalk.cyan('budget setup')}
    First-run wizard: email, password, fixed amounts.

  ${chalk.cyan('budget set [--month YYYY-MM]')}
    Set category budgets (defaults to next month).

  ${chalk.cyan('budget analyse --personal <file> --joint <file> [--month YYYY-MM]')}
    Parse Revolut CSVs, categorise, generate report.

  ${chalk.cyan('budget history [--month YYYY-MM]')}
    Show all months or open a specific month's report.

  ${chalk.cyan('budget remind setup')}    Activate 1st-of-month cron + email reminder.
  ${chalk.cyan('budget remind test')}     Send a test email immediately.
  ${chalk.cyan('budget remind fire')}     Print the monthly terminal reminder now.
  ${chalk.cyan('budget remind remove')}   Remove the cron entry.

  ${chalk.cyan('budget goals setup')}     Configure savings goals and pot keywords.
  ${chalk.cyan('budget goals set')}       Update monthly targets.

${chalk.bold('  DATA')}  ${chalk.dim('~/.household-budget/')}

  `);
}

// ── Utility ────────────────────────────────────────────────────────────────

function die(msg) {
  throw new Error(msg);
}
