// Pronunciation trainer view
import { pronunciationLessons } from '../data/pronunciation-data.js';
import { speak } from '../audio.js';
import { startRecording, stopRecording, playRecording } from '../audio.js';
import { getCompletedLessons, completeLesson, isLessonUnlocked } from '../data/lesson-plan.js';
import { showToast } from '../components/toast.js';

let currentLesson = null;
let currentPairIndex = 0;
let score = 0;
let totalAttempts = 0;
let recordingUrl = null;
let isRecording = false;

export function render() {
  currentLesson = null;
  renderLessonList();
}

function renderLessonList() {
  const completed = getCompletedLessons();
  const el = document.getElementById('app-content');

  el.innerHTML = `
    <div class="section-header">
      <span class="section-title">🔊 Pronúncia</span>
    </div>
    <p class="text-sm text-muted mb-16">Sound first! Learn the sounds of European Portuguese.</p>
    <ul class="lesson-list" id="pronunciation-lessons"></ul>
  `;

  const list = document.getElementById('pronunciation-lessons');
  pronunciationLessons.forEach(lesson => {
    const unlocked = isLessonUnlocked(lesson.id);
    const done = completed.includes(lesson.id);

    const li = document.createElement('li');
    li.className = `lesson-item${done ? ' completed' : ''}${!unlocked ? ' locked' : ''}`;
    li.innerHTML = `
      <div class="lesson-number">${done ? '✓' : lesson.id}</div>
      <div class="lesson-info">
        <div class="lesson-title">${lesson.title}</div>
        <div class="lesson-subtitle">${lesson.subtitle}</div>
      </div>
      ${!unlocked ? '<span class="text-muted">🔒</span>' : ''}
    `;

    if (unlocked) {
      li.addEventListener('click', () => startLesson(lesson));
    }
    list.appendChild(li);
  });
}

function startLesson(lesson) {
  currentLesson = lesson;
  currentPairIndex = 0;
  score = 0;
  totalAttempts = 0;
  renderPhonemeOverview();
}

