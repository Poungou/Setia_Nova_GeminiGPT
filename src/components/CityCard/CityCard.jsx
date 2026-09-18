// src/components/CityCard/CityCard.jsx
//
// Grande carte "ville" pour la page Lieux — plus spectaculaire qu'une
// LocationCard classique, avec un grand numéro, un glyphe/portrait et un
// compteur de lieux internes (cf. les badges de la Galerie pour l'esprit).
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { imgSrc, imgFocus } from '../../lib/image.js'
import SafeImage from '../SafeImage/SafeImage.jsx'
import './CityCard.css'

const MotionLink = motion(Link)
const EASE = [0.22, 1, 0.36, 1]

export default function CityCard({ city, index = 0, childrenCount = 0 }) {
  const reduce = useReducedMotion()
  const isDraft = city.canon !== 'confirmed'
  const initials = (city.name || '').replace(/[^\p{L}]/gu, '').slice(0, 2).toUpperCase()

  const motionProps = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 24 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-40px' },
        transition: { duration: 0.5, delay: Math.min(index * 0.08, 0.4), ease: EASE },
        whileHover: { y: -6 },
      }

  return (
    <MotionLink
      to={`/lieux/${city.id}`}
      className={`city-card${isDraft ? ' city-card--draft' : ''}`}
      aria-label={`${city.name}${city.type ? ` — ${city.type}` : ''}`}
      {...motionProps}
    >
      <span className="city-card__number">{String(index + 1).padStart(2, '0')}</span>
      <div className="city-card__media">
        {imgSrc(city.image) ? (
          <SafeImage
            fallback={<span className="city-card__glyph" aria-hidden="true">{initials}</span>}
            src={imgSrc(city.image)}
            alt={city.name}
            loading="lazy"
            style={{ objectPosition: imgFocus(city.image) }}
          />
        ) : (
          <span className="city-card__glyph" aria-hidden="true">{initials}</span>
        )}
      </div>
      <div className="city-card__body">
        {city.type && <span className="eyebrow">{city.type}</span>}
        <h3>{city.name}</h3>
        {isDraft ? (
          <p className="city-card__status">{city.status || 'À explorer'}</p>
        ) : (
          <p>{city.shortDescription || <span className="dash">—</span>}</p>
        )}
        {childrenCount > 0 && (
          <span className="city-card__count">{childrenCount} lieu{childrenCount > 1 ? 'x' : ''} à découvrir →</span>
        )}
      </div>
    </MotionLink>
  )
}
