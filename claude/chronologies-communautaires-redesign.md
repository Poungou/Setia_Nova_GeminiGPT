# Chronologies communautaires

La page `/chronologie` présente d’abord une bibliothèque de volumes à choisir, même avec une seule chronologie publiée. Aucun auteur n’est ouvert par défaut. Chaque volume mène à `/chronologie?auteur=ID` ; « Toutes les chronologies » ramène à la bibliothèque. Une fois le récit choisi, la page présente une chronologie personnelle à la fois : avatar public (ou initiale en l’absence d’image), nom de l’auteur·ice et introduction neutre. Le sélecteur permet de changer de chronologie, sans fusionner leurs événements. La sélection est partageable via le paramètre `auteur` (identifiant de chronologie).

La v2 remplace les accordéons, les périodes inventées et les cœurs par un fil continu et trois niveaux de points lumineux : repère, notable, tournant majeur. Le tri utilise l’ordre enregistré par l’auteur, sans interpréter les dates RP libres. Recherche, personnage, lieu et « majeurs seulement » se combinent ; changer de chronologie réinitialise ces filtres.

Les événements affichent toujours leur titre, leur date connue, leurs points clés et leurs liens. Les signalements de spoilers sont informatifs et ne masquent rien. Un événement vide indique « Pas encore développé ». Les 19 événements historiques ont reçu 2 à 4 points clés tirés exclusivement de leur description existante ; les descriptions originales sont conservées.

`keyPoints` contient 2 à 4 textes, éditables dans Compte et Admin. `description` conserve le développement. Avec des points clés, un développement de plus de 220 caractères est accessible via « Lire l’archive complète », sans remplacer les points clés. Sans points clés explicites, l’ancien texte reste intégralement visible, réparti en quatre points au maximum ; un texte trop court n’est pas artificiellement complété.

L’API publique fournit le nom du propriétaire même sans profil RP publié. La chronologie historique reste techniquement propriété de `system` ; sa métadonnée `authorName: Poungou` sert uniquement à l’attribution visible, sans modifier les droits. L’avatar provient uniquement d’un profil public, sinon une initiale est affichée.

La référence canvas « Chronologie — v2, personnelle et sobre » n’était pas accessible pendant l’implémentation : le rendu suit la spécification écrite et les variables visuelles du site. Version mobile dédiée, arcs et croisements entre auteur·ices restent hors périmètre.

## Données et accès

- Le canon Nakamura reste dans `src/data/timelines.json` (métadonnées) et
  `src/data/events.json` (événements non dupliqués).
- Les chronologies de compte utilisent la table D1 `timelines`, avec
  `owner_user_id`, données JSON et horodatages. Les événements sont embarqués
  dans le JSON ; leur ordre suit le tableau enregistré.
- La permission `create_timeline` autorise la création depuis
  `/compte/chronologies`. Un utilisateur ne modifie que ses propres fiches ;
  l’administrateur peut les modérer depuis cet espace compte.
- La section Admin Chronologies gère les métadonnées statiques en développement.
  En production, ces métadonnées restent en lecture seule ; leur modification
  nécessite un commit et un déploiement, comme les autres collections statiques.
- Les nouvelles fiches du formulaire sont des brouillons. Les endpoints publics
  de liste et de détail excluent les brouillons. Les identifiants du canon sont
  réservés et ne peuvent pas être utilisés pour une création de compte.
- `timelineEvents.js` partage la normalisation entre Worker et plugins Vite.
  En développement, les fiches de compte utilisent les collections JSON locales.

## Validation et mise en production ultérieure

Exécuter `npm run build`, `npm run lint` et `npm test`. La suite Chronologies
contrôle les permissions, la propriété, les brouillons, le CRUD, les événements
et la préservation du canon ; elle utilise SQLite en mémoire.

`0012_timelines.sql` crée uniquement la table et son index de propriétaire.
Elle devra être appliquée avant un futur déploiement de cette version :
le bootstrap du compte utilise cette table. Cette finalisation Git n’applique
aucune migration distante et ne déploie rien sur Cloudflare.

Le commit exclut les modifications locales des personnages, relations,
contenus et configuration Wrangler. Le composant SpoilerGate est inclus car
il est une dépendance nécessaire de la nouvelle page publique.

## Illustrations des événements

Les champs `image` (URL ou objet `{ src, focus }`), `imageAlt` et `imageCaption` sont éditables dans Compte et Admin, puis conservés par la normalisation partagée. L’upload utilise le service existant des images de compte. Une illustration fournie apparaît dans une marge à droite, avec cadrage et crédit ; aucune image n’est inventée ni ajoutée automatiquement aux événements historiques. Une image indisponible affiche un remplacement sans masquer le texte. Le fil reste vertical et les points clés restent visibles.

La bibliothèque utilise des couvertures typographiques ; les événements sont présentés sur des surfaces plus opaques et les illustrations comme des tirages légèrement inclinés. Les couleurs suivent les thèmes du site.
