/**
 * KAZITASK — Exports Markdown / CSV / JSON / PDF
 */

import {
  computeMetrics, formatDuration, formatDurationLong
} from './metrics.js';
import { downloadBlob } from './store.js';

/* ============================================================
   Markdown
   ============================================================ */

export function buildMarkdown(dateIso, tasks, settings) {
  const m = computeMetrics(tasks);
  const dateLabel = new Date(dateIso + 'T00:00:00')
    .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const accompli = tasks.filter(t => t.status === 'Terminé');
  const problemes = tasks.filter(t =>
    t.impact || t.status === 'Bloqué' || t.pri === 'Critique'
  );
  const reportes = tasks.filter(t => t.status !== 'Terminé');

  let md = `# Rapport KAZITASK — ${dateLabel}\n\n`;
  md += `**Auteur** : ${settings.name} · ${settings.role}\n\n`;
  md += `## Métriques clés\n\n`;
  md += `- **Tâches** : ${m.total} (${m.done} terminées, ${m.open} en cours, ${m.blocked} bloquées)\n`;
  md += `- **Temps travaillé** : ${formatDuration(m.totalReal)} — estimé ${formatDuration(m.totalEst)}\n`;
  md += `- **Taux de résolution** : ${Math.round(m.tauxResolution * 100)} %\n`;
  md += `- **Score de performance** : ${m.score ?? '—'}/100 (${m.scoreLabel})\n\n`;

  md += `## Accompli\n\n`;
  if (accompli.length === 0) md += `_Aucune tâche terminée._\n\n`;
  else accompli.forEach(t => md += `- ✅ **${t.title}** — _${t.cat}_ · ${t.pri} · ${formatDuration(t.real)}\n`);

  md += `\n## Problèmes & incidents\n\n`;
  if (problemes.length === 0) md += `_Aucun incident notable._\n\n`;
  else problemes.forEach(t => {
    const tags = [];
    if (t.pri === 'Critique')  tags.push('🔥 Critique');
    if (t.status === 'Bloqué') tags.push('🛑 Bloqué');
    if (t.impact)             tags.push(`⚠️ Impact ${formatDuration(t.down)}`);
    md += `- **${t.title}**${tags.length ? ` _(${tags.join(', ')})_` : ''}\n`;
    if (t.note) md += `  - ${t.note.replace(/\n/g, '\n  - ')}\n`;
  });

  md += `\n## Reporté à demain\n\n`;
  if (reportes.length === 0) md += `_Tout est terminé, bravo._\n\n`;
  else reportes.forEach(t => md += `- ⏳ **${t.title}** — _${t.status}_\n`);

  return md;
}

/* ============================================================
   CSV
   ============================================================ */

export function buildCsv(dateIso, tasks) {
  const headers = ['date', 'titre', 'categorie', 'priorite', 'statut',
                   'estime_min', 'reel_min', 'downtime_min', 'impact', 'notes'];
  const esc = v => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const rows = tasks.map(t => [
    t.date, t.title, t.cat, t.pri, t.status,
    t.est, t.real, t.down, t.impact ? 'oui' : 'non',
    (t.note || '').replace(/\r?\n/g, ' ')
  ].map(esc).join(','));
  return [headers.join(','), ...rows].join('\n');
}

/* ============================================================
   JSON (snapshot du jour)
   ============================================================ */

export function buildJson(dateIso, tasks, settings) {
  const payload = {
    app: 'kazitask',
    date: dateIso,
    exportedAt: new Date().toISOString(),
    settings,
    metrics: computeMetrics(tasks),
    tasks
  };
  return JSON.stringify(payload, null, 2);
}

/* ============================================================
   Téléchargements simples (Étape 2 du SPEC)
   ============================================================ */

export function downloadMarkdown(dateIso, tasks, settings) {
  const md = buildMarkdown(dateIso, tasks, settings);
  downloadBlob(new Blob([md], { type: 'text/markdown;charset=utf-8' }),
    `kazitask-${dateIso}.md`);
}

export function downloadCsv(dateIso, tasks) {
  const csv = buildCsv(dateIso, tasks);
  // BOM pour qu'Excel reconnaisse l'UTF-8
  downloadBlob(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }),
    `kazitask-${dateIso}.csv`);
}

export function downloadDayJson(dateIso, tasks, settings) {
  const json = buildJson(dateIso, tasks, settings);
  downloadBlob(new Blob([json], { type: 'application/json' }),
    `kazitask-${dateIso}.json`);
}

