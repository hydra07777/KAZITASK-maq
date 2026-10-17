# SPEC — Décisions pour la maquette

## Modèle de données (localStorage, clé `kazitask.v1`, tableau de tâches)
```json
{
  "id": 1760000000000,
  "date": "2026-10-16",
  "title": "Ticket #4092 – Panne switch",
  "cat": "Support N2",
  "pri": "Critique",
  "status": "Terminé",
  "est": 60,
  "real": 90,
  "down": 20,
  "impact": true,
  "note": "Remplacement du module SFP"
}
```
- Catégories : Support N1, Support N2, Support N3, Infrastructure, Sécurité, Développement, Maintenance, Réunion
- Priorités : Basse, Moyenne, Haute, Critique
- Statuts : En cours, Terminé, Bloqué
- Durées en minutes (affichage `1h30`)

## Score de performance (hypothèse à valider avec le prospect)
```
score = 100 × (0,40 × taux_résolution + 0,30 × taux_critiques_traitées + 0,30 × efficacité_temps)
efficacité_temps = min(1, estimé / réel)     (1 si réel = 0)
taux_critiques_traitées = 1 s'il n'y a aucune tâche critique
```
La formule doit vivre dans UNE seule fonction (`metrics.js`) facile à modifier.
Seuils d'affichage : ≥ 75 vert, ≥ 50 orange, sinon rouge.

## Rapport du jour (Markdown)
Sections : Accompli · Problèmes & incidents (impact, bloqué ou critique) · Reporté à demain (non terminées) · Métriques.

## Raccourcis clavier
- `N` : nouvelle tâche (focus sur le titre)
- `E` : ouvrir l'export
- `Ctrl/Cmd + Entrée` : enregistrer
- `Échap` : fermer la fenêtre d'export

## Étapes de travail (à faire dans l'ordre, une à la fois)
1. **Structure** : découper `reference/kazitask-v0.html` en `index.html`, `css/`, `js/` sans changer le comportement
2. **Downloads réels** : boutons de téléchargement .md, .csv, .json (Blob + lien temporaire)
3. **PDF réel** : jsPDF + autotable, rapport stylisé (en-tête KAZITASK, métriques, tableau)
4. **Historique** : navigation par date (précédent/suivant), vue semaine avec rapport hebdo
5. **Import/Export JSON de sauvegarde** (le localStorage peut être vidé)
6. **Paramètres** : SLA par priorité (ex. Critique = 4 h) pris en compte dans le score, nom/poste de l'utilisateur dans le rapport
7. **Finitions** : états vides, validation, accessibilité, test mobile

## Hors périmètre (pour l'instant)
Comptes utilisateurs, backend, équipes, partage, intégrations Jira/Slack, notifications.

## Questions ouvertes pour le prospect
- Qui utilisera l'app (seul, équipe) ? Besoin multi-appareils ?
- Formule exacte du score et SLA de l'entreprise
- Interface en français, anglais, ou les deux ?
