# TODO — Woltar Archives Vivantes

## 🔄 Contexte pour reprise (si tu es une nouvelle session Claude Code)

Ce projet a été bootstrapé par Claude (Cowork) le 29/08/2026, sans accès shell direct à la machine de l'utilisatrice — d'où des livraisons par zip. Si tu es Claude Code et que tu as un accès direct au dossier, tu n'as plus ce problème : tu peux éditer, lancer `npm run dev`, tester et committer directement.

**Historique des commits** :
- `feat: bootstrap Woltar Archives Vivantes (Vite+React, data-driven)` — structure, données, pages
- `feat: typographie plus chaleureuse + animations (entrees, scroll-reveal, halos)` — polices Google Fonts (Cormorant Garamond / Spectral / Manrope), Reveal au scroll, halos au survol, hero en cascade

**État confirmé par l'utilisatrice** :
- `npm install` + `npm run dev` fonctionnent sur sa machine (Node v24.20.0, Windows, execution policy PowerShell mise en RemoteSigned)
- Le site tourne et s'affiche correctement à `http://localhost:5173`
- Elle a demandé plus d'animation + une police plus douce (§ "manque d'animation... police plus douce... donne envie de lire") → traité dans le commit ci-dessus, retour visuel de sa part **pas encore reçu** — à lui demander en priorité si tu reprends la main.

**Questions ouvertes / à trancher avec elle** :
1. Le cahier des charges original mentionne (§11, exemple illustratif) "Fudo = neveu de Kazuko" — ce n'est PAS confirmé dans les fiches individuelles (section 9 du cahier des charges), donc **pas ajouté** à `data/characters.js`. À confirmer avant de l'ajouter comme relation canon.
2. Elle a mentionné avoir des clés API Anthropic/OpenAI/Google configurées dans VS Code — quand demandé, elle a répondu "rien pour l'instant" (pas de génération de portraits IA prévue immédiatement). Le dossier `Setia_Nova_Site` contenait un plugin WordPress `ai-provider-for-google` sans rapport avec le projet, laissé tel quel (jamais eu d'outil de suppression pour le retirer) — à supprimer si elle confirme ne pas en avoir besoin.
3. Interface admin (fiches RP + upload images) demandée explicitement — planifiée en Phase 8, pas commencée.

**Règle à ne jamais casser** : ne jamais inventer de lore. Un champ inconnu reste vide (`''`/`[]`), jamais une valeur inventée. Voir `CONTENT_GUIDE.md` pour la structure des données.

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

## Phase 8 — Backend + Administration (EN COURS — branche `feat/admin`)

Décisions (30/08/2026) : site **public**, backend **Supabase** + login Google à terme.
MAIS l'utilisatrice ne peut pas faire elle-même la création de comptes.
→ **Piste B d'abord** : admin **100 % local**, zéro compte, livrable tout de suite.
La Piste A (Supabase en ligne) reste préparée pour plus tard.

Phase 8-B — admin local (FAIT, à tester par l'utilisatrice) :
- [x] Données déplacées dans `src/data/*.json` (les `.js` deviennent de simples lecteurs)
- [x] Plugin Vite `plugins/woltar-admin.js` (dev only) : lire/écrire les JSON + upload images → `public/media/`
- [x] `/admin` : liste + formulaires créer / modifier / supprimer pour les 6 collections
- [x] Champs : texte, zones longues, tags, sélecteurs, refs entre collections, relations perso, images + galeries
- [x] Verrou local léger (phrase d'accès `woltar`, modifiable dans `src/admin/localAuth.js`)
- [x] Bouton « Connexion » discret en pied de page (visible en dev uniquement)
- [x] Chargé à la demande : n'alourdit pas le site public (chunk séparé ~24 ko)
- [ ] Retour de l'utilisatrice après essai (`npm run dev` → pied de page → « Connexion »)
- [ ] Intégrer les vrais portraits / images via l'admin

Phase 8a — préparation Supabase (fait, en attente pour la Piste A) :
- [x] `@supabase/supabase-js` installé
- [x] `supabase/schema.sql` — tables characters / character_relations / locations / clans / events / archives + RLS (lecture publique, écriture admin) + bucket `media`
- [x] `src/lib/supabaseClient.js` (repli auto sur données statiques si non configuré)
- [x] `src/lib/adminConfig.js` (ADMIN_EMAILS)
- [x] `scripts/migrate.mjs` + `npm run migrate` (données statiques → Supabase)
- [x] `.env.example`, `.gitignore` durci
- [x] `ADMIN_SETUP.md` — checklist pas à pas pour l'utilisatrice

Phase 8a-bis — Piste A, quand quelqu'un peut aider ~15 min (voir ADMIN_SETUP.md) :
- [ ] Créer projet Supabase + exécuter `schema.sql`, transmettre URL + clé `anon`
- [ ] Auth : privilégier le **lien magique par e-mail** (plus simple que Google OAuth)
- [ ] Pousser le dépôt sur GitHub → déployer sur Vercel
- [ ] Migration `npm run migrate` (clé `service_role`, puis la régénérer)
- [ ] Basculer l'admin local vers Supabase (le schéma de champs `src/admin/schema.js` est réutilisable tel quel)

## Contenu à intégrer dès que disponible
- [ ] Portraits des 7 personnages (actuellement : initiales KN, HN, FN, CA, SN, IS, MN)
- [ ] Images des 3 lieux majeurs
- [ ] Biographies complètes (actuellement laissées vides pour ne pas inventer de lore)
