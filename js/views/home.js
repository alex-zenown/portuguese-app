// Home dashboard view
import { storage, updateStreak } from '../storage.js';
import { getDueCards, getNewCards, getStats, getDailyLimit, getNewCardsLearnedToday } from '../srs.js';
import { createProgressBar } from '../components/progress-bar.js';
import { getCompletedLessons } from '../data/lesson-plan.js';

export function render() {
  const streak = updateStreak();
  const stats = getStats();
  const dueCards = getDueCards();
  const newCards = getNewCards();
  const completed = getCompletedLessons();
  const dailyLimit = getDailyLimit();
  const newToday = getNewCardsLearnedToday();
  const totalDue = dueCards.length + Math.min(newCards.length, Math.max(0, dailyLimit - newToday));

  const totalLessons = 20;
  const completedCount = completed.length;

  // Determine recommended activity
  let recommendation = '';
  if (completedCount === 0) {
    recommendation = `
      <a href="#pronunciation" class="card" style="text-decoration: none; color: inherit; display: block; border-left: 3px solid var(--green);">
        <div class="flex items-center gap-8">
          <span style="font-size: 1.5rem">🔊</span>
          <div>
            <div class="card-header" style="margin-bottom: 2px">Começa com os sons</div>
            <div class="text-sm text-muted">Start with pronunciation — sound first!</div>
          </div>
        </div>
      </a>
    `;
  } else if (totalDue > 0) {
    recommendation = `
      <a href="#vocabulary" class="card" style="text-decoration: none; color: inherit; display: block; border-left: 3px solid var(--green);">
        <div class="flex items-center gap-8">
          <span style="font-size: 1.5rem">📚</span>
          <div>
            <div class="card-header" style="margin-bottom: 2px">Revisão diária</div>
            <div class="text-sm text-muted">${totalDue} cards waiting for review</div>
          </div>
        </div>
      </a>
    `;
  } else {
    recommendation = `
      <a href="#vocabulary" class="card" style="text-decoration: none; color: inherit; display: block; border-left: 3px solid var(--green);">
        <div class="flex items-center gap-8">
          <span style="font-size: 1.5rem">✨</span>
          <div>
            <div class="card-header" style="margin-bottom: 2px">Aprende palavras novas</div>
            <div class="text-sm text-muted">Start a new vocabulary lesson</div>
          </div>
        </div>
      </a>
    `;
  }

  const el = document.getElementById('app-content');
  el.innerHTML = `
    <div class="text-center mb-16">
      <div class="streak-display justify-center">
        <span class="streak-fire">${streak > 0 ? '🔥' : '💤'}</span>
        <span>${streak} dia${streak !== 1 ? 's' : ''} seguido${streak !== 1 ? 's' : ''}</span>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-item">
        <div class="stat-value">${totalDue}</div>
        <div class="stat-label">Para hoje</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${stats.total}</div>
        <div class="stat-label">Palavras</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${completedCount}</div>
        <div class="stat-label">Lições</div>
      </div>
    </div>

    ${createProgressBar(completedCount, totalLessons, 'Progresso geral')}

    <div class="section-header mt-24">
      <span class="section-title">Próximo passo</span>
    </div>
    ${recommendation}

    <div class="mt-16">
      <div class="flex gap-8">
        <a href="#progress" class="btn btn-outline btn-sm flex-1 justify-center" style="text-decoration: none">📊 Estatísticas</a>
        <a href="#settings" class="btn btn-secondary btn-sm flex-1 justify-center" style="text-decoration: none">⚙️ Definições</a>
      </div>
    </div>
  `;
}
