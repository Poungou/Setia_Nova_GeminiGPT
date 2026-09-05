// src/pages/Chronology/Chronology.jsx
//
// Refonte « chronologies communautaires » : la page n'affiche plus UNE
// frise géante, mais une liste de chronologies (catégories) repliables — une
// seule ouverte à la fois par défaut — chacune propriété d'un compte
// (`system` pour le canon Nakamura, un id de compte pour une chronologie
// créée depuis /compte). Voir usePublicTimelines (src/lib/publicData.js),
// worker/routes/public.js et TimelineAccordionItem.jsx pour le détail d'une
// catégorie (en-tête + événements + garde-fou spoiler).
//
// Priorité explicite de cette refonte : simplicité de navigation avant
// décoration — la frise en zigzag et le lecteur latéral de l'ancienne
// version sont remplacés par un empilement vertical unique, identique en
// structure sur desktop et mobile (seule la largeur change).
import { useEffect, useMemo, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { usePublicCharacterOwners, usePublicTimelines } from '../../lib/publicData.js'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import Reveal from '../../components/Reveal/Reveal.jsx'
import TimelineAccordionItem from './TimelineAccordionItem.jsx'
import '../Universe/Universe.css'
import './Chronology.css'

export default function Chronology() {
  const timelines = usePublicTimelines()
  const owners = usePublicCharacterOwners()
  const reduce = useReducedMotion()
  const [openId, setOpenId] = useState(undefined)

  // Une seule chronologie ouverte par défaut — la première de la liste —
  // sans écraser un choix déjà fait par la personne qui consulte la page.
  useEffect(() => {
    if (openId === undefined && timelines.length > 0) setOpenId(timelines[0].id)
  }, [timelines, openId])

  const ownerNameById = useMemo(
    () => Object.fromEntries(owners.map((o) => [o.userId, o.name])),
    [owners],
  )

  return (
    <PageTransition>
      <section className="container universe-page">
        <Reveal className="section-heading">
          <span className="eyebrow">Récit</span>
          <h1 className="section-title">Chronologie</h1>
          {timelines.length > 0 && (
            <p className="chrono-page__intro">
              Choisis une chronologie à déplier pour lire ses événements.
            </p>
          )}
        </Reveal>

        {timelines.length > 0 ? (
          <div className="chrono-accordion">
            {timelines.map((timeline) => (
              <TimelineAccordionItem
                key={timeline.id}
                timeline={timeline}
                isOpen={openId === timeline.id}
                onToggle={() => setOpenId((current) => (current === timeline.id ? null : timeline.id))}
                ownerName={
                  timeline.ownerUserId && timeline.ownerUserId !== 'system'
                    ? ownerNameById[timeline.ownerUserId]
                    : null
                }
                reduce={reduce}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>La chronologie est encore vierge</strong>
            Les histoires de Woltar apparaîtront ici au fil du RP.
          </div>
        )}
      </section>
    </PageTransition>
  )
}
