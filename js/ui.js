/**
 * KAZITASK — Rendu UI
 * Toutes les chaînes utilisateur sont passées par `escape()` avant injection.
 */

import {
  CATEGORIES, PRIORITIES, STATUSES,
  PRIORITY_CLASS, STATUS_CLASS,
  computeMetrics, formatDuration, formatDateFr, exceedsSla, computeInsights
} from './metrics.js';

/** Échappement HTML pour éviter XSS. */
export function escape(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Peuple les <select> avec les options des énumérations. */
export function fillSelectOptions() {
  const setOptions = (sel, items, placeholder) => {
    if (!sel) return;
    sel.innerHTML = '';
    if (placeholder) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = placeholder;
      sel.appendChild(opt);
    }
    items.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      sel.appendChild(opt);
    });
  };
  setOptions(document.getElementById('fCat'),    CATEGORIES, 'Choisir…');
  setOptions(document.getElementById('fPri'),    PRIORITIES, 'Choisir…');
  setOptions(document.getElementById('fStatus'), STATUSES,   'Choisir…');
}

/** Met à jour les compteurs dans les filtres. */
export function updateFilterCounts(tasks) {
  const counts = {
    all: tasks.length,
    encours:  tasks.filter(t => t.status === 'En cours').length,
    termine:  tasks.filter(t => t.status === 'Terminé').length,
    bloque:   tasks.filter(t => t.status === 'Bloqué').length,
    critique: tasks.filter(t => t.pri === 'Critique').length
  };
  for (const key of Object.keys(counts)) {
    const el = document.getElementById('count' + key.charAt(0).toUpperCase() + key.slice(1));
    if (el) el.textContent = counts[key];
  }
}

/** Met à jour les 4 cartes métriques. */
export function renderMetrics(tasks) {
  const m = computeMetrics(tasks);

  document.getElementById('metricTotal').textContent = m.total;
  document.getElementById('metricDone').textContent  = `${m.done} terminées`;
  document.getElementById('metricOpen').textContent  = `${m.open} en cours`;
  document.getElementById('metricTime').textContent  = formatDuration(m.totalReal);
  document.getElementById('metricEst').textContent   = formatDuration(m.totalEst);
  document.getElementById('metricResolve').textContent = m.total === 0
    ? '0%'
    : Math.round(m.tauxResolution * 100) + '%';

  const scoreEl = document.getElementById('metricScore');
  const pillEl  = document.getElementById('scorePill');
  const lblEl   = document.getElementById('scoreLabel');

  if (m.score === null) {
    scoreEl.textContent = '—';
    pillEl.className = 'score-pill';
    lblEl.textContent = '—';
  } else {
    scoreEl.textContent = m.score;
    pillEl.className = 'score-pill ' + m.scoreClass;
    lblEl.textContent = m.scoreLabel;
  }

  return m;
}

/**
 * Rend la liste des tâches pour le jour donné, après application du filtre.
 * @param {Array} tasks - tâches du jour
 * @param {string} filter - all | encours | termine | bloque | critique
 * @param {string} searchQuery
 * @param {{critique:number,haute:number}} sla
 * @param {Function} onEdit
 * @param {Function} onDelete
 * @param {Function} onToggleStatus
 */
export function renderTaskList(tasks, filter, searchQuery, sla, onEdit, onDelete, onToggleStatus) {
  const list   = document.getElementById('taskList');
  const empty  = document.getElementById('emptyState');

  let filtered = tasks.slice();

  if (filter === 'encours')  filtered = filtered.filter(t => t.status === 'En cours');
  if (filter === 'termine')  filtered = filtered.filter(t => t.status === 'Terminé');
  if (filter === 'bloque')   filtered = filtered.filter(t => t.status === 'Bloqué');
  if (filter === 'critique') filtered = filtered.filter(t => t.pri === 'Critique');

  const q = (searchQuery || '').trim().toLowerCase();
  if (q) {
    filtered = filtered.filter(t =>
      (t.title || '').toLowerCase().includes(q) ||
      (t.note  || '').toLowerCase().includes(q)
    );
  }

  // Tri : critiques d'abord, puis par date de mise à jour décroissante
  filtered.sort((a, b) => {
    if (a.pri === 'Critique' && b.pri !== 'Critique') return -1;
    if (b.pri === 'Critique' && a.pri !== 'Critique') return 1;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });

  if (filtered.length === 0) {
    list.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  list.innerHTML = filtered.map(t => taskRowHtml(t, sla)).join('');

  // Boutons d'action
  list.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', () => onEdit(btn.dataset.id));
  });
  list.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Supprimer cette tâche ?')) onDelete(btn.dataset.id);
    });
  });
  list.querySelectorAll('[data-action="toggle"]').forEach(btn => {
    btn.addEventListener('click', () => onToggleStatus(btn.dataset.id));
  });
}

