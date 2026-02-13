// Conversation practice view — Claude API integration
import { sendMessage, buildSystemPrompt, SCENARIOS, getApiKey } from '../claude-api.js';
import { speak } from '../audio.js';
import { addCard } from '../srs.js';
import { showToast } from '../components/toast.js';

let currentScenario = null;
let messages = [];
let isLoading = false;

export function render() {
  currentScenario = null;
  messages = [];
  renderScenarioSelection();
}

function renderScenarioSelection() {
  const hasKey = !!getApiKey();
  const el = document.getElementById('app-content');

  el.innerHTML = `
    <div class="section-header">
      <span class="section-title">💬 Conversa</span>
    </div>
    <p class="text-sm text-muted mb-16">Practice Portuguese in real conversations with AI.</p>

    ${!hasKey ? `
      <div class="card" style="border-left: 3px solid var(--red);">
        <div class="card-header">🔑 API Key Needed</div>
        <p class="text-sm text-muted">Add your Anthropic API key in <a href="#settings">Settings</a> to use conversation practice.</p>
      </div>
    ` : `
      <p class="text-sm text-muted mb-12">Escolhe um cenário:</p>
      <div class="scenario-grid" id="scenarios"></div>
    `}
  `;

  if (!hasKey) return;

  const grid = document.getElementById('scenarios');
  SCENARIOS.forEach(s => {
    const card = document.createElement('div');
    card.className = 'scenario-card';
    card.innerHTML = `
      <div class="scenario-emoji">${s.emoji}</div>
      <div class="scenario-name">${s.name}</div>
    `;
    card.addEventListener('click', () => startConversation(s));
    grid.appendChild(card);
  });
}

async function startConversation(scenario) {
  currentScenario = scenario;
  messages = [];
  renderChat();

  // Get initial message from Claude
  await sendChatMessage(null);
}

function renderChat() {
  const el = document.getElementById('app-content');

  el.innerHTML = `
    <div class="flex justify-between items-center mb-8">
      <button class="btn btn-secondary btn-sm" id="back-btn">← Voltar</button>
      <div class="flex gap-8 items-center">
        <span style="font-size: 1.2rem">${currentScenario.emoji}</span>
        <span class="text-sm" style="font-weight: 600">${currentScenario.name}</span>
      </div>
      <button class="btn btn-secondary btn-sm" id="save-words-btn" title="Save new words">💾</button>
    </div>

    <div class="chat-container" id="chat-messages"></div>

    <div class="chat-input-area">
      <input type="text" class="chat-input" id="chat-input" placeholder="Escreve em português..." autocomplete="off">
      <button class="btn btn-primary btn-icon" id="send-btn">➤</button>
    </div>
  `;

  document.getElementById('back-btn').addEventListener('click', renderScenarioSelection);
  document.getElementById('save-words-btn').addEventListener('click', saveNewWords);

  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');

  const handleSend = () => {
    const text = input.value.trim();
    if (!text || isLoading) return;
    input.value = '';
    sendChatMessage(text);
  };

  sendBtn.addEventListener('click', handleSend);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSend(); });

  renderMessages();
  input.focus();
}

function renderMessages() {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  container.innerHTML = '';

  messages.forEach(msg => {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${msg.role}`;

    let html = msg.content;
    // Add audio button for assistant messages
    if (msg.role === 'assistant') {
      html += `<button class="audio-btn" style="width: 28px; height: 28px; font-size: 0.8rem; margin-top: 8px; display: inline-flex;">🔊</button>`;
    }
    bubble.innerHTML = html;

    // Audio for assistant messages
    if (msg.role === 'assistant') {
      const audioBtn = bubble.querySelector('.audio-btn');
      audioBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        speak(msg.content.replace(/<[^>]*>/g, ''));
      });
    }

    container.appendChild(bubble);
  });

  if (isLoading) {
    const loading = document.createElement('div');
    loading.className = 'chat-bubble assistant';
    loading.innerHTML = `<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
    container.appendChild(loading);
  }

  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

async function sendChatMessage(userText) {
  if (userText) {
    messages.push({ role: 'user', content: userText });
  }

  isLoading = true;
  renderMessages();

  try {
    const apiMessages = messages.map(m => ({ role: m.role, content: m.content }));
    const systemPrompt = buildSystemPrompt(currentScenario.description);
    const response = await sendMessage(apiMessages, systemPrompt);

    messages.push({ role: 'assistant', content: response });
    isLoading = false;
    renderMessages();

    // Auto-speak the response
    speak(response.replace(/<[^>]*>/g, ''));
  } catch (err) {
    isLoading = false;
    renderMessages();
    showToast(err.message, 'error');
  }
}

function saveNewWords() {
  // Extract Portuguese words from assistant messages that might be new vocabulary
  const assistantText = messages
    .filter(m => m.role === 'assistant')
    .map(m => m.content)
    .join(' ');

  // Simple word extraction — user can pick from these
  const words = [...new Set(assistantText.match(/\b[a-záàâãéèêíïóôõúüç]{3,}\b/gi) || [])];

  if (words.length === 0) {
    showToast('Nenhuma palavra nova encontrada', 'info');
    return;
  }

  // Show modal to pick words
  const el = document.getElementById('app-content');
  const existing = document.getElementById('word-picker');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'word-picker';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-title">Guardar palavras novas</div>
      <p class="text-sm text-muted mb-12">Select words to add to your SRS deck:</p>
      <div id="word-list" style="max-height: 300px; overflow-y: auto;"></div>
      <div class="modal-actions">
        <button class="btn btn-secondary btn-sm" id="cancel-save">Cancelar</button>
        <button class="btn btn-primary btn-sm" id="confirm-save">Guardar</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const wordList = overlay.querySelector('#word-list');
  const selected = new Set();

  words.slice(0, 20).forEach(word => {
    const row = document.createElement('label');
    row.className = 'toggle-row';
    row.style.cursor = 'pointer';
    row.innerHTML = `
      <span>${word}</span>
      <input type="checkbox" value="${word}">
    `;
    row.querySelector('input').addEventListener('change', (e) => {
      if (e.target.checked) selected.add(word);
      else selected.delete(word);
    });
    wordList.appendChild(row);
  });

  overlay.querySelector('#cancel-save').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#confirm-save').addEventListener('click', () => {
    selected.forEach(word => {
      addCard(`conv_${word}_${Date.now()}`, {
        type: 'conversation',
        word: word,
        emoji: '💬',
        context: `Palavra da conversa: ___`,
        full: word,
        ipa: '',
        gender: '',
      });
    });
    if (selected.size > 0) {
      showToast(`${selected.size} palavras guardadas!`, 'success');
    }
    overlay.remove();
  });

  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}
