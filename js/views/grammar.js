// Grammar exercises view
import { grammarUnits, isGrammarUnlocked } from '../data/grammar-data.js';
import { getCards, addCard, rateCard } from '../srs.js';
import { speak } from '../audio.js';
import { showToast } from '../components/toast.js';
import { createProgressBar } from '../components/progress-bar.js';
import { storage } from '../storage.js';

let currentUnit = null;
let exercises = [];
let exerciseIndex = 0;
let score = 0;
let total = 0;

export function render() {
  currentUnit = null;
  renderUnitList();
}

function getLearnedCardCount() {
  const cards = getCards();
  return Object.values(cards).filter(c => c.repetition > 0 && c.type === 'vocabulary').length;
}

function renderUnitList() {
  const learnedCount = getLearnedCardCount();
  const completedUnits = storage.get('completedGrammar', []);
  const el = document.getElementById('app-content');

  el.innerHTML = `
    <div class="section-header">
      <span class="section-title">✏️ Gramática</span>
    </div>
    <p class="text-sm text-muted mb-16">Grammar unlocks as you learn vocabulary (${learnedCount} words learned)</p>
    <ul class="lesson-list" id="grammar-units"></ul>
  `;

  const list = document.getElementById('grammar-units');
  grammarUnits.forEach(unit => {
    const unlocked = learnedCount >= (unit.requiredVocab || 0);
    const done = completedUnits.includes(unit.id);

    const li = document.createElement('li');
    li.className = `lesson-item${done ? ' completed' : ''}${!unlocked ? ' locked' : ''}`;
    li.innerHTML = `
      <div class="lesson-number">${done ? '✓' : unit.icon}</div>
      <div class="lesson-info">
        <div class="lesson-title">${unit.title}</div>
        <div class="lesson-subtitle">${unit.subtitle}${!unlocked ? ` — needs ${unit.requiredVocab} words` : ''}</div>
      </div>
      ${!unlocked ? '<span class="text-muted">🔒</span>' : ''}
    `;

    if (unlocked) {
      li.addEventListener('click', () => startUnit(unit));
    }
    list.appendChild(li);
  });
}

function startUnit(unit) {
  currentUnit = unit;

  // Show conjugation tables if present, then start exercises
  if (unit.conjugations) {
    renderConjugationOverview();
  } else {
    startExercises();
  }
}

function renderConjugationOverview() {
  const el = document.getElementById('app-content');
  let tablesHtml = '';

  for (const [verb, conj] of Object.entries(currentUnit.conjugations)) {
    tablesHtml += `
      <h3 class="mb-8" style="color: var(--green)">${verb}</h3>
      <table class="conj-table">
        <tr><th>Pessoa</th><th>Forma</th></tr>
        ${Object.entries(conj).map(([pronoun, form]) =>
          `<tr><td>${pronoun}</td><td><strong>${form}</strong></td></tr>`
        ).join('')}
      </table>
    `;
  }

  el.innerHTML = `
    <button class="btn btn-secondary btn-sm mb-16" id="back-btn">← Voltar</button>
    <h2 class="section-title mb-8">${currentUnit.title}</h2>
    <p class="text-sm text-muted mb-16">${currentUnit.subtitle}</p>
    ${tablesHtml}
    <button class="btn btn-primary btn-full mt-24" id="start-exercises">Começar Exercícios</button>
  `;

  document.getElementById('back-btn').addEventListener('click', renderUnitList);
  document.getElementById('start-exercises').addEventListener('click', startExercises);

  // Add audio to conjugation forms
  el.querySelectorAll('.conj-table td strong').forEach(td => {
    td.style.cursor = 'pointer';
    td.addEventListener('click', () => speak(td.textContent));
  });
}

function startExercises() {
  exercises = shuffleArray([...currentUnit.exercises]);
  exerciseIndex = 0;
  score = 0;
  total = 0;
  renderExercise();
}

function renderExercise() {
  if (exerciseIndex >= exercises.length) {
    renderGrammarSummary();
    return;
  }

  const ex = exercises[exerciseIndex];
  switch (ex.type) {
    case 'fill': renderFillExercise(ex); break;
    case 'conjugate': renderConjugateExercise(ex); break;
    case 'sentence': renderSentenceExercise(ex); break;
    default: exerciseIndex++; renderExercise();
  }
}

