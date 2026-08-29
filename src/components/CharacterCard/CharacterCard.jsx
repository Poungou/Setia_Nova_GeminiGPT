import { Link } from 'react-router-dom'
import './CharacterCard.css'

function getInitials(character) {
  const f = character.firstName?.[0] || ''
  const l = character.lastName?.[0] || ''
  return (f + l).toUpperCase()
}

export default function CharacterCard({ character }) {
  const fullName = [character.firstName, character.lastName].filter(Boolean).join(' ')

  return (
    <Link to={`/personnages/${character.id}`} className="character-card">
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
    </Link>
  )
}
