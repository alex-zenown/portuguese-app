// Vocabulary flashcard view — learn + review modes
import { vocabularyLessons, getWordsForLesson } from '../data/vocabulary-data.js';
import { addCard, rateCard, getDueCards, getNewCards, getCard, getIntervalText, getNewCardsLearnedToday, incrementNewCardsToday, getDailyLimit } from '../srs.js';
import { speak } from '../audio.js';
import { createFlashcard } from '../components/card.js';
import { createProgressBar } from '../components/progress-bar.js';
import { showToast } from '../components/toast.js';
import { getCompletedLessons, completeLesson, isLessonUnlocked } from '../data/lesson-plan.js';
import { logActivity } from '../storage.js';

let mode = null; // 'list' | 'learn' | 'review'
let currentCards = [];
let cardIndex = 0;
let sessionCorrect = 0;
let sessionTotal = 0;
let currentLessonId = null;

export function render() {
  mode = 'list';
  renderLessonList();
}

function renderLessonList() {
  const completed = getCompletedLessons();
  const dueCards = getDueCards();
  const newCards = getNewCards();
  const dailyLimit = getDailyLimit();
  const newToday = getNewCardsLearnedToday();

  const el = document.getElementById('app-content');
  el.innerHTML = `
    <div class="section-header">
      <span class="section-title">📚 Vocabulário</span>
    </div>

    ${dueCards.length > 0 ? `
      <div class="card" style="border-left: 3px solid var(--green); cursor: pointer;" id="review-due">
        <div class="flex items-center gap-8">
          <span style="font-size: 1.5rem">🔄</span>
          <div class="flex-1">
            <div class="card-header" style="margin-bottom: 2px">Revisão</div>
            <div class="text-sm text-muted">${dueCards.length} cards para rever</div>
          </div>
          <span class="badge badge-green">${dueCards.length}</span>
        </div>
      </div>
    ` : ''}

    <p class="text-sm text-muted mb-12 mt-16">Lições de vocabulário</p>
    <p class="text-sm text-muted mb-12">Palavras novas hoje: ${newToday} / ${dailyLimit}</p>
    <ul class="lesson-list" id="vocab-lessons"></ul>
  `;

  if (dueCards.length > 0) {
    document.getElementById('review-due').addEventListener('click', () => startReview(dueCards));
  }

  const list = document.getElementById('vocab-lessons');
  vocabularyLessons.forEach(lesson => {
    const unlocked = isLessonUnlocked(lesson.id);
    const done = completed.includes(lesson.id);
    const words = getWordsForLesson(lesson.id);
    const learnedCount = words.filter(w => getCard(w.id) !== null).length;

    const li = document.createElement('li');
    li.className = `lesson-item${done ? ' completed' : ''}${!unlocked ? ' locked' : ''}`;
    li.innerHTML = `
      <div class="lesson-number">${done ? '✓' : lesson.icon}</div>
      <div class="lesson-info">
        <div class="lesson-title">${lesson.title}</div>
        <div class="lesson-subtitle">${lesson.subtitle} — ${learnedCount}/${words.length}</div>
      </div>
      ${!unlocked ? '<span class="text-muted">🔒</span>' : ''}
    `;

    if (unlocked) {
      li.addEventListener('click', () => startLearn(lesson.id));
    }
    list.appendChild(li);
  });
}

function startLearn(lessonId) {
  currentLessonId = lessonId;
  const words = getWordsForLesson(lessonId);

  // Add all words to SRS if not present
  words.forEach(w => addCard(w.id, {
    type: 'vocabulary',
    word: w.word,
    emoji: w.emoji,
    context: w.context,
    full: w.full,
    ipa: w.ipa,
    gender: w.gender,
  }));

  // Get new (unlearned) cards for this lesson
  const newCards = words.filter(w => {
    const card = getCard(w.id);
    return card && card.repetition === 0;
  });

  // Also include due review cards for this lesson
  const reviewCards = words.filter(w => {
    const card = getCard(w.id);
    if (!card || card.repetition === 0) return false;
    return card.dueDate <= new Date().toISOString().slice(0, 10);
  });

  const dailyLimit = getDailyLimit();
  const newToday = getNewCardsLearnedToday();
  const remaining = Math.max(0, dailyLimit - newToday);

  currentCards = [
    ...reviewCards.map(w => ({ ...w, isNew: false })),
    ...newCards.slice(0, remaining).map(w => ({ ...w, isNew: true })),
  ];

  if (currentCards.length === 0) {
    // All done for this lesson!
    if (newCards.length === 0) {
      completeLesson(lessonId);
      showToast('Lição completa! 🎉', 'success');
    } else {
      showToast('Limite diário atingido. Volta amanhã!', 'info');
    }
    renderLessonList();
    return;
  }

  cardIndex = 0;
  sessionCorrect = 0;
  sessionTotal = 0;
  mode = 'learn';
  renderCard();
}

function startReview(cards) {
  currentCards = cards.map(c => ({
    id: c.id,
    word: c.word,
    emoji: c.emoji,
    context: c.context,
    full: c.full,
    ipa: c.ipa,
    gender: c.gender,
    isNew: false,
  }));
  cardIndex = 0;
  sessionCorrect = 0;
  sessionTotal = 0;
  mode = 'review';
  renderCard();
}

