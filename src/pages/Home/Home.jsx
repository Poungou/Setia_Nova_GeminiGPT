import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { locations } from '../../data/locations.js'
import { getSiteStats } from '../../utils/stats.js'
import aetherData from '../../data/aether.json'
import { imgSrc, imgFocus } from '../../lib/image.js'
import { usePublicCharacterOwners, usePublicCharacters } from '../../lib/publicData.js'
import CharacterCarousel from '../../components/CharacterCarousel/CharacterCarousel.jsx'
import LocationCard from '../../components/LocationCard/LocationCard.jsx'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import Reveal from '../../components/Reveal/Reveal.jsx'
import homeData from '../../data/home.json'
import './Home.css'

const aetherConfig = aetherData[0] || null
const DEFAULT_HOME = {
  eyebrow: 'Woltar Nova · vitrine RP communautaire',
  title: 'Bienvenue sur Woltar Nova.',
  subtitle: 'Explore les visages, les liens et les lieux qui donnent vie aux récits de Woltar Nova, à ton rythme.',
  communityNote:
    'Woltar Nova n’est pas le site officiel de Woltar : c’est une vitrine communautaire où chaque joueuse et joueur présente ses propres personnages, son univers et ses histoires.',
  intro: 'Ici, les histoires prennent le temps de respirer.',
  primaryCtaLabel: 'Découvrir les personnages',
  primaryCtaUrl: '/personnages',
  secondaryCtaLabel: 'Explorer l’univers',
  secondaryCtaUrl: '/univers',
  journalCtaLabel: 'Lire le Journal',
  journalCtaUrl: '/journal',
  aetherCtaLabel: 'Parler à Aether',
  aetherCtaUrl: '/aether',
}
const homeConfig = { ...DEFAULT_HOME, ...(homeData[0] || {}) }

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
  const characters = usePublicCharacters()
  const characterOwners = usePublicCharacterOwners()
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
              {homeConfig.eyebrow}
            </motion.span>
            <motion.h1 className="hero__title" {...itemMotion}>
              {homeConfig.title}
            </motion.h1>
            <motion.p className="hero__subtitle" {...itemMotion}>
              {homeConfig.subtitle}
            </motion.p>
            {homeConfig.communityNote && (
              <motion.p className="hero__community-note" {...itemMotion}>
                {homeConfig.communityNote}
              </motion.p>
            )}
            <motion.div className="hero__actions" {...itemMotion}>
              <Link to={homeConfig.primaryCtaUrl || '/personnages'} className="btn btn-primary">
                {homeConfig.primaryCtaLabel}
              </Link>
              <Link to={homeConfig.secondaryCtaUrl || '/univers'} className="btn">
                {homeConfig.secondaryCtaLabel}
              </Link>
              {homeConfig.journalCtaLabel && (
                <Link to={homeConfig.journalCtaUrl || '/journal'} className="btn">
                  {homeConfig.journalCtaLabel}
                </Link>
              )}
              <Link to={homeConfig.aetherCtaUrl || '/aether'} className="hero__aether-cta">
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
                {homeConfig.aetherCtaLabel}
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

            <motion.div {...itemMotion}>
              <Link to="/personnages#players-title" className="hero__players-link">
                Voir les joueurs de Woltar Nova →
              </Link>
            </motion.div>
          </motion.div>
        </section>

        <Reveal as="section" className="container home-quote">
          <p>« {homeConfig.intro} »</p>
        </Reveal>

        <section className="container home-section">
          <Reveal className="section-heading">
            <span className="eyebrow">Galerie</span>
            <h2 className="section-title">Visages de Woltar</h2>
          </Reveal>
          <CharacterCarousel characters={characters} owners={characterOwners} />
          <Link to="/personnages" className="btn home-section__more">
            Voir tous les personnages →
          </Link>
        </section>

        <section className="container home-section">
          <Reveal className="section-heading">
            <span className="eyebrow">Coins à explorer</span>
            <h2 className="section-title">Les lieux de Woltar Nova</h2>
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
