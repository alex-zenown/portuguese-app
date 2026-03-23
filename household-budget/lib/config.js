// lib/config.js
// Config file management for ~/.household-budget/config.json
//
// Decision: atomic writes use write-to-temp-then-rename pattern so a crash
// mid-write never corrupts the live config.
//
// Decision: CONFIG_DIR is always ~/.household-budget/ (tilde expanded via
// os.homedir()). The tool is single-user by design.

import fs from 'fs';
import path from 'path';
import os from 'os';

export const CONFIG_DIR   = path.join(os.homedir(), '.household-budget');
export const CONFIG_FILE  = path.join(CONFIG_DIR, 'config.json');
export const HISTORY_DIR  = path.join(CONFIG_DIR, 'history');
export const REPORTS_DIR  = path.join(CONFIG_DIR, 'reports');

const DEFAULT_CONFIG = {
  email: '',
  emailPassword: '',          // stored in plaintext — user is warned during setup
  merchantRules: {
    'pingo doce': 'Groceries',
    'uber': 'Transport',
    'spotify': 'Subscriptions',
  },
  fixedAmounts: {
    'Credit Card': 0,
    'Credit Card Debt Attack': 0,
    'Buffer Savings': 0,
  },
  budgets: {},
  goals: {
    personal: {
      label: 'Personal Savings (Buffer Pot)',
      type: 'personal',
      monthlyTarget: 0,
      potKeyword: null,
      streak: 0,
      lastMetMonth: null,
    },
    couple: {
      label: 'Couple Goal',
      type: 'couple',
      monthlyTarget: 0,
      potKeyword: null,
      streak: 0,
      lastMetMonth: null,
    },
  },
};

/** Ensure all data directories exist */
export function ensureDirs() {
  fs.mkdirSync(CONFIG_DIR,   { recursive: true });
  fs.mkdirSync(HISTORY_DIR,  { recursive: true });
  fs.mkdirSync(REPORTS_DIR,  { recursive: true });
}

/**
 * Load config, auto-creating with defaults if missing.
 * Deep-merges loaded values over defaults so new keys are always present.
 */
export function loadConfig() {
  ensureDirs();
  if (!fs.existsSync(CONFIG_FILE)) {
    saveConfig(DEFAULT_CONFIG);
    return structuredClone(DEFAULT_CONFIG);
  }
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    const loaded = JSON.parse(raw);
    // Deep-merge: defaults provide any keys missing from the stored file
    return deepMerge(structuredClone(DEFAULT_CONFIG), loaded);
  } catch {
    console.error('Warning: config.json is unreadable — recreating from defaults.');
    saveConfig(DEFAULT_CONFIG);
    return structuredClone(DEFAULT_CONFIG);
  }
}

/**
 * Atomically save config: write to .tmp then rename.
 * @param {object} config
 */
export function saveConfig(config) {
  ensureDirs();
  const tmp = CONFIG_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(config, null, 2), 'utf8');
  fs.renameSync(tmp, CONFIG_FILE);
}

/**
 * Load history for a specific month (YYYY-MM).
 * Returns null if not found.
 */
export function loadHistory(month) {
  const file = path.join(HISTORY_DIR, `${month}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/**
 * Save history for a month atomically.
 * @param {string} month  YYYY-MM
 * @param {object} data
 */
export function saveHistory(month, data) {
  ensureDirs();
  const file = path.join(HISTORY_DIR, `${month}.json`);
  const tmp  = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

/** Return all analysed months sorted newest-first */
export function listHistory() {
  ensureDirs();
  return fs.readdirSync(HISTORY_DIR)
    .filter(f => /^\d{4}-\d{2}\.json$/.test(f))
    .map(f => f.replace('.json', ''))
    .sort()
    .reverse();
}

/** Returns the previous calendar month as YYYY-MM */
export function prevMonth(yyyyMM) {
  const [y, m] = yyyyMM.split('-').map(Number);
  const d = new Date(y, m - 2, 1); // month is 0-indexed
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Returns the next calendar month as YYYY-MM */
export function nextMonth(yyyyMM) {
  const [y, m] = yyyyMM.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Current month as YYYY-MM */
export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Format a YYYY-MM string as "March 2026" */
export function formatMonthLong(yyyyMM) {
  const [y, m] = yyyyMM.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
}

/** Format a YYYY-MM-DD string as "3 Mar 2026" */
export function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Format a number as "€1,234.56" */
export function formatMoney(n) {
  return '€' + Number(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// --- internal ---

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key] || typeof target[key] !== 'object') target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}
