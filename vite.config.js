/**
 * KAZITASK — Configuration Vite minimale.
 * Objectif : servir le projet tel quel (HTML/CSS/JS natifs, modules ES).
 * Aucun bundling SPA, aucun transform : Vite ne fait qu'améliorer la résolution
 * des imports et la vitesse de rechargement (HMR sur CSS).
 */

import { defineConfig } from 'vite';

export default defineConfig({
  // Racine = le dossier projet (là où se trouvent index.html, css/, js/, ...)
  root: '.',
  // Le "build" sort dans dist/ (généré par `npm run build`).
  // Le mode MPA sert index.html comme entry de la page d'accueil.
  appType: 'mpa',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Pas de minification agressive (on garde la lisibilité du bundle)
    sourcemap: true
  },
  server: {
    port: 5173,
    strictPort: false,
    open: false
  },
  preview: {
    port: 4173
  }
});