function renderPhonemeOverview() {
  const el = document.getElementById('app-content');
  el.innerHTML = `
    <button class="btn btn-secondary btn-sm mb-16" id="back-btn">← Voltar</button>
    <h2 class="section-title mb-8">${currentLesson.title}</h2>
    <p class="text-sm text-muted mb-16">${currentLesson.subtitle}</p>

    <div id="phoneme-list"></div>

    <button class="btn btn-primary btn-full mt-24" id="start-practice">
      Praticar Pares Mínimos
    </button>
  `;

  document.getElementById('back-btn').addEventListener('click', renderLessonList);
  document.getElementById('start-practice').addEventListener('click', startMinimalPairs);

  const listEl = document.getElementById('phoneme-list');
  currentLesson.phonemes.forEach(p => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <div class="flex items-center gap-8">
        <span style="font-size: 1.3rem; font-family: monospace; min-width: 60px; color: var(--green); font-weight: 700">${p.ipa}</span>
        <div class="flex-1">
          <div class="text-sm">${p.description}</div>
          <div class="text-sm text-muted">${p.examples.join(', ')}</div>
        </div>
        <button class="audio-btn listen-btn" data-words="${p.examples.join('|')}">🔊</button>
      </div>
    `;
    listEl.appendChild(div);
  });

  listEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('.listen-btn');
    if (!btn) return;
    btn.classList.add('playing');
    const words = btn.dataset.words.split('|');
    for (const w of words) {
      await speak(w);
    }
    btn.classList.remove('playing');
  });
}

function startMinimalPairs() {
  if (!currentLesson.minimalPairs || currentLesson.minimalPairs.length === 0) {
    completeLesson(currentLesson.id);
    showToast('Lição completa!', 'success');
    renderLessonList();
    return;
  }
  currentPairIndex = 0;
  score = 0;
  totalAttempts = 0;
  renderMinimalPair();
}

function renderMinimalPair() {
  const pairs = currentLesson.minimalPairs;
  if (currentPairIndex >= pairs.length) {
    renderSummary();
    return;
  }

  const pair = pairs[currentPairIndex];
  const el = document.getElementById('app-content');

  // Randomly choose which one to play
  const playFirst = Math.random() < 0.5;
  const targetWord = playFirst ? pair.word1 : pair.word2;
  const targetAudio = playFirst ? pair.audio1 : pair.audio2;

  el.innerHTML = `
    <div class="flex justify-between items-center mb-16">
      <button class="btn btn-secondary btn-sm" id="back-to-overview">← Voltar</button>
      <span class="badge badge-green">${currentPairIndex + 1} / ${pairs.length}</span>
    </div>

    <div class="quiz-prompt">
      <div class="text-sm text-muted mb-8">${pair.distinction}</div>
      <button class="audio-btn" id="play-audio" style="width: 64px; height: 64px; font-size: 1.5rem; margin: 0 auto;">🔊</button>
      <div class="text-sm text-muted mt-8">Ouve e escolhe a palavra correta</div>
    </div>

    <div class="quiz-options" id="options"></div>

    <div class="text-center mt-16">
      <button class="record-btn" id="record-btn" title="Record yourself">🎤</button>
      <div class="text-sm text-muted mt-8" id="record-status">Grava a tua voz para comparar</div>
    </div>

    ${recordingUrl ? `
      <div class="text-center mt-8">
        <button class="btn btn-secondary btn-sm" id="play-recording">▶️ Ouvir gravação</button>
      </div>
    ` : ''}
  `;

  // Play audio
  const playBtn = document.getElementById('play-audio');
  playBtn.addEventListener('click', async () => {
    playBtn.classList.add('playing');
    await speak(targetAudio);
    playBtn.classList.remove('playing');
  });

  // Auto-play on load
  setTimeout(() => speak(targetAudio), 300);

  // Options
  const optionsEl = document.getElementById('options');
  [pair.word1, pair.word2].forEach(word => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option';
    btn.textContent = word;
    btn.addEventListener('click', () => {
      totalAttempts++;
      const correct = word === targetWord;
      if (correct) score++;

      btn.classList.add(correct ? 'correct' : 'incorrect');
      // Highlight the correct one
      optionsEl.querySelectorAll('.quiz-option').forEach(b => {
        b.style.pointerEvents = 'none';
        if (b.textContent === targetWord) b.classList.add('correct');
      });

      // Play both for comparison
      setTimeout(async () => {
        await speak(pair.audio1, 0.7);
        await new Promise(r => setTimeout(r, 400));
        await speak(pair.audio2, 0.7);

        setTimeout(() => {
          currentPairIndex++;
          renderMinimalPair();
        }, 800);
      }, 600);
    });
    optionsEl.appendChild(btn);
  });

  // Recording
  const recordBtn = document.getElementById('record-btn');
  const recordStatus = document.getElementById('record-status');
  recordBtn.addEventListener('click', async () => {
    if (!isRecording) {
      const ok = await startRecording();
      if (ok) {
        isRecording = true;
        recordBtn.classList.add('recording');
        recordStatus.textContent = 'A gravar... Clica para parar';
      } else {
        showToast('Não foi possível aceder ao microfone', 'error');
      }
    } else {
      isRecording = false;
      recordBtn.classList.remove('recording');
      recordingUrl = await stopRecording();
      recordStatus.textContent = 'Gravação guardada';
      // Re-render to show play button
      renderMinimalPair();
    }
  });

  // Play recording
  const playRecBtn = document.getElementById('play-recording');
  if (playRecBtn) {
    playRecBtn.addEventListener('click', () => playRecording(recordingUrl));
  }

  document.getElementById('back-to-overview').addEventListener('click', renderPhonemeOverview);
}

function renderSummary() {
  completeLesson(currentLesson.id);
  const pct = totalAttempts > 0 ? Math.round((score / totalAttempts) * 100) : 100;

  const el = document.getElementById('app-content');
  el.innerHTML = `
    <div class="card summary-card">
      <div class="summary-score">${pct}%</div>
      <div class="summary-label">Pares mínimos corretos</div>
      <div class="text-sm text-muted">${score} / ${totalAttempts}</div>
      <div class="mt-24">
        <button class="btn btn-primary btn-full" id="back-to-list">Continuar</button>
      </div>
    </div>
  `;

  document.getElementById('back-to-list').addEventListener('click', renderLessonList);
}
