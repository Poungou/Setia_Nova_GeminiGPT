# Carnet des cultures

- `/culture` : lecture publique, recherche par titre/auteur/introduction, filtres par hashtag et contributions personnelles.
- `/culture/nouveau` et `/culture/:id/modifier` : publication immédiate pour tout compte actif, édition par l’auteur ou une administratrice. Le texte accepte le Markdown nettoyé à l’affichage. Une illustration peut être ajoutée par URL HTTPS avec son crédit.
- `/admin/culture` : ajouter, renommer et supprimer les hashtags ; accéder aux contributions pour les modifier ou les supprimer. Retirer un hashtag conserve les publications.
- Le menu Univers, la carte Culture et le menu du compte donnent accès au carnet.

## Stockage et déploiement

La migration additive `migrations/0013_culture.sql` crée trois tables indépendantes : publications, hashtags et associations. Elle fournit six hashtags de départ et ne modifie aucun contenu existant. Appliquer une seule fois avant le déploiement du Worker :

```powershell
npx wrangler d1 execute woltar-db --remote --file migrations/0013_culture.sql
npm run build
npx wrangler deploy --keep-vars
```

Le développement Vite utilise `plugins/data/culture.json` (ignoré par Git). Les écritures locales sont sérialisées. Le Worker utilise D1 avec des transactions pour les publications et leurs hashtags. Les contrôles de session, propriétaire, données et droits admin sont partagés entre les deux environnements. Les modifications concurrentes d’un texte sont refusées si la version a changé.

La suppression d’un compte laisse ses contributions publiques signées du nom enregistré lors de leur création. Les administratrices peuvent ensuite les supprimer ou les modifier.

## Vérification

`npm test` inclut les tests Culture : droits, publication immédiate, conservation des textes après suppression d’un hashtag, validations, transactions SQLite et persistance locale avec session signée.

Le test visuel optionnel utilise l’installation Playwright déjà employée par les tests de navigation : lancer Vite sur le port 5182 puis `node scripts/test-culture-browser.mjs`. Les publications et comptes de ce test restent en mémoire et ne sont jamais écrits sur le site réel.
