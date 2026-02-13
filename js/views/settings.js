// Settings view
import { storage } from '../storage.js';
import { getApiKey, setApiKey } from '../claude-api.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';

export function render() {
  const apiKey = getApiKey();
  const dailyLimit = storage.get('dailyNewCardLimit', 15);
  const darkMode = document.documentElement.dataset.theme === 'dark';
  const showIpa = storage.get('showIpa', true);

  const el = document.getElementById('app-content');
  el.innerHTML = `
    <div class="section-header">
      <span class="section-title">⚙️ Definições</span>
    </div>

    <div class="card">
      <div class="card-header">🔑 API Key</div>
      <p class="text-sm text-muted mb-8">Required for AI conversation practice. Your key is stored locally and never sent anywhere except the Anthropic API.</p>
      <div class="form-group">
        <input type="password" class="form-input" id="api-key-input" value="${apiKey}" placeholder="sk-ant-...">
      </div>
      <button class="btn btn-primary btn-sm" id="save-key">Guardar</button>
    </div>

    <div class="card mt-12">
      <div class="card-header">Aprendizagem</div>

      <div class="form-group">
        <label class="form-label">Cartões novos por dia</label>
        <input type="number" class="form-input" id="daily-limit" value="${dailyLimit}" min="1" max="100">
      </div>

      <div class="toggle-row">
        <span class="toggle-label">Mostrar IPA</span>
        <label class="toggle">
          <input type="checkbox" id="show-ipa" ${showIpa ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="toggle-row">
        <span class="toggle-label">Modo escuro</span>
        <label class="toggle">
          <input type="checkbox" id="dark-mode" ${darkMode ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <div class="card mt-12">
      <div class="card-header">Dados</div>
      <div class="flex flex-col gap-8">
        <button class="btn btn-outline btn-full" id="export-btn">📤 Exportar dados</button>
        <button class="btn btn-outline btn-full" id="import-btn">📥 Importar dados</button>
        <button class="btn btn-danger btn-full" id="clear-btn">🗑️ Apagar todos os dados</button>
      </div>
      <input type="file" id="import-file" accept=".json" class="hidden">
    </div>

    <div class="text-center mt-24 text-sm text-muted">
      <p>Português — European Portuguese Learning App</p>
      <p>Fluent Forever methodology</p>
    </div>
  `;

  // API Key
  document.getElementById('save-key').addEventListener('click', () => {
    const key = document.getElementById('api-key-input').value.trim();
    setApiKey(key);
    showToast(key ? 'API key guardada!' : 'API key removida', 'success');
  });

  // Daily limit
  document.getElementById('daily-limit').addEventListener('change', (e) => {
    const val = parseInt(e.target.value) || 15;
    storage.set('dailyNewCardLimit', Math.max(1, Math.min(100, val)));
    showToast('Limite diário atualizado', 'success');
  });

  // IPA toggle
  document.getElementById('show-ipa').addEventListener('change', (e) => {
    storage.set('showIpa', e.target.checked);
  });

  // Dark mode
  document.getElementById('dark-mode').addEventListener('change', (e) => {
    const theme = e.target.checked ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    storage.set('theme', theme);
  });

  // Export
  document.getElementById('export-btn').addEventListener('click', () => {
    const data = storage.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portuguese-app-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Dados exportados!', 'success');
  });

  // Import
  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });

  document.getElementById('import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const ok = storage.importData(ev.target.result);
      if (ok) {
        showToast('Dados importados com sucesso!', 'success');
        // Re-apply theme
        const theme = storage.get('theme', 'light');
        document.documentElement.dataset.theme = theme;
      } else {
        showToast('Erro ao importar dados', 'error');
      }
    };
    reader.readAsText(file);
  });

  // Clear data
  document.getElementById('clear-btn').addEventListener('click', () => {
    showModal('Apagar todos os dados?', '<p>This will permanently delete all your progress, SRS data, and settings. This cannot be undone.</p>', [
      { label: 'Cancelar' },
      {
        label: 'Apagar tudo',
        className: 'btn btn-danger btn-sm',
        onClick: () => {
          storage.clearAll();
          showToast('Todos os dados foram apagados', 'success');
          setTimeout(() => location.reload(), 500);
        }
      },
    ]);
  });
}
