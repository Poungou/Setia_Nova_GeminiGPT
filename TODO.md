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

## Phase 7 — Contenu & rubriques

### Palier 1 — terrain de jeu (local, sans compte)
- [x] **Journal / blog** : rubrique `/journal` — billets datés (fan art / chapitre / note / news),
  markdown, couverture, galerie lightbox, liens persos/lieux, brouillon vs publié
- [x] Rendu **markdown** (`src/lib/markdown.js`, marked + DOMPurify) + composant `Lightbox`
- [x] Champs `author` + `visibility` ajoutés (persos & billets) pour le futur multi-joueurs
- [x] **Galerie fan art** dédiée (`/galerie`) : agrège billets + portraits + lieux, filtres, lightbox
- [x] Markdown pour bios/histoires perso, descriptions/histoire de lieux et clans (`<Prose>`)
- [x] Pages par tag (`/tag/:tag`) ; tags cliquables sur fiches perso et billets
- [x] Arbre du clan (`<RelationGraph>` SVG) sur la fiche de clan
- [x] Recadrage vignettes (point focal), mini-portraits ronds, décor de fond animé
- [x] Chronologie illustrée → **fait (30/08/2026, Cowork)** : `data/events.json` rempli avec les 19 événements canoniques fournis par l'utilisatrice (origines, pacte Nakamura, Apocalypse, période « AP »…). Page `/chronologie` reconstruite en vraie frise cliquable. La section « Chronologie personnelle » des fiches perso — jusqu'ici un texte statique jamais branché — est maintenant reliée aux mêmes données (filtre par `event.characters`). Plusieurs points restent à trancher avec elle (voir sa réponse dans le chat du 30/08 : contradiction sur la mort de Salut, âge de Fudo à l'ouverture du Joyeux Lutin, personnages mentionnés sans fiche — Marie, Salut, Ichiyo, Atheleen, Hichiky, Châton Lolita, Daya, Sadie). **Refonte complète de la page (30/08/2026, soir, Cowork)** : demande explicite de l'utilisatrice — passer du deck de cartes façon Chain of Memories à une vraie frise chronologique (ligne horizontale + nœuds + cartes alternées au-dessus/en-dessous), sans changer le contenu des événements ni l'identité du site. Livré :
  - `src/pages/Chronology/periods.js` (nouveau) : regroupe les 19 événements en 6 grandes périodes (Ère des royaumes, Enfance des jumeaux, Après Salut, Exil et ruptures, Retour au manoir, Époque actuelle) à partir du champ `order` déjà présent dans les données — **purement présentationnel, ne touche jamais à `events.json`**. Le classement exact de « Mort de Salut » reste l'ambiguïté déjà connue (voir ci-dessus) ; l'événement est regroupé par proximité d'`order` avec son arc narratif, sans trancher la question. Bornes de périodes ajustables directement dans ce fichier si besoin.
  - `src/pages/Chronology/hearts.js` (nouveau) : résout la couleur du petit cœur affiché sur chaque nœud parmi les **9 illustrations fournies par l'utilisatrice** (`coeur_grand_[cyan|gris|rouge|violet|jaune|vert|bleu|rose|blanc].png`, copiées telles quelles dans `public/hearts/` — jamais les `.gif`, jamais redessinées). Résolution : override manuel par id d'événement (table vide pour l'instant, à remplir à la main pour forcer une couleur précise) → sinon déduite de la teinte du premier personnage lié (même logique HSL que `src/lib/frames.js`, étendue à la palette des 9 cœurs) → sinon gris par défaut (neutre/secondaire, comme demandé). Le blanc n'est jamais choisi automatiquement, réservé aux overrides manuels (ex. futur/inconnu).
  - `Chronology.jsx`/`.css` réécrits : ligne horizontale fine posée sur toute la largeur de chaque période (dessinée en segments par nœud plutôt qu'un seul élément — un seul élément en `grid-column:1/-1` entrait en collision avec le placement automatique des nœuds dans la grille CSS et désalignait tout après le 1er événement ; corrigé avant livraison), nœuds réguliers (petit losange + cœur coloré), cartes alternées au-dessus/en-dessous reliées par une fine tige verticale, titres de période discrets au-dessus de chaque ligne. Cartes existantes conservées (coins coupés, style fin) mais légèrement réduites et resserrées (ratio 4/5 au lieu de 5/7). Clic sur une carte : le panneau de lecture à droite s'ouvre exactement comme avant, aucun changement de comportement ni de contenu. Périodes à plus de ~6 événements deviennent défilables horizontalement (barre de défilement fine) plutôt que de s'écraser ou de déborder de la page.
  - Corrigé au passage : les tokens `--gold`/`--gold-soft`/`--gold-bright` utilisés par cette page pour distinguer les événements « majeurs » n'étaient définis nulle part dans le projet (bug préexistant, silencieux) — la bordure dorée ne s'affichait donc pas vraiment. Définis maintenant localement dans `Chronology.css` (scopés à `.chronology-layout`, jamais touché `theme.css` ni aucune autre page).
  - Mobile (< 720px) : la frise horizontale devient une ligne verticale à gauche, cartes empilées dans l'ordre chronologique (alternance au-dessus/en-dessous non reprise en vertical, cf. « alternées OU empilées » — choix : empilées, plus lisible sur petit écran), panneau de lecture sous la frise comme avant.
  - Vérifié en direct : les 19 événements et 6 périodes s'affichent avec le texte exact des données (aucune invention), nœuds parfaitement alignés sur la ligne dans les 6 périodes, alternance au-dessus/en-dessous confirmée, couleurs de cœur cohérentes avec les personnages liés (ex. Kazuko → cyan), bordure dorée « majeur » à nouveau visible, aucun débordement horizontal en mobile (375px), aucune erreur console. **Reste à confirmer avec elle** : rendu visuel définitif (captures), et si le découpage en 6 périodes lui convient tel quel.
- [ ] Archives RP (remplir via l'admin, sans jamais réécrire les textes originaux)
- [ ] Page Univers enrichie ; carte de Woltar / Sétia avec marqueurs
- [x] Identité visuelle « pixel art façon Kingdom Hearts » → **fait (30/08/2026, Cowork)** : nouveau système d'icônes pixel-art en SVG (`src/components/PixelIcons/` : `PixelHeart`, `PixelPaopu`, `PixelFrame`, généré via `src/lib/pixelIcon.js`). Cœur pixel coloré selon le personnage (nouveau champ `color` sur les fiches, éditable dans `/admin`, déjà renseigné pour Kazuko/Fudo/Calion d'après leurs traits existants — à ajuster/compléter toi-même si la teinte ne te va pas). Étoile paopu dorée à la place de la flèche « Voir la fiche ». Vignettes personnages (`CharacterCard`) passées en cercle avec cadre pixel doré. Chronologie entièrement repensée en deck de cartes cliquables façon Chain of Memories (coins coupés, bordure dorée pour les événements majeurs, panneau de lecture à droite/en dessous) au lieu de la frise verticale précédente. Nouveau token `--gold` dans `theme.css`. Ajustement (30/08/2026, suite retour utilisatrice avec capture d'écran) : le cadre était rogné par le `overflow:hidden` du disque circulaire qui le contenait (donc en partie masqué par la photo) et sa grille 18×18 trop fine passait pour lisse plutôt que « pixel art ». Corrigé : le cadre (`PixelFrame`) est maintenant un frère du disque et non un enfant (plus de rognage), la grille est passée à 12×12 (gros blocs, plus nettement rétro), et les tailles sont calées mathématiquement (trou du cadre = 75 % de la grille = disque à 75 % de son wrapper) pour un alignement pile. **Étoile paopu remplacée par la vraie illustration (30/08/2026, soir)** : demande explicite de l'utilisatrice, même logique que le cadre — `PixelPaopu.jsx` ne dessine plus de grille SVG, il affiche `illustration_site/paopu.png` (rognée sur son contenu réel : le fichier source est un canevas 1536×1024 avec beaucoup de vide transparent autour de l'étoile, donc recadrée + réduite côté Cowork à 197×240 avant d'être copiée dans `public/icons/paopu.png`, sinon l'icône aurait été minuscule et floue en usage inline). Taille affichée réajustée de 13px à 18px de haut (la vraie illustration est plus détaillée que l'ancien pixel-art 9×9, elle a besoin d'un peu plus de place pour rester lisible à côté du texte « Voir la fiche ») ; largeur calculée automatiquement selon le ratio réel du PNG (≈0,82) pour ne jamais déformer l'étoile. Seul usage trouvé dans le code : `CharacterCard.jsx` (vérifié par recherche sur l'ensemble des pages/composants avant de livrer). Vérifié en direct : les 7 vignettes chargent l'image sans erreur, dimensions naturelles conformes au PNG livré, aucune erreur console.
- [x] Nav qui commence à être longue (9 entrées) — regrouper ? → **fait (30/08/2026, Cowork)** : Clans / Lieux / Chronologie regroupés dans un sous-menu « Univers » (`Header.jsx`/`.css`), la page Univers servant déjà de hub vers ces trois sections. Nav ramenée à 6 entrées de premier niveau. Sous-menu au survol + clic (desktop), accordéon dans le menu mobile.
- [x] `bg-ambient` : la page hero garde son propre dégradé (le décor ne s'y voit pas) → **fait (30/08/2026, Cowork)** : `.ambient` avait `z-index: 0`, ce qui le mettait au même niveau d'empilement que `.hero` (`position: relative`) ; comme `.hero` vient plus tard dans le DOM, il passait devant et masquait le décor. Passé à `z-index: -1` dans `Ambient.css` — garantit que le décor animé reste toujours sous tout contenu normal, hero compris, sans toucher au dégradé propre du hero. Vérifié en direct dans le navigateur avant/après (capture + mesure de l'ordre d'empilement).
- [x] Thème « Woltar » (couleurs du site historique woltar.net) → **fait (30/08/2026, Cowork)**, à la demande de l'utilisatrice (« un thème exclusivement aux couleurs de woltar.net, avec le fond à pois bordeaux rouge »). Couleurs extraites en direct sur `https://woltar.net` (inspection DOM + échantillonnage pixel du fond `wo_fond.jpg`) plutôt qu'estimées : rouge de base `#980000`, rouge des pois `#A81818`, bleu de contenu `#279FD3`, bleu de lien `#00599C`. Ajouté comme **3e thème sélectionnable** (`data-theme="woltar"`), pas un remplacement — `ThemeToggle` cycle maintenant Sombre → Clair → Woltar → Sombre (icône flamme pour le 3e état). Pas de violet dans la palette source : le token `--violet` est aliasé sur la famille bleue plutôt que d'inventer une teinte hors-palette. `src/theme.js` et le script anti-flash de `index.html` mis à jour pour valider les 3 valeurs (le thème « woltar » n'est jamais déduit des préférences système, uniquement choisi puis mémorisé). 1er jet (pois en filigrane, fond bordeaux assourdi) jugé « pas assez fidèle » par l'utilisatrice captures + code source du jeu à l'appui → **corrigé (30/08/2026, même soir)** : fond repassé au rouge saturé réel (`--bg-base: #8a0000`, proche du `#980000` du jeu), pois nettement visibles et contrastés sur une tuile 140×140 (taille mesurée sur le fichier `wo_fond.jpg` du vrai site), un seul pois doux par tuile façon fond du jeu. Cartes/panneaux volontairement laissés sombres façon « Archives Vivantes » (pas de panneau bleu/blanc du jeu) — choix explicite de l'utilisatrice pour rester cohérente avec le reste du site. Vérifié en direct : cycle des 3 thèmes, tokens CSS corrects par thème, contraste texte largement suffisant (8,4:1 sur le fond, 15:1 sur les cartes), pas de débordement horizontal en mobile (375px), pas d'erreur console, retour propre à « sombre » sans régression des thèmes existants.
- [ ] Décider comment le token `--gold` (accent des icônes pixel-art, hors palette woltar.net) doit se comporter sous le thème « woltar » — actuellement inchangé (même doré que les thèmes sombre/clair) ; à revoir si ça jure visuellement une fois testé avec de vrais portraits.
- [x] Cadre des vignettes personnages : la grille pixel-art 12×12 (anneau doré épais) jugée « pas bonne » par l'utilisatrice, avec une maquette de référence précise (cadre miroir ovale dressé, couronne + gemme colorée en haut, plumes colorées en éventail de chaque côté, "relief blanc" sur le cadre). **1er remplacement (SVG dessiné à la main, 30/08/2026 après-midi) → rejeté par l'utilisatrice** (« pas fan, il manque le relief blanc & l'iconique bleu... visuellement pas ouf ») : c'était une approximation vectorielle faute d'outil de génération d'image côté Cowork, jugée insuffisante après un vrai retour visuel. **Remplacé définitivement (30/08/2026, soir)** par ses propres illustrations toutes faites (`C:\Users\defos\Documents\Setia_Nova_Site\illustration_site\cadre_grand_[bleu|gris|rouge|violet].png`, pack "cadre_grand" validé par elle) : `PixelFrame.jsx` rend maintenant une simple `<img>` au lieu de SVG dessiné, pilotée par un nouveau module `src/lib/frames.js` (4 teintes disponibles, `resolveFrameColor()` = champ admin `frameColor` explicite si renseigné, sinon déduit automatiquement du champ `color` existant via la teinte HSL). Nouveau champ `frameColor` ajouté dans `/admin` (sélecteur Auto/Bleu/Gris/Rouge/Violet) pour permettre une correction manuelle sans toucher au code. Les 4 PNG copiés dans `public/frames/`. Le trou circulaire transparent de chaque illustration a été mesuré précisément (rayon par ray-casting sur 36 angles, script Python côté Cowork) pour caler le disque photo exactement dedans — les 4 teintes ne sont pas des variantes recolorées d'un même tracé mais 4 illustrations séparées, donc chacune a son propre calage (`insetX`/`insetY` dans `frames.js`). `CharacterCard.css` repassé à un disque photo carré/circulaire (les trous des vraies illustrations sont ronds, pas ovales comme l'était l'approximation SVG). **Vérifié en direct dans le navigateur après livraison sur sa machine** : les 7 vignettes chargent l'image correspondante sans erreur 404 (dimensions naturelles de chaque `<img>` conformes aux vrais fichiers PNG), teintes correctement résolues (Kazuko→bleu, Fudo→rouge, Calion→violet, les 4 autres sans `color` défini → gris par défaut), disque bien centré dans le trou du cadre, aucune erreur console. **Retour visuel réel de l'utilisatrice (30/08/2026, avec captures)** : « le blanc grignotte l'image du dessous » — un anneau de fond de carte (clair en thème clair) restait visible entre la photo et le cadre, sur la plupart du pourtour. Cause identifiée : le calage précédent utilisait le rayon MINIMUM mesuré sur 36 angles (le point le plus serré, sous la couronne en haut du cadre) comme rayon unique pour tout le cercle — beaucoup trop prudent partout ailleurs, où le vrai trou est nettement plus grand. **Corrigé (même soir)** : le disque photo n'est plus centré/uniforme mais décalé + agrandi par teinte (mesure directionnelle haut/bas/gauche/droite/diagonales, centre décalé vers le bas pour absorber le rétrécissement dû à la couronne, rayon augmenté au maximum sans jamais dépasser le point le plus serré dans aucune direction). `frames.js` stocke maintenant un `inset: { top, right, bottom, left }` par teinte au lieu d'un simple `insetX`/`insetY` symétrique, appliqué tel quel dans `CharacterCard.jsx`. Résultat : la photo peut légèrement déborder sous les décorations aux points les plus serrés (normal/invisible pour un cadre monté), mais plus de vide visible entre elle et le cadre. Revérifié en direct (nouvelles valeurs d'`inset` bien appliquées au DOM, aucune erreur console) — **rendu visuel final toujours à confirmer par elle**, la capture d'écran n'étant pas fiable côté Cowork (panneau navigateur replié).

**Reste à confirmer avec elle** : rendu visuel définitif (captures), et si les autres assets du pack (`cadre_petit_*`, `cadre_miniature_*`, `cartes_[couleur].png`, `paopu_*.png`) doivent aussi remplacer d'autres éléments pixel-art existants — pas encore demandé, ne pas anticiper.

### Palier 3 — multi-joueurs (après mise en ligne)
- [x] Comptes joueurs — auth locale (`plugins/woltar-auth.js`) : rôles admin/user, un compte non-admin ne peut éditer que ses propres personnages/Personas (`ownerUserId`, voir Phase 9-bis)
- [ ] Flux de validation (brouillon → en attente → publié) côté admin
- [ ] Formulaire public « proposer mon perso »
- [ ] (option) réactions / commentaires / livre d'or

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
- [x] Retour de l'utilisatrice après essai (`npm run dev` → pied de page → « Connexion ») → testé sur mobile, fonctionnel, mais UX mobile pas satisfaisante (débordement horizontal + éléments qui cassaient) → **corrigé (30/08/2026, Cowork)** dans `src/admin/admin.css` : la sidebar/nav/pied de page étaient des enfants flex avec `overflow-x:auto` mais sans `min-width:0`, donc au lieu de scroller ils étiraient toute la page (classique piège flexbox). Ajout de `min-width:0` en cascade + réagencement mobile (sidebar en barre horizontale sticky, listes/formulaires empilés). Revérifié par l'utilisatrice : « Tout est ok niveau accessibilité ».
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

## Phase 9 — Woltarien IA (prototype, Cowork, 30/08/2026 soir)

Demande explicite de l'utilisatrice : un bouton « Parler avec Fudo » sur sa
fiche, avec une architecture générique (`characterId`) pensée dès le départ
pour d'autres personnages puis, plus tard, pour que d'autres joueurs créent
leur propre Woltarien IA. Détails complets : `AI_PERSONA_SETUP.md`.

- [x] Nouvelle collection **`personas`** (`src/data/personas.json` +
  `src/data/personas.js`), même pattern JSON+lecteur que les 6 collections
  existantes. `id` == `characterId` (une Persona par personnage). Sépare
  strictement canon (fiche personnage, inchangée) et interprétation RP
  (Persona : personnalité, manière de parler, secrets, limites RP,
  instructions personnalisées, relations RP…).
- [x] Backend dédié **`plugins/woltar-ai.js`** (Vite, dev only, même
  principe que `plugins/woltar-admin.js`) : `POST /__ai/api/chat` — charge
  la Persona + la fiche personnage depuis le disque, construit le prompt
  système (`plugins/lib/personaPrompt.js`), appelle l'API IA, renvoie
  uniquement le texte. Limites : message ≤ 4000 caractères, historique ≤ 20
  messages, ~20 req/min/adresse, timeout 25 s, aucune stack trace exposée.
- [x] Prompt système : distingue explicitement FICHE CANONIQUE (jamais
  contredite) et INTERPRÉTATION RP (non canonique), interdit de révéler les
  instructions ou la fiche Persona brute, ignore les tentatives de sortie de
  rôle, traite toute improvisation comme non-canonique — jamais présentée
  comme un fait établi.
- [x] `/admin` → nouvelle section **« Compagnons IA »** (réutilise
  l'infrastructure existante). Champ `characterSelect` pour lier une Persona
  à sa fiche personnage. Bouton **« Tester la Persona »**
  (`src/admin/PersonaTester.jsx`) : contourne uniquement le champ « IA
  activée », rien d'autre.
- [x] Composant partagé **`<ChatWidget>`** (`src/components/ChatWidget/`) :
  réutilisé en flottant sur la fiche personnage publique et en inline dans
  `/admin` pour le test. Mention visible « Personnage interprété par IA ».
- [x] Fiche Fudo : bouton « Parler avec Fudo » visible (persona activée,
  uniquement `greeting` renseigné à dessein — voir règle « ne jamais inventer
  de lore » — à compléter par l'utilisatrice via `/admin`).
- [ ] Personnalité/manière de parler/secrets de Fudo à renseigner via
  `/admin` — actuellement vides (prototype fonctionnel mais neutre).
- [ ] Mémoire persistante par utilisateur/persona — explicitement différée
  (mémoire de session uniquement pour ce prototype, comme demandé).
- [ ] Étendre à Shizuka / autres personnages une fois Fudo validé par elle.

**Mise à jour (30/08/2026, passe suivante, agent local avec accès shell)** :
fournisseur IA basculé d'Anthropic vers **OpenAI**, toujours côté serveur
uniquement (`plugins/woltar-ai.js` réécrit, `OPENAI_API_KEY`/`OPENAI_MODEL`
dans `.env.local`) ; `plugins/lib/personaPrompt.js` inchangé. Auth locale
ajoutée dans la foulée — voir Phase 9-bis ci-dessous.

## Phase 9-bis — Comptes & permissions (`ownerUserId`)

Ajouté par un agent local avec accès shell direct (npm/wrangler), en
parallèle de Cowork. Vérifié fichier par fichier avant de construire dessus.

- [x] **`plugins/lib/authStore.js`** : comptes stockés dans
  `plugins/data/users.json` (ignoré par Git), mots de passe hachés scrypt,
  sessions par cookie signé HMAC (`plugins/data/auth-secret.txt`, généré au
  premier lancement). Rôles `admin` / `user`. Le tout premier compte créé
  devient automatiquement admin.
- [x] **`plugins/woltar-auth.js`** (`/__auth/api/*`) : `session`, `register`,
  `login`, `logout`, plus une route `local-admin` (phrase d'accès en clair,
  utilisable uniquement en dev local — **jamais portée sur le Worker de
  production**, voir Phase 10), `users` (liste + modification, admin
  uniquement).
- [x] **`plugins/woltar-account.js`** (`/__account/api/*`) : un compte non
  -admin ne peut créer/modifier/supprimer que ses propres personnages et
  Personas (`ownerUserId`) ; les 5 collections de référence (lieux, clans,
  chronologie, archives, journal) restent en lecture seule pour lui.
  Suppression d'un personnage entraîne la suppression de ses Personas
  possédées par le même compte.
- [x] `src/lib/authApi.js` / `src/lib/accountApi.js`, `src/account/AccountApp.jsx`,
  `src/admin/AdminUsersPage.jsx` (gestion des comptes, admin uniquement).

**Point de vigilance identifié (Cowork, relu avant la Phase 10)** : la route
`local-admin` (mot de passe en clair `woltar` par défaut) n'a de sens que
sur le serveur de dev local — elle n'a **pas** été portée dans
`worker/routes/auth.js`. À ne jamais reproduire dans un environnement
public.

## Phase 10 — Worker Cloudflare + D1 (préparé, PAS déployé)

Suite de la Phase 9-bis : migrer auth + comptes + personnages + Personas vers
un backend qui peut tourner en production (Cloudflare Worker + D1), en
gardant OpenAI et toutes les permissions `ownerUserId` côté serveur. Portée
volontairement minimale : les 5 collections sans propriétaire (lieux, clans,
chronologie, archives, journal) restent des fichiers JSON statiques pour
l'instant — décision explicite de l'utilisatrice, voir
`docs/CLOUDFLARE_DEPLOYMENT_PLAN.md`.

- [x] `migrations/0001_init.sql` — schéma D1 (`users`, `characters`,
  `personas` + index sur `owner_user_id`/`character_id`).
- [x] `worker/lib/authStore.js` — port D1 de `plugins/lib/authStore.js`.
  Différences volontaires : pas de route « admin local » ; secret de session
  lu depuis un secret Wrangler (`AUTH_SESSION_SECRET`), jamais généré à la
  volée ; inscriptions publiques fermées par défaut après le premier compte
  (`ALLOW_PUBLIC_REGISTRATION`) ; cookie `Secure`.
- [x] `worker/lib/contentStore.js` — CRUD D1 pour personnages/Personas +
  `STATIC_COLLECTIONS` pour les 5 collections restées en JSON.
- [x] `worker/routes/auth.js`, `worker/routes/account.js`, `worker/routes/ai.js`
  — port des 3 plugins Vite équivalents vers l'API Fetch (Request/Response).
  `worker/routes/ai.js` réutilise `plugins/lib/personaPrompt.js` sans
  modification : même prompt système qu'en dev local.
- [x] `worker/index.js` — route `/__auth`, `/__account`, `/__ai` vers ces
  handlers, sert `dist/` via `env.ASSETS.fetch()` pour le reste.
- [x] `wrangler.jsonc` mis à jour : `main`, binding D1 `WOLTAR_DB`
  (`database_id` en placeholder — à compléter après création de la base),
  `assets.run_worker_first: true`, variable `ALLOW_PUBLIC_REGISTRATION`.
- [x] `scripts/generate-d1-seed.mjs` (+ `npm run d1:seed:generate`) — génère
  `d1-seed.sql` à partir des JSON locaux actuels, sans toucher D1 ni migrer
  de mot de passe.
- [x] Base D1 `woltar-db` créée, `database_id` renseigné dans
  `wrangler.jsonc` (fait entre-temps, hors Cowork). `d1-seed.sql` généré
  (`npm run d1:seed:generate`) — statut de son application réelle en D1
  (`wrangler d1 execute --remote`) non confirmé.
- [ ] Appliquer `migrations/0001_init.sql` (local puis remote) si pas déjà
  fait, puis `d1-seed.sql` pour reprendre les fiches existantes.
- [ ] Poser les secrets Wrangler `OPENAI_API_KEY` et `AUTH_SESSION_SECRET`.
- [ ] Tester avec `npm run cloudflare:preview` (Worker + D1 local) avant
  tout déploiement réel.
- [ ] **Ne pas lancer `wrangler deploy`** avant validation explicite de
  l'utilisatrice — voir `docs/CLOUDFLARE_DEPLOYMENT_PLAN.md` pour la liste
  exacte des commandes restantes.
- [ ] Une fois en ligne : décider comment les futures modifications faites
  via `/admin` en local (qui n'écrit que dans `src/data/*.json`) doivent se
  resynchroniser avec D1 en production — hors scope de cette passe.

## Phase 11 — Site public branché sur D1, chat réparé, audio (Cowork, 31/08/2026)

Suite à liste de mise à jour donnée par l'utilisatrice (10 points). État :

- [x] **Bug identifié et corrigé : le chat IA était cassé en production.**
  Deux causes cumulées : (1) `personaChatAvailable` valait
  `import.meta.env.DEV`, donc `false` sur tout build de prod — le bouton
  « Parler avec… » ne s'affichait jamais sur le site déployé
  (`src/lib/personaApi.js`, corrigé : toujours `true`, le backend existe
  désormais en dev *et* en prod). (2) `worker/routes/ai.js` lisait la
  Persona/le personnage **uniquement** dans D1, sans repli — si D1 n'était
  pas encore peuplé pour une fiche (Fudo y compris), le chat répondait
  404 « Persona introuvable ». Corrigé via le point suivant.
- [x] **`worker/lib/contentStore.js`** : ajout de
  `get/listCharactersWithFallback` et `get/listPersonasWithFallback` — D1
  d'abord, repli sur `src/data/characters.json`/`personas.json` si absent
  de D1 *ou* si D1 lève une erreur (table pas migrée, binding cassé...).
  `worker/routes/ai.js` les utilise désormais partout : le chat de Fudo (et
  de tout personnage historique) fonctionne quel que soit l'état réel de
  la migration D1 — c'est ce qui garantit le point demandé « conserver
  Fudo fonctionnel pendant la migration des autres Personas ».
- [x] **Nouvelle API publique `/__public/api/*`** (sans authentification) :
  `worker/lib/publicStore.js` + `worker/routes/public.js` en prod,
  `plugins/woltar-public.js` en dev (même contrat, lit les JSON locaux).
  Trois routes : `GET /characters` (liste publiée), `GET /characters/:id`,
  `GET /personas/:characterId` (projection **publique** seulement — jamais
  personnalité/secrets/limites RP/instructions, voir
  `PUBLIC_PERSONA_FIELDS`). C'est ce qui manquait pour que les fiches et
  Personas créées/modifiées depuis `/compte` apparaissent sur le site
  public sans reconstruire le site.
- [x] **`src/lib/publicData.js`** (nouveau) : hooks `usePublicCharacters`,
  `usePublicCharacter(id)`, `usePublicPersona(characterId)` — premier rendu
  instantané avec les données statiques du bundle (aucune régression si le
  fetch échoue), puis mise à jour avec la réponse de `/__public/api/*`.
  Branchés dans `src/pages/Characters/Characters.jsx` et
  `src/pages/CharacterDetail/CharacterDetail.jsx` (remplace les imports
  statiques `characters.js`/`personas.js` sur ces deux pages précisément).
- [x] **Fuite corrigée au passage** : avant ce correctif, `CharacterDetail`
  importait `personas.json` en entier côté client (tous les champs privés
  de toutes les Personas — secrets, instructions, limites RP compris —
  finissaient dans le bundle JS envoyé au navigateur, pour n'importe quel
  visiteur). La projection publique de `/__public/api/personas/:id` referme
  cette fuite pour les fiches publiques.
- [x] **Fond sombre animé** (`src/components/Ambient/`) : déjà livré avant
  cette passe (hors Cowork) avec fallback image statique
  (`fond_sombre.jfif`), repli automatique si la vidéo échoue à charger
  (`onError`), désactivation sur mobile et sous `prefers-reduced-motion`.
  Vérifié par relecture, rien à corriger — juste besoin d'un `npm run
  build` + déploiement pour être visible en ligne si pas déjà fait.
- [x] **`/compte`** (`src/account/AccountApp.jsx`) : vérifié par relecture —
  la sauvegarde (`onSave`) appelle bien `reload()` qui recharge le bootstrap
  complet ensuite, donc la liste et la fiche se rafraîchissent
  immédiatement après création/modification/suppression. Aucun bug trouvé
  dans le code ; reste à confirmer en conditions réelles une fois
  déployé (Cowork n'a pas de shell pour lancer `npm run dev` elle-même).
- [x] **Lecteur audio d'ambiance discret**
  (`src/components/AmbientAudio/`) : play/pause, mute, volume, mémorisés
  dans `localStorage`. Aucun fichier audio fourni pour l'instant — le
  lecteur s'efface tout seul (`onError`) tant que
  `public/media/ambiance.mp3` n'existe pas. **Dépose un fichier audio à ce
  chemin exact pour l'activer, aucun autre changement nécessaire.**
- [x] **Reset de mot de passe** : pas de flux self-service par e-mail (aucun
  fournisseur d'envoi — Resend/Mailgun/etc. — configuré ; à décider si
  besoin). À la place : `updateUser` (`worker/lib/authStore.js` et
  `plugins/lib/authStore.js`) accepte désormais un champ `password` dans le
  patch, et `/admin` → Utilisateurs a un bouton « Réinitialiser le mot de
  passe » (`src/admin/AdminUsersPage.jsx`) — un admin peut donc changer le
  mot de passe de n'importe quel compte sans jamais toucher D1 à la main.
- [ ] **Refonte DA des fiches personnage** (grand portrait + nom + citation,
  barre identité, blocs fins histoire/relations/événements/Persona) — en
  attente de la maquette de référence que l'utilisatrice doit repartager
  (perdue au changement de session Cowork).
- [ ] **Push GitHub complet** — remote déjà configuré
  (`github.com/Poungou/Setia_Nova_GeminiGPT.git`, branche `main`), mais
  Cowork n'a pas d'accès shell/git sur cette machine dans cette session :
  impossible d'exécuter `git add`/`commit`/`push` à sa place. Commandes à
  lancer elle-même (terminal VS Code ou GitHub Desktop) :
  `git add -A && git commit -m "..." && git push`.
- [ ] Limite connue, non corrigée dans cette passe : `getRelationTargets`
  (`src/data/characters.js`) résout les relations d'un personnage
  uniquement contre les données **statiques** du bundle — un personnage
  créé après coup uniquement en D1 (via `/compte`) n'apparaîtra pas comme
  cible de relation tant que le site n'est pas reconstruit. N'affecte pas
  les personnages historiques (Fudo, Kazuko...), tous dans le repli
  statique.
- [ ] Les statistiques de l'accueil (`Home.jsx`, « 07+ personnages »...) et
  les autres pages listant des personnages (Univers, RelationGraph...)
  n'ont pas été branchées sur l'API publique dans cette passe — restent
  sur les données statiques du bundle, comme avant. À faire si besoin.

## Contenu à intégrer dès que disponible
- [ ] Portraits des 7 personnages (actuellement : initiales KN, HN, FN, CA, SN, IS, MN)
- [ ] Images des 3 lieux majeurs
- [ ] Biographies complètes (actuellement laissées vides pour ne pas inventer de lore)
