// SPA Router and app initialization
import { storage, updateStreak } from './storage.js';

// View modules (lazy-ish — all loaded upfront since no build step)
import * as home from './views/home.js';
import * as pronunciation from './views/pronunciation.js';
import * as vocabulary from './views/vocabulary.js';
import * as grammar from './views/grammar.js';
import * as conversation from './views/conversation.js';
import * as progress from './views/progress.js';
import * as settings from './views/settings.js';

const routes = {
  home,
  pronunciation,
  vocabulary,
  grammar,
  conversation,
  progress,
  settings,
};

const viewTitles = {
  home: 'Português',
  pronunciation: 'Pronúncia',
  vocabulary: 'Vocabulário',
  grammar: 'Gramática',
  conversation: 'Conversa',
  progress: 'Progresso',
  settings: 'Definições',
};

let currentView = null;

function navigate(hash) {
  const viewName = (hash || '#home').replace('#', '');
  const view = routes[viewName];

  if (!view) {
    navigate('#home');
    return;
  }

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });

  // Update header title
  document.getElementById('header-title').textContent = viewTitles[viewName] || 'Português';

  // Reset content and render view
  const content = document.getElementById('app-content');
  content.innerHTML = '';
  content.style.animation = 'none';
  content.offsetHeight; // Force reflow
  content.style.animation = '';

  currentView = viewName;

  try {
    view.render();
  } catch (err) {
    console.error(`Error rendering ${viewName}:`, err);
    content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">😕</div><div class="empty-state-text">Something went wrong. <br><button class="btn btn-primary btn-sm mt-12" onclick="location.hash='#home'">Go Home</button></div></div>`;
  }
}

// Initialize
function init() {
  // Apply saved theme
  const theme = storage.get('theme', 'light');
  document.documentElement.dataset.theme = theme;

  // Update streak on load
  updateStreak();

  // Route handling
  window.addEventListener('hashchange', () => navigate(location.hash));
  navigate(location.hash || '#home');
}

// Wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
