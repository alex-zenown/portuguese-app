// Curriculum sequencing — maps lesson IDs to types and unlock criteria

export const lessons = [
  // Pronunciation block (1-5)
  { id: 1, type: 'pronunciation', title: 'Vogais Orais', unlockAfter: null },
  { id: 2, type: 'pronunciation', title: 'Vogais Nasais', unlockAfter: 1 },
  { id: 3, type: 'pronunciation', title: 'Consoantes I', unlockAfter: 2 },
  { id: 4, type: 'pronunciation', title: 'Consoantes II', unlockAfter: 3 },
  { id: 5, type: 'pronunciation', title: 'Acentuação e Ritmo', unlockAfter: 4 },

  // Vocabulary block (6-20)
  { id: 6, type: 'vocabulary', title: 'Animais', unlockAfter: null },
  { id: 7, type: 'vocabulary', title: 'Comida', unlockAfter: 6 },
  { id: 8, type: 'vocabulary', title: 'Corpo', unlockAfter: 7 },
  { id: 9, type: 'vocabulary', title: 'Pessoas', unlockAfter: 8 },
  { id: 10, type: 'vocabulary', title: 'Roupa', unlockAfter: 9 },
  { id: 11, type: 'vocabulary', title: 'Casa', unlockAfter: 10 },
  { id: 12, type: 'vocabulary', title: 'Natureza', unlockAfter: 11 },
  { id: 13, type: 'vocabulary', title: 'Cidade', unlockAfter: 12 },
  { id: 14, type: 'vocabulary', title: 'Tempo', unlockAfter: 13 },
  { id: 15, type: 'vocabulary', title: 'Cores e Números', unlockAfter: 14 },
  { id: 16, type: 'vocabulary', title: 'Ações I', unlockAfter: 15 },
  { id: 17, type: 'vocabulary', title: 'Ações II', unlockAfter: 16 },
  { id: 18, type: 'vocabulary', title: 'Adjetivos', unlockAfter: 17 },
  { id: 19, type: 'vocabulary', title: 'Dia a Dia', unlockAfter: 18 },
  { id: 20, type: 'vocabulary', title: 'Expressões', unlockAfter: 19 },
];

export function isLessonUnlocked(lessonId) {
  const lesson = lessons.find(l => l.id === lessonId);
  if (!lesson) return false;
  if (lesson.unlockAfter === null) return true;

  // Check if prerequisite is completed
  const completedLessons = JSON.parse(localStorage.getItem('ptapp_completedLessons') || '[]');
  return completedLessons.includes(lesson.unlockAfter);
}

export function completeLesson(lessonId) {
  const completed = JSON.parse(localStorage.getItem('ptapp_completedLessons') || '[]');
  if (!completed.includes(lessonId)) {
    completed.push(lessonId);
    localStorage.setItem('ptapp_completedLessons', JSON.stringify(completed));
  }
}

export function getCompletedLessons() {
  return JSON.parse(localStorage.getItem('ptapp_completedLessons') || '[]');
}
