/**
 * KAZITASK — Métriques de performance
 * Une seule fonction pour la formule du score : à modifier ici seulement.
 */

/** Liste de référence pour les énumérations. Garder synchro avec le HTML. */
export const CATEGORIES = [
  'Support N1', 'Support N2', 'Support N3',
  'Infrastructure', 'Sécurité', 'Développement',
  'Maintenance', 'Réunion'
];

export const PRIORITIES = ['Basse', 'Moyenne', 'Haute', 'Critique'];
export const STATUSES   = ['En cours', 'Terminé', 'Bloqué'];

/** Mapping pour badges (classe CSS). Doit matcher le CSS. */
export const PRIORITY_CLASS = {
  'Basse':    'basse',
  'Moyenne':  'moyenne',
  'Haute':    'haute',
  'Critique': 'critique'
};

export const STATUS_CLASS = {
  'En cours': 'encours',
  'Terminé':  'termine',
  'Bloqué':   'bloque'
};

/**
 * Formate une durée en minutes en "1h30" ou "45min".
 * @param {number} minutes
 * @returns {string}
 */
export function formatDuration(minutes) {
  if (!minutes || minutes < 0) return '0min';
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

/** Formate un nombre de minutes en hh:mm (pour PDF / exports). */
export function formatDurationLong(minutes) {
  if (!minutes || minutes < 0) return '0h00';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${String(m).padStart(2, '0')}`;
}

/** Formate une date ISO en libellé français lisible. */
export function formatDateFr(isoDate, todayIso) {
  if (isoDate === todayIso) return "Aujourd'hui";
  const d = new Date(isoDate + 'T00:00:00');
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yIso = yesterday.toISOString().slice(0, 10);
  if (isoDate === yIso) return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Date du jour en ISO local (YYYY-MM-DD), sans décalage UTC. */
export function todayIso() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Décale une date ISO de N jours. */
export function shiftDate(isoDate, days) {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Calcule les métriques agrégées pour un ensemble de tâches d'un même jour.
 * @param {Array} tasks
 * @returns {{
 *   total: number, open: number, done: number, blocked: number,
 *   totalEst: number, totalReal: number, totalDown: number,
 *   critTotal: number, critDone: number,
 *   tauxResolution: number, tauxCritiques: number, efficaciteTemps: number,
 *   score: number|null, scoreLabel: string, scoreClass: string
 * }}
 */
export function computeMetrics(tasks) {
  const total = tasks.length;
  if (total === 0) {
    return {
      total: 0, open: 0, done: 0, blocked: 0,
      totalEst: 0, totalReal: 0, totalDown: 0,
      critTotal: 0, critDone: 0,
      tauxResolution: 0, tauxCritiques: 0, efficaciteTemps: 0,
      score: null, scoreLabel: '—', scoreClass: ''
    };
  }

  const done    = tasks.filter(t => t.status === 'Terminé').length;
  const open    = tasks.filter(t => t.status === 'En cours').length;
  const blocked = tasks.filter(t => t.status === 'Bloqué').length;

  const totalEst  = tasks.reduce((s, t) => s + (Number(t.est)  || 0), 0);
  const totalReal = tasks.reduce((s, t) => s + (Number(t.real) || 0), 0);
  const totalDown = tasks.reduce((s, t) => s + (Number(t.down) || 0), 0);

  // Taux de résolution : terminées / total
  const tauxResolution = done / total;

  // Taux de tâches critiques traitées
  const critTotal = tasks.filter(t => t.pri === 'Critique').length;
  const critDone  = tasks.filter(t => t.pri === 'Critique' && t.status === 'Terminé').length;
  // Si aucune tâche critique, le score reçoit 1 par défaut
  const tauxCritiques = critTotal === 0 ? 1 : critDone / critTotal;

  // Efficacité temps : 1 si on a tenu l'estimation, sinon dégradé
  const efficaciteTemps = totalReal === 0
    ? 1
    : Math.min(1, totalEst / totalReal);

  // Score pondéré
  const score = Math.round(
    100 * (0.40 * tauxResolution + 0.30 * tauxCritiques + 0.30 * efficaciteTemps)
  );

  let scoreLabel, scoreClass;
  if (score >= 75)      { scoreLabel = 'Excellent'; scoreClass = 'green'; }
  else if (score >= 50) { scoreLabel = 'À améliorer'; scoreClass = 'orange'; }
  else                  { scoreLabel = 'Critique';    scoreClass = 'red'; }

  return {
    total, open, done, blocked,
    totalEst, totalReal, totalDown,
    critTotal, critDone,
    tauxResolution, tauxCritiques, efficaciteTemps,
    score, scoreLabel, scoreClass
  };
}

/**
 * Vérifie si une tâche dépasse le SLA configuré.
 * @param {object} task
 * @param {{critique:number, haute:number}} slaHours
 * @returns {boolean}
 */
export function exceedsSla(task, slaHours) {
  if (task.status === 'Terminé') return false;
  const limit = slaHours[task.pri];
  if (!limit) return false;
  return (Number(task.real) || 0) > limit * 60;
}

/**
 * Calcule des insights compacts pour la carte "Insights du jour".
 * @param {Array} tasks
 * @param {{critique:number, haute:number}} slaHours
 * @returns {{
 *   byCat: Array<{cat:string, count:number, pct:number}>,
 *   toDo: Array<object>,            // tâches non terminées, triées par criticité
 *   sla: {critique:{total:number, over:number}, haute:{total:number, over:number}}
 * }}
 */
export function computeInsights(tasks, slaHours) {
  // Répartition par catégorie
  const catCount = {};
  tasks.forEach(t => { catCount[t.cat] = (catCount[t.cat] || 0) + 1; });
  const total = tasks.length;
  const byCat = Object.entries(catCount)
    .map(([cat, count]) => ({ cat, count, pct: total ? count / total : 0 }))
    .sort((a, b) => b.count - a.count);

  // À débloquer : tâches non terminées, triées par criticité puis temps réel
  const priOrder = { 'Critique': 0, 'Haute': 1, 'Moyenne': 2, 'Basse': 3 };
  const toDo = tasks
    .filter(t => t.status !== 'Terminé')
    .sort((a, b) => {
      const pa = priOrder[a.pri] ?? 9;
      const pb = priOrder[b.pri] ?? 9;
      if (pa !== pb) return pa - pb;
      return (b.real || 0) - (a.real || 0);
    })
    .slice(0, 4);

  // SLA : pour Critique et Haute, combien dépassent
  const sla = {
    critique: { total: 0, over: 0 },
    haute:    { total: 0, over: 0 }
  };
  tasks.forEach(t => {
    if (t.pri !== 'Critique' && t.pri !== 'Haute') return;
    if (t.status === 'Terminé') return;
    sla[t.pri.toLowerCase()].total += 1;
    if (exceedsSla(t, slaHours)) sla[t.pri.toLowerCase()].over += 1;
  });

  return { byCat, toDo, sla };
}