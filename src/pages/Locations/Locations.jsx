import { isTopLevelLocation } from '../../data/locations.js'
import { usePublicLocations } from '../../lib/publicData.js'
import LocationCard from '../../components/LocationCard/LocationCard.jsx'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import Reveal from '../../components/Reveal/Reveal.jsx'
import './Locations.css'

export default function Locations() {
  const locations = usePublicLocations()
  const topLevel = locations.filter(isTopLevelLocation)
  const childrenOf = (parentId) => locations.filter((location) => location.parentId === parentId)
  const known = topLevel.filter((l) => l.canon === 'confirmed')
  const upcoming = topLevel.filter((l) => l.canon !== 'confirmed')

  return (
    <PageTransition>
      <section className="container locations-page">
        <Reveal className="section-heading">
          <span className="eyebrow">Coins à explorer</span>
          <h1 className="section-title">Les lieux de Woltar Nova</h1>
        </Reveal>

        <div className="locations-page__grid">
          {known.map((l, i) => (
            <LocationCard key={l.id} location={l} index={i} />
          ))}
        </div>

        {known.map((parent) => {
          const children = childrenOf(parent.id)
          if (children.length === 0) return null
          return (
            <Reveal key={parent.id} className="locations-page__children">
              <div className="section-heading">
                <span className="eyebrow">Dans {parent.name}</span>
                <h2 className="section-title">Sous-lieux à écrire</h2>
              </div>
              <div className="locations-page__grid locations-page__grid--compact">
                {children.map((child, i) => (
                  <LocationCard key={child.id} location={child} index={i} />
                ))}
              </div>
            </Reveal>
          )
        })}

        {upcoming.length > 0 && (
          <Reveal className="locations-page__upcoming">
            <span className="eyebrow">À venir</span>
            <ul>
              {upcoming.map((l) => (
                <li key={l.id}>{l.name}</li>
              ))}
            </ul>
          </Reveal>
        )}
      </section>
    </PageTransition>
  )
}
