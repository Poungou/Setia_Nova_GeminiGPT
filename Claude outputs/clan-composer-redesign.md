# Refonte création/édition de clan — Composeur de clan

Session Claude (Cowork), suite au pass « Chronologies communautaires ». Objectif : rendre la création/édition
d'un clan visuelle et intuitive (identité compacte, membres en cartes, éditeur de liens A → B, aperçu du
sociogramme en direct avec choix du centre au clic) sans casser le backend existant.

## Analyse de l'existant (avant de coder)

Avant toute modification, relecture complète de :

- `src/admin/schema.js` (entrée `clans` : champs, defaults, hint sur `centerCharacterId`)
- `src/admin/Fields.jsx` (`RefsInput`, `RelationsInput`, `CharacterSelectInput`, `ImageInput`)
- `src/components/RelationGraph/RelationGraph.jsx` + `.css` (sociogramme radial existant, Phase 22)
- `src/lib/relations.js` (`RELATION_NATURES`, `RELATION_INTENSITIES`)
- `src/lib/image.js`, `src/pages/ClanDetail/ClanDetail.jsx`, `src/pages/Clans/Clans.jsx`
- `plugins/lib/clanMembers.js`, `worker/routes/account.js` (routes `/collections/clans/:id/members`,
  `sanitizeOwnedClanRow`, `assertCanAddMember`, `assertCanEdit`)
- `migrations/0004_clans_and_members.sql`

Point important découvert en cours d'audit : deux fichiers avaient été modifiés par ailleurs depuis le pass
Chronologies (`.codex` présent dans le profil Windows — probablement Codex) : `src/account/AccountApp.jsx`
seul, puis un peu plus tard `src/admin/AdminApp.jsx` / `AdminCommunityPage.jsx` / `AdminLayout.jsx` ensemble.
Ces trois derniers fichiers ne sont pas concernés par cette tâche (ils vivent sous `/admin`, pas `/compte`) —
non touchés. `AccountApp.jsx`, en revanche, a été relu intégralement dans sa version actuelle avant toute
édition, pour ne rien écraser.

Autre point vérifié avant de conclure à un « trou » : `ClanDetail.jsx` passe déjà
`centerId={clan.centerCharacterId}` à `<RelationGraph>` — le champ était donc déjà branché de bout en bout
côté public ; il manquait seulement une manière agréable de le régler côté `/compte`.

## Architecture retenue

**Aucune route serveur ajoutée, aucune migration.** Tout passe par ce qui existe déjà :

- **Bloc A — Identité** : les mêmes champs `SCHEMA.clans` (via le composant `Field` générique), regroupés en
  sous-sections compactes (grille 2 colonnes, les blocs "Textes" en pleine largeur) au lieu d'un long
  formulaire vertical. L'aperçu immédiat de l'emblème existait déjà dans `ImageInput` — récupéré tel quel.
- **Bloc B — Membres** : mêmes appels `getClanMembers` / `addClanMember` / `removeClanMember` (table
  `clan_members`, route `/collections/clans/:id/members`) qu'avant — seule la présentation a changé (cartes
  portrait + nom au lieu d'un `<select>` + liste texte, avec recherche si plus de 6 personnages candidates).
