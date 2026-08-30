import { Link } from 'react-router-dom'
import { imgSrc, imgFocus } from '../../lib/image.js'
import './RelationCard.css'

function getInitials(character) {
  const f = character.firstName?.[0] || ''
  const l = character.lastName?.[0] || ''
  return (f + l).toUpperCase()
}

export default function RelationCard({ relation }) {
  const { character, type } = relation
  if (!character) return null
  const fullName = [character.firstName, character.lastName].filter(Boolean).join(' ')

  return (
    <Link to={`/personnages/${character.id}`} className="relation-card">
      <div className="relation-card__portrait">
        {imgSrc(character.portrait) ? (
          <img
            src={imgSrc(character.portrait)}
            alt={fullName}
            loading="lazy"
            style={{ objectPosition: imgFocus(character.portrait) }}
          />
        ) : (
          <span>{getInitials(character)}</span>
        )}
      </div>
      <div className="relation-card__body">
        <span className="relation-card__type eyebrow">{type}</span>
        <strong>{fullName}</strong>
      </div>
    </Link>
  )
}
