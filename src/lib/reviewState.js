// src/lib/reviewState.js
//
// État de relecture d'une fiche de compte, tel que renvoyé par le Worker
// (`reviewStatus`). Affichage uniquement : c'est le serveur qui décide de ce
// qu'on peut modifier, envoyer ou publier.

export const REVIEW_STATE_LABEL = {
  draft: 'Brouillon',
  pending: 'En attente',
  published: 'Publiée',
  needs: 'À corriger',
  hidden: 'Refusée',
}

// Ton de la pastille : jamais la couleur seule, le libellé est toujours écrit.
export const REVIEW_STATE_TONE = {
  draft: 'muted',
  pending: 'wait',
  published: 'ok',
  needs: 'warn',
  hidden: 'warn',
}

export function reviewStateOf(row) {
  switch (row?.reviewStatus) {
    case 'pending': return 'pending'
    case 'needs_changes': return 'needs'
    case 'hidden': return 'hidden'
    case 'draft': return 'draft'
    default:
      // Publiée côté relecture, ou pas d'info (serveur de dev local) : c'est
      // `visibility` qui dit si la fiche est un brouillon.
      return row?.visibility === 'draft' ? 'draft' : 'published'
  }
}
