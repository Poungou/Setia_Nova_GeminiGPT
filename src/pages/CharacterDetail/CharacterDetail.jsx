import { useParams, Link, Navigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { getCharacterById, getRelationTargets } from '../../data/characters.js'
import { getLocationById } from '../../data/locations.js'
import RelationCard from '../../components/RelationCard/RelationCard.jsx'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import Reveal from '../../components/Reveal/Reveal.jsx'
import './CharacterDetail.css'

const EASE = [0.22, 1, 0.36, 1]

const heroContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
}
const heroItem = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
}
const portraitVariant = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: EASE } },
}

const SECTIONS = [
  { id: 'identite', label: 'Identité' },
  { id: 'histoire', label: 'Histoire' },
  { id: 'relations', label: 'Relations' },
  { id: 'chronologie', label: 'Chronologie' },
  { id: 'galerie', label: 'Galerie' },
]

function Field({ label, value }) {
  return (
    <div className="identity-field">
      <dt>{label}</dt>
      <dd>{value ? value : <span className="dash">—</span>}</dd>
    </div>
  )
}

function getInitials(character) {
  const f = character.firstName?.[0] || ''
  const l = character.lastName?.[0] || ''
  return (f + l).toUpperCase()
}

export default function CharacterDetail() {
  const { id } = useParams()
  const character = getCharacterById(id)
  const reduce = useReducedMotion()

  if (!character || character.visibility === 'draft') {
    return <Navigate to="/personnages" replace />
  }

  const relations = getRelationTargets(character)
  const associatedLocations = (character.locations || [])
    .map((locId) => getLocationById(locId))
    .filter(Boolean)
  const fullName = [character.firstName, character.lastName].filter(Boolean).join(' ')

  const heroMotion = reduce ? {} : { variants: heroContainer, initial: 'hidden', animate: 'show' }
  const itemMotion = reduce ? {} : { variants: heroItem }
  const portraitMotion = reduce ? {} : { variants: portraitVariant }

  return (
    <PageTransition>
      <article className="character-detail">
        <section className="character-hero">
          <motion.div className="container character-hero__inner" {...heroMotion}>
            <motion.div className="character-hero__portrait" {...portraitMotion}>
              {character.portrait ? (
                <img src={character.portrait} alt={fullName} />
              ) : (
                <span>{getInitials(character)}</span>
              )}
            </motion.div>

            <div className="character-hero__info">
              <motion.span className="character-hero__number" {...itemMotion}>
                {character.number}
              </motion.span>
              <motion.h1 className="character-hero__name" {...itemMotion}>
                {character.firstName}
                <br />
                {character.lastName}
              </motion.h1>
              {character.title && (
                <motion.p className="character-hero__title" {...itemMotion}>
                  {character.title}
                </motion.p>
              )}
              {character.clan && (
                <motion.div {...itemMotion}>
                  <Link to="/lieux" className="character-hero__clan eyebrow">
                    Clan {character.clan}
                  </Link>
                </motion.div>
              )}

              <motion.nav className="character-hero__nav" aria-label="Sections de la fiche" {...itemMotion}>
                {SECTIONS.map((s) => (
                  <a key={s.id} href={`#${s.id}`}>
                    {s.label}
                  </a>
                ))}
              </motion.nav>
            </div>
          </motion.div>
        </section>

        <Reveal as="section" id="identite" className="container character-section">
          <h2 className="eyebrow">Identité</h2>
          <dl className="identity-grid">
            <Field label="Nom" value={character.lastName} />
            <Field label="Prénom" value={character.firstName} />
            <Field label="Surnom" value={character.nickname} />
            <Field label="Âge" value={character.age} />
            <Field label="Genre" value={character.gender} />
            <Field label="Espèce" value={character.species} />
            <Field label="Origine" value={character.origin} />
            <Field label="Résidence" value={character.residence} />
            <Field label="Occupation" value={character.occupation} />
            <Field label="Clan" value={character.clan} />
            <Field label="Statut" value={character.status === 'active' ? 'Actif' : 'À développer'} />
          </dl>

          {character.traits?.length > 0 && (
            <div className="character-traits">
              {character.traits.map((t) => (
                <span key={t} className="character-traits__tag">
                  {t}
                </span>
              ))}
            </div>
          )}
        </Reveal>

        {(character.character || character.appearance) && (
          <Reveal as="section" className="container character-section character-section--split">
            {character.character && (
              <div>
                <h2 className="eyebrow">Caractère</h2>
                <p>{character.character}</p>
              </div>
            )}
            {character.appearance && (
              <div>
                <h2 className="eyebrow">Apparence</h2>
                <p>{character.appearance}</p>
              </div>
            )}
          </Reveal>
        )}

        <Reveal as="section" id="histoire" className="container character-section">
          <h2 className="eyebrow">Histoire</h2>
          {character.biography ? (
            <p className="character-section__prose">{character.biography}</p>
          ) : (
            <div className="empty-state">
              <strong>À écrire</strong>
              Cette section sera complétée au fil du RP.
            </div>
          )}
        </Reveal>

        <Reveal as="section" id="relations" className="container character-section">
          <h2 className="eyebrow">Relations</h2>
          {relations.length > 0 ? (
            <div className="relations-grid">
              {relations.map((rel) => (
                <RelationCard key={rel.characterId} relation={rel} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucune relation renseignée</strong>
              À compléter dès qu&rsquo;un lien est confirmé.
            </div>
          )}
        </Reveal>

        {associatedLocations.length > 0 && (
          <Reveal as="section" className="container character-section">
            <h2 className="eyebrow">Lieux associés</h2>
            <ul className="character-locations">
              {associatedLocations.map((loc) => (
                <li key={loc.id}>
                  <Link to={`/lieux/${loc.id}`}>{loc.name}</Link>
                </li>
              ))}
            </ul>
          </Reveal>
        )}

        <Reveal as="section" id="chronologie" className="container character-section">
          <h2 className="eyebrow">Chronologie personnelle</h2>
          <div className="empty-state">
            <strong>Aucun événement pour l&rsquo;instant</strong>
            La chronologie de {character.firstName} apparaîtra ici.
          </div>
        </Reveal>

        <Reveal as="section" id="galerie" className="container character-section">
          <h2 className="eyebrow">Galerie</h2>
          {character.gallery?.length > 0 ? (
            <div className="character-gallery">
              {character.gallery.map((src) => (
                <img key={src} src={src} alt={`${fullName} — illustration`} loading="lazy" />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucune image pour l&rsquo;instant</strong>
              Les portraits et illustrations seront ajoutés progressivement.
            </div>
          )}
        </Reveal>

        <Reveal as="section" className="container character-section">
          <h2 className="eyebrow">Notes / Archives</h2>
          <div className="empty-state">
            <strong>—</strong>
            Espace réservé aux informations RP supplémentaires.
          </div>
        </Reveal>
      </article>
    </PageTransition>
  )
}