function renderCard() {
  if (cardIndex >= currentCards.length) {
    renderSessionSummary();
    return;
  }

  const wordData = currentCards[cardIndex];
  const el = document.getElementById('app-content');

  const front = `
    <div class="flashcard-emoji">${wordData.emoji}</div>
    <div class="flashcard-sentence">${wordData.context}</div>
    <button class="audio-btn mt-8" id="card-audio-front">🔊</button>
  `;

  const back = `
    <div class="flashcard-word">${wordData.word}</div>
    <div class="flashcard-ipa">${wordData.ipa || ''}</div>
    <div class="flashcard-gender">${wordData.gender || ''}</div>
    <div class="flashcard-full-sentence">${wordData.full}</div>
    <button class="audio-btn mt-8" id="card-audio-back">🔊</button>
  `;

  el.innerHTML = `
    <div class="flex justify-between items-center mb-8">
      <button class="btn btn-secondary btn-sm" id="back-btn">← Voltar</button>
      <span class="badge ${wordData.isNew ? 'badge-gold' : 'badge-green'}">
        ${wordData.isNew ? 'Nova' : 'Revisão'} — ${cardIndex + 1}/${currentCards.length}
      </span>
    </div>
    ${createProgressBar(cardIndex, currentCards.length)}
    <div id="card-container"></div>
    <div class="text-center text-sm text-muted mt-8" id="flip-hint">Toca no cartão para virar</div>
    <div id="rating-area" class="hidden"></div>
  `;

  const container = document.getElementById('card-container');
  const flashcard = createFlashcard({
    front,
    back,
    onFlip: (flipped) => {
      document.getElementById('flip-hint').classList.add('hidden');
      if (flipped) {
        document.getElementById('rating-area').classList.remove('hidden');
        // Play the word when revealed
        speak(wordData.word);
        setupBackAudio(wordData);
      }
    },
  });
  container.appendChild(flashcard);

  // Front audio
  setTimeout(() => {
    const frontAudio = document.getElementById('card-audio-front');
    if (frontAudio) {
      frontAudio.addEventListener('click', (e) => {
        e.stopPropagation();
        speak(wordData.full);
      });
    }
  }, 50);

  // Rating buttons
  const ratingArea = document.getElementById('rating-area');
  ratingArea.innerHTML = `
    <div class="srs-buttons">
      <button class="srs-btn" data-rating="1">
        Outra vez
        <span class="srs-interval">${getIntervalText(wordData.id, 1)}</span>
      </button>
      <button class="srs-btn" data-rating="3">
        Difícil
        <span class="srs-interval">${getIntervalText(wordData.id, 3)}</span>
      </button>
      <button class="srs-btn" data-rating="4">
        Bom
        <span class="srs-interval">${getIntervalText(wordData.id, 4)}</span>
      </button>
      <button class="srs-btn" data-rating="5">
        Fácil
        <span class="srs-interval">${getIntervalText(wordData.id, 5)}</span>
      </button>
    </div>
  `;

  ratingArea.addEventListener('click', (e) => {
    const btn = e.target.closest('.srs-btn');
    if (!btn) return;
    const rating = parseInt(btn.dataset.rating);

    sessionTotal++;
    if (rating >= 3) sessionCorrect++;
    if (wordData.isNew) incrementNewCardsToday();

    rateCard(wordData.id, rating);

    // If "Again", re-add to end
    if (rating < 3) {
      currentCards.push(wordData);
    }

    cardIndex++;
    renderCard();
  });

  document.getElementById('back-btn').addEventListener('click', renderLessonList);
}

function setupBackAudio(wordData) {
  setTimeout(() => {
    const backAudio = document.getElementById('card-audio-back');
    if (backAudio) {
      backAudio.addEventListener('click', (e) => {
        e.stopPropagation();
        speak(wordData.word);
      });
    }
  }, 50);
}

function renderSessionSummary() {
  const pct = sessionTotal > 0 ? Math.round((sessionCorrect / sessionTotal) * 100) : 100;
  logActivity(sessionTotal);

  // Check if lesson is complete
  if (currentLessonId) {
    const words = getWordsForLesson(currentLessonId);
    const allLearned = words.every(w => {
      const card = getCard(w.id);
      return card && card.repetition > 0;
    });
    if (allLearned) {
      completeLesson(currentLessonId);
    }
  }

  const el = document.getElementById('app-content');
  el.innerHTML = `
    <div class="card summary-card">
      <div class="summary-score">${pct}%</div>
      <div class="summary-label">Precisão da sessão</div>
      <div class="stat-grid mt-16">
        <div class="stat-item">
          <div class="stat-value">${sessionTotal}</div>
          <div class="stat-label">Total</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: var(--green)">${sessionCorrect}</div>
          <div class="stat-label">Corretas</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: var(--red)">${sessionTotal - sessionCorrect}</div>
          <div class="stat-label">Para rever</div>
        </div>
      </div>
      <div class="mt-24">
        <button class="btn btn-primary btn-full" id="continue-btn">Continuar</button>
      </div>
    </div>
  `;

  document.getElementById('continue-btn').addEventListener('click', renderLessonList);
}
