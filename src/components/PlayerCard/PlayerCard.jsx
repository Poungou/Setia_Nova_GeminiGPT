// src/components/PlayerCard/PlayerCard.jsx
//
// Carte "annuaire" pour /joueurs — composition centrée (avatar → pseudo →
// accroche → badges → personnages rattachés → CTA), alignée sur la maquette
// fournie. Ne lit que les données déjà exposées par /__public/api/players
// (voir worker/lib/playerProfiles.js#listPublicPlayerProfiles) — aucune
// donnée inventée, aucun nouveau champ ajouté au profil.
import { Link } from 'react-router-dom'
import { PenLine, Globe, Clock, ShieldAlert, ArrowRight } from 'lucide-react'
import { imgSrc } from '../../lib/image.js'
import './PlayerCard.css'

// Les 4 seuls champs "courts" du profil RP servent de badges synthétiques —
// un badge n'apparaît que si le champ est réellement rempli (règle §35 du
// cahier des charges du site : ne jamais laisser croire qu'une info existe
// si elle est vide). Une icône par catégorie (constante, pas par contenu :
// on n'invente pas une icône "qui correspondrait" au texte libre du champ).
const BADGE_FIELDS = [
  ['writing_style', 'Style RP', PenLine],
  ['univers', 'Univers', Globe],
  ['rhythm', 'Rythme', Clock],
  ['tw', 'TW', ShieldAlert],
]

export function playerBadges(profile) {
  return BADGE_FIELDS.filter(([field]) => profile?.[field]).map(([field, label, Icon]) => ({ field, label, Icon, value: profile[field] }))
}

export function PlayerAvatar({ player, size = 'md' }) {
  const src = imgSrc(player.profile?.avatar)
  return (
    <span className={`players-avatar players-avatar--${size}`}>
      {src ? <img src={src} alt="" loading="lazy" /> : (player.name?.[0] || '?').toUpperCase()}
    </span>
  )
}

export default function PlayerCard({ player, characters = [] }) {
  const badges = playerBadges(player.profile)
  const shown = characters.slice(0, 5)
  const extra = characters.length - shown.length

  return (
    <Link to={`/joueurs/${encodeURIComponent(player.userId)}`} className="players-card">
      <PlayerAvatar player={player} size="md" />
      <h2 className="players-card__name">#{player.name}</h2>

      {player.profile?.player_intro && <p className="players-card__intro">« {player.profile.player_intro} »</p>}

      {badges.length > 0 && (
        <div className="players-card__badges">
          {badges.map(({ field, label, Icon }) => (
            <span key={field} className="badge">
              <Icon size={12} aria-hidden="true" />
              {label}
            </span>
          ))}
        </div>
      )}

      <span className="players-card__count">
        {characters.length} personnage{characters.length > 1 ? 's' : ''} rattaché{characters.length > 1 ? 's' : ''}
      </span>

      {characters.length > 0 && (
        <div className="players-card__characters" aria-hidden="true">
          {shown.map((character) => (
            <span key={character.id} className="players-card__mini-portrait">
              {imgSrc(character.portrait) ? (
                <img src={imgSrc(character.portrait)} alt="" loading="lazy" />
              ) : (
                <span>{(character.firstName?.[0] || '') + (character.lastName?.[0] || '')}</span>
              )}
            </span>
          ))}
          {extra > 0 && <span className="players-card__mini-portrait players-card__mini-portrait--more">+{extra}</span>}
        </div>
      )}

      <span className="players-card__cta">
        Voir le profil <ArrowRight size={14} aria-hidden="true" />
      </span>
    </Link>
  )
}
