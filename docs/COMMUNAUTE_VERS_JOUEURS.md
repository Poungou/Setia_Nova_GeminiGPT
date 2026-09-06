# Communauté RP → Joueurs : transition sans copie de données

## État constaté

« Communauté RP » n’est pas un stockage distinct. `AdminCommunityPage` gère déjà les profils joueurs via les API de profils existantes. En production, ces API utilisent `user_profiles` ; en développement Vite, `plugins/data/user-profiles.json`. Le pseudo provient du compte (`users.name`) et non d’un deuxième profil.

| Information | Source existante | Réutilisation publique |
| --- | --- | --- |
| Pseudo | `users.name` | Galerie et fiche `/joueurs/:id` |
| Avatar et crédit | `avatar`, `image_source` | Galerie, fiche et crédit sur la fiche |
| Présentation | `player_intro` | Extrait en galerie, présentation complète |
| Style d’écriture | `writing_style` | Galerie et fiche |
| Univers, TW, rythme | `univers`, `tw`, `rhythm` | Rubriques de la fiche, rythme en galerie |
| Pseudo IG | `ig_username` | Fiche joueur |
| Personnages possédés | `ownerUserId` | Rattachement automatique |
| Associations complémentaires | `linked_character_ids` | Rattachement supplémentaire, sans transfert de propriété |

`profile_public`, le statut/désactivation du compte, les identifiants et horodatages restent conservés. Les profils privés ne sont pas publiés ; les brouillons de personnages ne sont pas exposés dans les fiches publiques. L’admin conserve son accès aux profils privés et aux brouillons, dans les permissions existantes.

La migration historique 0009 contient les anciennes rubriques RP de Poungou et prévoit leur insertion seulement si son profil n’existe pas. Elle n’est pas réappliquée dans cette passe. Son application effective en production n’a pas été vérifiée : aucun accès D1 distant n’a été effectué.

La migration 0003 a également créé `site_settings` pour l’ancien profil créateur. Aucun lecteur/écrivain actif de cette table n’a été trouvé dans le code actuel. Son éventuel contenu distant reste inconnu et intact : il faudra l’inventorier avant de confirmer une suppression ou une reprise de données historiques.

## Changements de cette passe

- L’écran d’administration est nommé « Joueurs » et disponible sur `/admin/players`. Il réutilise intégralement le composant et les API existants.
- `/admin/community` et `/admin/creator/*` redirigent vers cet éditeur, toujours derrière la connexion admin. Ils ne redirigent pas vers une vue publique qui ferait perdre l’accès à l’édition.
- Des liens explicites mènent à `/joueurs` et aux profils publics. Aucun profil privé n’obtient de lien public dans l’admin.
- L’affichage admin des personnages inclut désormais les liens complémentaires, avec le même helper `isCharacterLinked` que les lecteurs de profils. Les brouillons sont indiqués comme tels plutôt que liés à une fiche publique inaccessible.
- Les libellés publics « Communauté RP » deviennent « Joueurs ». L’ancre historique `/personnages#players-title` reste présente.
- Aucune copie, suppression, publication automatique ni mutation de profil. Aucune migration créée. Backend Aether, D1 et chronologies inchangés.

## Ce qui peut disparaître ultérieurement

- Le nom interne `AdminCommunityPage` peut devenir `AdminPlayersPage` lors du prochain nettoyage ; le formulaire de gestion doit être conservé ou repris avant toute suppression du composant.
- Après confirmation et vérification des anciens favoris/liens, les alias `/admin/community` et `/admin/creator/*` pourront être retirés. Les conserver reste peu coûteux.
- L’encart de transition « Les joueurs — qui sont-ils ? » dans `/personnages` pourra être retiré lors de la passe graphique, en conservant un traitement de son ancienne ancre si elle est encore utilisée.
- Ne pas supprimer `user_profiles`, le fichier local des profils, les relations de personnages ou les migrations historiques. Ils restent les sources actives, pas des doublons.
- `communityNote` sur l’accueil et la valeur `community` de portée du lore décrivent le site/lore communautaire ; ce ne sont pas des données de l’ancien écran de profils et elles ne sont pas concernées.

## Vérifications

Build et lint ; suite de tests existante (profils publics/privés, propriétés et associations, permissions) ; nouveau test DOM du footer en build dev/production, changement des trois thèmes avec persistance, retour en haut, absence du lien Compte et affichage des champs/propriétés/associations dans l’écran admin sans écriture réseau.

Les tests DOM sont exécutés avec largeurs 375 et 1440 px, mais jsdom ne calcule pas la géométrie : le rendu CSS et le menu natif du système restent à vérifier visuellement sur un téléphone réel. Aucun déploiement Cloudflare effectué.
