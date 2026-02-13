// Progress & stats view
import { storage } from '../storage.js';
import { getStats, getCards } from '../srs.js';
import { getCompletedLessons } from '../data/lesson-plan.js';

export function render() {
  const stats = getStats();
  const activityLog = storage.get('activityLog', {});
  const streak = storage.get('streak', 0);
  const completed = getCompletedLessons();
  const completedGrammar = storage.get('completedGrammar', []);

  const el = document.getElementById('app-content');
  el.innerHTML = `
    <div class="section-header">
      <span class="section-title">📊 Progresso</span>
    </div>

    <div class="stat-grid">
      <div class="stat-item">
        <div class="stat-value">${streak}</div>
        <div class="stat-label">Dias</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${stats.total}</div>
        <div class="stat-label">Cartões</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${stats.mature}</div>
        <div class="stat-label">Maduros</div>
      </div>
    </div>

    <div class="card mt-16">
      <div class="card-header">Estado dos Cartões</div>
      <div class="stat-grid">
        <div class="stat-item">
          <div class="stat-value" style="color: #2196f3">${stats.new}</div>
          <div class="stat-label">Novos</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: #e67e22">${stats.learning}</div>
          <div class="stat-label">A aprender</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: var(--green)">${stats.reviewing}</div>
          <div class="stat-label">Em revisão</div>
        </div>
      </div>
      <div class="text-sm text-muted mt-8">Average ease: ${stats.averageEase}</div>
    </div>

    <div class="card mt-12">
      <div class="card-header">Lições Completas</div>
      <div class="flex gap-8" style="flex-wrap: wrap;">
        <span class="badge badge-green">🔊 Pronúncia: ${completed.filter(id => id <= 5).length}/5</span>
        <span class="badge badge-green">📚 Vocabulário: ${completed.filter(id => id >= 6 && id <= 20).length}/15</span>
        <span class="badge badge-green">✏️ Gramática: ${completedGrammar.length}/8</span>
      </div>
    </div>

    <div class="card mt-12">
      <div class="card-header">Atividade (últimos 12 semanas)</div>
      <div class="heatmap" id="heatmap"></div>
      <div class="flex justify-between text-sm text-muted mt-8">
        <span>Menos</span>
        <div class="flex gap-8">
          <div class="heatmap-cell" style="width: 12px; height: 12px;"></div>
          <div class="heatmap-cell level-1" style="width: 12px; height: 12px;"></div>
          <div class="heatmap-cell level-2" style="width: 12px; height: 12px;"></div>
          <div class="heatmap-cell level-3" style="width: 12px; height: 12px;"></div>
          <div class="heatmap-cell level-4" style="width: 12px; height: 12px;"></div>
        </div>
        <span>Mais</span>
      </div>
    </div>

    <div class="card mt-12">
      <div class="card-header">Previsão SRS</div>
      <div id="forecast"></div>
    </div>
  `;

  renderHeatmap(activityLog);
  renderForecast();
}

function renderHeatmap(activityLog) {
  const heatmap = document.getElementById('heatmap');
  const today = new Date();
  const cells = [];

  // 84 days (12 weeks)
  for (let i = 83; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    const count = activityLog[key] || 0;

    let level = 0;
    if (count > 0) level = 1;
    if (count >= 10) level = 2;
    if (count >= 25) level = 3;
    if (count >= 50) level = 4;

    const cell = document.createElement('div');
    cell.className = `heatmap-cell${level > 0 ? ` level-${level}` : ''}`;
    cell.title = `${key}: ${count} activities`;
    heatmap.appendChild(cell);
  }
}

function renderForecast() {
  const cards = getCards();
  const forecast = {};
  const today = new Date();

  // Count cards due for each of the next 14 days
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const key = date.toISOString().slice(0, 10);
    forecast[key] = 0;
  }

  Object.values(cards).forEach(card => {
    if (card.dueDate && forecast[card.dueDate] !== undefined) {
      forecast[card.dueDate]++;
    }
  });

  const forecastEl = document.getElementById('forecast');
  const maxCount = Math.max(1, ...Object.values(forecast));

  forecastEl.innerHTML = Object.entries(forecast).map(([date, count]) => {
    const day = new Date(date).toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric' });
    const pct = (count / maxCount) * 100;
    return `
      <div class="flex items-center gap-8 mb-8">
        <span class="text-sm" style="min-width: 80px; color: var(--text-muted)">${day}</span>
        <div class="progress-bar flex-1">
          <div class="progress-fill" style="width: ${pct}%; background: ${count > 0 ? 'var(--green)' : 'var(--bg-input)'}"></div>
        </div>
        <span class="text-sm" style="min-width: 30px; text-align: right">${count}</span>
      </div>
    `;
  }).join('');
}
