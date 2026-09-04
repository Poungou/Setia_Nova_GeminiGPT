// plugins/lib/mailer.js
//
// Équivalent dev de worker/lib/mailer.js : aucun envoi réel en local, le
// lien est simplement affiché dans le terminal du serveur Vite pour tester
// le flux sans compte email de test. passwordResetEmail/emailChangeEmail
// sont réutilisées telles quelles depuis la version Worker (fonctions pures,
// aucune API Cloudflare-only) pour ne pas dupliquer le texte des emails.

export { passwordResetEmail, emailChangeEmail } from '../../worker/lib/mailer.js'

export async function sendMail(root, { to, subject, text }) {
  console.log(`\n[mailer:dev] --- Email simulé ---\nÀ : ${to}\nSujet : ${subject}\n${text}\n---------------------\n`)
  return { sent: true }
}
