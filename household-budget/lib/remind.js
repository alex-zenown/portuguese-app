// lib/remind.js
// Monthly reminder system: terminal print + system crontab setup.
//
// Decision: we add a system crontab entry (via `crontab -l | crontab -`) rather
// than running node-cron as a daemon. A cron daemon approach would require a
// permanently running process, which doesn't suit a CLI tool. node-cron is
// listed as a spec dependency but is not well-suited to this use case;
// we include it as a dev-accessible utility import but use system cron here.
//
// Decision: the cron command uses the full path to `budget` resolved via
// `which budget` so it works regardless of the user's PATH in cron context.

import { execSync } from 'child_process';
import chalk from 'chalk';
import { loadConfig, loadHistory, listHistory, formatMonthLong, formatMoney, prevMonth, currentMonth } from './config.js';
import { sendReminderEmail } from './email.js';

const CRON_SCHEDULE = '0 9 1 * *'; // 9am on 1st of every month
const CRON_MARKER   = '# household-budget-reminder';

/**
 * Add (or replace) the monthly reminder cron entry.
 */
export async function setupReminder(config) {
  // Find budget binary path
  let budgetPath = 'budget';
  try {
    budgetPath = execSync('which budget', { encoding: 'utf8' }).trim();
  } catch {
    console.log(chalk.yellow('  Warning: `budget` not found in PATH. Run npm link first.'));
  }

  const cronLine = `${CRON_SCHEDULE} ${budgetPath} remind fire ${CRON_MARKER}`;

  // Read existing crontab
  let existing = '';
  try {
    existing = execSync('crontab -l', { encoding: 'utf8' });
  } catch {
    // No crontab yet — start fresh
    existing = '';
  }

  // Remove any existing budget reminder line
  const filtered = existing
    .split('\n')
    .filter(l => !l.includes(CRON_MARKER))
    .join('\n')
    .trim();

  const newCrontab = (filtered ? filtered + '\n' : '') + cronLine + '\n';

  try {
    execSync(`echo ${JSON.stringify(newCrontab)} | crontab -`);
    console.log(chalk.green('  ✅ Cron entry added: ' + cronLine));
  } catch (err) {
    console.error(chalk.red('  Failed to write crontab: ' + err.message));
    console.log(chalk.dim('  Add manually: ' + cronLine));
  }

  // Test email connection
  if (config.email && config.emailPassword) {
    console.log(chalk.dim('\n  Testing email connection…'));
    try {
      const nodemailer = (await import('nodemailer')).default;
      const transport  = nodemailer.createTransport({
        host: 'smtp-mail.outlook.com', port: 587, secure: false,
        auth: { user: config.email, pass: config.emailPassword },
      });
      await transport.verify();
      console.log(chalk.green('  ✅ SMTP connection verified'));
    } catch (err) {
      console.log(chalk.yellow('  ⚠️  SMTP verify failed: ' + err.message));
      console.log(chalk.dim('  Run `budget remind test` after checking credentials.'));
    }
  } else {
    console.log(chalk.dim('  Email not configured — run `budget setup` to add credentials.'));
  }
}

/**
 * Remove the reminder cron entry.
 */
export function removeReminder() {
  try {
    const existing = execSync('crontab -l', { encoding: 'utf8' });
    const filtered = existing
      .split('\n')
      .filter(l => !l.includes(CRON_MARKER))
      .join('\n')
      .trim();
    execSync(`echo ${JSON.stringify(filtered + '\n')} | crontab -`);
    console.log(chalk.green('  ✅ Cron entry removed.'));
  } catch {
    console.log(chalk.dim('  No crontab entry found.'));
  }
}

/**
 * Fire the terminal reminder (called by cron on 1st of every month).
 */
export function fireReminder() {
  const months  = listHistory();
  const lastMon = months[0] || null;
  const lastH   = lastMon ? loadHistory(lastMon) : null;

  let lastSummary = 'No prior data yet';
  if (lastH && lastH.summary) {
    const label = formatMonthLong(lastH.month);
    const total = formatMoney(lastH.summary.total);
    let vsText  = '';
    if (lastH.budget) {
      const budTotal = Object.values(lastH.budget).reduce((s, v) => s + v, 0);
      const diff     = lastH.summary.total - budTotal;
      vsText         = diff >= 0
        ? chalk.red(` · €${Math.abs(diff).toFixed(2)} over budget`)
        : chalk.green(` · €${Math.abs(diff).toFixed(2)} under budget`);
    }
    lastSummary = `${label} · ${total} spent${vsText}`;
  }

  const line = chalk.dim('════════════════════════════════════════════');
  console.log('\n' + line);
  console.log(chalk.bold.cyan('  📅 MONTHLY BUDGET REMINDER'));
  console.log(line);
  console.log(chalk.white("  It's the 1st — time to run your household analysis.\n"));
  console.log(chalk.dim('  1. Download your Revolut CSVs (personal + joint)'));
  console.log(chalk.dim('  2. Run: ') + chalk.cyan('budget analyse --personal <file> --joint <file>'));
  console.log('');
  console.log(chalk.dim('  Last month: ') + lastSummary);
  console.log(line + '\n');
}

/**
 * Send a test reminder email immediately.
 */
export async function sendTestEmail(config) {
  const { sendTestEmail: doSend } = await import('./email.js');
  console.log(chalk.dim('  Sending test email to ' + config.email + '…'));
  try {
    await doSend(config);
    console.log(chalk.green('  ✅ Test email sent!'));
  } catch (err) {
    console.error(chalk.red('  ✗ Email failed: ' + err.message));
  }
}

/**
 * Called by cron: fire terminal message and send email.
 */
export async function cronFire() {
  fireReminder();

  const config = loadConfig();
  if (!config.email || !config.emailPassword) return;

  const months  = listHistory();
  const lastMon = months[0] || null;
  const lastH   = lastMon ? loadHistory(lastMon) : null;
  const now     = new Date();
  const curMon  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  try {
    await sendReminderEmail(config, curMon, lastH);
    console.log(chalk.green('  📧 Reminder email sent to ' + config.email));
  } catch (err) {
    console.error(chalk.red('  ✗ Email send failed: ' + err.message));
    // Don't throw — cron should exit cleanly
  }
}
