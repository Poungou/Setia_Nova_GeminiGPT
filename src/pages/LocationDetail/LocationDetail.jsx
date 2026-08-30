import { useParams, Link, Navigate } from 'react-router-dom'
import { getLocationById } from '../../data/locations.js'
import { characters } from '../../data/characters.js'
import RelationCard from '../../components/RelationCard/RelationCard.jsx'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import Reveal from '../../components/Reveal/Reveal.jsx'
import './LocationDetail.css'

function Field({ label, value }) {
  return (
    <div className="identity-field">
      <dt>{label}</dt>
      <dd>{value ? value : <span className="dash">—</span>}</dd>
    </div>
  )
}

export default function LocationDetail() {
  const { id } = useParams()
  const location = getLocationById(id)

  if (!location) {
    return <Navigate to="/lieux" replace />
  }

  const associatedCharacters = (location.characters || [])
    .map((cid) => characters.find((c) => c.id === cid))
    .filter(Boolean)

  return (
    <PageTransition>
      <article className="location-detail">
        <Reveal as="section" className="location-hero container" y={16}>
          {location.type && <span className="eyebrow">{location.type}</span>}
          <h1 className="section-title">{location.name}</h1>
          {location.shortDescription && (
            <p className="location-hero__lead">{location.shortDescription}</p>
          )}
        </Reveal>

        <Reveal as="section" className="container character-section">
          <h2 className="eyebrow">Informations</h2>
          <dl className="identity-grid">
            <Field label="Type" value={location.type} />
            <Field label="Localisation" value={location.location} />
            <Field label="Propriétaire" value={location.owner} />
            <Field label="Faction" value={location.faction} />
            <Field label="Statut" value={location.status} />
          </dl>
        </Reveal>

        <Reveal as="section" className="container character-section">
          <h2 className="eyebrow">Description</h2>
          {location.description ? (
            <p className="character-section__prose">{location.description}</p>
          ) : (
            <div className="empty-state">
              <strong>À compléter</strong>
              La description de ce lieu n&rsquo;a pas encore été renseignée.
            </div>
          )}
        </Reveal>

        <Reveal as="section" className="container character-section">
          <h2 className="eyebrow">Personnages associés</h2>
          {associatedCharacters.length > 0 ? (
            <div className="relations-grid">
              {associatedCharacters.map((c) => (
                <RelationCard key={c.id} relation={{ character: c, type: c.title }} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucun personnage associé pour l&rsquo;instant</strong>
            </div>
          )}
        </Reveal>

        <Reveal as="section" className="container character-section">
          <h2 className="eyebrow">Galerie</h2>
          <div className="empty-state">
            <strong>Aucune image pour l&rsquo;instant</strong>
          </div>
        </Reveal>

        <p className="container">
          <Link to="/lieux" className="btn">
            ← Retour aux lieux
          </Link>
        </p>
      </article>
    </PageTransition>
  )
}
