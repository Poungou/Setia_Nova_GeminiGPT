# Admin local — mode d'emploi

L'administration tourne **sur ta machine**, pendant que le serveur de dev est lancé.
Aucun compte, aucune connexion internet requise. Tes modifications sont écrites
directement dans `src/data/*.json` et le site se recharge tout seul.

## Y accéder

1. Lance le site :

```bash
npm run dev
```

2. Ouvre `http://localhost:5173`.
3. Tout en bas de page (pied de page), clique le lien discret **« Connexion »**.
4. Phrase d'accès : `woltar`
   *(modifiable dans `src/admin/localAuth.js` si tu veux)*

## Ce que tu peux faire

| Section | Actions |
|---|---|
| Personnages | créer, modifier, supprimer ; identité, textes, portrait, galerie, lieux associés, **relations**, mots-clés |
| Lieux | idem + image principale, personnages associés |
| Clans | membres, lieux, description, histoire |
| Chronologie | événements datés, ordre d'affichage |
| Archives RP | arc, texte RP *(⚠️ ne jamais réécrire un texte fourni sans demande)* |

- **Images** : bouton « Choisir un fichier » → l'image est copiée dans `public/media/`
  et référencée automatiquement. Tu peux aussi coller une URL.
- **Identifiant** : généré depuis le nom/titre à la création, puis figé (ne pas le
  changer casserait les liens entre fiches).
- Chaque enregistrement réécrit proprement le fichier `.json` correspondant.

## Publier les changements

Le site n'est pas encore en ligne. Quand tu veux que je sauvegarde/publie tes
ajouts, dis-le moi : je fais le commit git (et le déploiement quand la Piste A
sera en place).

## Limites (levées avec la mise en ligne — Piste A)

- Fonctionne uniquement en local, avec `npm run dev`.
- Le verrou par phrase d'accès n'est pas de la vraie sécurité (inutile en local).
- Pas d'historique des versions autre que git.
