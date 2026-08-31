import { isPersonaEnabled } from '../../data/personas.js'
import './PersonaBlock.css'

// Bloc compact et secondaire présentant le « Woltarien IA » d'une fiche
// personnage, si une Persona existe pour elle. Ne lit jamais les champs
// privés d'une Persona (personnalité, secrets, limites RP, instructions…) —
// uniquement `enabled`, déjà exposé publiquement (voir
// worker/lib/publicStore.js, PUBLIC_PERSONA_FIELDS).
//
// - Aucune Persona pour ce personnage -> le bloc ne s'affiche pas du tout
//   (pas de grand bloc vide pour rien).
// - Persona désactivée -> statut "Inactif".
// - Persona activée -> statut "Actif".
// Volontairement PAS de bouton ici : un seul CTA de discussion existe sur la
// fiche, le bouton « Parler avec [Nom] » du hero — ce bloc reste
// statut + description seulement, pour éviter le doublon de CTA.
export default function PersonaBlock({ persona, character }) {
  if (!persona) return null

  const active = isPersonaEnabled(persona)
  const firstName = character?.firstName || 'ce personnage'

  return (
    <div className="persona-block">
      <div className="persona-block__head">
        <span className="eyebrow">Woltarien IA</span>
        <span className={`persona-block__status ${active ? 'is-active' : 'is-inactive'}`}>
          {active ? 'Actif' : 'Inactif'}
        </span>
      </div>
      <p className="persona-block__text">
        {active
          ? `Une interprétation RP de ${firstName} est disponible (voir le bouton « Parler avec ${firstName} » en haut de la fiche). Les échanges restent une improvisation encadrée, jamais du canon.`
          : `Aucune interprétation IA active pour ${firstName} pour le moment.`}
      </p>
    </div>
  )
}
