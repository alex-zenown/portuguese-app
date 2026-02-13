// Flashcard component with 3D flip

export function createFlashcard({ front, back, onFlip }) {
  const container = document.createElement('div');
  container.className = 'flashcard-container';

  container.innerHTML = `
    <div class="flashcard">
      <div class="flashcard-face flashcard-front">${front}</div>
      <div class="flashcard-face flashcard-back">${back}</div>
    </div>
  `;

  const card = container.querySelector('.flashcard');
  let flipped = false;

  container.addEventListener('click', () => {
    flipped = !flipped;
    card.classList.toggle('flipped', flipped);
    if (onFlip) onFlip(flipped);
  });

  container.flip = () => {
    flipped = !flipped;
    card.classList.toggle('flipped', flipped);
    if (onFlip) onFlip(flipped);
  };

  container.isFlipped = () => flipped;

  container.reset = () => {
    flipped = false;
    card.classList.remove('flipped');
  };

  return container;
}
