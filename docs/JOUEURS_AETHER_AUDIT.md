# Joueurs, navigation et confidentialité Aether — 6 septembre 2026

## Audit avant modification

- React/Vite : `Header` est commun aux pages publiques. Le sous-menu Univers combinait `hover`/`focus-within` en CSS avec un état React, avec un espace de 16 px entre déclencheur et panneau. La fermeture explicite pouvait être contredite par le CSS.
- Les joueurs étaient des accordéons dans `/personnages`. Les champs RP et la visibilité existaient dans `user_profiles` (migrations 0008/0011). La route publique `/__public/api/players` exclut les profils privés et comptes désactivés ; sa projection ne contient pas d’email, hash de mot de passe ou jeton.
- `ownerUserId` reste la propriété réelle. `linked_character_ids` correspond aux associations complémentaires autorisées par l’administration, sans transfert de propriété. Les routes compte ciblent le compte de la session ; les routes de gestion d’autres comptes sont réservées à l’admin.
- Les événements des chronologies sont déjà un tableau JSON dans `timelines.data` (migration 0012), normalisé par `normalizeTimelineEvents`, commun au Worker et au serveur Vite.

## Flux Aether initial

1. `ChatWidget` conservait les 20 derniers messages dans un état React, sans localStorage/sessionStorage ni historique serveur.
2. Le navigateur envoyait `{ messages, context?, testMode? }` à `POST /__aether/api/chat`. Le Worker limitait à 20 messages et 4 000 caractères par message. `testMode` exigeait une session admin.
3. Le Worker lisait la configuration Aether et les personnages/clans D1 avec repli statique ; les lieux provenaient du fichier statique. Les lecteurs utilisés pouvaient inclure des brouillons. Les résumés et le contexte personnage devenaient des instructions OpenAI.
4. L’appel `responses.create` utilisait GPT-5.6 Luna par défaut, avec possibilité de surcharge par `OPENAI_MODEL`. Aucun outil image n’était fourni, mais les capacités n’étaient pas explicitement verrouillées. `store` était omis.
5. Aucune écriture de transcript D1 ni API d’historique/admin n’existait. Les erreurs pouvaient toutefois écrire l’objet d’erreur ou son message dans les logs. L’observabilité Wrangler était activée. Les réglages distants Cloudflare/OpenAI n’ont pas été consultés.

## Architecture retenue

- Aucun historique serveur, aucune table supplémentaire, aucun chiffrement au repos à gérer puisqu’aucun transcript n’est conservé par l’application.
- Historique limité à la mémoire de la page. Quitter/recharger la page le supprime. Chaque réponse utilise uniquement l’historique récent envoyé par le navigateur ; aucun identifiant de conversation OpenAI n’est conservé.
- Politique de requête partagée entre Vite et Worker : `store: false`, `background: false`, `tools: []`, `tool_choice: 'none'`, sortie texte. Les options du navigateur ne peuvent pas les remplacer. Les demandes usuelles de création/retouche d’image sont refusées localement ; les formulations non reconnues n’ont toujours aucun outil image disponible.
- Le modèle est fixé à `gpt-5.6-luna` en production et développement pour correspondre au texte public. `OPENAI_MODEL` ne le remplace plus pour Aether.
- Logs SDK désactivés (`logLevel: 'off'`). Les erreurs applicatives ne journalisent qu’un libellé constant, sans contenu, objet d’erreur ni clé. Les réponses HTTP Aether portent `Cache-Control: no-store`.
- L’observabilité automatique est désactivée dans la configuration Wrangler préparée. Ce réglage ne modifie pas les réglages déjà déployés. Aucun journal historique n’a été consulté ou supprimé.
- Contexte construit à partir des personnages, clans et lieux publiés ; filtre supplémentaire partagé dans le constructeur de prompt, y compris pour le personnage de contexte et les références de relations/membres. Les profils joueurs, comptes privés et chronologies ne sont pas transmis par cette version. Le texte libre d’une fiche publiée reste, par nature, un contenu public fourni par son auteur.
- La clé OpenAI reste exclusivement côté serveur. Aucun outil, endpoint ou écran ne permet à l’admin de relire une conversation.

### Limites et vérifications fournisseur

Le Worker et OpenAI traitent nécessairement les messages en clair pendant la requête. Un administrateur capable de modifier le code déployé ou d’instrumenter l’infrastructure pourrait intercepter de futurs messages. Cette architecture supprime les possibilités de relecture fournies par l’application ; elle ne garantit pas une impossibilité cryptographique et ne revendique pas de zero knowledge.

La [documentation officielle OpenAI sur les données](https://developers.openai.com/api/docs/guides/your-data) distingue stockage des réponses et journaux de surveillance des abus. `store: false` désactive le stockage d’état des réponses ; il ne garantit pas à lui seul l’absence de toute conservation fournisseur. Les options Zero Data Retention/Modified Abuse Monitoring dépendent de l’éligibilité et des réglages de l’organisation/projet.

Avant mise en production, vérifier dans le projet OpenAI les contrôles de données, le partage volontaire, les droits d’accès et l’éligibilité ZDR ; vérifier aussi Cloudflare Workers Logs, Logpush, Tail Workers et tout éventuel proxy/API Gateway. Ces réglages de compte ne sont ni déductibles du dépôt ni modifiés par cette passe. Ne pas annoncer « aucune conservation chez OpenAI » sans cette vérification. Les nouvelles options ne suppriment pas rétroactivement d’anciennes réponses stockées chez le fournisseur.

## Réutilisation, migration et UX

- Nouvelles pages `/joueurs` et `/joueurs/:id`, basées sur l’API publique existante ; cartes de personnages existantes réutilisées. États chargement, indisponibilité, profil privé/introuvable.
- Le lien `#Pseudo` sur une fiche personnage pointe vers le profil public du véritable propriétaire. Un propriétaire sans profil public n’obtient pas un faux lien vers une fiche privée.
- Univers est un panneau contrôlé explicitement, indépendant de la route, avec clic extérieur, Échap, retour du focus et fermeture lors d’une navigation. Accès Compte visible même lorsque le menu mobile est fermé.
- `spoiler` est un booléen d’événement conservé dans le JSON existant. Titre/date restent visibles après déverrouillage global ; description et liens restent masqués jusqu’à « Afficher ce spoiler ». Le verrou global reste prioritaire. Comme le SpoilerGate existant, c’est une protection de lecture volontaire, pas une confidentialité des données envoyées au navigateur.
- Aucune migration créée ou appliquée. Aucun déploiement Cloudflare effectué.

## Vérification

`npm run build`, `npm run lint`, `npm test`, et `node "Claude outputs/test-permissions.mjs"`.

Les tests supplémentaires couvrent l’appel Worker avec OpenAI simulé, les erreurs contenant des sentinelles privées, l’absence d’écriture D1, la politique texte/stockage, les brouillons exclus, les interactions DOM desktop/mobile, le lien Compte, les cartes Joueurs et les deux niveaux de SpoilerGate. Les suites existantes couvrent les profils privés, les comptes désactivés/propriétaires, les associations autorisées et les permissions d’édition.

À vérifier visuellement sur navigateur réel avant publication : largeur 320/375/768 px et grand écran, pseudos longs, avatars manquants, fiche joueur avec plusieurs portraits, clavier/tactile, panneau Aether et lisibilité des spoilers. Les tests DOM ne mesurent pas la géométrie CSS.
