# Woltar — Archives Vivantes

Vitrine RP privée et encyclopédie interactive pour l'univers Woltar (personnages, lieux, clans, chronologie, archives).

## Installation

Prérequis : [Node.js](https://nodejs.org/) 18 ou plus récent (installe aussi `npm`).

```bash
npm install
```

## Lancer le site en local

```bash
npm run dev
```

Puis ouvre l'adresse affichée dans le terminal (en général `http://localhost:5173`). Le site se recharge automatiquement à chaque modification de fichier.

## Construire une version de production

```bash
npm run build
```

Le résultat est généré dans le dossier `dist/`. Pour le prévisualiser localement :

```bash
npm run preview
```

## Structure du projet

Voir `ARCHITECTURE.md` pour le détail des dossiers.

Voir `CONTENT_GUIDE.md` pour apprendre à ajouter ou modifier un personnage, un lieu, une relation, sans toucher au code des composants.

## Déploiement

Ce projet est un site statique généré par Vite (`npm run build` → dossier `dist/`). Il peut être déployé sur n'importe quel hébergeur de fichiers statiques (Netlify, Vercel, GitHub Pages, etc.) en pointant simplement vers ce dossier `dist/`.

## État du projet

Voir `TODO.md` pour la liste des chantiers en cours et à venir (relations avancées, chronologie, archives RP, interface d'administration).