- **Bloc C — Éditeur visuel de liens** : **aucune nouvelle route**. Une relation reste exactement
  `{characterId, type, description, nature, intensity}` sur `character.relations[]` (le même champ que
  l'éditeur historique `RelationsInput`). L'éditeur écrit simplement des **deux côtés** en une seule action,
  via deux appels successifs à la route déjà existante `PUT /collections/characters/:id` (celle qu'utilise
  déjà la fiche personnage générique). Deux nouvelles fonctions **pures** dans `src/lib/relations.js`
  (`upsertRelation`, `removeRelation`) calculent le prochain tableau `relations` sans dépendre de React —
  testées directement (voir plus bas). Une catégorie proposée (`RELATION_LINK_TYPES`, aussi dans
  `relations.js` : Famille, Parent/Enfant, Frère-sœur, Couple, Amitié, Rivalité, Mentor/Protégé, Ennemi,
  Autre) ne fait que pré-remplir un libellé par sens — texte entièrement modifiable ensuite, jamais verrouillé.
  Cas limite géré explicitement : si le second personnage appartient à un autre compte (ex. une admin a
  ajouté un personnage d'une autre joueuse au clan), le second PUT échoue (403) — le premier reste enregistré
  et un message clair l'indique, plutôt qu'un plantage ou une perte silencieuse.
- **Bloc D — Aperçu en direct + personnage central** : réutilise `RelationGraph` **tel quel**, avec un seul
  ajout non cassant : une prop optionnelle `onNodeClick`. Absente (comme sur `ClanDetail.jsx` et
  `CharacterDetail.jsx`, jamais modifiés), le rendu public est strictement identique à avant. Fournie (depuis
  le Bloc D), les portraits deviennent des `<button>` qui appellent `onNodeClick(id)` au lieu de naviguer —
  c'est ce qui permet de cliquer un portrait pour le définir comme centre. Un `<select>` de repli reste
  disponible juste en dessous (accessibilité / clavier). Le graphe s'affiche aussi désormais avec 0 lien tant
  qu'on est en mode éditeur (portraits seuls, pas de message "Aucun lien renseigné"), pour rester utile dès la
  création du clan, avant que des relations n'existent — comportement inchangé en lecture publique.

**Un seul fichier composite nouveau** : `src/components/ClanComposer/ClanComposer.jsx` (+ `.css`), monté
depuis `AccountApp.jsx` (`AccountEdit`) uniquement pour `collection === 'clans'` — les autres collections
(personnages, lieux, articles, chronologies) gardent exactement le rendu générique d'avant, inchangé.

Ordre de composition, conforme à la demande : identité (Bloc A) → *si le clan est déjà enregistré* → membres
(Bloc B) → liens (Bloc C) → aperçu + centre (Bloc D). Pour un nouveau clan, seul le Bloc A s'affiche avec un
message invitant à enregistrer d'abord (même logique que l'ancien `ClanMembersEditor`, qui n'apparaissait déjà
que `!isNew`).

## Fichiers modifiés

- `src/account/AccountApp.jsx` — suppression de `ClanMembersEditor` (logique déplacée dans `ClanComposer`,
  routes API identiques) ; le rendu de la collection `clans` délègue à `<ClanComposer>` ; le champ
  `centerCharacterId` est retiré du groupe de champs générique pour `clans` (il vit dans le Bloc D).
- `src/lib/relations.js` — ajout de `RELATION_LINK_TYPES`, `upsertRelation`, `removeRelation` (fonctions
  pures, aucune modification des exports existants `RELATION_NATURES`/`RELATION_INTENSITIES`).
- `src/components/RelationGraph/RelationGraph.jsx` — ajout de la prop optionnelle `onNodeClick` (défaut :
  absente, comportement public inchangé) ; export de `collectEdges` (déjà interne, maintenant réutilisée par
  `ClanRelationsBlock`) ; léger assouplissement de la condition d'affichage vide (voir Bloc D ci-dessus).
- `src/components/RelationGraph/RelationGraph.css` — reset visuel pour les nouveaux `<button>` de nœud
  (identique à l'ancien `<Link>`).

## Fichiers créés

- `src/components/ClanComposer/ClanComposer.jsx` + `.css` — les Blocs A/B/C/D.
- `Claude outputs/test-relations.mjs` — 21 assertions sur `RELATION_LINK_TYPES`, `upsertRelation`,
  `removeRelation` (immutabilité, pas de duplication, conservation des extras en édition, tolérance aux
  tableaux absents).
- `Claude outputs/test-clan-composer.mjs` — 20 assertions d'intégration réelle (mêmes handlers que le Worker
  de production, SQLite en mémoire) : création de clan, ajout/retrait de membres (table `clan_members`
  inchangée), écriture d'un lien des deux côtés via deux `PUT /collections/characters/:id`, cas limite du
  personnage appartenant à un autre compte (403 propre, pas de perte du premier côté), écriture de
  `centerCharacterId`, suppression d'un membre sans supprimer le personnage.

## Build / lint / tests

- **Tests réels exécutés dans cette session** (sandbox Cowork, avec les vrais handlers `worker/routes/*.js` +
  SQLite en mémoire) : `test-relations.mjs` (21/21 OK), `test-clan-composer.mjs` (20/20 OK, nouveau), plus
  relance de `test-timelines.mjs` (36/36 OK) et `test-player-profiles.mjs` (45/45 OK) pour vérifier l'absence
  de régression sur le reste du backend compte.
- **Vérification syntaxe/JSX** de tous les fichiers modifiés/créés via `tsc --noEmit --allowJs --jsx preserve`
  — aucune erreur.
- **`npm run build` / `npm run lint` / `npm test` (le vrai script npm) n'ont PAS pu être lancés dans cette
  session** : l'installation des dépendances échoue ici avec une erreur 403 (accès à `registry.npmjs.org`
  refusé par la politique réseau de cet environnement) — ce n'est pas une erreur transitoire à réessayer.
  Cette session n'a par ailleurs pas d'accès shell (`device_bash`) sur ta machine pour ce projet (uniquement
  lecture/écriture de fichiers) : à faire toi-même en local :

  ```bash
  npm run build
  npm run lint
  npm test
  node "Claude outputs/test-relations.mjs"
  node "Claude outputs/test-clan-composer.mjs"
  ```

