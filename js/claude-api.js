// Claude API client for conversation practice
import { storage } from './storage.js';

const API_URL = 'https://api.anthropic.com/v1/messages';

export function getApiKey() {
  return storage.get('apiKey', '');
}

export function setApiKey(key) {
  storage.set('apiKey', key);
}

export async function sendMessage(messages, systemPrompt) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API key not set. Go to Settings to add your Anthropic API key.');
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 512,
      system: systemPrompt,
      messages: messages,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

export function buildSystemPrompt(scenario) {
  return `You are a friendly Portuguese language practice partner for a beginner learner.

RULES:
- Speak ONLY in European Portuguese (PT-PT), not Brazilian Portuguese
- Keep your language at A1-A2 level (basic vocabulary and simple sentences)
- Use PT-PT vocabulary: autocarro (not ônibus), comboio (not trem), pequeno-almoço (not café da manhã), telemóvel (not celular)
- Use tu conjugation (informal) as is common in PT-PT
- If the learner makes a mistake, gently rephrase what they said correctly (do NOT explicitly say "correction" or lecture them)
- Keep responses short (1-3 sentences)
- Use simple present tense primarily, with occasional past tense
- If the learner writes in English, respond in Portuguese but keep it very simple

SCENARIO: ${scenario}

Start the conversation naturally in Portuguese appropriate to the scenario. Be warm and encouraging.`;
}

export const SCENARIOS = [
  { id: 'cafe', emoji: '☕', name: 'No Café', description: 'Order coffee and pastries at a Portuguese café' },
  { id: 'mercado', emoji: '🛒', name: 'No Mercado', description: 'Buy fruits and vegetables at the market' },
  { id: 'direcoes', emoji: '🗺️', name: 'Direções', description: 'Ask for and give directions in the city' },
  { id: 'restaurante', emoji: '🍽️', name: 'No Restaurante', description: 'Order a meal at a restaurant' },
  { id: 'hotel', emoji: '🏨', name: 'No Hotel', description: 'Check in at a hotel' },
  { id: 'transporte', emoji: '🚃', name: 'Transportes', description: 'Buy tickets and take public transport' },
  { id: 'apresentacao', emoji: '👋', name: 'Apresentação', description: 'Introduce yourself and meet someone new' },
  { id: 'compras', emoji: '🛍️', name: 'Compras', description: 'Shop for clothes and ask about prices' },
];
