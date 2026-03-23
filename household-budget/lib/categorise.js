// lib/categorise.js
// Keyword-based transaction categorisation.
//
// Decision: 'uber' appears in Transport (not Dining Out), so "Uber Eats"
// transactions will be tagged Transport. For the Delivery insight we use a
// separate DELIVERY_KEYWORDS list that matches food-delivery merchants
// regardless of their assigned category.
//
// Decision: keyword check uses String.prototype.includes(), matching the spec's
// "case-insensitive on merchant name". Some keywords have intentional trailing
// spaces ('nos ', 'meo ', 'cp ') to avoid false positives on partial matches.

export const CATEGORIES = [
  'Groceries',
  'Dining Out',
  'Transport',
  'Bills & Utilities',
  'Health & Wellness',
  'Subscriptions',
  'Shopping',
  'Entertainment',
  'Personal Care',
  'Credit Card',
  'Credit Card Debt Attack',
  'Buffer Savings',
];

// The 9 categories that come from CSV transactions (last 3 are fixed amounts)
export const VARIABLE_CATEGORIES = CATEGORIES.slice(0, 9);

// Fixed-amount categories — values come from config, never from CSV card spend
export const FIXED_CATEGORIES = ['Credit Card', 'Credit Card Debt Attack', 'Buffer Savings'];

// Order matters: first match wins (spec requirement)
const KEYWORD_MAP = [
  ['Groceries', [
    'pingo doce', 'continente', 'lidl', 'aldi', 'mercado', 'minimarket',
    'mini mercado', 'lily super', 'amadeu', 'minimercado', 'intermarché',
  ]],
  ['Dining Out', [
    'restaur', 'bistro', 'tasca', 'pizzar', 'burgu', 'sushi', 'taco',
    'meia-lua', 'trickys', 'nep thai', 'kailua', 'lupita', 'hummus',
    'gleba', 'orioli', 'carambola', 'trulino', 'pequeno jardim',
    'ze da tasca', 'miss can', 'traco liquido', 'churrasqueira',
    'cool can', 'wineclick', 'slow sourdough', 'caf ele ela',
    'parra wine', 'taberna', 'marisqueira', 'cervejaria',
  ]],
  ['Transport', [
    'uber', 'bolt', 'lime', 'cabify', 'metro', 'cp ', 'comboio', 'autocarro',
    'rent a car', 'hertz', 'europcar',
  ]],
  ['Bills & Utilities', [
    'vodafone', 'nos ', 'meo ', 'edp', 'epal', 'galp', 'rohahome', 'oasis',
    'seguro', 'insurance', 'condominio', 'água', 'electricidade',
  ]],
  ['Health & Wellness', [
    'farmácia', 'farmacia', 'pharmacy', 'gym', 'classpass', 'padel',
    'ag1', 'student breakthrough', 'health', 'clínica', 'clinica',
    'dentist', 'médico', 'medico',
  ]],
  ['Subscriptions', [
    'netflix', 'spotify', 'apple', 'claude', 'google one', 'amazon prime',
    'youtube', 'disney', 'hbo', 'microsoft', 'dropbox', 'notion',
  ]],
  ['Shopping', [
    'zara', 'h&m', 'corte inglés', 'scalapay', 'klarna', 'postery',
    'lovely parade', 'el corte', 'fnac', 'worten', 'ikea', 'primark',
    'amazon',
  ]],
  ['Entertainment', [
    'cinema', 'uci', 'nintendo', 'steam', 'ticketmaster', 'casa dell',
    'concert', 'bilhete', 'museu',
  ]],
  ['Personal Care', [
    'hair', 'barber', 'salão', 'salon', 'rhamus', 'spa', 'beauty', 'nail',
    'barbearia',
  ]],
];

// Used by the insights engine to detect food-delivery spend across categories
export const DELIVERY_KEYWORDS = [
  'glovo', 'uber eats', 'ubereats', 'just eat', 'deliveroo', 'bolt food',
  'takeaway', 'getir',
];

/**
 * Returns the matching category string, or null if no keyword matches.
 * @param {string} merchant - cleaned merchant name
 */
export function categorise(merchant) {
  const lower = merchant.toLowerCase();
  for (const [cat, keywords] of KEYWORD_MAP) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return cat;
    }
  }
  return null;
}

/** Returns true if the merchant looks like a food-delivery service */
export function isDelivery(merchant) {
  const lower = merchant.toLowerCase();
  return DELIVERY_KEYWORDS.some(kw => lower.includes(kw));
}
