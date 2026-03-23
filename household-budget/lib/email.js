// lib/email.js
// Sends monthly reminder email via Outlook SMTP (STARTTLS on port 587).
//
// Decision: password is stored in config.json in plaintext because this is a
// single-user local tool. The setup wizard explicitly warns the user.
// We never log the password to the terminal.

import nodemailer from 'nodemailer';
import { formatMonthLong, formatMoney } from './config.js';

/**
 * Build a nodemailer transporter for Outlook.
 * @param {string} email
 * @param {string} password
 */
function makeTransport(email, password) {
  return nodemailer.createTransport({
    host:   'smtp-mail.outlook.com',
    port:   587,
    secure: false, // STARTTLS
    auth: { user: email, pass: password },
    tls: { ciphers: 'SSLv3' }, // Outlook sometimes needs this
  });
}

/**
 * Send the monthly reminder email.
 * @param {object} config  Full config object
 * @param {string} month   YYYY-MM of the month to remind about
 * @param {object|null} lastHistory  Previous month's history, or null
 */
export async function sendReminderEmail(config, month, lastHistory) {
  if (!config.email || !config.emailPassword) {
    throw new Error('Email or password not configured. Run: budget setup');
  }

  const monthLabel  = formatMonthLong(month);
  const subject     = `📅 Household Budget — Time to run your ${monthLabel} analysis`;

  let lastSummaryHTML = '<em>No prior month data available.</em>';
  if (lastHistory && lastHistory.summary) {
    const { total } = lastHistory.summary;
    const budgetTotal = lastHistory.budget
      ? Object.values(lastHistory.budget).reduce((s, v) => s + v, 0)
      : null;
    let vs = '';
    if (budgetTotal) {
      const diff = total - budgetTotal;
      vs = diff >= 0
        ? ` · <span style="color:#ff5c5c">+${formatMoney(diff)} over budget</span>`
        : ` · <span style="color:#3ddc84">${formatMoney(Math.abs(diff))} under budget</span>`;
    }
    lastSummaryHTML = `<strong>${formatMonthLong(lastHistory.month)}:</strong> ${formatMoney(total)} spent${vs}`;
  }

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;color:#1a1a2e;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:#0e0e12;border-radius:12px;padding:32px;color:#e8e8f0;">
    <h2 style="color:#3ddc84;font-family:Georgia,serif;margin:0 0 16px">
      📅 Monthly Budget Reminder
    </h2>
    <p>Hi Alex,</p>
    <p>It's the 1st — time to run your monthly household budget analysis.</p>
    <ol>
      <li>Download your Revolut CSV exports (personal + joint accounts)</li>
      <li>Open Terminal and run:<br>
        <code style="background:#16161c;padding:4px 8px;border-radius:4px;color:#ffb547;">
          budget analyse --personal personal.csv --joint joint.csv
        </code>
      </li>
    </ol>
    <p style="margin-top:24px;padding:16px;background:#16161c;border-radius:8px;">
      <strong>Last month summary:</strong><br>${lastSummaryHTML}
    </p>
    <p style="color:#888899;font-size:12px;margin-top:24px;">
      — Household Budget Tracker
    </p>
  </div>
</body>
</html>`;

  const transport = makeTransport(config.email, config.emailPassword);
  await transport.sendMail({
    from:    config.email,
    to:      config.email,
    subject,
    html,
  });
}

/**
 * Verify SMTP credentials by sending a test email.
 * @param {object} config
 */
export async function sendTestEmail(config) {
  if (!config.email || !config.emailPassword) {
    throw new Error('Email or password not configured. Run: budget setup');
  }
  const transport = makeTransport(config.email, config.emailPassword);
  await transport.verify();
  await transport.sendMail({
    from:    config.email,
    to:      config.email,
    subject: '✅ Budget Tracker — SMTP test successful',
    html:    '<p>Your email configuration is working correctly.</p><p>— Household Budget Tracker</p>',
  });
}