function taskRowHtml(t, sla) {
  const statusCls = STATUS_CLASS[t.status] || 'encours';
  const priCls    = PRIORITY_CLASS[t.pri]   || 'moyenne';
  const slaExceeded = exceedsSla(t, sla);
  const slaBadge = slaExceeded
    ? `<span class="badge" style="background:var(--critique-soft); color:var(--critique);" title="Dépasse le SLA"><span class="dot"></span>SLA</span>`
    : '';

  return `
    <article class="task-row" data-id="${escape(t.id)}">
      <span class="task-status-dot ${statusCls}" aria-label="Statut : ${escape(t.status)}"></span>
      <div class="task-body">
        <div class="task-title">${escape(t.title)}</div>
        <div class="task-meta">
          <span class="badge badge-cat">${escape(t.cat)}</span>
          <span class="badge badge-pri ${priCls}"><span class="dot"></span>${escape(t.pri)}</span>
          <span class="badge badge-st ${statusCls}"><span class="dot"></span>${escape(t.status)}</span>
          ${slaBadge}
          <span class="mono" title="Estimé">⏱ ${formatDuration(t.est)}</span>
          <span class="mono" title="Réel" style="color:var(--text-secondary);">→ ${formatDuration(t.real)}</span>
          ${t.impact ? `<span style="color:var(--critique);" title="Impact utilisateur"><i data-lucide="alert-triangle" style="width:12px;height:12px;"></i> impact ${formatDuration(t.down)}</span>` : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="icon-btn" data-action="toggle" data-id="${escape(t.id)}" title="Basculer En cours ↔ Terminé" aria-label="Basculer statut">
          <i data-lucide="${t.status === 'Terminé' ? 'rotate-ccw' : 'check'}" class="icon"></i>
        </button>
        <button class="icon-btn" data-action="edit" data-id="${escape(t.id)}" title="Modifier" aria-label="Modifier la tâche">
          <i data-lucide="pencil" class="icon"></i>
        </button>
        <button class="icon-btn" data-action="delete" data-id="${escape(t.id)}" title="Supprimer" aria-label="Supprimer la tâche">
          <i data-lucide="trash-2" class="icon"></i>
        </button>
      </div>
    </article>
  `;
}

/* ============================================================
   Modales
   ============================================================ */

export function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('is-open');
  // Focus premier champ
  setTimeout(() => {
    const first = el.querySelector('input, select, textarea, button');
    if (first) first.focus();
  }, 50);
}

export function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('is-open');
}

export function closeAllModals() {
  document.querySelectorAll('.modal-backdrop.is-open')
    .forEach(m => m.classList.remove('is-open'));
}

/** Remplit le formulaire de tâche avec un objet (création = vide). */
export function fillTaskForm(task) {
  document.getElementById('fTitle').value  = task?.title  || '';
  document.getElementById('fCat').value    = task?.cat    || '';
  document.getElementById('fPri').value    = task?.pri    || 'Moyenne';
  document.getElementById('fStatus').value = task?.status || 'En cours';
  document.getElementById('fEst').value    = task?.est    ?? 30;
  document.getElementById('fReal').value   = task?.real   ?? 30;
  document.getElementById('fDown').value   = task?.down   ?? 0;
  document.getElementById('fImpact').value = task?.impact ? 'true' : 'false';
  document.getElementById('fNote').value   = task?.note   || '';
}