function renderFillExercise(ex) {
  const el = document.getElementById('app-content');
  el.innerHTML = `
    <div class="flex justify-between items-center mb-8">
      <button class="btn btn-secondary btn-sm" id="back-btn">← Voltar</button>
      <span class="badge badge-green">${exerciseIndex + 1} / ${exercises.length}</span>
    </div>
    ${createProgressBar(exerciseIndex, exercises.length)}

    <div class="quiz-prompt">
      <div class="text-sm text-muted mb-8">Preenche o espaço:</div>
      <div style="font-size: 1.2rem; line-height: 1.8">${ex.sentence.replace('___', '<strong style="color: var(--green); border-bottom: 2px dashed var(--green)">___</strong>')}</div>
    </div>

    <div class="quiz-options" id="options"></div>
  `;

  document.getElementById('back-btn').addEventListener('click', renderUnitList);

  const optionsEl = document.getElementById('options');
  const shuffled = shuffleArray([...ex.options]);

  shuffled.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option';
    btn.textContent = opt;
    btn.addEventListener('click', () => handleFillAnswer(btn, opt, ex, optionsEl));
    optionsEl.appendChild(btn);
  });
}

function handleFillAnswer(btn, selected, ex, optionsEl) {
  total++;
  const correct = selected === ex.answer;
  if (correct) score++;

  btn.classList.add(correct ? 'correct' : 'incorrect');
  optionsEl.querySelectorAll('.quiz-option').forEach(b => {
    b.style.pointerEvents = 'none';
    if (b.textContent === ex.answer) b.classList.add('correct');
  });

  // Speak the correct sentence
  speak(ex.sentence.replace('___', ex.answer));

  // If wrong, create SRS card for this
  if (!correct) {
    addGrammarCard(ex);
  }

  setTimeout(() => { exerciseIndex++; renderExercise(); }, 1200);
}

function renderConjugateExercise(ex) {
  const el = document.getElementById('app-content');
  const tenseLabel = ex.tense === 'past' ? 'Pretérito' : 'Presente';

  el.innerHTML = `
    <div class="flex justify-between items-center mb-8">
      <button class="btn btn-secondary btn-sm" id="back-btn">← Voltar</button>
      <span class="badge badge-green">${exerciseIndex + 1} / ${exercises.length}</span>
    </div>
    ${createProgressBar(exerciseIndex, exercises.length)}

    <div class="quiz-prompt">
      <div class="text-sm text-muted mb-8">Conjuga no ${tenseLabel}:</div>
      <div style="font-size: 1.2rem">${ex.pronoun} + <strong style="color: var(--green)">${ex.verb}</strong></div>
    </div>

    <div class="form-group mt-16">
      <input type="text" class="form-input" id="conj-input" placeholder="Escreve a forma correta..." autocomplete="off" autocapitalize="off">
    </div>
    <button class="btn btn-primary btn-full" id="check-btn">Verificar</button>
    <div id="feedback" class="hidden mt-12 text-center"></div>
  `;

  document.getElementById('back-btn').addEventListener('click', renderUnitList);

  const input = document.getElementById('conj-input');
  const checkBtn = document.getElementById('check-btn');
  const feedback = document.getElementById('feedback');

  const check = () => {
    const answer = input.value.trim().toLowerCase();
    total++;
    const correct = answer === ex.answer.toLowerCase();
    if (correct) score++;

    feedback.classList.remove('hidden');
    if (correct) {
      feedback.innerHTML = `<span style="color: var(--green); font-weight: 700">✓ Correto!</span>`;
    } else {
      feedback.innerHTML = `<span style="color: var(--red)">✗ A resposta é: <strong>${ex.answer}</strong></span>`;
      addGrammarCard(ex);
    }

    speak(`${ex.pronoun} ${ex.answer}`);
    input.disabled = true;
    checkBtn.disabled = true;

    setTimeout(() => { exerciseIndex++; renderExercise(); }, 1500);
  };

  checkBtn.addEventListener('click', check);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
  input.focus();
}

