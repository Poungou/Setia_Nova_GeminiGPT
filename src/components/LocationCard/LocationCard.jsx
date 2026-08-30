import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { imgSrc, imgFocus } from '../../lib/image.js'
import './LocationCard.css'

const MotionLink = motion(Link)
const EASE = [0.22, 1, 0.36, 1]

export default function LocationCard({ location, index = 0 }) {
  const reduce = useReducedMotion()

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
    <MotionLink to={`/lieux/${location.id}`} className="location-card" {...motionProps}>
      <div className="location-card__media">
        {imgSrc(location.image) ? (
          <img
            src={imgSrc(location.image)}
            alt={location.name}
            loading="lazy"
            style={{ objectPosition: imgFocus(location.image) }}
          />
        ) : (
          <span className="location-card__glyph" aria-hidden="true" />
        )}
      </div>
      <div className="location-card__body">
        {location.type && <span className="eyebrow">{location.type}</span>}
        <h3>{location.name}</h3>
        <p>{location.shortDescription || <span className="dash">—</span>}</p>
      </div>
    </MotionLink>
  )
}
