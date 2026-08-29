# Guide de contenu — comment modifier le site sans coder

Ce guide s'adresse à la propriétaire du site, sans besoin d'être développeuse. Tout se passe dans le dossier `src/data/`.

⚠️ Règle d'or : **si une information n'est pas connue ou pas confirmée, laisse le champ vide (`''`) ou vide le tableau (`[]`)**. Le site affichera automatiquement un tiret « — » ou un message "à compléter" — jamais d'information inventée.

## Ajouter un nouveau personnage

1. Ouvre `src/data/characters.js`.
2. Copie un bloc `{ ... }` existant (par exemple celui d'Isil, le plus simple) et colle-le juste avant le `]` final.
3. Modifie chaque champ :
   - `id` : identifiant unique, en minuscules, sans espace ni accent (ex. `'nouveau-personnage'`). C'est ce qui apparaît dans l'URL : `/personnages/nouveau-personnage`.
   - `number` : le numéro affiché sur la carte (ex. `'08'`).
   - `firstName`, `lastName`, `nickname`, `title`, `clan`, `age`, `gender`, `species`, `origin`, `residence`, `occupation` : texte libre, ou `''` si inconnu.
   - `status` : `'active'` ou `'to-develop'` — utilisé par les filtres de la page Personnages.
   - `canon` : `'confirmed'` ou `'draft'`.
   - `traits` : liste de caractéristiques visuelles, ex. `['Pelage vert', 'Yeux cyan']`.
   - `shortDescription`, `character` (caractère), `appearance` (apparence), `biography` (histoire) : texte libre, peuvent rester vides.
   - `relations` : voir plus bas.
   - `locations` : liste d'identifiants de lieux (voir `src/data/locations.js`), ex. `['manoir-de-setia']`.
   - `tags` : mots-clés utilisés par la recherche, ex. `['Nakamura', 'Sétia']`.
   - `gallery` : liste de chemins d'images (voir "Ajouter un portrait" plus bas). Laisser `[]` si aucune image.
4. Enregistre le fichier. La nouvelle fiche apparaît automatiquement dans la galerie, la recherche et les filtres.

## Modifier un personnage existant

Trouve son bloc dans `src/data/characters.js` (repère-toi avec le champ `id`) et modifie directement les champs voulus. Pas besoin de toucher à autre chose.

## Ajouter un portrait ou une image

1. Dépose le fichier image (`.webp` de préférence, `.png`/`.jpg` acceptés) dans `src/assets/characters/`.
2. Dans le bloc du personnage, renseigne :
   ```js
   portrait: '/src/assets/characters/nom-du-fichier.webp',
   ```
3. Pour une galerie de plusieurs images :
   ```js
   gallery: [
     '/src/assets/characters/nom-1.webp',
     '/src/assets/characters/nom-2.webp',
   ],
   ```
Tant qu'aucune image n'est fournie, le site affiche automatiquement les initiales du personnage (ex. « KN » pour Kazuko Nakamura).

## Ajouter une relation entre deux personnages

Dans le bloc du personnage, ajoute une entrée dans `relations` :

```js
relations: [
  {
    characterId: 'hachiro-nakamura', // l'id de l'AUTRE personnage
    type: 'Frère jumeau',            // comment le décrire depuis CE personnage
    description: '',                  // texte libre optionnel
  },
],
```

La relation n'est affichée que du côté du personnage où elle est écrite. Si Kazuko et Hachiro sont frère et sœur, il faut ajouter la relation dans les deux fiches (une fois "Frère jumeau" côté Kazuko, une fois "Sœur jumelle" côté Hachiro).

## Créer un lieu

Même principe dans `src/data/locations.js` : copie un bloc existant, renseigne `id`, `name`, `type`, `location`, `owner`, `faction`, `description`, `characters` (liste d'ids de personnages associés), etc.

## Créer un événement de chronologie

Dans `src/data/events.js`, ajoute un objet :

```js
{
  id: 'un-id-unique',
  title: "Titre de l'événement",
  dateRP: 'Date en RP',
  order: 1, // détermine l'ordre d'affichage
  description: '...',
  characters: ['kazuko-nakamura'],
  locations: ['manoir-de-setia'],
  image: '',
  importance: 'majeur',
  tags: [],
}
```

## Créer un clan

Dans `src/data/clans.js`, même principe : `id`, `name`, `description`, `residence`, `locations`, `members` (liste d'ids de personnages).

## Ce que tu n'as jamais besoin de faire

- Toucher aux fichiers dans `src/components/` ou `src/pages/` pour ajouter du contenu.
- Écrire du HTML.
- Dupliquer une fiche personnage complète : un seul fichier de données suffit pour tous les personnages.