/* ============================================================
   PDF (Étape 3 du SPEC) — jsPDF + autotable
   ============================================================ */

export function downloadPdf(dateIso, tasks, settings) {
  if (!window.jspdf) {
    alert('PDF indisponible : jsPDF n\'est pas chargé.');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const m = computeMetrics(tasks);

  const dateLabel = new Date(dateIso + 'T00:00:00')
    .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // En-tête coloré
  doc.setFillColor(124, 58, 237);
  doc.rect(0, 0, 595, 64, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('KAZITASK — Rapport de fin de journée', 40, 32);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1), 40, 50);

  // Métadonnées auteur
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.text(`${settings.name} · ${settings.role}`, 40, 84);

  // Bloc métriques
  doc.setDrawColor(230, 230, 230);
  doc.setFillColor(248, 248, 252);
  doc.roundedRect(40, 100, 515, 70, 6, 6, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('MÉTRIQUES', 56, 118);

  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.text(`Tâches : ${m.total}  ·  Terminées : ${m.done}  ·  En cours : ${m.open}  ·  Bloquées : ${m.blocked}`, 56, 138);
  doc.text(`Temps travaillé : ${formatDurationLong(m.totalReal)}   ·   Estimé : ${formatDurationLong(m.totalEst)}`, 56, 156);

  // Score (badge coloré)
  const scoreX = 470, scoreY = 110;
  let scoreRgb = [239, 68, 68];
  if (m.score !== null && m.score >= 75) scoreRgb = [34, 197, 94];
  else if (m.score !== null && m.score >= 50) scoreRgb = [245, 158, 11];
  doc.setFillColor(...scoreRgb);
  doc.roundedRect(scoreX, scoreY, 70, 50, 6, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(m.score === null ? '—' : String(m.score), scoreX + 35, scoreY + 30, { align: 'center' });
  doc.setFontSize(8);
  doc.text('SCORE', scoreX + 35, scoreY + 44, { align: 'center' });

  // Tableau des tâches
  if (tasks.length > 0) {
    doc.autoTable({
      startY: 190,
      head: [['Titre', 'Catégorie', 'Pri.', 'Statut', 'Estimé', 'Réel', 'Impact']],
      body: tasks.map(t => [
        t.title,
        t.cat,
        t.pri,
        t.status,
        formatDurationLong(t.est),
        formatDurationLong(t.real),
        t.impact ? `${formatDurationLong(t.down)}` : '—'
      ]),
      styles: { fontSize: 9, cellPadding: 5, textColor: [40, 40, 40] },
      headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 248, 252] },
      columnStyles: {
        0: { cellWidth: 180 },
        4: { halign: 'right', cellWidth: 50 },
        5: { halign: 'right', cellWidth: 50 }
      },
      margin: { left: 40, right: 40 }
    });
  }

  // Notes / problèmes sur une 2e page si nécessaire
  const problemes = tasks.filter(t =>
    t.impact || t.status === 'Bloqué' || t.pri === 'Critique'
  );
  if (problemes.length > 0) {
    let y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 24 : 200;
    if (y > 700) { doc.addPage(); y = 60; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(40, 40, 40);
    doc.text('Problèmes & incidents', 40, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    probles.forEach(t => {
      const tags = [];
      if (t.pri === 'Critique')  tags.push('Critique');
      if (t.status === 'Bloqué') tags.push('Bloqué');
      if (t.impact)             tags.push(`Impact ${formatDurationLong(t.down)}`);
      const line = `• ${t.title}${tags.length ? ` (${tags.join(', ')})` : ''}`;
      if (y > 780) { doc.addPage(); y = 60; }
      doc.text(line, 40, y);
      y += 14;
      if (t.note) {
        const wrapped = doc.splitTextToSize(t.note, 510);
        wrapped.forEach(l => {
          if (y > 780) { doc.addPage(); y = 60; }
          doc.text(l, 50, y);
          y += 12;
        });
      }
      y += 4;
    });
  }

  // Pied de page
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`KAZITASK · ${settings.name} · généré le ${new Date().toLocaleString('fr-FR')}`,
      40, 820);
    doc.text(`${p} / ${pages}`, 555, 820, { align: 'right' });
  }

  doc.save(`kazitask-${dateIso}.pdf`);
}