import { Link } from 'react-router-dom'
import { ArrowUpRight, Sparkles, BookOpen, Feather } from 'lucide-react'
import { usePublicCharacterOwners, usePublicCharacters, usePublicLocations } from '../../lib/publicData.js'
import CharacterCarousel from '../../components/CharacterCarousel/CharacterCarousel.jsx'
import LocationCard from '../../components/LocationCard/LocationCard.jsx'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import Reveal from '../../components/Reveal/Reveal.jsx'
import homeData from '../../data/home.json'
import './Home.css'

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


export default function Home() {
  const characters = usePublicCharacters()
  const characterOwners = usePublicCharacterOwners()
  const locations = usePublicLocations()
  const featuredLocations = locations.filter(location => location.canon === 'confirmed')
  return (
    <PageTransition>
      <div id="top" className="home-page container">
        <section className="home-intro" aria-labelledby="home-title">
          <Reveal className="home-intro__copy">
            <span className="eyebrow">{homeConfig.eyebrow}</span>
            <h1 id="home-title">{homeConfig.title}</h1>
            <p className="home-intro__subtitle">{homeConfig.subtitle}</p>
            <div className="home-intro__actions">
              <Link to={homeConfig.primaryCtaUrl || '/personnages'} className="btn btn-primary">{homeConfig.primaryCtaLabel}<ArrowUpRight size={16} aria-hidden="true" /></Link>
              <Link to={homeConfig.secondaryCtaUrl || '/univers'} className="home-text-link">{homeConfig.secondaryCtaLabel}<ArrowUpRight size={16} aria-hidden="true" /></Link>
            </div>
            {homeConfig.communityNote && <p className="home-intro__note">{homeConfig.communityNote}</p>}
          </Reveal>
          <Reveal className="home-window">
            <div className="home-window__scene" aria-hidden="true"><span>Woltar Nova</span><Sparkles size={26} /></div>
            <div className="home-window__caption"><span className="eyebrow">Un univers, mille histoires</span><p>« {homeConfig.intro} »</p><Link className="home-text-link" to="/joueurs">Rencontrer les joueurs<ArrowUpRight size={16} aria-hidden="true" /></Link></div>
          </Reveal>
        </section>
        <dl className="home-numbers">
          <div><dd>{String(characters.length).padStart(2, '0')}</dd><dt>Personnages à découvrir</dt></div>
          <div><dd>{String(locations.length).padStart(2, '0')}</dd><dt>Lieux à explorer</dt></div>
          <div><dd>∞</dd><dt>Histoires à écrire</dt></div>
        </dl>
        <section className="home-paths" aria-label="Entrer dans les récits">
          <Link className="home-path" to="/culture"><span className="home-path__top"><span>01 / TRANSMETTRE</span><Feather size={20} aria-hidden="true" /></span><h2>Les cultures vivantes</h2><p>Coutumes, croyances et petits rituels : découvrez ce que chacun fait vivre dans son univers.</p><span className="home-path__bottom">Découvrir les cultures<ArrowUpRight size={18} aria-hidden="true" /></span></Link>
          {homeConfig.journalCtaLabel && <Link className="home-path" to={homeConfig.journalCtaUrl || '/journal'}><span className="home-path__top"><span>02 / FEUILLETER</span><BookOpen size={20} aria-hidden="true" /></span><h2>Au fil des récits</h2><p>Des nouvelles, des instants partagés et les traces laissées par les histoires.</p><span className="home-path__bottom">{homeConfig.journalCtaLabel}<ArrowUpRight size={18} aria-hidden="true" /></span></Link>}
          <Link className="home-path" to={homeConfig.aetherCtaUrl || '/aether'}><span className="home-path__top"><span>03 / S’INSPIRER</span><Sparkles size={20} aria-hidden="true" /></span><h2>Une rencontre avec Aether</h2><p>Une présence pour échanger et laisser naître de nouvelles idées.</p><span className="home-path__bottom">{homeConfig.aetherCtaLabel}<ArrowUpRight size={18} aria-hidden="true" /></span></Link>
        </section>
        <section className="home-section" aria-labelledby="home-characters">
          <Reveal className="home-heading"><div><span className="eyebrow">Les visages derrière les histoires</span><h2 id="home-characters">Visages de Woltar</h2></div><Link className="home-text-link" to="/personnages">Tous les personnages<ArrowUpRight size={16} aria-hidden="true" /></Link></Reveal>
          <CharacterCarousel characters={characters} owners={characterOwners} />
        </section>
        {featuredLocations.length > 0 && <section className="home-section" aria-labelledby="home-locations">
          <Reveal className="home-heading"><div><span className="eyebrow">D’un lieu à l’autre</span><h2 id="home-locations">Les lieux de Woltar Nova</h2></div><Link className="home-text-link" to="/univers">Explorer l’univers<ArrowUpRight size={16} aria-hidden="true" /></Link></Reveal>
          <div className="home-grid">{featuredLocations.map((location, index) => <LocationCard key={location.id} location={location} index={index} />)}</div>
        </section>}
      </div>
    </PageTransition>
  )
}
