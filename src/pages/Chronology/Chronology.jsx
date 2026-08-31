import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { events } from '../../data/events.js'
import { getCharacterById } from '../../data/characters.js'
import { getLocationById } from '../../data/locations.js'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import Reveal from '../../components/Reveal/Reveal.jsx'
import Prose from '../../components/Prose/Prose.jsx'
import { groupEventsByPeriod } from './periods.js'
import { getEventHeartColor, getHeartSrc } from './hearts.js'
import '../Universe/Universe.css'
import './Chronology.css'

const EASE = [0.22, 1, 0.36, 1]

function EventHeart({ color, size = 15, className = '' }) {
  return (
    <img
      src={getHeartSrc(color)}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      loading="lazy"
      className={`chrono-heart ${className}`.trim()}
    />
  )
}

function Card({ event, isSelected, onSelect, index, reduce }) {
  const motionProps = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-30px' },
        transition: { duration: 0.4, delay: Math.min(index * 0.025, 0.35), ease: EASE },
      }

  return (
    <motion.button
      type="button"
      className={
        'chrono-card' +
        (event.importance === 'majeur' ? ' chrono-card--majeur' : '') +
        (isSelected ? ' is-selected' : '')
      }
      onClick={() => onSelect(event.id)}
      aria-pressed={isSelected}
      {...motionProps}
    >
      <span className="chrono-card__date eyebrow">{event.dateRP || '—'}</span>
      <span className="chrono-card__title">{event.title}</span>
    </motion.button>
  )
}

function TimelineRow({ period, selectedId, onSelect, reduce, startIndex }) {
  return (
    <section className="chrono-period" aria-labelledby={`chrono-period-${period.key}`}>
      <h2 className="chrono-period__label" id={`chrono-period-${period.key}`}>
        {period.label}
      </h2>
      <div className="chrono-period__track" style={{ '--n-events': period.events.length }}>
        {period.events.map((event, i) => {
          const above = i % 2 === 0
          const chars = (event.characters || []).map(getCharacterById).filter(Boolean)
          const heartColor = getEventHeartColor(event, chars)
          const cardProps = {
            event,
            index: startIndex + i,
            reduce,
            isSelected: event.id === selectedId,
            onSelect,
          }
          return (
            <div className="chrono-stop" key={event.id}>
              <div className={'chrono-slot chrono-slot--above' + (above ? ' has-card' : '')}>
                {above && <Card {...cardProps} />}
              </div>
              <div className="chrono-node-row">
                <span
                  className={
                    'chrono-node' + (event.importance === 'majeur' ? ' chrono-node--majeur' : '')
                  }
                >
                  <EventHeart color={heartColor} />
                  <span className="chrono-dot" aria-hidden="true" />
                </span>
              </div>
              <div className={'chrono-slot chrono-slot--below' + (!above ? ' has-card' : '')}>
                {!above && <Card {...cardProps} />}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default function Chronology() {
  const [selectedId, setSelectedId] = useState(null)
  const reduce = useReducedMotion()
  const readerRef = useRef(null)

  const selected = events.find((e) => e.id === selectedId) || null
  const chars = selected ? (selected.characters || []).map(getCharacterById).filter(Boolean) : []
  const locs = selected ? (selected.locations || []).map(getLocationById).filter(Boolean) : []
  const periods = groupEventsByPeriod(events)

  function select(id) {
    setSelectedId(id)
    // Sur mobile surtout : amène le lecteur de carte dans le champ de vision.
    requestAnimationFrame(() => {
      readerRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' })
    })
  }

  let runningIndex = 0

  return (
    <PageTransition>
      <section className="container universe-page">
        <Reveal className="section-heading">
          <span className="eyebrow">Récit</span>
          <h1 className="section-title">Chronologie</h1>
          {events.length > 0 && (
            <p className="chronology-intro">Choisis un événement sur la frise pour le lire.</p>
          )}
        </Reveal>

        {events.length > 0 ? (
          <div className="chronology-layout">
            <div className="chrono-timeline">
              {periods.map((period) => {
                const row = (
                  <TimelineRow
                    key={period.key}
                    period={period}
                    selectedId={selectedId}
                    onSelect={select}
                    reduce={reduce}
                    startIndex={runningIndex}
                  />
                )
                runningIndex += period.events.length
                return row
              })}
            </div>

            <div className="chrono-reader" ref={readerRef}>
              {selected ? (
                <motion.div
                  key={selected.id}
                  className="chrono-reader__card"
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                >
                  <span className="chrono-reader__date eyebrow">{selected.dateRP || '—'}</span>
                  <h2 className="chrono-reader__title">{selected.title}</h2>
                  <Prose markdown={selected.description} />

                  {(chars.length > 0 || locs.length > 0) && (
                    <div className="timeline__links">
                      {chars.map((c) => (
                        <Link key={c.id} to={`/personnages/${c.id}`} className="timeline__chip">
                          {[c.firstName, c.lastName].filter(Boolean).join(' ')}
                        </Link>
                      ))}
                      {locs.map((l) => (
                        <Link key={l.id} to={`/lieux/${l.id}`} className="timeline__chip">
                          {l.name}
                        </Link>
                      ))}
                    </div>
                  )}

                  {selected.tags?.length > 0 && (
                    <div className="timeline__tags">
                      {selected.tags.map((tag) => (
                        <Link key={tag} to={`/tag/${encodeURIComponent(tag)}`} className="timeline__tag">
                          #{tag}
                        </Link>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="chrono-reader__placeholder">
                  <EventHeart color="gris" size={22} />
                  <p>Sélectionne un événement dans la frise pour l’ouvrir ici.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <strong>La chronologie est encore vierge</strong>
            Les événements marquants de Woltar apparaîtront ici au fil du RP.
          </div>
        )}
      </section>
    </PageTransition>
  )
}
