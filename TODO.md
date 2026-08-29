# TODO — Woltar Archives Vivantes

## Phase 0 — Bootstrap ✅
- [x] Structure de dossiers propre (components / pages / data / assets / styles)
- [x] Vite + React + React Router
- [x] Palette bordeaux / bleu nuit / violet, thème CSS centralisé
- [x] README, ARCHITECTURE, CONTENT_GUIDE, TODO
- [x] Git initialisé

## Phase 1 — Données ✅
- [x] `characters.js` avec les 7 personnages connus
- [x] `locations.js` avec les 3 lieux majeurs + 3 lieux à préparer
- [x] `clans.js` (Clan Nakamura)
- [x] `events.js` et `archives.js` (structure prête, vide pour l'instant)

## Phase 2 — Accueil ✅
- [x] Hero, citation, statistiques calculées automatiquement
- [x] Header/nav routée + menu mobile
- [x] Footer

## Phase 3 — Galerie personnages ✅
- [x] Recherche instantanée (nom, clan, titre, tags, traits…)
- [x] Filtres (Tous / Actifs / À développer)
- [x] Affichage du nombre de résultats

## Phase 4 — Fiche personnage ✅
- [x] Route `/personnages/:id`
- [x] Fiche complète : identité, caractère, apparence, histoire, relations, lieux associés, chronologie personnelle, galerie, notes
- [x] Kazuko comme référence, template appliqué aux 6 autres
- [x] Repli élégant (initiales) tant qu'aucun portrait n'est fourni

## Phase 5 — Lieux ✅
- [x] Page `/lieux` (index)
- [x] Page `/lieux/:id` (fiche détaillée)
- [x] Manoir de Sétia, Le Joyeux Lutin, Palais des Astres

## Phase 6 — Responsive & accessibilité
- [x] Mobile-first, menu hamburger
- [x] `prefers-reduced-motion` respecté
- [ ] Vérifier les contrastes sur toutes les pages une fois les vraies images intégrées
- [ ] Test complet clavier (tab, focus visible) sur toutes les pages

## Phase 7 — À venir
- [ ] Vraie chronologie (remplir `data/events.js`)
- [ ] Archives RP (remplir `data/archives.js`, sans jamais réécrire les dialogues originaux)
- [ ] Visualisation graphique des relations / arbre généalogique du clan Nakamura
- [ ] Page Univers enrichie (histoire du monde, société, magie, technologie…) au fur et à mesure
- [ ] Carte de Woltar / Sétia avec marqueurs interactifs

## Phase 8 — Backend + Administration
- [ ] Choisir et brancher Supabase (ou équivalent) pour stocker les données en base
- [ ] Authentification (Supabase Auth) — jamais de mot de passe en clair côté front
- [ ] Interface `/admin` : créer/modifier/supprimer un personnage, un lieu, une relation, un événement, une archive
- [ ] Upload d'images depuis l'interface admin (remplacement des portraits)

## Contenu à intégrer dès que disponible
- [ ] Portraits des 7 personnages (actuellement : initiales KN, HN, FN, CA, SN, IS, MN)
- [ ] Images des 3 lieux majeurs
- [ ] Biographies complètes (actuellement laissées vides pour ne pas inventer de lore)
