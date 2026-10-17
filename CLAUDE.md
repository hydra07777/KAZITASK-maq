# KAZITASK — Maquette

## Contexte
KAZITASK est un journal de tâches pour professionnel IT (support, sysadmin, réseau, dev).
Il note ses tâches pendant la journée, l'app calcule des indicateurs de performance,
puis exporte un rapport de fin de journée pour son manager.
Ce N'EST PAS un gestionnaire de projet (pas de Kanban, pas d'équipes) : c'est un outil de **reporting quotidien**.

Statut : maquette front-only, usage personnel d'abord. Projet porté par ArcaneCore (Kinshasa, RDC).
Langue de l'interface et des commentaires : **français**.

## Documents à lire d'abord
1. `docs/BRIEF.md` : le brief original du prospect (source de vérité fonctionnelle)
2. `docs/SPEC.md` : décisions techniques, modèle de données, formule du score
3. `reference/kazitask-v0.html` : première maquette fonctionnelle en un seul fichier.
   Elle sert de **référence de comportement et de design**, à reprendre et améliorer,
   pas à recopier telle quelle.

## Stack (imposée)
- HTML5 + CSS3 + JavaScript natif (ES modules), **sans build, sans framework**
- Tailwind via CDN autorisé, sinon CSS maison avec variables
- Icônes : Lucide (CDN)
- PDF : jsPDF (+ autotable) via cdnjs
- Stockage : localStorage (clé `kazitask.v1`), toujours dans un try/catch
- Doit fonctionner en ouvrant simplement `index.html` (ou via `npx serve`)

## Structure cible
```
index.html
css/style.css
js/
  app.js        # point d'entrée, raccourcis clavier
  store.js      # CRUD + localStorage + import/export JSON
  metrics.js    # calculs de performance et score
  ui.js         # rendu liste, stats, formulaire, filtres
  export.js     # Markdown, CSV, JSON, PDF
```

## Règles
- Code modulaire, fonctions courtes, noms explicites
- Échapper tout texte utilisateur avant injection dans le DOM (XSS)
- Dark mode par défaut, responsive mobile d'abord, accessible (labels, focus visibles)
- Ne pas ajouter de dépendance sans me le dire
- Ne pas inventer de fonctionnalité hors `docs/SPEC.md` ; proposer plutôt dans la réponse
- Après chaque étape : lister ce qui est fait et ce qui reste

## Commandes
- Lancer : `npx serve .`
