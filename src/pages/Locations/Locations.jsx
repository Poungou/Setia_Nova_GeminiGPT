import { usePublicLocations } from '../../lib/publicData.js'
import WorldMap from '../../components/WorldMap/WorldMap.jsx'
import CityCard from '../../components/CityCard/CityCard.jsx'
import LocationCard from '../../components/LocationCard/LocationCard.jsx'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import Reveal from '../../components/Reveal/Reveal.jsx'
import SafeImage from '../../components/SafeImage/SafeImage.jsx'
import { Compass, ArrowDownRight, MapPinned } from 'lucide-react'
import './Locations.css'

// Sétia est le lieu vedette : épinglée en tête de la liste des villes, quel
// que soit l'ordre renvoyé par l'API. Le reste garde son ordre (canon d'abord).
const PINNED_CITY_ID = 'setia'
const pinnedFirst = (list) => [
  ...list.filter((c) => c.id === PINNED_CITY_ID),
  ...list.filter((c) => c.id !== PINNED_CITY_ID),
]

export default function Locations() {
  const locations = usePublicLocations()

  // Les « villes » (Sétia, Begy, Vésén...) sont des lieux marqués `isCity`
  // dans l'admin — voir src/admin/schema.js. Les lieux existants (Manoir,
  // Joyeux Lutin, Palais des Astres, Forêt de Sétia...) sont rattachés à
  // leur ville via `parentId`, comme n'importe quel sous-lieu.
  const cities = locations.filter((l) => l.isCity)
  const knownCities = cities.filter((c) => c.canon === 'confirmed')
  const draftCities = cities.filter((c) => c.canon !== 'confirmed')
  const orderedCities = pinnedFirst([...knownCities, ...draftCities])
  const mapCities = cities.map((c) => ({ ...c, muted: c.canon !== 'confirmed' }))

  const childrenCountOf = (id) => locations.filter((l) => l.parentId === id).length

  // Lieux qui ne sont ni une ville, ni rattachés à une ville pour l'instant
  // (ex. Groove's, Planétarium) : affichés à part plutôt que perdus.
  const unassigned = locations.filter((l) => !l.isCity && !l.parentId)

  return (
    <PageTransition>
      <section className="container locations-page">
        <Reveal className="locations-hero">
          <div className="locations-hero__copy">
            <span className="eyebrow"><MapPinned size={14} /> Atlas vivant</span>
            <h1 className="section-title">Entrez dans<br /><em>Woltar.</em></h1>
            <p className="locations-page__intro">Villes, refuges et recoins de RP : choisissez un point sur la carte et laissez le décor ouvrir la prochaine histoire.</p>
            <a className="locations-hero__cta" href="#carte-interactive">Explorer la carte <ArrowDownRight size={17} /></a>
          </div>
          <figure className="locations-hero__plan">
            <div className="locations-hero__plan-frame">
              <SafeImage src="https://woltar.net/images/planetes/woltar/plan.png" alt="Carte officielle du monde de Woltar" />
              <span className="locations-hero__pin locations-hero__pin--one" />
              <span className="locations-hero__pin locations-hero__pin--two" />
              <span className="locations-hero__seal"><Compass size={20} /> à explorer</span>
            </div>
            <figcaption>Carte officielle de Woltar.net · une boussole pour vos récits</figcaption>
          </figure>
        </Reveal>

        <div className="locations-atlas-summary"><span><strong>{cities.length}</strong> villes</span><span><strong>{locations.filter(l => !l.isCity).length}</strong> lieux à découvrir</span><a href="#destinations">Choisir une destination <ArrowDownRight size={16} /></a></div>

        {mapCities.length > 0 && (
          <Reveal id="carte-interactive" className="locations-page__map">
            <div className="locations-map-caption"><span><Compass size={18} /> L’atlas de Woltar</span><span>Sélectionnez une ville pour entrer</span></div>
            <WorldMap cities={mapCities} />
          </Reveal>
        )}

        {orderedCities.length > 0 && (
          <Reveal as="section" id="destinations" className="locations-page__section">
            <div className="section-heading">
              <span className="eyebrow">Villes</span>
              <h2 className="section-title">D’une ville à l’autre</h2>
            </div>
            <div className="locations-page__grid locations-page__grid--cities">
              {orderedCities.map((city, i) => (
                <CityCard key={city.id} city={city} index={i} childrenCount={childrenCountOf(city.id)} />
              ))}
            </div>
          </Reveal>
        )}

        {unassigned.length > 0 && (
          <Reveal as="section" className="locations-page__section">
            <div className="section-heading">
              <span className="eyebrow">Hors des sentiers</span>
              <h2 className="section-title">Autres lieux</h2>
            </div>
            <div className="locations-page__grid locations-page__grid--compact">
              {unassigned.map((l, i) => (
                <LocationCard key={l.id} location={l} index={i} />
              ))}
            </div>
          </Reveal>
        )}
      </section>
    </PageTransition>
  )
}