## Commit + push Git

Autorisés cette fois, mais **non réalisables depuis cette session** (pas d'accès shell/git sur ta machine pour
ce projet). Les 8 fichiers ont été écrits directement dans ton dossier `woltar` (copie confirmée, aucun
rejet). Pour committer :

```bash
git add src/components/ClanComposer/ src/components/RelationGraph/RelationGraph.jsx src/components/RelationGraph/RelationGraph.css src/account/AccountApp.jsx src/lib/relations.js "Claude outputs/test-relations.mjs" "Claude outputs/test-clan-composer.mjs"
git commit -m "feat: composeur de clan visuel (membres, liens, sociogramme en direct)"
git push
```

## Ce qu'il reste à vérifier visuellement

Rien de tout ceci n'a pu être vu dans un vrai navigateur depuis cette session (pas d'accès à ton `npm run
dev` local). À l'œil, dans `/compte/clans/:id` :

- Bloc A : la grille 2 colonnes reste lisible, l'aperçu de l'emblème s'affiche bien au choix d'un fichier.
- Bloc B : les cartes membres (portrait + nom), l'ajout avec recherche si tu as beaucoup de personnages.
- Bloc C : créer un lien Kazuko ↔ Hachiro (catégorie « Frère/sœur »), vérifier que les deux libellés
  proposés sont corrects, modifier un lien existant, le supprimer.
- Bloc D : cliquer un portrait dans l'aperçu doit le mettre au centre (halo + nom en plus grand) — vérifier
  que le `<select>` de repli en dessous reflète le même choix, et que le résultat persiste après avoir cliqué
  « Enregistrer » puis rechargé la page.
- Le clan canon Nakamura (`/admin`, pas `/compte`) n'est pas concerné par ce composeur (il garde son
  `members` embarqué géré depuis `/admin`) — seuls les clans de compte passent par `ClanComposer`.
- Mobile : les blocs s'empilent, la grille de membres se resserre, l'éditeur de lien passe en une colonne,
  et l'aperçu du sociogramme bascule automatiquement sur la liste verticale déjà existante de
  `RelationGraph` (comportement hérité, pas modifié).
