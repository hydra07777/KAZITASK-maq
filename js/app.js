/**
 * KAZITASK — Point d'entrée
 * Orchestration : état, raccourcis clavier, événements UI.
 */

import {
  loadStore, saveStore, loadSettings, saveSettings,
  upsertTask, deleteTask, tasksForDate,
  buildBackupBlob, downloadBlob, importFromJsonText
} from './store.js';
import {
  todayIso, shiftDate, computeMetrics, formatDuration
} from './metrics.js';
import {
  fillSelectOptions, renderMetrics, renderTaskList, updateFilterCounts,
  openModal, closeModal, closeAllModals,
  fillTaskForm, readTaskForm, setPageDate, toast
} from './ui.js';
import {
  buildMarkdown, buildCsv, buildJson,
  downloadMarkdown, downloadCsv, downloadDayJson, downloadPdf
} from './export.js';

/* ============================================================
   État applicatif
   ============================================================ */

const state = {
  store:        loadStore(),
  settings:     loadSettings(),
  currentDate:  todayIso(),
  currentFilter: 'all',
  searchQuery:  '',
  editingId:    null
};

/* ============================================================
   Initialisation
   ============================================================ */

function init() {
  // Sidebar : reflet de l'utilisateur
  document.getElementById('userName').textContent = state.settings.name;
  document.getElementById('userRole').textContent = state.settings.role;
  document.getElementById('avatarInitials').textContent =
    initials(state.settings.name);

  // Pré-remplir durée par défaut
  const defEst = document.getElementById('fEst');
  if (defEst && !defEst.dataset.userSet) defEst.value = state.settings.defaultEst;

  // Peuple les selects (catégorie, priorité, statut)
  fillSelectOptions();

  // Rendu initial
  renderAll();

  bindEvents();
  bindKeyboard();

  // Icônes Lucide au démarrage
  if (window.lucide) window.lucide.createIcons();

  // Premier lancement : toast d'accueil si localStorage vide
  if (state.store.tasks.length === 0) {
    setTimeout(() => toast('Bienvenue ! Ajoutez votre première tâche avec N.', 'success', 3500), 400);
  }
}

function initials(name) {
  if (!name) return 'IT';
  return name.trim().split(/\s+/).slice(0, 2)
    .map(p => p.charAt(0).toUpperCase()).join('');
}

/* ============================================================
   Rendu
   ============================================================ */

function renderAll() {
  setPageDate(state.currentDate, todayIso());

  // Titre dynamique selon la date
  const isToday = state.currentDate === todayIso();
  const titleEl = document.getElementById('pageTitle');
  const subEl   = document.getElementById('pageSubtitle');
  if (isToday) {
    titleEl.textContent = 'Journal du jour';
    subEl.textContent = '— consignez vos tâches, mesurez votre performance';
  } else {
    titleEl.textContent = 'Journal';
    subEl.textContent = '— ' + new Date(state.currentDate + 'T00:00:00')
      .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  const tasks = tasksForDate(state.store, state.currentDate);
  renderMetrics(tasks);
  updateFilterCounts(tasks);
  renderTaskList(
    tasks, state.currentFilter, state.searchQuery, state.settings.sla,
    startEditTask, handleDelete, toggleStatus
  );

  if (window.lucide) window.lucide.createIcons();
}

/* ============================================================
   Actions tâches
   ============================================================ */

function openCreateModal() {
  state.editingId = null;
  document.getElementById('taskModalTitle').textContent = 'Nouvelle tâche';
  fillTaskForm({
    est: state.settings.defaultEst,
    real: state.settings.defaultEst,
    down: 0,
    impact: false,
    cat: '',
    pri: 'Moyenne',
    status: 'En cours'
  });
  openModal('taskModal');
}

function startEditTask(id) {
  const t = state.store.tasks.find(x => x.id === id);
  if (!t) return;
  state.editingId = id;
  document.getElementById('taskModalTitle').textContent = 'Modifier la tâche';
  fillTaskForm(t);
  openModal('taskModal');
}

function handleSubmitTask(e) {
  e.preventDefault();
  const data = readTaskForm();
  if (!data.title) {
    toast('Le titre est obligatoire.', 'error');
    return;
  }
  if (!data.cat) {
    toast('Choisissez une catégorie.', 'error');
    return;
  }
  upsertTask(state.store, {
    ...data,
    id: state.editingId || undefined,
    date: state.currentDate
  });
  closeModal('taskModal');
  renderAll();
  toast(state.editingId ? 'Tâche mise à jour.' : 'Tâche enregistrée.', 'success');
}

function handleDelete(id) {
  if (deleteTask(state.store, id)) {
    renderAll();
    toast('Tâche supprimée.', 'success');
  }
}

function toggleStatus(id) {
  const t = state.store.tasks.find(x => x.id === id);
  if (!t) return;
  // Cycle : En cours → Terminé → Bloqué → En cours
  const cycle = { 'En cours': 'Terminé', 'Terminé': 'Bloqué', 'Bloqué': 'En cours' };
  t.status = cycle[t.status] || 'En cours';
  t.updatedAt = Date.now();
  saveStore(state.store);
  renderAll();
}

/* ============================================================
   Filtres & recherche
   ============================================================ */

function setFilter(filter) {
  state.currentFilter = filter;
  document.querySelectorAll('.filter-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.filter === filter);
  });
  renderAll();
}

