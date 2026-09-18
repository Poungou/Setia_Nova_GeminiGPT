import { Link } from 'react-router-dom'
import { ArrowUpRight, Sparkles, BookOpen, Feather } from 'lucide-react'
import { usePublicCharacterOwners, usePublicCharacters, usePublicLocations } from '../../lib/publicData.js'
import CharacterCarousel from '../../components/CharacterCarousel/CharacterCarousel.jsx'
import LocationCard from '../../components/LocationCard/LocationCard.jsx'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import Reveal from '../../components/Reveal/Reveal.jsx'
import useHomeSettings from '../../lib/useHomeSettings.js'
import SafeImage from '../../components/SafeImage/SafeImage.jsx'
import './Home.css'

export default function Home() {
  const homeConfig = useHomeSettings()
  const characters = usePublicCharacters()
  const characterOwners = usePublicCharacterOwners()
  const locations = usePublicLocations()
  const featuredLocations = locations.filter(location => location.canon === 'confirmed')
  const titleWords = homeConfig.title.trim().split(/\s+/)
  const titleLead = titleWords.slice(0, -1).join(' ')
  const titleAccent = titleWords.at(-1) || ''
  return (
    <PageTransition>
      <div id="top" className="home-page container">
        <section className="home-intro" aria-labelledby="home-title">
          <Reveal className="home-intro__copy">
            <span className="eyebrow">{homeConfig.eyebrow}</span>
            <h1 id="home-title" className="section-title"><span>{titleLead}{titleLead ? ' ' : ''}</span><em>{titleAccent}</em></h1>
            <p className="home-intro__subtitle">{homeConfig.subtitle}</p>
            <div className="home-intro__actions">
              <Link to={homeConfig.primaryCtaUrl || '/personnages'} className="btn btn-primary">{homeConfig.primaryCtaLabel}<ArrowUpRight size={16} aria-hidden="true" /></Link>
              <Link to={homeConfig.secondaryCtaUrl || '/univers'} className="home-text-link">{homeConfig.secondaryCtaLabel}<ArrowUpRight size={16} aria-hidden="true" /></Link>
            </div>
            {homeConfig.communityNote && <p className="home-intro__note">{homeConfig.communityNote}</p>}
          </Reveal>
          <Reveal className="home-window">
            <div className="home-window__scene" aria-hidden="true"><SafeImage src={homeConfig.windowImage} alt="" fallback="" /><span>{homeConfig.windowTitle}</span><Sparkles size={26} /></div>
            <div className="home-window__caption"><span className="eyebrow">{homeConfig.windowEyebrow}</span><p>« {homeConfig.intro} »</p><Link className="home-text-link" to={homeConfig.playersUrl}>{homeConfig.playersLabel}<ArrowUpRight size={16} aria-hidden="true" /></Link></div>
          </Reveal>
        </section>
        <dl className="home-numbers">
          <div><dd>{String(characters.length).padStart(2, '0')}</dd><dt>{homeConfig.charactersStat}</dt></div>
          <div><dd>{String(locations.length).padStart(2, '0')}</dd><dt>{homeConfig.locationsStat}</dt></div>
          <div><dd>∞</dd><dt>{homeConfig.storiesStat}</dt></div>
        </dl>
        <section className="home-paths" aria-label="Entrer dans les récits">
          <Link className="home-path" to={homeConfig.cultureCtaUrl}><span className="home-path__top"><span>{homeConfig.cultureEyebrow}</span><Feather size={20} aria-hidden="true" /></span><h2>{homeConfig.cultureTitle}</h2><p>{homeConfig.cultureDescription}</p><span className="home-path__bottom">{homeConfig.cultureCtaLabel}<ArrowUpRight size={18} aria-hidden="true" /></span></Link>
          {homeConfig.journalCtaLabel && <Link className="home-path" to={homeConfig.journalCtaUrl || '/journal'}><span className="home-path__top"><span>{homeConfig.journalEyebrow}</span><BookOpen size={20} aria-hidden="true" /></span><h2>{homeConfig.journalTitle}</h2><p>{homeConfig.journalDescription}</p><span className="home-path__bottom">{homeConfig.journalCtaLabel}<ArrowUpRight size={18} aria-hidden="true" /></span></Link>}
          <Link className="home-path" to={homeConfig.aetherCtaUrl || '/aether'}><span className="home-path__top"><span>{homeConfig.aetherEyebrow}</span><Sparkles size={20} aria-hidden="true" /></span><h2>{homeConfig.aetherTitle}</h2><p>{homeConfig.aetherDescription}</p><span className="home-path__bottom">{homeConfig.aetherCtaLabel}<ArrowUpRight size={18} aria-hidden="true" /></span></Link>
        </section>
        <section className="home-section" aria-labelledby="home-characters">
          <Reveal className="home-heading"><div><span className="eyebrow">{homeConfig.charactersEyebrow}</span><h2 id="home-characters">{homeConfig.charactersTitle}</h2></div><Link className="home-text-link" to="/personnages">{homeConfig.charactersLinkLabel}<ArrowUpRight size={16} aria-hidden="true" /></Link></Reveal>
          <CharacterCarousel characters={characters} owners={characterOwners} />
        </section>
        {featuredLocations.length > 0 && <section className="home-section" aria-labelledby="home-locations">
          <Reveal className="home-heading"><div><span className="eyebrow">{homeConfig.locationsEyebrow}</span><h2 id="home-locations">{homeConfig.locationsTitle}</h2></div><Link className="home-text-link" to="/univers">{homeConfig.locationsLinkLabel}<ArrowUpRight size={16} aria-hidden="true" /></Link></Reveal>
          <div className="home-grid">{featuredLocations.map((location, index) => <LocationCard key={location.id} location={location} index={index} />)}</div>
        </section>}
      </div>
    </PageTransition>
  )
}
