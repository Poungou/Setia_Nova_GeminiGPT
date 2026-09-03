import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { imgSrc, imgFocus, imgCredit } from '../../lib/image.js'
import { resolveFrameColor, getFrameMeta } from '../../lib/frames.js'
import PixelFrame from '../PixelIcons/PixelFrame.jsx'
import PixelHeart from '../PixelIcons/PixelHeart.jsx'
import PixelPaopu from '../PixelIcons/PixelPaopu.jsx'
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
  const frameColor = resolveFrameColor(character)
  const frameMeta = getFrameMeta(frameColor)
  const imageSource = imgCredit(character.portrait, character.image_source)

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
        <span className="character-card__number">{character.number}</span>
        <PixelHeart color={character.color} size={17} className="character-card__heart" title={`Couleur de ${character.firstName || 'ce personnage'}`} />

        <span className="character-card__disc-wrap">
          <span
            className="character-card__disc"
            style={{
              inset: `${frameMeta.inset.top}% ${frameMeta.inset.right}% ${frameMeta.inset.bottom}% ${frameMeta.inset.left}%`,
            }}
          >
            {imgSrc(character.portrait) ? (
              <img
                src={imgSrc(character.portrait)}
                alt={fullName}
                loading="lazy"
                style={{ objectPosition: imgFocus(character.portrait) }}
              />
            ) : (
              <span className="character-card__initials">{getInitials(character)}</span>
            )}
          </span>
          <PixelFrame frameColor={frameColor} className="character-card__frame" />
        </span>
      </div>
      {imgSrc(character.portrait) && imageSource && <p className="character-card__source">Source : {imageSource}</p>}

      <div className="character-card__body">
        {character.clan && <span className="character-card__clan eyebrow">Clan {character.clan}</span>}
        <h3 className="character-card__name">{fullName}</h3>
        <p className="character-card__title">{character.title}</p>
        {character.shortDescription && <p className="character-card__summary">{character.shortDescription}</p>}
        <span className="character-card__cta">
          Voir la fiche <PixelPaopu size={18} />
        </span>
      </div>
    </MotionLink>
  )
}