/* ============================================================
   Navigation date
   ============================================================ */

function goToToday() { state.currentDate = todayIso(); renderAll(); }
function prevDate()  { state.currentDate = shiftDate(state.currentDate, -1); renderAll(); }
function nextDate()  {
  const next = shiftDate(state.currentDate, 1);
  if (next > todayIso()) return; // ne pas dépasser aujourd'hui
  state.currentDate = next;
  renderAll();
}

/* ============================================================
   Export modal
   ============================================================ */

function openExportModal() {
  const tasks = tasksForDate(state.store, state.currentDate);
  const m = computeMetrics(tasks);
  const summary = document.getElementById('reportSummary');
  if (tasks.length === 0) {
    summary.innerHTML = `<p style="color:var(--text-muted); font-size:13px;">
      Aucune tâche pour le moment. Le rapport sera généré à partir de zéro.
    </p>`;
  } else {
    summary.innerHTML = `
      <div style="display:flex; gap:16px; flex-wrap:wrap; font-size:13px; color:var(--text-secondary);">
        <span><strong style="color:var(--text-primary);">${m.total}</strong> tâches</span>
        <span><strong style="color:var(--text-primary);">${m.done}</strong> terminées</span>
        <span><strong style="color:var(--text-primary);">${formatDuration(m.totalReal)}</strong> travaillées</span>
        <span>Score <strong style="color:var(--text-primary);">${m.score ?? '—'}/100</strong></span>
      </div>
    `;
  }
  openModal('exportModal');
  if (window.lucide) window.lucide.createIcons();
}

/* ============================================================
   Settings modal
   ============================================================ */

function openSettingsModal() {
  document.getElementById('sName').value = state.settings.name;
  document.getElementById('sRole').value = state.settings.role;
  document.getElementById('sSlaC').value  = state.settings.sla.critique;
  document.getElementById('sSlaH').value  = state.settings.sla.haute;
  document.getElementById('sDefaultEst').value = state.settings.defaultEst;
  openModal('settingsModal');
}

function handleSettingsSubmit(e) {
  e.preventDefault();
  state.settings = {
    name: document.getElementById('sName').value.trim() || 'Technicien IT',
    role: document.getElementById('sRole').value.trim() || 'Support & Infrastructure',
    sla: {
      critique: Number(document.getElementById('sSlaC').value) || 4,
      haute:    Number(document.getElementById('sSlaH').value) || 8
    },
    defaultEst: Number(document.getElementById('sDefaultEst').value) || 30
  };
  saveSettings(state.settings);

  // Refresh sidebar
  document.getElementById('userName').textContent = state.settings.name;
  document.getElementById('userRole').textContent = state.settings.role;
  document.getElementById('avatarInitials').textContent = initials(state.settings.name);

  closeModal('settingsModal');
  renderAll();
  toast('Paramètres enregistrés.', 'success');
}

/* ============================================================
   Import / Export JSON global
   ============================================================ */

function exportBackup() {
  const blob = buildBackupBlob(state.settings);
  const date = todayIso();
  downloadBlob(blob, `kazitask-backup-${date}.json`);
  toast('Sauvegarde téléchargée.', 'success');
}

function triggerImport() {
  document.getElementById('importFile').click();
}

function handleImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const result = importFromJsonText(ev.target.result);
    if (result.ok) {
      state.store = loadStore();
      renderAll();
      toast(`${result.count} tâche(s) importée(s).`, 'success');
    } else {
      toast(result.error || 'Import impossible.', 'error');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
}

/* ============================================================
   Événements
   ============================================================ */

