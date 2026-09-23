import { ArrowUpRight, Network, History, MapPin, Feather } from 'lucide-react'
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
    title: 'Familles',
    icon: Network,
    pin: 'Famille vedette · Nakamura',
    text: 'Les familles qui structurent Woltar, leurs membres et les liens qui les unissent.',
    to: '/clans',
  },
  {
    title: 'Chronologie',
    icon: History,
    text: 'Des repères pour situer les RP, les liens de famille et les grands tournants.',
    to: '/chronologie',
  },
]

// Deux cartes de référence, plus discrètes. Sétia n'est pas une catégorie à
// part : c'est le lieu vedette, épinglé en tête de « Lieux ».
const REFERENCE = [
  {
    title: 'Lieux',
    icon: MapPin,
    text: "Le Manoir de Sétia, Le Joyeux Lutin, le Palais des Astres, et d'autres endroits à étoffer tranquillement.",
    to: '/lieux',
    pin: 'Lieu vedette · Sétia',
  },
  {
    title: 'Culture',
    icon: Feather,
    text: 'Coutumes, croyances et traditions : un carnet vivant, écrit par les joueurs. Partagez votre propre culture.',
    to: '/culture',
  },
]

function UniverseCard({ chapter, index, variant, reduce }) {
  const Icon = chapter.icon
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
      <div className="universe-card__chapter" aria-hidden="true"><Icon size={22} /><span>0{index + 1}</span></div>
      {chapter.pin && <span className="universe-card__pin">{chapter.pin}</span>}
      <h2>{chapter.title}</h2>
      <p>{chapter.text}</p>
      <span className="universe-card__explore">Explorer <ArrowUpRight size={16} aria-hidden="true" /></span>
    </MotionLink>
  )
}

export default function Universe() {
  const reduce = useReducedMotion()

  return (
    <PageTransition>
      <section className="container universe-page">
        <Reveal className="section-heading universe-heading">
          <span className="eyebrow">Un univers à plusieurs voix</span>
          <h1 className="section-title">Nos histoires,<br /><em>un même univers.</em></h1>
          <p>Familles, lieux, récits et cultures : explorez Woltar Nova au fil des créations de la communauté.</p>
          <span className="universe-heading__note"><Feather size={16} aria-hidden="true" /> Un monde qui s’écrit ensemble</span>
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
