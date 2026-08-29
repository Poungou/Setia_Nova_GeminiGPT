import { Link } from 'react-router-dom'
import { characters } from '../../data/characters.js'
import { locations } from '../../data/locations.js'
import { getSiteStats } from '../../utils/stats.js'
import CharacterCard from '../../components/CharacterCard/CharacterCard.jsx'
import LocationCard from '../../components/LocationCard/LocationCard.jsx'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import './Home.css'

export default function Home() {
  const stats = getSiteStats()
  const featuredCharacters = characters.slice(0, 4)
  const featuredLocations = locations.filter((l) => l.canon === 'confirmed')

  return (
    <PageTransition>
      <div id="top">
        <section className="hero">
          <div className="container hero__inner">
            <span className="eyebrow hero__eyebrow">Woltar · Archives Vivantes</span>
            <h1 className="hero__title">
              LES HISTOIRES
              <br />
              NE DISPARAISSENT JAMAIS.
            </h1>
            <p className="hero__subtitle">
              Explore les visages, les liens et les lieux qui façonnent Woltar. Une vitrine
              vivante pour retrouver l&rsquo;essentiel de chaque récit.
            </p>
            <div className="hero__actions">
              <Link to="/personnages" className="btn btn-primary">
                Découvrir le clan
              </Link>
              <Link to="/univers" className="btn">
                Ouvrir les archives
              </Link>
            </div>

            <dl className="hero__stats">
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
            </dl>
          </div>
        </section>

        <section className="container home-quote">
          <p>
            « On ne naît pas légende.
            <br />
            On le devient en refusant de disparaître. »
          </p>
        </section>

        <section className="container home-section">
          <div className="section-heading">
            <span className="eyebrow">Galerie</span>
            <h2 className="section-title">Visages de Woltar</h2>
          </div>
          <div className="home-grid">
            {featuredCharacters.map((c) => (
              <CharacterCard key={c.id} character={c} />
            ))}
          </div>
          <Link to="/personnages" className="btn home-section__more">
            Voir tous les personnages →
          </Link>
        </section>

        <section className="container home-section">
          <div className="section-heading">
            <span className="eyebrow">Cartographie narrative</span>
            <h2 className="section-title">Les lieux de Woltar</h2>
          </div>
          <div className="home-grid home-grid--locations">
            {featuredLocations.map((l) => (
              <LocationCard key={l.id} location={l} />
            ))}
          </div>
        </section>
      </div>
    </PageTransition>
  )
}
