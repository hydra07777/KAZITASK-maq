/**
 * KAZITASK — Persistance localStorage + import/export JSON
 * Stockage clé `kazitask.v1`. Toujours enrobé dans try/catch.
 */

const STORAGE_KEY = 'kazitask.v1';
const SETTINGS_KEY = 'kazitask.settings.v1';

/** @typedef {{id:string,date:string,title:string,cat:string,pri:string,status:string,est:number,real:number,down:number,impact:boolean,createdAt:number,updatedAt:number}} Task */

/**
 * Lecture sécurisée du store.
 * @returns {{tasks: Task[], version: number}}
 */
export function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { tasks: [], version: 1 };
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.tasks)) return { tasks: [], version: 1 };
    return parsed;
  } catch (err) {
    console.warn('[kazitask] localStorage illisible, reset :', err);
    return { tasks: [], version: 1 };
  }
}

/** Écriture sécurisée. */
export function saveStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch (err) {
    console.error('[kazitask] sauvegarde impossible :', err);
    return false;
  }
}

/**
 * Charge les paramètres utilisateur (nom, poste, SLA).
 * @returns {{name:string,role:string,sla:{critique:number,haute:number},defaultEst:number}}
 */
export function loadSettings() {
  const defaults = {
    name: 'Technicien IT',
    role: 'Support & Infrastructure',
    sla: { critique: 4, haute: 8 },
    defaultEst: 30
  };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

/**
 * Génère un nouvel identifiant unique (timestamp + random).
 */
export function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ============================================================
   CRUD
   ============================================================ */

/**
 * Crée ou met à jour une tâche. Renvoie la tâche enregistrée.
 * @param {Partial<Task>} taskDraft
 * @returns {Task}
 */
export function upsertTask(store, taskDraft) {
  const now = Date.now();
  const id = taskDraft.id || newId();
  const existing = store.tasks.find(t => t.id === id);

  /** @type {Task} */
  const task = {
    id,
    date: taskDraft.date,
    title: (taskDraft.title || '').trim(),
    cat: taskDraft.cat,
    pri: taskDraft.pri,
    status: taskDraft.status,
    est: Number(taskDraft.est) || 0,
    real: Number(taskDraft.real) || 0,
    down: Number(taskDraft.down) || 0,
    impact: taskDraft.impact === true || taskDraft.impact === 'true',
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now
  };

  if (existing) {
    Object.assign(existing, task);
  } else {
    store.tasks.push(task);
  }
  saveStore(store);
  return task;
}

export function deleteTask(store, id) {
  const before = store.tasks.length;
  store.tasks = store.tasks.filter(t => t.id !== id);
  if (store.tasks.length !== before) saveStore(store);
  return store.tasks.length !== before;
}

export function tasksForDate(store, dateIso) {
  return store.tasks.filter(t => t.date === dateIso);
}

/* ============================================================
   Import / Export JSON
   ============================================================ */

/** Exporte toutes les tâches + paramètres dans un Blob JSON. */
export function buildBackupBlob(settings) {
  const store = loadStore();
  const payload = {
    app: 'kazitask',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    tasks: store.tasks
  };
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}

/** Déclenche un téléchargement navigateur pour un Blob. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Parse un fichier JSON et remplace le store.
 * Retourne {ok:boolean, error?:string, count?:number}
 */
export function importFromJsonText(text) {
  try {
    const data = JSON.parse(text);
    if (!data || !Array.isArray(data.tasks)) {
      return { ok: false, error: 'Format invalide : champ "tasks" absent ou non-tableau.' };
    }
    const store = { tasks: data.tasks, version: 1 };
    saveStore(store);
    return { ok: true, count: data.tasks.length };
  } catch (err) {
    return { ok: false, error: 'JSON invalide : ' + err.message };
  }
}