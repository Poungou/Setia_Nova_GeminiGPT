import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import Reveal from '../../components/Reveal/Reveal.jsx'
import './Universe.css'

const MotionLink = motion(Link)
const EASE = [0.22, 1, 0.36, 1]

const CHAPTERS = [
  {
    title: 'Woltar',
    text: "Le monde d'origine des personnages. Les habitants sont appelés « woltarien » / « woltarienne » (pluriel employé en RP : « woltarions »).",
    to: null,
  },
  {
    title: 'Sétia',
    text: 'Un repère central pour cette vitrine RP personnelle.',
    to: '/lieux',
  },
  {
    title: 'Clan Nakamura',
    text: "L'un des axes principaux de Nova-Setia.",
    to: '/clans/nakamura',
  },
  {
    title: 'Lieux',
    text: "Manoir de Sétia, Le Joyeux Lutin, Palais des Astres, et d'autres endroits à étoffer tranquillement.",
    to: '/lieux',
  },
  {
    title: 'Chronologie',
    text: 'Des repères pour situer les RP, les liens de famille et les grands tournants.',
    to: '/chronologie',
  },
  {
    title: 'Culture',
    text: 'Coutumes, société, politique, magie, technologie : des notes à documenter progressivement.',
    to: null,
  },
]

export default function Universe() {
  const reduce = useReducedMotion()

  return (
    <PageTransition>
      <section className="container universe-page">
        <Reveal className="section-heading">
          <span className="eyebrow">Repères</span>
          <h1 className="section-title">Autour de Nova-Setia</h1>
        </Reveal>

        <div className="universe-grid">
          {CHAPTERS.map((chapter, i) => {
            const content = (
              <>
                <h2>{chapter.title}</h2>
                <p>{chapter.text}</p>
              </>
            )
            const motionProps = reduce
              ? {}
              : {
                  initial: { opacity: 0, y: 20 },
                  whileInView: { opacity: 1, y: 0 },
                  viewport: { once: true, margin: '-40px' },
                  transition: { duration: 0.5, delay: Math.min(i * 0.06, 0.3), ease: EASE },
                  whileHover: chapter.to ? { y: -4 } : undefined,
                }

            return chapter.to ? (
              <MotionLink
                key={chapter.title}
                to={chapter.to}
                className="universe-card"
                {...motionProps}
              >
                {content}
              </MotionLink>
            ) : (
              <motion.div
                key={chapter.title}
                className="universe-card universe-card--static"
                {...motionProps}
              >
                {content}
              </motion.div>
            )
          })}
        </div>
      </section>
    </PageTransition>
  )
}
