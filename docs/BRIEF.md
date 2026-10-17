# Brief original du prospect (copie fidèle, ne pas modifier)

## KAZITASK

### OBJECTIF PRINCIPAL DE L'APPLICATION
L'application doit permettre à un professionnel IT de consigner facilement ses tâches au fil de la journée, d'enregistrer ses performances, puis de générer/exporter un rapport complet en fin de journée (format PDF, Markdown et CSV).

### FONCTIONNALITÉS CLÉS

1. **Tableau de Bord / Journal des Tâches (IT Task Log) :**
   - Ajout rapide de tâche :
     - Titre de la tâche (ex: "Résolution ticket #4092 - Panne Switch", "Déploiement maj serveur")
     - Catégorie IT (Support N1/N2/N3, Infrastructure, Sécurité, Développement, Maintenance, Réunion)
     - Priorité (Basse, Moyenne, Haute, Critique)
     - Statut (En cours, Terminé, En attente/Bloqué)
     - Durée estimée vs Durée réelle (en minutes ou heures)
     - Temps d'arrêt / Impact utilisateur (Oui/Non, Durée d'interruption si applicable)
     - Notes techniques / Solution appliquée

2. **Calculateur de Performance en Temps Réel :**
   - Nombre total de tâches réalisées dans la journée
   - Taux de résolution des tickets / tâches
   - Temps total travaillé vs Temps estimé
   - Score de charge/performance calculé automatiquement (SLA respectés, tâches critiques traitées)

3. **Module d'Exportation de Fin de Journée (Daily Report / Performance Export) :**
   - Résumé quotidien récapitulatif : "Ce qui a été accompli", "Problèmes rencontrés & Incidents majeurs", "Tâches reportées à demain", "Métriques clés de performance"
   - Export PDF / Impression : rapport propre et stylisé prêt à envoyer au manager
   - Export Markdown / Texte brut : pour copier-coller dans Slack, Teams, Jira ou un mail
   - Export CSV / JSON : pour l'archivage ou l'analyse de données

### DESIGN & INTERFACE UTILISATEUR (UI/UX)
- Interface moderne, sombre par défaut (Dark Mode IT/Tech friendly)
- Style dashboard très fluide avec raccourcis clavier pour ajouter rapidement une tâche
- Badges de couleurs selon la priorité et la catégorie

### TECH STACK RECOMMANDÉE
- Frontend : React / Next.js ou HTML5/TailwindCSS + JavaScript natif
- Stockage local : LocalStorage ou IndexedDB
- Librairies : TailwindCSS, Lucide-React ou FontAwesome, jsPDF ou html2pdf.js

### LIVRABLE ATTENDU
Code complet, fonctionnel et modulaire (HTML/CSS/JS ou React/Tailwind) avec ajout de tâches, suivi de performance et exportation de rapport.
