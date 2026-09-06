import { useParams, Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { getRelationTargets, getRelationNetwork } from '../../data/characters.js'
import { getLocationById } from '../../data/locations.js'
import { getClanByCharacter } from '../../data/clans.js'
import { events } from '../../data/events.js'
import { usePublicCharacter, usePublicClans, usePublicPlayers } from '../../lib/publicData.js'
import { imgSrc, imgFocus, imgCredit } from '../../lib/image.js'
import RelationGraph from '../../components/RelationGraph/RelationGraph.jsx'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import Reveal from '../../components/Reveal/Reveal.jsx'
import Prose from '../../components/Prose/Prose.jsx'
import NotFound from '../NotFound/NotFound.jsx'
import { GlyphRelations, GlyphLocation, GlyphEvents } from '../../components/PixelIcons/PixelGlyphs.jsx'
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

// Champs affichés dans la barre d'identité horizontale, sous le hero.
// Un champ vide ne génère aucun chip (pas de "—" affiché) : voir IdentityChip.
const IDENTITY_BAR_FIELDS = [
  { key: 'clan', label: 'Clan' },
  { key: 'occupation', label: 'Occupation' },
  { key: 'age', label: 'Âge' },
  { key: 'species', label: 'Espèce' },
  { key: 'gender', label: 'Genre' },
  { key: 'origin', label: 'Origine' },
  { key: 'residence', label: 'Résidence' },
  {
    key: 'status',
    label: 'Statut',
    format: (v) => (v === 'active' ? 'Actif' : v === 'deceased' ? 'Décédé' : v === 'archived' ? 'Archivé' : v ? 'À développer' : ''),
  },
]

function IdentityChip({ label, value }) {
  if (!value) return null
  return (
    <div className="identity-chip">
      <dt>{label}</dt>
      <dd>{value}</dd>
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
  // Fiche « live » : D1 (via /compte, /admin) si disponible, sinon repli sur
  // les données statiques du bundle — voir src/lib/publicData.js.
  const { character, loading, error } = usePublicCharacter(id)
  // Clans « live » (D1 + canon) pour résoudre le lien vers la fiche clan —
  // voir getClanByCharacter(character, clans) ci-dessous et
  // src/lib/publicData.js.
  const clans = usePublicClans()
  const players = usePublicPlayers()
  const reduce = useReducedMotion()

  if (loading) {
    return <section className="container character-section" role="status" aria-live="polite">Chargement de la fiche…</section>
  }

  if (!character && error) {
    return (
      <section className="container character-section" role="alert">
        <h1 className="section-title">La fiche n’a pas pu être chargée.</h1>
        <p>Veuillez réessayer dans quelques instants.</p>
        <button type="button" className="btn" onClick={() => window.location.reload()}>Réessayer</button>
      </section>
    )
  }

  if (!character || character.visibility === 'draft') {
    return <NotFound />
  }

  const owner = players.find((player) => player.userId === character.ownerUserId)
  const relations = getRelationTargets(character)
  const relationNetwork = getRelationNetwork(character)
  const associatedLocations = (character.locations || [])
    .map((locId) => getLocationById(locId))
    .filter(Boolean)
  const personalEvents = events.filter((e) => (e.characters || []).includes(character.id))
  const fullName = [character.firstName, character.lastName].filter(Boolean).join(' ')
  const hasCharacterOrAppearance = Boolean(character.character || character.appearance)
  const clanRecord = getClanByCharacter(character, clans)
  const portraitSource = imgCredit(character.portrait, character.image_source)

  // Nav interne : ne pointe que vers les sections réellement affichées.
  const sectionsNav = [
    { id: 'identite', label: 'Identité', show: true },
    { id: 'histoire', label: 'Histoire', show: true },
    { id: 'relations', label: 'Liens du clan', show: relations.length > 0 },
    { id: 'chronologie', label: 'Chronologie', show: personalEvents.length > 0 },
    { id: 'galerie', label: 'Galerie', show: character.gallery?.length > 0 },
  ].filter((s) => s.show)

  const heroMotion = reduce ? {} : { variants: heroContainer, initial: 'hidden', animate: 'show' }
  const itemMotion = reduce ? {} : { variants: heroItem }
  const portraitMotion = reduce ? {} : { variants: portraitVariant }

  return (
    <PageTransition>
      <article className="character-detail">
        <section className="character-hero">
          <motion.div className="container character-hero__inner" {...heroMotion}>
            <motion.figure className="character-hero__portrait-wrap" {...portraitMotion}>
              <div className="character-hero__portrait">
                {imgSrc(character.portrait) ? (
                  <img
                    src={imgSrc(character.portrait)}
                    alt={fullName}
                    style={{ objectPosition: imgFocus(character.portrait) }}
                  />
                ) : (
                  <span>{getInitials(character)}</span>
                )}
              </div>
              {imgSrc(character.portrait) && portraitSource && (
                <figcaption className="image-source">Source : {portraitSource}</figcaption>
              )}
            </motion.figure>

            <div className="character-hero__info">
              <motion.span className="character-hero__number" {...itemMotion}>
                {character.number}
              </motion.span>

              <motion.h1 className="character-hero__name" {...itemMotion}>
                {character.firstName}
                <br />
                {character.lastName}
              </motion.h1>

              {character.nickname && (
                <motion.p className="character-hero__nickname" {...itemMotion}>
                  « {character.nickname} »
                </motion.p>
              )}

              <motion.p className="character-hero__eyebrow eyebrow" {...itemMotion}>
                Archive vivante · Dossier personnage
              </motion.p>

              {character.title && (
                <motion.p className="character-hero__title" {...itemMotion}>
                  {character.title}
                </motion.p>
              )}
              {character.shortDescription && (
                <motion.p className="character-hero__summary" {...itemMotion}>
                  {character.shortDescription}
                </motion.p>
              )}
              {owner && (
                <motion.p className="character-hero__summary" {...itemMotion}>
                  Propriétaire : <Link to={`/joueurs/${encodeURIComponent(owner.userId)}`}>#{owner.name}</Link>
                </motion.p>
              )}
              {character.clan && (
                <motion.div {...itemMotion}>
                  {clanRecord ? (
                    <Link to={`/clans/${clanRecord.id}`} className="character-hero__clan eyebrow">
                      Clan {character.clan}
                    </Link>
                  ) : (
                    <span className="character-hero__clan character-hero__clan--static eyebrow">
                      Clan {character.clan}
                    </span>
                  )}
                </motion.div>
              )}

              {character.quote && (
                <motion.blockquote className="character-hero__quote" {...itemMotion}>
                  {character.quote}
                </motion.blockquote>
              )}

              {sectionsNav.length > 0 && (
                <motion.nav className="character-hero__nav" aria-label="Sections de la fiche" {...itemMotion}>
                  {sectionsNav.map((s) => (
                    <a key={s.id} href={`#${s.id}`}>
                      {s.label}
                    </a>
                  ))}
                </motion.nav>
              )}
            </div>
          </motion.div>
        </section>

        <Reveal as="section" id="identite" className="container character-identity">
          <dl className="identity-bar">
            {IDENTITY_BAR_FIELDS.map((f) => (
              <IdentityChip
                key={f.key}
                label={f.label}
                value={f.format ? f.format(character[f.key]) : character[f.key]}
              />
            ))}
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

          {character.tags?.length > 0 && (
            <div className="character-tags">
              {character.tags.map((t) => (
                <Link key={t} to={`/tag/${encodeURIComponent(t)}`} className="character-tags__link">
                  #{t}
                </Link>
              ))}
            </div>
          )}
        </Reveal>

        <div className="container character-body">
          <div className="character-body__main">
            {hasCharacterOrAppearance && (
              <Reveal className="character-section character-section--split character-section--nested character-card character-card--compact">
                {character.character && (
                  <div>
                    <h2 className="eyebrow section-card-title">Caractère</h2>
                    <Prose markdown={character.character} className="prose--tight" />
                  </div>
                )}
                {character.appearance && (
                  <div>
                    <h2 className="eyebrow section-card-title">Apparence</h2>
                    <Prose markdown={character.appearance} className="prose--tight" />
                  </div>
                )}
              </Reveal>
            )}

            <Reveal
              as="section"
              id="histoire"
              className="character-section character-section--nested character-card character-card--primary"
            >
              <h2 className="eyebrow section-card-title">Histoire</h2>
              {character.biography ? (
                <Prose markdown={character.biography} className="prose--tight" />
              ) : (
                <div className="empty-state">
                  <strong>À écrire</strong>
                  Cette section sera complétée au fil du RP.
                </div>
              )}
            </Reveal>
          </div>

          <aside className="character-body__aside">
            {associatedLocations.length > 0 && (
              <Reveal as="section" className="character-aside-block">
                <h2 className="eyebrow aside-heading">
                  <GlyphLocation />
                  Lieux associés
                </h2>
                <ul className="character-locations">
                  {associatedLocations.map((loc) => (
                    <li key={loc.id}>
                      <Link to={`/lieux/${loc.id}`}>{loc.name}</Link>
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}

            {personalEvents.length > 0 && (
              <Reveal as="section" id="chronologie" className="character-aside-block">
                <h2 className="eyebrow aside-heading">
                  <GlyphEvents />
                  Événements clés
                </h2>
                <ol className="character-chronology">
                  {personalEvents.map((e) => (
                    <li key={e.id}>
                      <Link to="/chronologie" className="character-chronology__link">
                        <span className="eyebrow">{e.dateRP}</span>
                        <strong>{e.title}</strong>
                      </Link>
                    </li>
                  ))}
                </ol>
              </Reveal>
            )}
          </aside>
        </div>

        {relations.length > 0 && (
          <Reveal as="section" id="relations" className="container character-section character-section--relations">
            <h2 className="eyebrow aside-heading">
              <GlyphRelations />
              Liens du clan
            </h2>
            <RelationGraph members={relationNetwork.members} centerId={character.id} />
          </Reveal>
        )}

        {character.gallery?.length > 0 && (
          <Reveal as="section" id="galerie" className="container character-section">
            <h2 className="eyebrow">Galerie</h2>
            <div className="character-gallery">
              {character.gallery.map((item) => (
                <figure key={imgSrc(item)} className="character-gallery__item">
                  <img src={imgSrc(item)} alt={`${fullName} — illustration`} loading="lazy" />
                  {imgCredit(item, character.gallery_sources?.[imgSrc(item)]) && (
                    <figcaption className="image-source">
                      Source : {imgCredit(item, character.gallery_sources?.[imgSrc(item)])}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </Reveal>
        )}
      </article>
    </PageTransition>
  )
}
