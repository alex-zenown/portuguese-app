// lib/csv.js
// Revolut Portuguese CSV parser.
//
// Expected columns (comma-separated, may have quoted fields):
//   Tipo, Produto, Data de início, Data de Conclusão, Descrição,
//   Montante, Comissão, Moeda, Estado, Saldo
//
// Decision: we write a minimal quoted-CSV parser rather than adding a
// csv-parse dependency (not listed in the spec). It handles double-quoted
// fields containing commas and escaped quotes ("").
//
// Decision: amounts — Revolut PT exports use "." as decimal separator in CSV
// even though the UI shows ",". We normalise both just in case.

import { categorise } from './categorise.js';

/**
 * Parse a raw CSV string into an array of row objects keyed by header.
 * Handles double-quoted fields and embedded commas.
 */
export function parseCSV(content) {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length === 0) return [];

  const headers = splitCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = splitCSVLine(line);
    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || '').trim();
    });
    rows.push(row);
  }
  return rows;
}

/**
 * Parse a Revolut Portuguese CSV export and return card-spend transactions
 * for a given month.
 *
 * @param {string} content  Raw CSV file content
 * @param {'personal'|'joint'} account  Which account this CSV belongs to
 * @param {string} month  YYYY-MM — filter to this month only
 * @param {object} merchantRules  Saved merchant→category rules from config
 * @returns {Array<Transaction>}
 */
export function parseRevolut(content, account, month, merchantRules = {}) {
  const rows = parseCSV(content);

  // Validate columns
  const required = ['Tipo', 'Descrição', 'Data de início', 'Montante', 'Estado'];
  const firstRow = rows[0] || {};
  for (const col of required) {
    if (!(col in firstRow)) {
      throw new Error(
        `This doesn't look like a Revolut CSV. Expected columns: Tipo, Produto, Data de início…\nFound: ${Object.keys(firstRow).join(', ')}`
      );
    }
  }

  const transactions = [];

  for (const row of rows) {
    // Only card payments
    if (row['Tipo'] !== 'Pagamento com cartão') continue;
    // Only completed
    if (row['Estado'] !== 'CONCLUÍDA') continue;

    const amountRaw = parseAmount(row['Montante']);
    // Only outgoing (negative in CSV = money spent)
    if (amountRaw >= 0) continue;

    const date = row['Data de início'].slice(0, 10); // YYYY-MM-DD
    // Only the target month
    if (!date.startsWith(month)) continue;

    const rawDesc = row['Descrição'] || '';
    const merchant = cleanMerchant(rawDesc);
    const amount = Math.abs(amountRaw);

    // Apply saved rules first, then keyword matching
    let category = merchantRules[merchant.toLowerCase()] || null;
    if (!category) category = categorise(merchant);

    transactions.push({ date, merchant, amount, account, category, excluded: false });
  }

  return transactions;
}

/**
 * Scan ALL row types in Alex's personal CSV for savings-pot transfers.
 * Returns { deposits: [...], withdrawals: [...] } for the given potKeyword.
 *
 * @param {string} content  Raw CSV file content
 * @param {string} potKeyword  Substring to match in Descrição (case-insensitive)
 * @param {string} month  YYYY-MM
 */
export function parseSavingsTransfers(content, potKeyword, month) {
  if (!potKeyword) return { deposits: [], withdrawals: [] };
  const rows = parseCSV(content);
  const kw = potKeyword.toLowerCase();

  const deposits    = [];
  const withdrawals = [];

  for (const row of rows) {
    if (row['Tipo'] !== 'Transferência') continue;
    const desc = (row['Descrição'] || '').toLowerCase();
    if (!desc.includes(kw)) continue;

    const date = (row['Data de início'] || '').slice(0, 10);
    if (!date.startsWith(month)) continue;

    const amount = parseAmount(row['Montante']);
    const entry = {
      date,
      description: row['Descrição'],
      amount: Math.abs(amount),
    };

    if (amount < 0) {
      deposits.push(entry);
    } else {
      withdrawals.push(entry);
    }
  }

  return { deposits, withdrawals };
}

// --- helpers ---

/** Remove "Pagamento a " prefix and normalise whitespace */
function cleanMerchant(desc) {
  return desc.replace(/^Pagamento a\s+/i, '').trim();
}

/** Parse a Revolut amount string — handles both "." and "," as decimal sep */
function parseAmount(str) {
  if (!str) return 0;
  // Remove any thousand-separator spaces or dots used as thousands
  // Revolut PT: "-43,94" or "-43.94"
  const normalised = str.replace(/\s/g, '').replace(',', '.');
  return parseFloat(normalised) || 0;
}

/**
 * Minimal quoted-CSV line splitter.
 * Handles: plain fields, "quoted, with commas", and "" escaped quotes inside quotes.
 */
function splitCSVLine(line) {
  const fields = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      // Quoted field
      let field = '';
      i++; // skip opening quote
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') {
          field += '"';
          i += 2;
        } else if (line[i] === '"') {
          i++; // skip closing quote
          break;
        } else {
          field += line[i++];
        }
      }
      fields.push(field);
      if (line[i] === ',') i++; // skip delimiter
    } else {
      // Unquoted field
      const end = line.indexOf(',', i);
      if (end === -1) {
        fields.push(line.slice(i));
        break;
      }
      fields.push(line.slice(i, end));
      i = end + 1;
    }
  }
  return fields;
}
