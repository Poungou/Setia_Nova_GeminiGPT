# Architecture — Woltar Archives Vivantes

## Stack

- **React 18 + Vite** — framework et outil de build, rapide et léger.
- **React Router** — navigation entre pages avec de vraies URL (`/personnages/kazuko-nakamura`, `/lieux/manoir-de-setia`, etc.).
- **CSS custom** (variables de palette dans `src/styles/theme.css`) — pas de gros framework CSS.
- **Framer Motion** — micro-animations discrètes (apparition des pages).
- **lucide-react** — icônes (menu, recherche…).

## Principe fondateur : tout vient des données

Aucune fiche personnage, lieu ou clan n'est codée en dur dans un composant. Chaque type de contenu a son fichier de données dans `src/data/`, et les composants/pages se contentent de lire ces fichiers et de les afficher. Modifier un fichier de données met à jour tout le site automatiquement (galerie, recherche, fiche détaillée, relations, etc.).

C'est ce qui permet de passer de 7 personnages à 50 sans réécrire de code.

## Arborescence

```
src/
├── components/        Composants réutilisables (pas de contenu figé dedans)
│   ├── Header/         Navigation + menu mobile
│   ├── Footer/         Pied de page (citation, crédits)
│   ├── CharacterCard/   Carte personnage (galerie, accueil)
│   ├── RelationCard/    Carte "mini-personnage" utilisée dans les relations
│   ├── LocationCard/    Carte lieu
│   ├── SearchBar/       Barre de recherche
│   ├── FilterBar/       Boutons de filtre (Tous / Actifs / À développer)
│   └── PageTransition/  Animation d'apparition de page (Framer Motion)
│
├── pages/              Une page = une route
│   ├── Home/            /
│   ├── Characters/      /personnages
│   ├── CharacterDetail/ /personnages/:id
│   ├── Universe/        /univers
│   ├── Clans/           /clans
│   ├── ClanDetail/      /clans/:id
│   ├── Locations/       /lieux
│   ├── LocationDetail/  /lieux/:id
│   ├── Chronology/      /chronologie
│   ├── Archives/        /archives
│   └── NotFound/        toute autre URL
│
├── data/               LA SOURCE DE VÉRITÉ — voir CONTENT_GUIDE.md
│   ├── characters.js    Les personnages
│   ├── locations.js     Les lieux
│   ├── clans.js         Les clans
│   ├── events.js        La chronologie (vide pour l'instant)
│   └── archives.js      Les archives RP (vide pour l'instant)
│
├── assets/             Images (portraits, lieux…)
│   ├── characters/
│   └── locations/
│
├── styles/
│   ├── theme.css        Palette de couleurs, typographie, variables globales
│   └── global.css       Styles partagés (boutons, cartes, états vides…)
│
├── utils/
│   └── stats.js          Calcule automatiquement les chiffres de l'accueil
│
├── App.jsx             Déclaration des routes
└── main.jsx            Point d'entrée de l'application
```

## Comment une fiche personnage fonctionne

1. `App.jsx` déclare la route `/personnages/:id`.
2. `pages/CharacterDetail/CharacterDetail.jsx` lit l'identifiant dans l'URL (`:id`), va chercher le personnage correspondant dans `data/characters.js`, et affiche ses champs.
3. Si le champ est vide (âge inconnu, historique pas encore écrit…), l'interface affiche un tiret « — » ou un état vide plutôt que d'inventer une information. **Le site n'invente jamais de lore.**
4. Les relations, lieux associés, etc. sont résolus automatiquement à partir des identifiants stockés dans la fiche (`relations: [{ characterId: 'hachiro-nakamura', ... }]`).

Kazuko Nakamura sert de modèle de référence : sa fiche utilise exactement la même structure que les six autres, avec plus de champs déjà renseignés.

## Statuts et fiabilité de l'information

Chaque personnage et chaque lieu porte un champ `canon` :

- `"confirmed"` — information confirmée par la propriétaire.
- `"draft"` — nom connu, mais à développer.

Cela permet de distinguer une information sûre d'une simple ébauche, sans jamais les mélanger visuellement de façon trompeuse.

## Prochaines phases (voir TODO.md)

- Backend (Supabase) pour stocker les données en base plutôt que dans des fichiers JS.
- Authentification (Supabase Auth) et interface `/admin` pour éditer les fiches et images sans toucher au code — **jamais de mot de passe en clair dans le JavaScript envoyé au navigateur.**
