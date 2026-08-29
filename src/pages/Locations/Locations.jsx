import { locations } from '../../data/locations.js'
import LocationCard from '../../components/LocationCard/LocationCard.jsx'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import './Locations.css'

export default function Locations() {
  const known = locations.filter((l) => l.canon === 'confirmed')
  const upcoming = locations.filter((l) => l.canon !== 'confirmed')

  return (
    <PageTransition>
      <section className="container locations-page">
        <div className="section-heading">
          <span className="eyebrow">Cartographie narrative</span>
          <h1 className="section-title">Les lieux de Woltar</h1>
        </div>

        <div className="locations-page__grid">
          {known.map((l) => (
            <LocationCard key={l.id} location={l} />
          ))}
        </div>

        {upcoming.length > 0 && (
          <div className="locations-page__upcoming">
            <span className="eyebrow">À venir</span>
            <ul>
              {upcoming.map((l) => (
                <li key={l.id}>{l.name}</li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </PageTransition>
  )
}