function bindEvents() {
  document.getElementById('addTaskBtn').addEventListener('click', openCreateModal);
  document.getElementById('taskForm').addEventListener('submit', handleSubmitTask);
  document.getElementById('settingsForm').addEventListener('submit', handleSettingsSubmit);

  // Filtres
  document.querySelectorAll('.filter-chip').forEach(c => {
    c.addEventListener('click', () => setFilter(c.dataset.filter));
  });

  // Navigation date
  document.getElementById('prevDay').addEventListener('click', prevDate);
  document.getElementById('nextDay').addEventListener('click', nextDate);
  document.getElementById('todayLabel').addEventListener('click', goToToday);

  // Recherche
  const searchToggle = document.getElementById('searchToggle');
  const searchBar    = document.getElementById('searchBar');
  const searchInput  = document.getElementById('searchInput');
  searchToggle.addEventListener('click', () => {
    const visible = !searchBar.hidden;
    searchBar.hidden = visible;
    if (!visible) searchInput.focus();
    else { state.searchQuery = ''; searchInput.value = ''; renderAll(); }
  });
  searchInput.addEventListener('input', () => {
    state.searchQuery = searchInput.value;
    renderAll();
  });

  // Fermeture modales (backdrop + bouton)
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeAllModals());
  });
  document.querySelectorAll('.modal-backdrop').forEach(bd => {
    bd.addEventListener('click', e => {
      if (e.target === bd) closeAllModals();
    });
  });

  // Export modal
  document.getElementById('exportPdf').addEventListener('click', () => {
    const tasks = tasksForDate(state.store, state.currentDate);
    downloadPdf(state.currentDate, tasks, state.settings);
    toast('PDF généré.', 'success');
  });
  document.getElementById('exportMd').addEventListener('click', () => {
    const tasks = tasksForDate(state.store, state.currentDate);
    downloadMarkdown(state.currentDate, tasks, state.settings);
    toast('Markdown téléchargé.', 'success');
  });
  document.getElementById('exportCsv').addEventListener('click', () => {
    const tasks = tasksForDate(state.store, state.currentDate);
    downloadCsv(state.currentDate, tasks);
    toast('CSV téléchargé.', 'success');
  });
  document.getElementById('exportJson').addEventListener('click', () => {
    const tasks = tasksForDate(state.store, state.currentDate);
    downloadDayJson(state.currentDate, tasks, state.settings);
    toast('JSON téléchargé.', 'success');
  });

  // Sidebar items
  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      document.querySelectorAll('.nav-item').forEach(n =>
        n.classList.toggle('active', n === item && n.dataset.view));
      if (view === 'export') openExportModal();
      else if (view === 'metrics') openExportModal(); // pour l'instant le rapport = métriques
      else goToToday();
    });
  });

  // Outils
  document.getElementById('navImport').addEventListener('click', triggerImport);
  document.getElementById('navExport').addEventListener('click', exportBackup);
  document.getElementById('navSettings').addEventListener('click', openSettingsModal);

  document.getElementById('importFile').addEventListener('change', handleImportFile);

  // Mobile menu
  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('is-open');
  });
}

/* ============================================================
   Raccourcis clavier
   ============================================================ */

function bindKeyboard() {
  document.addEventListener('keydown', e => {
    // Ignorer si on est dans un champ de saisie (sauf raccourcis globaux)
    const target = e.target;
    const isField = target && /INPUT|TEXTAREA|SELECT/.test(target.tagName);

    // Échap ferme une modale ouverte
    if (e.key === 'Escape') {
      closeAllModals();
      return;
    }

    // Ctrl/Cmd + Entrée : enregistrer le formulaire de tâche ou de paramètres
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      const openModal = document.querySelector('.modal-backdrop.is-open');
      if (!openModal) return;
      const form = openModal.querySelector('form');
      if (form) form.requestSubmit();
      e.preventDefault();
      return;
    }

    // Si un champ de saisie est focus, on n'active pas les raccourcis globaux
    if (isField) return;

    const k = e.key.toLowerCase();
    if (k === 'n') { e.preventDefault(); openCreateModal(); }
    else if (k === 'e') { e.preventDefault(); openExportModal(); }
    else if (k === 't') { e.preventDefault(); goToToday(); }
    else if (k === 'arrowleft')  { e.preventDefault(); prevDate(); }
    else if (k === 'arrowright') { e.preventDefault(); nextDate(); }
  });
}

/* ============================================================
   Bootstrap
   ============================================================ */

document.addEventListener('DOMContentLoaded', init);