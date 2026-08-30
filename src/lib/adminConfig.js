// src/lib/adminConfig.js
//
// Adresse(s) e-mail autorisée(s) à accéder à /admin.
// DOIT rester synchronisé avec la fonction is_admin() de supabase/schema.sql
// (c'est la base de données qui fait respecter la règle ; ceci ne sert qu'à
// l'affichage côté interface).

export const ADMIN_EMAILS = ['defosse.marion@gmail.com']

export function isAdminEmail(email) {
  if (!email) return false
  return ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase())
}
