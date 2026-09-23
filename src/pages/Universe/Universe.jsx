import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import Reveal from '../../components/Reveal/Reveal.jsx'
import './Universe.css'

const MotionLink = motion(Link)
const EASE = [0.22, 1, 0.36, 1]

// Deux fils rouges vivants, mis en avant.
const FEATURED = [
  {
    title: 'Clan Nakamura',
    text: "L'un des axes principaux de Woltar Nova.",
    to: '/clans/nakamura',
  },
  {
    title: 'Chronologie',
    text: 'Des repères pour situer les RP, les liens de famille et les grands tournants.',
    to: '/chronologie',
  },
]

// Deux cartes de référence, plus discrètes. Sétia n'est pas une catégorie à
// part : c'est le lieu vedette, épinglé en tête de « Lieux ».
const REFERENCE = [
  {
    title: 'Lieux',
    text: "Le Manoir de Sétia, Le Joyeux Lutin, le Palais des Astres, et d'autres endroits à étoffer tranquillement.",
    to: '/lieux',
    pin: 'Lieu vedette · Sétia',
  },
  {
    title: 'Culture',
    text: 'Coutumes, croyances et traditions : un carnet vivant, écrit par les joueurs. Partagez votre propre culture.',
    to: '/culture',
  },
]

function UniverseCard({ chapter, index, variant, reduce }) {
  const motionProps = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-40px' },
        transition: { duration: 0.5, delay: Math.min(index * 0.06, 0.3), ease: EASE },
        whileHover: { y: -4 },
      }

  return (
    <MotionLink
      to={chapter.to}
      className={`universe-card universe-card--${variant}`}
      {...motionProps}
    >
      {chapter.pin && <span className="universe-card__pin">{chapter.pin}</span>}
      <h2>{chapter.title}</h2>
      <p>{chapter.text}</p>
    </MotionLink>
  )
}

export default function Universe() {
  const reduce = useReducedMotion()

  return (
    <PageTransition>
      <section className="container universe-page">
        <Reveal className="section-heading">
          <span className="eyebrow">Repères</span>
          <h1 className="section-title">Autour de Woltar Nova</h1>
        </Reveal>

        <div className="universe-grid universe-grid--featured">
          {FEATURED.map((chapter, i) => (
            <UniverseCard key={chapter.title} chapter={chapter} index={i} variant="featured" reduce={reduce} />
          ))}
        </div>

        <div className="universe-grid universe-grid--reference">
          {REFERENCE.map((chapter, i) => (
            <UniverseCard key={chapter.title} chapter={chapter} index={i + FEATURED.length} variant="reference" reduce={reduce} />
          ))}
        </div>
      </section>
    </PageTransition>
  )
}
