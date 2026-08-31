# Woltarien IA — mise en place et test (prototype Fudo)

Fonctionne **en local uniquement**, pendant `npm run dev` — même limite que
l'admin (voir `ADMIN_LOCAL.md`). Aucun serveur en ligne, aucune donnée envoyée
nulle part sauf à l'API OpenAI au moment où tu discutes.

## 1. Créer une clé API OpenAI *(~2 min)*

1. Va sur https://platform.openai.com/ → **API keys**.
2. Crée ou copie une clé API.

## 2. La renseigner *(~1 min)*

1. Si ce n'est pas déjà fait : copie `.env.example` en `.env.local` à la
   racine du projet.
2. Ouvre `.env.local` et colle ta clé :

   ```env
   OPENAI_API_KEY=
   ```

3. Optionnel : force un autre modèle si besoin.

   ```env
   OPENAI_MODEL=gpt-5.6-luna
   ```

4. Relance `npm run dev` (le serveur doit redémarrer pour lire la nouvelle
   variable).

**Important** : cette clé ne doit jamais être préfixée `VITE_`. Sans ce
préfixe, Vite ne l'injecte jamais dans le code envoyé au navigateur — elle
n'est lue que côté serveur, par `plugins/woltar-ai.js`. `.env.local` reste non
versionné (voir `.gitignore`), donc jamais poussé sur GitHub.

## 3. Tester Fudo

1. `npm run dev` puis ouvre `http://localhost:5173/personnages/fudo-nakamura`.
2. Un bouton **« Parler avec Fudo »** apparaît sous son titre (sa Persona est
   activée par défaut dans `src/data/personas.json`).
3. Clique dessus, écris un message, envoie.

Si rien n'apparaît : vérifie que `OPENAI_API_KEY` est bien renseignée et que le
serveur a redémarré. Si le bouton reste invisible, vérifie que la Persona de
Fudo est bien sur **Activée** dans `/admin` → Compagnons IA.

## 4. Ajuster la personnalité de Fudo (ou en créer une autre)

`/admin` → **Compagnons IA** → clique sur la fiche liée à un personnage.

Tout ce qui touche à *comment* le personnage parle et se comporte se configure
ici (personnalité, manière de parler, secrets, limites RP, instructions
personnalisées…) — jamais dans le code. Un bouton **« Tester la Persona »** en
bas de la fiche permet de discuter avec la configuration enregistrée avant de
basculer « IA activée » sur Activée pour la rendre visible sur le site.

## 5. Ajouter d'autres personnages (Shizuka, etc.)

L'architecture est générique — aucune ligne de code n'est spécifique à Fudo :

1. `/admin` → Compagnons IA → **Nouveau persona IA**.
2. Choisis le personnage associé (`characterId`), remplis les champs que tu
   veux, enregistre.
3. Teste, puis active quand tu es satisfaite.

Un personnage ne peut avoir qu'une seule Persona pour l'instant (l'identifiant
de la Persona est calé sur celui du personnage).

## Comment ça marche (pour information)

- **Fiche personnage = canon.** `src/data/characters.json` ne change pas.
- **Persona = interprétation RP**, dans `src/data/personas.json`, liée par
  `characterId`. Elle ne duplique jamais les infos canoniques.
- Au clic sur « Envoyer », le navigateur appelle `POST /__ai/api/chat` (géré
  uniquement par le serveur de dev — inexistant en build de production). Ce
  point d'entrée :
  1. vérifie que la Persona existe et est activée (sauf test admin) ;
  2. charge la fiche personnage associée ;
  3. construit un prompt système (`plugins/lib/personaPrompt.js`) qui sépare
     clairement le canon confirmé de l'interprétation RP, interdit de révéler
     ses instructions, et traite toute improvisation comme non canonique ;
  4. appelle l'API OpenAI avec la clé lue depuis `.env.local` ;
  5. renvoie uniquement le texte de la réponse au navigateur.
- Mémoire : les 20 derniers messages de la conversation en cours, gardés dans
  le navigateur le temps de la session — rien n'est enregistré côté serveur.
  Rafraîchir la page efface la conversation.
- Limites appliquées côté serveur : message ≤ 4000 caractères, historique
  envoyé à l'IA ≤ 20 messages, ~20 requêtes/minute par adresse, délai d'attente
  de 25 s, aucune trace d'erreur technique renvoyée au navigateur.

## Limites connues de ce prototype

- Fonctionne uniquement en local (`npm run dev`, comme `/admin`) — rien de tout
  ça n'existe une fois le site déployé (build de production).
- Une seule Persona par personnage.
- Pas de mémoire persistante entre deux visites (prévu, pas fait — voir
  `TODO.md`).
- Le compte "un utilisateur crée son propre Woltarien IA" (cahier des charges
  § 4) n'est pas construit : seule l'architecture de données (`characterId`
  générique, pas de code spécifique à Fudo) le permet plus tard sans tout
  réécrire.