function renderSentenceExercise(ex) {
  const el = document.getElementById('app-content');
  const shuffledWords = shuffleArray([...ex.words]);
  let answerWords = [];

  el.innerHTML = `
    <div class="flex justify-between items-center mb-8">
      <button class="btn btn-secondary btn-sm" id="back-btn">← Voltar</button>
      <span class="badge badge-green">${exerciseIndex + 1} / ${exercises.length}</span>
    </div>
    ${createProgressBar(exerciseIndex, exercises.length)}

    <div class="quiz-prompt">
      <div class="text-sm text-muted mb-8">Ordena as palavras:</div>
    </div>

    <div class="answer-area" id="answer-area"></div>
    <div class="word-bank" id="word-bank"></div>
    <button class="btn btn-primary btn-full mt-16" id="check-sentence" disabled>Verificar</button>
    <div id="feedback" class="hidden mt-12 text-center"></div>
  `;

  document.getElementById('back-btn').addEventListener('click', renderUnitList);

  const bankEl = document.getElementById('word-bank');
  const answerEl = document.getElementById('answer-area');
  const checkBtn = document.getElementById('check-sentence');

  function updateUI() {
    bankEl.innerHTML = '';
    answerEl.innerHTML = '';

    shuffledWords.forEach((word, i) => {
      const chip = document.createElement('span');
      chip.className = `word-chip${answerWords.includes(i) ? ' placed' : ''}`;
      chip.textContent = word;
      chip.addEventListener('click', () => {
        if (!answerWords.includes(i)) {
          answerWords.push(i);
          updateUI();
        }
      });
      bankEl.appendChild(chip);
    });

    answerWords.forEach((wordIdx, pos) => {
      const chip = document.createElement('span');
      chip.className = 'word-chip in-answer';
      chip.textContent = shuffledWords[wordIdx];
      chip.addEventListener('click', () => {
        answerWords.splice(pos, 1);
        updateUI();
      });
      answerEl.appendChild(chip);
    });

    checkBtn.disabled = answerWords.length !== shuffledWords.length;
  }

  updateUI();

  checkBtn.addEventListener('click', () => {
    const userAnswer = answerWords.map(i => shuffledWords[i]).join(' ');
    total++;
    const correct = userAnswer === ex.answer;
    if (correct) score++;

    const feedback = document.getElementById('feedback');
    feedback.classList.remove('hidden');
    answerEl.classList.add(correct ? 'correct' : 'incorrect');

    if (correct) {
      feedback.innerHTML = `<span style="color: var(--green); font-weight: 700">✓ Correto!</span>`;
    } else {
      feedback.innerHTML = `<span style="color: var(--red)">✗ A resposta é: <strong>${ex.answer}</strong></span>`;
      addGrammarCard(ex);
    }

    speak(ex.answer);
    checkBtn.disabled = true;

    setTimeout(() => { exerciseIndex++; renderExercise(); }, 1500);
  });
}

function addGrammarCard(ex) {
  const cardId = `g_${currentUnit.id}_${ex.answer}_${Date.now()}`;
  let context, full;

  if (ex.type === 'fill') {
    context = ex.sentence;
    full = ex.sentence.replace('___', ex.answer);
  } else if (ex.type === 'conjugate') {
    context = `${ex.pronoun} + ${ex.verb} = ___`;
    full = `${ex.pronoun} ${ex.answer}`;
  } else {
    context = ex.words.join(' / ');
    full = ex.answer;
  }

  addCard(cardId, {
    type: 'grammar',
    word: ex.answer,
    emoji: currentUnit.icon,
    context: context,
    full: full,
    ipa: '',
    gender: '',
  });
}

function renderGrammarSummary() {
  const pct = total > 0 ? Math.round((score / total) * 100) : 100;

  if (pct >= 60) {
    const completed = storage.get('completedGrammar', []);
    if (!completed.includes(currentUnit.id)) {
      completed.push(currentUnit.id);
      storage.set('completedGrammar', completed);
    }
  }

  const el = document.getElementById('app-content');
  el.innerHTML = `
    <div class="card summary-card">
      <div class="summary-score">${pct}%</div>
      <div class="summary-label">${pct >= 60 ? 'Muito bem!' : 'Tenta outra vez!'}</div>
      <div class="stat-grid mt-16">
        <div class="stat-item">
          <div class="stat-value">${total}</div>
          <div class="stat-label">Total</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: var(--green)">${score}</div>
          <div class="stat-label">Corretas</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: var(--red)">${total - score}</div>
          <div class="stat-label">Erradas</div>
        </div>
      </div>
      ${total - score > 0 ? '<p class="text-sm text-muted mt-12">Wrong answers were added to your SRS review cards.</p>' : ''}
      <div class="mt-24 flex gap-8">
        ${pct < 60 ? '<button class="btn btn-outline flex-1" id="retry-btn">Repetir</button>' : ''}
        <button class="btn btn-primary flex-1" id="continue-btn">Continuar</button>
      </div>
    </div>
  `;

  document.getElementById('continue-btn').addEventListener('click', renderUnitList);
  const retry = document.getElementById('retry-btn');
  if (retry) retry.addEventListener('click', startExercises);
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