export function readTaskForm() {
  return {
    title:  document.getElementById('fTitle').value.trim(),
    cat:    document.getElementById('fCat').value,
    pri:    document.getElementById('fPri').value,
    status: document.getElementById('fStatus').value,
    est:    Number(document.getElementById('fEst').value)  || 0,
    real:   Number(document.getElementById('fReal').value) || 0,
    down:   Number(document.getElementById('fDown').value) || 0,
    impact: document.getElementById('fImpact').value === 'true',
    note:   document.getElementById('fNote').value.trim()
  };
}

/* ============================================================
   Toast (notifications)
   ============================================================ */

export function toast(message, type = 'success', duration = 2400) {
  const stack = document.getElementById('toastStack');
  if (!stack) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `
    <i data-lucide="${type === 'success' ? 'check-circle-2' : 'alert-circle'}" class="icon"></i>
    <span>${escape(message)}</span>
  `;
  stack.appendChild(el);
  if (window.lucide) window.lucide.createIcons();
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(100%)';
    el.style.transition = 'all 200ms ease';
    setTimeout(() => el.remove(), 220);
  }, duration);
}

/* ============================================================
   Carte "Insights du jour"
   ============================================================ */

/**
 * Remplit la carte insights (3 blocs). Cachée si aucune tâche.
 * @param {Array} tasks
 * @param {{critique:number, haute:number}} sla
 */
export function renderInsights(tasks, sla) {
  const card = document.getElementById('insightsCard');
  if (!card) return;
  if (!tasks || tasks.length === 0) {
    card.hidden = true;
    return;
  }
  card.hidden = false;

  const insights = computeInsights(tasks, sla);

  // Bloc 1 : barres par catégorie
  const byCatEl = document.getElementById('insightByCat');
  if (byCatEl) {
    byCatEl.innerHTML = insights.byCat.map(row => `
      <div class="insight-bar-row">
        <span class="label" title="${escape(row.cat)}">${escape(row.cat)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.round(row.pct * 100)}%"></div></div>
        <span class="count">${row.count}</span>
      </div>
    `).join('');
  }

  // Bloc 2 : tâches à débloquer
  const todoEl = document.getElementById('insightTodo');
  if (todoEl) {
    if (insights.toDo.length === 0) {
      todoEl.innerHTML = '<li class="insight-list-empty">Tout est terminé, bravo !</li>';
    } else {
      todoEl.innerHTML = insights.toDo.map(t => {
        const cls = t.status === 'Bloqué' ? 'is-haute'
                   : t.pri === 'Critique' ? 'is-critique'
                   : t.pri === 'Haute'    ? 'is-haute'
                   : 'is-encours';
        return `
          <li class="${cls}">
            <span class="title" title="${escape(t.title)}">${escape(t.title)}</span>
            <span class="pri-pill">${escape(t.pri.slice(0, 3))}</span>
          </li>
        `;
      }).join('');
    }
  }

  // Bloc 3 : SLA
  const slaEl = document.getElementById('insightSla');
  if (slaEl) {
    const renderRow = (pri, color) => {
      const data = insights.sla[pri];
      if (data.total === 0) {
        return `
          <div class="insight-sla-row">
            <span class="pri-name"><span class="dot" style="background:${color}"></span>${pri === 'critique' ? 'Critique' : 'Haute'}</span>
            <span class="sla-count sla-ok">0 en cours</span>
          </div>
        `;
      }
      const cls = data.over > 0 ? 'sla-over' : 'sla-ok';
      return `
        <div class="insight-sla-row">
          <span class="pri-name"><span class="dot" style="background:${color}"></span>${pri === 'critique' ? 'Critique' : 'Haute'}</span>
          <span class="sla-count ${cls}">${data.over}/${data.total} en retard</span>
        </div>
      `;
    };
    slaEl.innerHTML = renderRow('critique', '#EF4444') + renderRow('haute', '#F59E0B');
  }
}

/* ============================================================
   En-tête / navigation date
   ============================================================ */

export function setPageDate(dateIso, todayIso) {
  document.getElementById('todayText').textContent = formatDateFr(dateIso, todayIso);
}