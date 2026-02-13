// Modal component

export function showModal(title, contentHtml, actions = []) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'active-modal';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-title">${title}</div>
      <div class="modal-body">${contentHtml}</div>
      <div class="modal-actions" id="modal-actions"></div>
    </div>
  `;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  document.body.appendChild(overlay);

  const actionsEl = document.getElementById('modal-actions');
  actions.forEach(({ label, className = 'btn btn-secondary btn-sm', onClick }) => {
    const btn = document.createElement('button');
    btn.className = className;
    btn.textContent = label;
    btn.addEventListener('click', () => {
      if (onClick) onClick();
      closeModal();
    });
    actionsEl.appendChild(btn);
  });

  return overlay;
}

export function closeModal() {
  const existing = document.getElementById('active-modal');
  if (existing) existing.remove();
}
