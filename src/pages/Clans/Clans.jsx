import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { clans } from '../../data/clans.js'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import Reveal from '../../components/Reveal/Reveal.jsx'
import '../Universe/Universe.css'

const MotionLink = motion(Link)

export default function Clans() {
  const reduce = useReducedMotion()
  const motionProps = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-40px' },
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
        whileHover: { y: -4 },
      }

  return (
    <PageTransition>
      <section className="container universe-page">
        <Reveal className="section-heading">
          <span className="eyebrow">Sociétés</span>
          <h1 className="section-title">Clans de Woltar</h1>
        </Reveal>
        <div className="universe-grid">
          {clans.map((clan) => (
            <MotionLink key={clan.id} to={`/clans/${clan.id}`} className="universe-card" {...motionProps}>
              <h2>{clan.name}</h2>
              <p>{clan.description || '—'}</p>
            </MotionLink>
          ))}
        </div>
      </section>
    </PageTransition>
  )
}
