// Progress bar component

export function createProgressBar(current, total, label = '') {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return `
    <div class="mb-8">
      ${label ? `<div class="flex justify-between mb-8"><span class="text-sm text-muted">${label}</span><span class="text-sm text-muted">${current}/${total}</span></div>` : ''}
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${pct}%"></div>
      </div>
    </div>
  `;
}
