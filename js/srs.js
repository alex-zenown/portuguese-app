// SM-2 Spaced Repetition Algorithm
import { storage, logActivity } from './storage.js';

const CARDS_KEY = 'srsCards';
const NEW_CARDS_TODAY_KEY = 'newCardsToday';
const NEW_CARDS_DATE_KEY = 'newCardsDate';

// Get all SRS cards
export function getCards() {
  return storage.get(CARDS_KEY, {});
}

// Save all cards
function saveCards(cards) {
  storage.set(CARDS_KEY, cards);
}

// Create or get a card by ID
export function getCard(cardId) {
  const cards = getCards();
  return cards[cardId] || null;
}

// Add a new card to the SRS system
export function addCard(cardId, data = {}) {
  const cards = getCards();
  if (cards[cardId]) return cards[cardId]; // Already exists

  cards[cardId] = {
    id: cardId,
    ...data,
    // SM-2 fields
    interval: 0,       // Days until next review
    repetition: 0,     // Number of successful reviews
    easeFactor: 2.5,   // Ease factor
    dueDate: new Date().toISOString().slice(0, 10), // Due today
    lastReview: null,
    created: new Date().toISOString(),
  };
  saveCards(cards);
  return cards[cardId];
}

// Rate a card: 1=Again, 3=Hard, 4=Good, 5=Easy
export function rateCard(cardId, rating) {
  const cards = getCards();
  const card = cards[cardId];
  if (!card) return null;

  const now = new Date();
  card.lastReview = now.toISOString();

  if (rating < 3) {
    // Failed — reset
    card.repetition = 0;
    card.interval = 0;
  } else {
    if (card.repetition === 0) {
      card.interval = 1;
    } else if (card.repetition === 1) {
      card.interval = 6;
    } else {
      card.interval = Math.round(card.interval * card.easeFactor);
    }
    card.repetition++;
  }

  // Update ease factor
  card.easeFactor = Math.max(1.3,
    card.easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))
  );

  // Hard penalty
  if (rating === 3) {
    card.interval = Math.max(1, Math.round(card.interval * 0.8));
  }

  // Easy bonus
  if (rating === 5) {
    card.interval = Math.round(card.interval * 1.3);
  }

  // Set next due date
  const due = new Date(now);
  due.setDate(due.getDate() + Math.max(card.interval, 1));
  card.dueDate = due.toISOString().slice(0, 10);

  // For "Again", review again in 1 minute (same day)
  if (rating < 3) {
    card.dueDate = now.toISOString().slice(0, 10);
    card.interval = 0;
  }

  cards[cardId] = card;
  saveCards(cards);
  logActivity(1);

  return card;
}

// Get cards due for review today
export function getDueCards() {
  const cards = getCards();
  const today = new Date().toISOString().slice(0, 10);
  return Object.values(cards)
    .filter(c => c.dueDate <= today && c.repetition > 0)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

// Get new cards (never reviewed, due today)
export function getNewCards() {
  const cards = getCards();
  const today = new Date().toISOString().slice(0, 10);
  return Object.values(cards)
    .filter(c => c.dueDate <= today && c.repetition === 0)
    .sort((a, b) => a.created.localeCompare(b.created));
}

// Track daily new card limit
export function getNewCardsLearnedToday() {
  const today = new Date().toISOString().slice(0, 10);
  const date = storage.get(NEW_CARDS_DATE_KEY, '');
  if (date !== today) {
    storage.set(NEW_CARDS_DATE_KEY, today);
    storage.set(NEW_CARDS_TODAY_KEY, 0);
    return 0;
  }
  return storage.get(NEW_CARDS_TODAY_KEY, 0);
}

export function incrementNewCardsToday() {
  const count = getNewCardsLearnedToday() + 1;
  storage.set(NEW_CARDS_TODAY_KEY, count);
  return count;
}

export function getDailyLimit() {
  return storage.get('dailyNewCardLimit', 15);
}

// Get interval text for preview
export function getIntervalText(cardId, rating) {
  const card = getCard(cardId);
  if (!card) return '';

  // Simulate what the interval would be
  let interval = card.interval;
  let rep = card.repetition;
  let ef = card.easeFactor;

  if (rating < 3) {
    return '<1m';
  }

  if (rep === 0) interval = 1;
  else if (rep === 1) interval = 6;
  else interval = Math.round(interval * ef);

  if (rating === 3) interval = Math.max(1, Math.round(interval * 0.8));
  if (rating === 5) interval = Math.round(interval * 1.3);

  if (interval === 1) return '1d';
  if (interval < 30) return `${interval}d`;
  if (interval < 365) return `${Math.round(interval / 30)}mo`;
  return `${(interval / 365).toFixed(1)}y`;
}

// Get SRS statistics
export function getStats() {
  const cards = getCards();
  const all = Object.values(cards);
  const today = new Date().toISOString().slice(0, 10);

  return {
    total: all.length,
    learning: all.filter(c => c.repetition > 0 && c.interval <= 1).length,
    reviewing: all.filter(c => c.repetition > 0 && c.interval > 1).length,
    new: all.filter(c => c.repetition === 0).length,
    dueToday: all.filter(c => c.dueDate <= today).length,
    mature: all.filter(c => c.interval >= 21).length,
    averageEase: all.length > 0
      ? (all.reduce((s, c) => s + c.easeFactor, 0) / all.length).toFixed(2)
      : '0',
  };
}
