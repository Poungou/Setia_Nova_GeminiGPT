import { useParams, Link, Navigate } from 'react-router-dom'
import { getLocationById, getLocationChildren, getLocationParent } from '../../data/locations.js'
import { characters } from '../../data/characters.js'
import { imgSrc, imgFocus } from '../../lib/image.js'
import RelationCard from '../../components/RelationCard/RelationCard.jsx'
import LocationCard from '../../components/LocationCard/LocationCard.jsx'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import Reveal from '../../components/Reveal/Reveal.jsx'
import Prose from '../../components/Prose/Prose.jsx'
import Lightbox from '../../components/Lightbox/Lightbox.jsx'
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

  const parent = getLocationParent(location)
  const children = getLocationChildren(location.id)
  const placement = [location.wing, location.zone].filter(Boolean).join(' · ')
  const associatedCharacters = (location.characters || [])
    .map((cid) => characters.find((c) => c.id === cid))
    .filter(Boolean)
  const gallery = (location.gallery || []).filter((v) => imgSrc(v))

  return (
    <PageTransition>
      <article className="location-detail">
        {imgSrc(location.image) && (
          <Reveal className="location-detail__banner" y={0}>
            <img
              src={imgSrc(location.image)}
              alt={location.name}
              style={{ objectPosition: imgFocus(location.image) }}
            />
          </Reveal>
        )}

        <Reveal as="section" className="location-hero container" y={16}>
          {location.type && <span className="eyebrow">{location.type}</span>}
          <h1 className="section-title">{location.name}</h1>
          {location.shortDescription && (
            <p className="location-hero__lead">{location.shortDescription}</p>
          )}
        </Reveal>

        <Reveal as="section" className="container character-section">
          <h2 className="eyebrow">Repères</h2>
          <dl className="identity-grid">
            <Field label="Type" value={location.type} />
            <Field
              label="Lieu parent"
              value={parent && <Link to={`/lieux/${parent.id}`}>{parent.name}</Link>}
            />
            <Field label="Aile / zone" value={placement} />
            <Field label="Étage" value={location.floor} />
            <Field label="Localisation" value={location.location} />
            <Field label="Propriétaire" value={location.owner} />
            <Field label="Faction" value={location.faction} />
            <Field label="Statut" value={location.status} />
          </dl>
        </Reveal>

        <Reveal as="section" className="container character-section">
          <h2 className="eyebrow">Description</h2>
          {location.description ? (
            <Prose markdown={location.description} className="prose--tight" />
          ) : (
            <div className="empty-state">
              <strong>À compléter</strong>
              La description de ce lieu n&rsquo;a pas encore été renseignée.
            </div>
          )}
        </Reveal>

        <Reveal as="section" className="container character-section">
          <h2 className="eyebrow">Lore libre</h2>
          {location.lore ? (
            <Prose markdown={location.lore} className="prose--tight" />
          ) : (
            <div className="empty-state">
              <strong>Espace prêt pour le lore</strong>
              Notes d&rsquo;ambiance, secrets, habitudes du lieu ou détails RP pourront être posés ici.
            </div>
          )}
        </Reveal>

        {location.history && (
          <Reveal as="section" className="container character-section">
            <h2 className="eyebrow">Histoire</h2>
            <Prose markdown={location.history} className="prose--tight" />
          </Reveal>
        )}

        {children.length > 0 && (
          <Reveal as="section" className="container character-section">
            <h2 className="eyebrow">Sous-lieux</h2>
            <div className="location-detail__children">
              {children.map((child, i) => (
                <LocationCard key={child.id} location={child} index={i} />
              ))}
            </div>
          </Reveal>
        )}

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
          {gallery.length > 0 ? (
            <Lightbox images={gallery.map((v) => ({ src: imgSrc(v), alt: location.name }))} />
          ) : (
            <div className="empty-state">
              <strong>Aucune image pour l&rsquo;instant</strong>
            </div>
          )}
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
