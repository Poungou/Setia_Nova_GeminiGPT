# Plan de deploiement Cloudflare pour Woltar

Ce document prepare Cloudflare sans migrer les donnees et sans deployer.

## Etat actuel verifie

- `.env.local` est ignore par Git via `.gitignore` (`.env.*`).
- `plugins/data/` est ignore par Git. Il contient le stockage local `users.json` et `auth-secret.txt`.
- `OPENAI_API_KEY` n'apparait que dans `.env.example` et dans le plugin serveur `plugins/woltar-ai.js`.
- Le code client ne doit jamais recevoir `OPENAI_API_KEY`. Sur Cloudflare, cette cle devra etre ajoutee comme secret Wrangler.
- `wrangler.jsonc` sert uniquement le build statique `dist/` comme SPA. Les API comptes/admin/IA ne sont pas encore migrees en production Cloudflare.

## A ne pas deployer tel quel

- `plugins/data/users.json` ne doit pas devenir le stockage production.
- `plugins/data/auth-secret.txt` ne doit pas devenir le secret production.
- Les plugins Vite `plugins/woltar-auth.js`, `plugins/woltar-account.js`, `plugins/woltar-admin.js` et `plugins/woltar-ai.js` utilisent l'environnement serveur local de Vite. Ils ne tournent pas tels quels dans Cloudflare Workers, et continuent d'etre utilises tels quels par `npm run dev` (rien n'y a change dans cette passe).

## Solution persistante recommandee

Utiliser Cloudflare D1 comme source de verite pour les comptes, roles, sessions et contenus possedes.

D1 est le meilleur choix ici parce que Woltar doit conserver des relations et permissions serveur :

- `ownerUserId` sur les fiches personnages et Personas IA ;
- roles `admin` et `user` ;
- permissions de lecture/ecriture par proprietaire ;
- sessions et revocation ;
- requetes d'administration sur les utilisateurs.

KV peut rester utile plus tard pour du cache court ou du rate limiting, mais pas comme stockage canonique des comptes.

## Portee retenue pour cette passe (decision validee)

Seuls les comptes, les personnages et les Personas IA migrent vers D1. Les 5
collections sans `ownerUserId` — lieux, clans, chronologie, archives, journal
— restent des fichiers JSON statiques empaquetes au build (lues en lecture
seule par le Worker via `worker/lib/contentStore.js`, `STATIC_COLLECTIONS`).
Raison : ce sont des donnees d'univers geree par l'administratrice, pas des
contenus qu'un compte utilisateur cree ou modifie lui-meme — pas besoin de
base de donnees pour ca dans l'immediat. Elles pourront migrer vers D1 plus
tard si `/admin` doit un jour ecrire directement en production.

## Ce qui a ete construit dans cette passe

Cote Worker (nouveau dossier `worker/`, ne remplace aucun fichier existant) :

- `worker/lib/authStore.js` — port D1 de `plugins/lib/authStore.js` (meme
  hachage scrypt, meme schema de cookie signe HMAC). Trois differences
  volontaires : pas de route "admin local" (mot de passe en clair, sens
  uniquement en dev local) ; `AUTH_SESSION_SECRET` doit etre un secret
  Wrangler deja en place (pas de generation a la volee, impossible sans
  fichier persistant dans un Worker) ; inscriptions publiques fermees par
  defaut apres le tout premier compte (`ALLOW_PUBLIC_REGISTRATION` doit
  valoir `"true"` pour les rouvrir) ; cookie de session avec l'attribut
  `Secure` (le Worker est toujours servi en HTTPS).
- `worker/lib/contentStore.js` — CRUD D1 pour `characters` et `personas`
  (table `data` en JSON, colonnes indexees `owner_user_id`/`character_id`),
  plus `STATIC_COLLECTIONS` pour les 5 collections de reference.
- `worker/routes/auth.js`, `worker/routes/account.js`, `worker/routes/ai.js`
  — portage direct des trois plugins Vite equivalents vers l'API Fetch
  (`Request`/`Response` au lieu de req/res Node). Memes routes, memes
  reponses JSON, memes regles d'autorisation (`ownerUserId`,
  `canEditOwnedResource`). `worker/routes/ai.js` reutilise **sans
  modification** `plugins/lib/personaPrompt.js` : le prompt systeme est
  identique entre dev local et production.
- `worker/index.js` — point d'entree du Worker : route `/__auth/api/*`,
  `/__account/api/*`, `/__ai/api/*` vers ces handlers, sert le reste via
  `env.ASSETS.fetch(request)` (le build `dist/`).
- `migrations/0001_init.sql` — schema D1 initial (`users`, `characters`,
  `personas` + index).
- `scripts/generate-d1-seed.mjs` — genere `d1-seed.sql` a partir des JSON
  locaux actuels (`src/data/characters.json`, `personas.json`). Ne touche
  jamais D1 directement et ne migre pas les mots de passe : un nouveau compte
  se cree via `/register` une fois en ligne (le tout premier devient admin).
- `wrangler.jsonc` mis a jour : `main` (`worker/index.js`), binding D1
  `WOLTAR_DB` (placeholder `database_id` a completer), variable
  `ALLOW_PUBLIC_REGISTRATION` a `"false"`, `assets.run_worker_first` a `true`
  pour que le Worker voie les requetes API avant le fallback statique.

Rien de tout ca n'a ete deploye. `npm run dev` continue d'utiliser les
plugins Vite existants sans aucun changement.

## Etapes manuelles restantes (dans l'ordre)

```bash
# 1. Verifier si la base existe deja, sinon la creer
npx wrangler d1 list
npx wrangler d1 create woltar-db
# -> copier le database_id renvoye dans wrangler.jsonc (d1_databases[0].database_id)

# 2. Appliquer le schema
npx wrangler d1 execute woltar-db --local --file=./migrations/0001_init.sql
npx wrangler d1 execute woltar-db --remote --file=./migrations/0001_init.sql

# 3. Secrets Wrangler (jamais dans wrangler.jsonc ni dans le code)
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put AUTH_SESSION_SECRET

# 4. (Optionnel) reprendre les personnages/Personas deja crees en local
node scripts/generate-d1-seed.mjs
npx wrangler d1 execute woltar-db --local --file=./d1-seed.sql
npx wrangler d1 execute woltar-db --remote --file=./d1-seed.sql

# 5. Tester en local avant tout
npm run cloudflare:preview
# -> cree un compte via l'UI (le premier devient admin), verifie fiches,
#    Personas et le chat IA de Fudo sur ce serveur local Worker+D1.
```

Ne pas lancer `wrangler deploy` tant que ces etapes n'ont pas ete rejouees et
validees par la proprietaire du site.
