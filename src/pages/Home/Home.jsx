import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { characters } from '../../data/characters.js'
import { locations } from '../../data/locations.js'
import { getSiteStats } from '../../utils/stats.js'
import aetherData from '../../data/aether.json'
import { imgSrc, imgFocus } from '../../lib/image.js'
import CharacterCard from '../../components/CharacterCard/CharacterCard.jsx'
import LocationCard from '../../components/LocationCard/LocationCard.jsx'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import Reveal from '../../components/Reveal/Reveal.jsx'
import './Home.css'

const aetherConfig = aetherData[0] || null

const EASE = [0.22, 1, 0.36, 1]

const heroContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
}

const heroItem = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
}

export default function Home() {
  const stats = getSiteStats()
  const featuredCharacters = characters.slice(0, 4)
  const featuredLocations = locations.filter((l) => l.canon === 'confirmed')
  const reduce = useReducedMotion()

  const heroMotion = reduce
    ? {}
    : { variants: heroContainer, initial: 'hidden', animate: 'show' }
  const itemMotion = reduce ? {} : { variants: heroItem }

  return (
    <PageTransition>
      <div id="top">
        <section className="hero">
          <motion.div className="container hero__inner" {...heroMotion}>
            <motion.span className="eyebrow hero__eyebrow" {...itemMotion}>
              Woltar · Archives Vivantes
            </motion.span>
            <motion.h1 className="hero__title" {...itemMotion}>
              LES HISTOIRES
              <br />
              NE DISPARAISSENT JAMAIS.
            </motion.h1>
            <motion.p className="hero__subtitle" {...itemMotion}>
              Explore les visages, les liens et les lieux qui façonnent Woltar. Une vitrine
              vivante pour retrouver l&rsquo;essentiel de chaque récit.
            </motion.p>
            <motion.div className="hero__actions" {...itemMotion}>
              <Link to="/personnages" className="btn btn-primary">
                Découvrir le clan
              </Link>
              <Link to="/univers" className="btn">
                Ouvrir les archives
              </Link>
              <Link to="/aether" className="hero__aether-cta">
                <span className="hero__aether-avatar" aria-hidden="true">
                  {imgSrc(aetherConfig?.avatar) ? (
                    <img
                      src={imgSrc(aetherConfig?.avatar)}
                      alt=""
                      style={{ objectPosition: imgFocus(aetherConfig?.avatar) }}
                    />
                  ) : (
                    <span>A</span>
                  )}
                </span>
                Parler à Aether
              </Link>
            </motion.div>

            <motion.dl className="hero__stats" {...itemMotion}>
              <div>
                <dt>Personnages</dt>
                <dd>{String(stats.characterCount).padStart(2, '0')}+</dd>
              </div>
              <div>
                <dt>Lieux</dt>
                <dd>{String(stats.locationCount).padStart(2, '0')}+</dd>
              </div>
              <div>
                <dt>Histoires à écrire</dt>
                <dd>∞</dd>
              </div>
            </motion.dl>
          </motion.div>
        </section>

        <Reveal as="section" className="container home-quote">
          <p>
            « On ne naît pas légende.
            <br />
            On le devient en refusant de disparaître. »
          </p>
        </Reveal>

        <section className="container home-section">
          <Reveal className="section-heading">
            <span className="eyebrow">Galerie</span>
            <h2 className="section-title">Visages de Woltar</h2>
          </Reveal>
          <div className="home-grid">
            {featuredCharacters.map((c, i) => (
              <CharacterCard key={c.id} character={c} index={i} />
            ))}
          </div>
          <Link to="/personnages" className="btn home-section__more">
            Voir tous les personnages →
          </Link>
        </section>

        <section className="container home-section">
          <Reveal className="section-heading">
            <span className="eyebrow">Cartographie narrative</span>
            <h2 className="section-title">Les lieux de Woltar</h2>
          </Reveal>
          <div className="home-grid home-grid--locations">
            {featuredLocations.map((l, i) => (
              <LocationCard key={l.id} location={l} index={i} />
            ))}
          </div>
        </section>
      </div>
    </PageTransition>
  )
}
