// worker/lib/mailer.js
//
// Envoi d'e-mails transactionnels (reset mot de passe, confirmation email)
// via l'API HTTP de Resend (https://resend.com) — compatible Workers (appel
// fetch direct, pas de SDK Node). Nécessite le secret Wrangler
// RESEND_API_KEY (jamais commité, jamais loggé) :
//
//   wrangler secret put RESEND_API_KEY
//
// Sans ce secret configuré, l'envoi est journalisé comme "non envoyé" côté
// serveur et la route appelante répond quand même normalement (réponse
// neutre côté interface — voir worker/routes/auth.js) : la propriétaire
// doit ajouter le secret pour que les emails partent réellement en
// production. `MAIL_FROM` (vars, optionnel) permet de personnaliser
// l'expéditeur ; sinon une adresse de test Resend est utilisée.
//
// Rappel sécurité : ne JAMAIS logger le contenu d'un email (il porte des
// liens à usage unique) — seul le statut d'envoi (ok/échec + code HTTP) est
// journalisé.

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

export async function sendMail(env, { to, subject, html, text }) {
  const apiKey = env.RESEND_API_KEY
  const from = env.MAIL_FROM || 'Nova-Setia <onboarding@resend.dev>'

  if (!apiKey) {
    console.warn('[mailer] RESEND_API_KEY absent — email non envoyé (mode dégradé).')
    return { sent: false }
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html, text }),
    })
    if (!res.ok) {
      console.error('[mailer] échec envoi', res.status)
      return { sent: false }
    }
    return { sent: true }
  } catch (err) {
    console.error('[mailer] erreur réseau', err?.message || err)
    return { sent: false }
  }
}

export function passwordResetEmail(link) {
  return {
    subject: 'Réinitialisation de ton mot de passe — Nova-Setia',
    html: `<p>Tu as demandé la réinitialisation du mot de passe de ton compte Nova-Setia.</p><p><a href="${link}">Choisir un nouveau mot de passe</a></p><p>Ce lien est valable 30 minutes et ne fonctionne qu'une seule fois. Si tu n'es pas à l'origine de cette demande, tu peux ignorer cet email — ton mot de passe reste inchangé.</p>`,
    text: `Réinitialise ton mot de passe : ${link}\n\nCe lien est valable 30 minutes et ne fonctionne qu'une seule fois. Si tu n'es pas à l'origine de cette demande, ignore cet email — ton mot de passe reste inchangé.`,
  }
}

export function emailChangeEmail(link) {
  return {
    subject: 'Confirme ta nouvelle adresse — Nova-Setia',
    html: `<p>Une demande de changement d'adresse email a été faite sur ton compte Nova-Setia.</p><p><a href="${link}">Confirmer cette nouvelle adresse</a></p><p>Ce lien est valable 60 minutes et ne fonctionne qu'une seule fois. Si tu n'es pas à l'origine de cette demande, ignore cet email — ton adresse actuelle reste inchangée.</p>`,
    text: `Confirme ta nouvelle adresse : ${link}\n\nCe lien est valable 60 minutes et ne fonctionne qu'une seule fois. Si tu n'es pas à l'origine de cette demande, ignore cet email — ton adresse actuelle reste inchangée.`,
  }
}
