# Mise en place de l'admin — checklist

Objectif : le site en ligne (public) + une interface `/admin` accessible à toi seule
via ton compte Google. Coût : 0 €.

Rôles :
- **Toi** : créer les comptes, cliquer, copier-coller des clés. Aucune ligne de code.
- **Claude Code (moi)** : tout le reste (tables, migration, pages admin, sécurité).

Quand une étape dit **→ donne-moi X**, colle-le dans la conversation Claude Code et je
prends le relais.

---

## 1. Créer le projet Supabase  *(~5 min)*

1. Va sur https://supabase.com → **Start your project** → connecte-toi (GitHub ou e-mail).
2. **New project** :
   - Name : `woltar`
   - Database Password : génère-en un long, **note-le** dans ton gestionnaire de mots de passe.
   - Region : `West EU (Ireland)` (ou le plus proche).
3. Attends que le projet finisse de démarrer (~2 min).

## 2. Créer les tables  *(~1 min)*

1. Dans le projet : menu de gauche → **SQL Editor** → **New query**.
2. Ouvre le fichier `supabase/schema.sql` de ce dépôt, copie **tout** son contenu, colle-le.
3. Clique **Run**. Tu dois voir « Success. No rows returned ».

> Ce script peut être relancé sans risque si besoin (il recrée tout proprement).

## 3. Récupérer les clés du site  *(~1 min)*

1. Menu de gauche → **Project Settings** (roue crantée) → **API**.
2. Repère :
   - **Project URL** → ex. `https://abcdefgh.supabase.co`
   - **Project API keys → `anon` `public`** → longue chaîne `eyJ...`
3. **→ donne-moi ces deux valeurs.** (La clé `anon` est publique par conception, elle
   ne permet que la lecture + l'écriture réservée à ton compte. Ne me donne **pas** la
   clé `service_role`.)

Pendant ce temps je crée le fichier `.env.local` en local ; sur Vercel on les remettra
à l'étape 6.

## 4. Activer la connexion Google  *(~10 min — l'étape la plus technique)*

### 4a. Côté Google Cloud

1. https://console.cloud.google.com → crée un projet (`woltar`) si tu n'en as pas.
2. **APIs & Services → OAuth consent screen** :
   - User type : **External** → Create
   - App name : `Woltar Archives`
   - User support email : ton e-mail
   - Developer contact : ton e-mail
   - Save and continue jusqu'au bout (pas besoin de scopes particuliers).
   - **Publishing status** : reste en « Testing », et dans **Test users** ajoute
     `defosse.marion@gmail.com`. (Ça suffit largement pour un usage perso.)
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** :
   - Application type : **Web application**
   - Name : `woltar-supabase`
   - **Authorized redirect URIs** → Add URI :
     colle l'URL que Supabase te donne à l'étape 4b (elle ressemble à
     `https://abcdefgh.supabase.co/auth/v1/callback`).
   - Create → note le **Client ID** et le **Client secret**.

### 4b. Côté Supabase

1. Menu de gauche → **Authentication → Sign In / Providers → Google**.
2. Active **Enable Sign in with Google**.
3. Colle le **Client ID** et le **Client Secret** de l'étape 4a.
4. Copie l'URL **Callback URL (for OAuth)** affichée ici → retourne à l'étape 4a
   la coller dans « Authorized redirect URIs » si ce n'est pas déjà fait. Save.
5. **Authentication → URL Configuration** :
   - **Site URL** : pour l'instant `http://localhost:5173` (on mettra l'URL Vercel après).
   - **Redirect URLs** : ajoute `http://localhost:5173/**` et (plus tard) `https://<ton-site>.vercel.app/**`.

> Rien à me donner ici — dis-moi juste « Google activé » quand c'est fait.

## 5. Déployer sur Vercel  *(~5 min)*

Prérequis : le code doit être sur GitHub.

1. Si le dépôt n'est pas encore sur GitHub : dis-le moi, je te guide pour le pousser.
2. https://vercel.com → **Add New → Project** → importe le dépôt `woltar`.
3. Framework Preset : **Vite** (détecté automatiquement). Laisse le reste par défaut.
4. **Deploy**. Tu obtiens une URL `https://woltar-xxxx.vercel.app`.
5. **→ donne-moi cette URL.**

## 6. Brancher les clés sur Vercel  *(~2 min)*

1. Projet Vercel → **Settings → Environment Variables**. Ajoute :
   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | l'URL de l'étape 3 |
   | `VITE_SUPABASE_ANON_KEY` | la clé `anon` de l'étape 3 |
2. Onglet **Deployments** → menu `...` du dernier déploiement → **Redeploy**.
3. Retourne dans Supabase → **Authentication → URL Configuration** → mets la **Site URL**
   sur ton URL Vercel, et garde les deux `Redirect URLs`.

## 7. Migrer les données existantes  *(je le lance, tu me donnes juste une clé)*

1. Supabase → **Project Settings → API → `service_role` `secret`** → révèle-la.
2. **→ donne-moi cette clé en message privé dans la conversation** (elle est très
   sensible : elle contourne toutes les protections. Je la mets dans un fichier
   `.env.migrate` **non versionné**, je lance `npm run migrate`, puis on peut la
   régénérer côté Supabase pour l'invalider).
3. Résultat attendu : tes 7 personnages, 6 lieux et le clan Nakamura apparaissent
   dans Supabase → **Table Editor**.

---

## Ce qu'il se passe ensuite (moi)

- Le site lit depuis Supabase (avec repli sur les données statiques si la base est injoignable).
- Page `/admin` : liste + formulaires créer / modifier / supprimer pour personnages,
  lieux, relations, clans, événements, archives + upload d'images.
- Bouton **Connexion** discret en pied de page → écran Google → `/admin`.
- Verrouillage : lecture publique, écriture uniquement pour `defosse.marion@gmail.com`
  (imposé par la base, pas seulement par l'interface).

## Récap des valeurs à me transmettre

| Étape | Valeur | Sensibilité |
|---|---|---|
| 3 | Project URL | publique |
| 3 | clé `anon` / `public` | publique |
| 4b | « Google activé » | — |
| 5 | URL Vercel | publique |
| 7 | clé `service_role` | 🔴 secrète — régénérable après migration |
