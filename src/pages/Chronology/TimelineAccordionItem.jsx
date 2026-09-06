// src/pages/Chronology/TimelineAccordionItem.jsx
//
// Une chronologie affichée comme une catégorie repliable (voir Chronology.jsx
// pour la liste et la gestion de l'accordéon — une seule ouverte à la fois).
// En-tête TOUJOURS visible, même repliée : titre, description courte,
// pseudo de la propriétaire (#Pseudo, si connue et si ce n'est pas une
// chronologie canon), personnages liés, indicateur ouvert/fermé, et
// indicateur spoiler (⚠) — le contenu détaillé (événements) reste masqué
// tant que la catégorie n'est pas dépliée.
//
// Le garde-fou spoiler existant (SpoilerGate) est réutilisé tel quel autour
// des événements : repliage + repliage = ré-affichage de l'avertissement, ce
// qui est le comportement voulu (voir SpoilerGate.jsx), puisque le corps
// n'est monté QUE quand la catégorie est ouverte (voir plus bas).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ChevronDown } from 'lucide-react'
import { getCharacterById } from '../../data/characters.js'
import { getLocationById } from '../../data/locations.js'
import Prose from '../../components/Prose/Prose.jsx'
import SpoilerGate from '../../components/SpoilerGate/SpoilerGate.jsx'
import { groupEventsByPeriod } from './periods.js'
import { getEventHeartColor, getHeartSrc } from './hearts.js'

const EASE = [0.22, 1, 0.36, 1]
const EXCERPT_MAX = 220

// Résumé rapide d'une description (potentiellement markdown) pour l'affichage
// par défaut d'un événement — un aperçu texte brut, pas un rendu markdown.
// Le rendu complet (Prose) n'apparaît qu'une fois l'événement déplié.
function plainExcerpt(text, max = EXCERPT_MAX) {
  const plain = String(text || '')
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/[*_#>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (plain.length <= max) return { excerpt: plain, truncated: false }
  const cut = plain.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return { excerpt: `${cut.slice(0, lastSpace > 0 ? lastSpace : max)}…`, truncated: true }
}

function EventHeart({ color, size = 14 }) {
  return (
    <img
      src={getHeartSrc(color)}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      loading="lazy"
      className="chrono-heart"
    />
  )
}

function EventRow({ event }) {
  const [expanded, setExpanded] = useState(false)
  const spoiler = event.spoiler === true || event.spoiler === 'true'
  const chars = (event.characters || []).map(getCharacterById).filter(Boolean)
  const locs = (event.locations || []).map(getLocationById).filter(Boolean)
  const heartColor = getEventHeartColor(event, chars)
  const { excerpt, truncated } = plainExcerpt(event.description)

  return (
    <li className={'chrono-event' + (event.importance === 'majeur' ? ' chrono-event--majeur' : '')}>
      <span className="chrono-event__marker" aria-hidden="true">
        <EventHeart color={heartColor} />
      </span>
      <div className="chrono-event__body">
        <div className="chrono-event__head">
          <span className="chrono-event__date eyebrow">{event.dateRP || '—'}</span>
          <h3 className="chrono-event__title">{event.title}</h3>
        </div>

        <SpoilerGate key={`${event.id}-${spoiler}`} disabled={!spoiler} message="Cet événement contient un spoiler." buttonLabel="Afficher ce spoiler">
        {!expanded && excerpt && <p className="chrono-event__excerpt">{excerpt}</p>}
        {expanded && event.description && (
          <div className="chrono-event__full">
            <Prose markdown={event.description} />
          </div>
        )}

        {(chars.length > 0 || locs.length > 0) && (
          <div className="chrono-event__links">
            {chars.map((c) => (
              <Link key={c.id} to={`/personnages/${c.id}`} className="chrono-pill">
                {[c.firstName, c.lastName].filter(Boolean).join(' ')}
              </Link>
            ))}
            {locs.map((l) => (
              <Link key={l.id} to={`/lieux/${l.id}`} className="chrono-pill chrono-pill--location">
                {l.name}
              </Link>
            ))}
          </div>
        )}

        {truncated && (
          <button
            type="button"
            className="chrono-event__toggle"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? 'Réduire' : 'Lire la suite'}
          </button>
        )}

        {expanded && event.tags?.length > 0 && (
          <div className="chrono-event__tags">
            {event.tags.map((tag) => (
              <Link key={tag} to={`/tag/${encodeURIComponent(tag)}`} className="chrono-tag">
                #{tag}
              </Link>
            ))}
          </div>
        )}
        </SpoilerGate>
      </div>
    </li>
  )
}

function EventList({ events }) {
  return (
    <ol className="chrono-events">
      {events.map((event) => (
        <EventRow key={event.id} event={event} />
      ))}
    </ol>
  )
}

function TimelineBody({ timeline }) {
  const events = timeline.events || []

  if (events.length === 0) {
    return <p className="chrono-empty">Aucun événement enregistré pour l’instant.</p>
  }

  // Sous-regroupement par grande période — réservé à la chronologie canon
  // Nakamura, seule dont les bornes de periods.js ont un sens : les autres
  // chronologies (créées depuis un compte) restent une simple liste
  // chronologique, sans découpage inventé.
  if (timeline.id === 'nakamura') {
    const groups = groupEventsByPeriod(events)
    return (
      <div className="chrono-groups">
        {groups.map((group) => (
          <section key={group.key} className="chrono-group" aria-labelledby={`chrono-group-${group.key}`}>
            <h3 className="chrono-group__label" id={`chrono-group-${group.key}`}>
              {group.label}
            </h3>
            <EventList events={group.events} />
          </section>
        ))}
      </div>
    )
  }

  return <EventList events={[...events].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))} />
}

export default function TimelineAccordionItem({ timeline, isOpen, onToggle, ownerName, reduce }) {
  const characters = (timeline.characters || []).map(getCharacterById).filter(Boolean)
  const panelId = `chrono-panel-${timeline.id}`
  const headerId = `chrono-header-${timeline.id}`

  const body = <TimelineBody timeline={timeline} />

  return (
    <div className={'chrono-accordion-item' + (isOpen ? ' is-open' : '')}>
      <h2 className="chrono-accordion-item__heading">
        <button
          type="button"
          id={headerId}
          className="chrono-accordion-item__trigger"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <span className="chrono-accordion-item__chevron" aria-hidden="true">
            <ChevronDown size={18} />
          </span>
          <span className="chrono-accordion-item__main">
            <span className="chrono-accordion-item__titleRow">
              <span className="chrono-accordion-item__title">{timeline.title}</span>
              {timeline.spoiler && (
                <span className="chrono-spoiler-flag" title="Contient des éléments importants de l’histoire">
                  <AlertTriangle size={14} aria-hidden="true" />
                  <span className="visually-hidden">Attention, spoiler</span>
                </span>
              )}
            </span>
            {timeline.description && <span className="chrono-accordion-item__desc">{timeline.description}</span>}
            <span className="chrono-accordion-item__meta">
              {ownerName && <span className="chrono-owner">#{ownerName}</span>}
              {characters.map((c) => (
                <span key={c.id} className="chrono-pill chrono-pill--static">
                  {[c.firstName, c.lastName].filter(Boolean).join(' ')}
                </span>
              ))}
            </span>
          </span>
        </button>
      </h2>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={headerId}
            className="chrono-accordion-item__panel"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduce ? {} : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <div className="chrono-accordion-item__panelInner">
              {timeline.spoiler ? (
                <SpoilerGate message="⚠ Cette chronologie contient des éléments importants de l’histoire.">
                  {body}
                </SpoilerGate>
              ) : (
                body
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
