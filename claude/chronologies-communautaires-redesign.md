# Chronologies communautaires

La page `/chronologie` présente des chronologies en accordéon. La première
s’ouvre à l’arrivée ; le visiteur peut ensuite toutes les fermer ou en ouvrir
une autre. Le contenu marqué spoiler demande une confirmation à chaque
réouverture. Les événements longs proposent « Lire la suite ».

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
