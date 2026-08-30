import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import './CharacterCard.css'

const MotionLink = motion(Link)
const EASE = [0.22, 1, 0.36, 1]

function getInitials(character) {
  const f = character.firstName?.[0] || ''
  const l = character.lastName?.[0] || ''
  return (f + l).toUpperCase()
}

export default function CharacterCard({ character, index = 0 }) {
  const reduce = useReducedMotion()
  const fullName = [character.firstName, character.lastName].filter(Boolean).join(' ')

  const motionProps = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 24 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-40px' },
        transition: { duration: 0.5, delay: Math.min(index * 0.06, 0.42), ease: EASE },
        whileHover: { y: -6 },
      }

  return (
    <MotionLink to={`/personnages/${character.id}`} className="character-card" {...motionProps}>
      <div className="character-card__portrait">
        {character.portrait ? (
          <img src={character.portrait} alt={fullName} loading="lazy" />
        ) : (
          <span className="character-card__initials">{getInitials(character)}</span>
        )}
        <span className="character-card__number">{character.number}</span>
      </div>

      <div className="character-card__body">
        {character.clan && <span className="character-card__clan eyebrow">Clan {character.clan}</span>}
        <h3 className="character-card__name">{fullName}</h3>
        <p className="character-card__title">{character.title}</p>
        <span className="character-card__cta">Voir la fiche →</span>
      </div>
    </MotionLink>
  )
}
