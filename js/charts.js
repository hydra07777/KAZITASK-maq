/**
 * KAZITASK — Mini-graphiques SVG pour les cartes métriques.
 * Aucune dépendance, pas de canvas. Les valeurs sont passées en attributs
 * pour rester compatibles avec une future re-render à chaque tâche ajoutée.
 */

/**
 * Donut (anneau) simple avec un seul segment proportionnel à `pct` (0..1).
 * Couleur personnalisable (ex: classe de score vert/orange/rouge).
 * Le centre reste vide pour ne pas concurrencer le gros chiffre de la carte hero.
 */
export function donutSvg(pct, color, size = 44, stroke = 6) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct || 0));
  const offset = c * (1 - clamped);
  return `
    <svg class="metric-chart" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"
         aria-hidden="true" focusable="false">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}"
              stroke="var(--chart-track)" stroke-width="${stroke}" fill="none" />
      <circle class="metric-chart-arc" cx="${size / 2}" cy="${size / 2}" r="${r}"
              stroke="${color}" stroke-width="${stroke}" fill="none"
              stroke-linecap="round"
              stroke-dasharray="${c}"
              stroke-dashoffset="${c}"
              style="--target-offset:${offset}px; transform: rotate(-90deg); transform-origin: center;" />
    </svg>
  `;
}

/**
 * Donut 3 segments (terminé / en cours / bloqué).
 * Espacement inter-segments pour rester lisible à petite taille.
 */
export function donutSegmentsSvg(done, open, blocked, size = 44, stroke = 5) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = (done || 0) + (open || 0) + (blocked || 0);
  if (total === 0) {
    return `
      <svg class="metric-chart" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"
           aria-hidden="true" focusable="false">
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}"
                stroke="var(--chart-track)" stroke-width="${stroke}" fill="none" />
      </svg>
    `;
  }
  // Petit gap entre segments (~6°) pour qu'on les distingue visuellement
  const gap = 0.10;        // fraction de la circonférence par segment
  const pcts = [done / total, open / total, blocked / total];
  const adjusted = pcts.map(p => Math.max(0, p - gap));
  // Recalcule la circonférence "active" une fois les gaps retirés
  const active = 2 * Math.PI * r * (1 - gap * pcts.length);
  const colors = ['var(--termine)', 'var(--encours)', 'var(--bloque)'];
  let cursor = 0;
  const arcs = adjusted.map((p, i) => {
    const len = active * (p / Math.max(adjusted.reduce((s, x) => s + x, 0), 0.0001));
    const dash = `${len} ${c - len}`;
    const out = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}"
              stroke="${colors[i]}" stroke-width="${stroke}" fill="none"
              stroke-dasharray="${dash}" stroke-dashoffset="${-cursor}"
              transform="rotate(-90 ${size / 2} ${size / 2})" />`;
    cursor += len;
    return out;
  });
  return `
    <svg class="metric-chart" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"
         aria-hidden="true" focusable="false">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}"
              stroke="var(--chart-track)" stroke-width="${stroke}" fill="none" />
      ${arcs.join('')}
    </svg>
  `;
}

/**
 * Jauge en arc (demi-cercle) pour un pourcentage 0..100.
 * L'arc part à gauche (180°) et monte jusqu'à 0° à droite.
 * Couleur: vert si ≥75, orange si ≥50, rouge sinon (mêmes seuils que le score).
 */
export function gaugeSvg(pct, color, width = 88, height = 44) {
  const stroke = 6;
  // Centre du cercle: (width/2, height-6), rayon = (width/2 - 10)
  const cx = width / 2;
  const cy = height - 6;
  const r  = Math.min(width / 2 - 10, cy - 6);
  const arcLength = Math.PI * r;   // demi circonférence
  const clamped = Math.max(0, Math.min(1, (pct || 0) / 100));
  const offset = arcLength * (1 - clamped);
  return `
    <svg class="metric-chart" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"
         aria-hidden="true" focusable="false">
      <path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}"
            stroke="var(--chart-track)" stroke-width="${stroke}" fill="none" stroke-linecap="round" />
      <path class="metric-chart-arc"
            d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}"
            stroke="${color}" stroke-width="${stroke}" fill="none" stroke-linecap="round"
            stroke-dasharray="${arcLength}"
            stroke-dashoffset="${arcLength}"
            style="--target-offset:${offset}px;" />
    </svg>
  `;
}

/**
 * Deux barres horizontaires empilées (estimé = haut, réel = bas), pas de
 * débordement : si réel > estimé, la barre réel est tronquée au track et on
 * peint tout le track en couleur d'alerte (overflow = "rouge plein").
 *
 * @param {number} est       minutes
 * @param {number} real      minutes
 * @param {number} max       minutes (référence pour le ratio, jamais 0)
 * @param {number} width     largeur du SVG (px CSS)
 */
export function barsCompareSvg(est, real, max, width = 120) {
  const height = 30;
  const stroke = 6;
  const trackX = 2;
  const trackW = width - 4;
  const trackY1 = 6;
  const trackY2 = 18;
  const e = Math.max(0, Number(est) || 0);
  const r = Math.max(0, Number(real) || 0);
  const ratio = Math.max(e, r, 1);
  const pctEst  = Math.max(0, Math.min(1, e / ratio));
  const pctReal = Math.max(0, Math.min(1, r / ratio));
  const over = e > 0 && r > e * 1.5;   // on flag seulement les vrais dépassements (>150%)
  // Couleur de la barre réel: rouge si débordement, sinon cyan
  const realFill = over ? 'var(--critique)' : 'var(--cyan)';
  return `
    <svg class="metric-chart" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"
         aria-hidden="true" focusable="false">
      <rect x="${trackX}" y="${trackY1}" width="${trackW}" height="${stroke}" rx="${stroke / 2}"
            fill="var(--chart-track)" />
      <rect x="${trackX}" y="${trackY1}" height="${stroke}" rx="${stroke / 2}"
            width="0" fill="var(--accent-light)" opacity="0.7"
            class="metric-chart-bar"
            style="--target-w:${(trackW * pctEst).toFixed(2)}px;" />
      <rect x="${trackX}" y="${trackY2}" width="${trackW}" height="${stroke}" rx="${stroke / 2}"
            fill="var(--chart-track)" />
      <rect x="${trackX}" y="${trackY2}" height="${stroke}" rx="${stroke / 2}"
            width="0" fill="${realFill}"
            class="metric-chart-bar"
            style="--target-w:${(trackW * pctReal).toFixed(2)}px;" />
    </svg>
  `;
}

/** Couleur par seuil de score (vert/orange/rouge). Cohérent avec la pill. */
export function scoreColor(score) {
  if (score === null || score === undefined) return 'var(--text-muted)';
  if (score >= 75) return 'var(--termine)';
  if (score >= 50) return 'var(--haute)';
  return 'var(--critique)';
}
