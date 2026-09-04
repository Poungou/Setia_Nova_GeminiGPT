import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { imgSrc, imgFocus } from '../../lib/image.js'
import { resolveFrameColor, getFrameMeta } from '../../lib/frames.js'
import PixelFrame from '../PixelIcons/PixelFrame.jsx'
import './RelationGraph.css'

// ---------------------------------------------------------------------
// Sociogramme / « affinity chart » du clan — Phase 22.
//
// Reçoit uniquement des données déjà existantes (`members`, chacun avec son
// propre `relations[]` venant de src/data/characters.json / de l'API
// publique) : rien n'est codé en dur ici, tout vient de la source de
// données réelle du site. Deux usages :
//   - ClanDetail.jsx   : members = tous les membres du clan, centerId =
//                        clan.centerCharacterId (facultatif)
//   - CharacterDetail.jsx : members = getRelationNetwork(character).members
//                        (le personnage + son réseau direct), centerId =
//                        le personnage consulté — voir data/characters.js
//
// `nature`/`intensity` sont des champs FACULTATIFS de chaque relation (voir
// src/lib/relations.js). Absents, ils ne sont jamais inventés : le lien est
// simplement classé « Famille » quand `type` décrit déjà un lien de sang
// (« Frère jumeau », « Père »…), sinon « Lien » — un libellé neutre, pas une
// caractérisation émotionnelle. Le texte affiché sur chaque liaison reste
// toujours `type`, tel qu'écrit par l'utilisatrice.
// ---------------------------------------------------------------------

// Espace de coordonnées abstrait (indépendant de la taille réelle à
// l'écran) : le conteneur CSS a le même ratio (voir RelationGraph.css,
// --rg-w / --rg-h), donc un cercle tracé ici reste un cercle une fois
// affiché, sur mobile comme sur desktop.
const VBW = 140
const VBH = 100
const CX = VBW / 2
const CY = VBH / 2
const RADIUS = { up: 30, down: 33, side: 40 }

const UP_WORDS = ['père', 'papa', 'mère', 'maman', 'grand-père', 'grand-mère', 'aïeul', 'aïeule', 'ancêtre', 'oncle', 'tante']
const DOWN_WORDS = ['fils', 'fille', 'neveu', 'nièce', 'petit-fils', 'petite-fille', 'filleul', 'filleule']
const SIDE_WORDS = [
  'frère', 'sœur', 'soeur', 'jumeau', 'jumelle', 'cousin', 'cousine',
  'mari', 'femme', 'époux', 'épouse', 'conjoint', 'conjointe', 'marié', 'mariée', 'fiancé', 'fiancée',
]

const NATURE_STYLE = {
  Famille: { color: 'var(--ivory-dim)', dash: '' },
  Confiance: { color: 'var(--ok)', dash: '' },
  Protection: { color: 'var(--midnight-bright)', dash: '' },
  Admiration: { color: 'var(--violet)', dash: '' },
  Rivalité: { color: 'var(--danger)', dash: '3 3' },
  Tension: { color: 'var(--wine-bright)', dash: '3 3' },
  Distance: { color: 'var(--ivory-faint)', dash: '1 4' },
  Trahison: { color: 'var(--danger)', dash: '' },
  Lien: { color: 'var(--line-strong)', dash: '' },
}
const NATURE_ORDER = ['Famille', 'Confiance', 'Protection', 'Admiration', 'Rivalité', 'Tension', 'Distance', 'Trahison', 'Lien']
const INTENSITY_WIDTH = { faible: 0.9, moyen: 1.5, fort: 2.3 }
const INTENSITY_OPACITY = { faible: 0.55, moyen: 0.85, fort: 1 }

function normalize(text) {
  return String(text || '').trim().toLowerCase()
}

// Classe un libellé de relation ('Frère jumeau', 'Neveu', 'Père'…) en
// génération relative : 'up' (ascendant), 'down' (descendant), 'side' (même
// génération) ou null (rien de reconnu — reste neutre). Purement une lecture
// du texte déjà écrit par l'utilisatrice, aucune invention.
function wordBucket(type) {
  const t = normalize(type)
  if (!t) return null
  if (UP_WORDS.some((w) => t.includes(w))) return 'up'
  if (DOWN_WORDS.some((w) => t.includes(w))) return 'down'
  if (SIDE_WORDS.some((w) => t.includes(w))) return 'side'
  return null
}

function isKinshipType(type) {
  return wordBucket(type) !== null
}

function classifyNature(rel) {
  const explicit = rel?.nature && NATURE_STYLE[rel.nature] ? rel.nature : null
  if (explicit) return explicit
  return isKinshipType(rel?.type) ? 'Famille' : 'Lien'
}

function classifyIntensity(rel) {
  return rel?.intensity && INTENSITY_WIDTH[rel.intensity] ? rel.intensity : 'moyen'
}

function fullName(c) {
  return [c?.firstName, c?.lastName].filter(Boolean).join(' ')
}

function initials(c) {
  return ((c?.firstName?.[0] || '') + (c?.lastName?.[0] || '')).toUpperCase()
}

// Regroupe les relations de TOUS les membres passés en une liste d'arêtes
// non orientées, en conservant les deux sens séparément (fromA / fromB) :
// c'est ce qui permet à Kazuko de décrire Hachiro autrement que Hachiro ne
// décrit Kazuko, sans perdre l'un des deux textes.
function collectEdges(members) {
  const ids = new Set(members.map((m) => m.id))
  const map = new Map()
  members.forEach((m) => {
    ;(m.relations || []).forEach((rel) => {
      if (!rel.characterId || rel.characterId === m.id || !ids.has(rel.characterId)) return
      const key = [m.id, rel.characterId].sort().join('::')
      const entry = map.get(key) || { key, a: [m.id, rel.characterId].sort()[0], b: [m.id, rel.characterId].sort()[1], fromA: null, fromB: null }
      if (m.id === entry.a) entry.fromA = rel
      else entry.fromB = rel
      map.set(key, entry)
    })
  })
  return [...map.values()]
}

function degreeMap(members, edges) {
  const degree = new Map(members.map((m) => [m.id, 0]))
  edges.forEach((e) => {
    degree.set(e.a, (degree.get(e.a) || 0) + 1)
    degree.set(e.b, (degree.get(e.b) || 0) + 1)
  })
  return degree
}

// La relation « qui parle » d'une arête, pour l'affichage : côté centre
// quand l'arête touche le centre (on préfère toujours les mots du
// personnage central), sinon un des deux côtés de façon stable.
function primaryRelation(edge, centerId) {
  if (edge.a === centerId) return edge.fromA || edge.fromB
  if (edge.b === centerId) return edge.fromB || edge.fromA
  return edge.fromA || edge.fromB
}

function bucketForCenterEdge(edge, centerId) {
  const centerIsA = edge.a === centerId
  const forward = centerIsA ? edge.fromA : edge.fromB
  const backward = centerIsA ? edge.fromB : edge.fromA
  if (forward?.type) {
    const b = wordBucket(forward.type)
    if (b) return b
  }
  if (backward?.type) {
    const b = wordBucket(backward.type)
    if (b === 'up') return 'down'
    if (b === 'down') return 'up'
    if (b === 'side') return 'side'
  }
  return 'side'
}

function spreadAngles(count, startDeg, endDeg) {
  if (count <= 0) return []
  if (count === 1) return [(startDeg + endDeg) / 2]
  const step = (endDeg - startDeg) / (count - 1)
  return Array.from({ length: count }, (_, i) => startDeg + i * step)
}

function fanAround(baseDeg, count, spreadDeg) {
  return spreadAngles(count, baseDeg - spreadDeg / 2, baseDeg + spreadDeg / 2)
}

function pct(x, y) {
  return { left: `${(x / VBW) * 100}%`, top: `${(y / VBH) * 100}%` }
}

// Point à t=0.5 d'une courbe de Bézier quadratique + un chemin SVG « Q »,
// avec un léger arc (perpendiculaire au segment) plutôt qu'une ligne
// droite — le sens de l'arc alterne d'une arête à l'autre pour limiter les
// croisements superposés.
function edgeGeometry(pa, pb, curveSign) {
  const mx = (pa.x + pb.x) / 2
  const my = (pa.y + pb.y) / 2
  const dx = pb.x - pa.x
  const dy = pb.y - pa.y
  const dist = Math.hypot(dx, dy) || 1
  const nx = -dy / dist
  const ny = dx / dist
  const bulge = Math.min(dist * 0.22, 13) * curveSign
  const cx = mx + nx * bulge
  const cy = my + ny * bulge
  const mid = { x: 0.25 * pa.x + 0.5 * cx + 0.25 * pb.x, y: 0.25 * pa.y + 0.5 * cy + 0.25 * pb.y }
  return { d: `M ${pa.x} ${pa.y} Q ${cx} ${cy} ${pb.x} ${pb.y}`, mid }
}

function useNarrow(query = '(max-width: 640px)') {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(query)
    const update = () => setNarrow(mq.matches)
    update()
    if (mq.addEventListener) mq.addEventListener('change', update)
    else mq.addListener(update)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', update)
      else mq.removeListener(update)
    }
  }, [query])
  return narrow
}

function Portrait({ character, size = 'md' }) {
  const frameColor = resolveFrameColor(character)
  const meta = getFrameMeta(frameColor)
  return (
    <span className={`relation-graph__portrait relation-graph__portrait--${size}`}>
      <span
        className="relation-graph__disc"
        style={{ inset: `${meta.inset.top}% ${meta.inset.right}% ${meta.inset.bottom}% ${meta.inset.left}%` }}
      >
        {imgSrc(character.portrait) ? (
          <img
            src={imgSrc(character.portrait)}
            alt={fullName(character)}
            loading="lazy"
            style={{ objectPosition: imgFocus(character.portrait) }}
          />
        ) : (
          <span className="relation-graph__initials">{initials(character)}</span>
        )}
      </span>
      <PixelFrame frameColor={frameColor} className="relation-graph__frame" />
    </span>
  )
}

// Petites icônes discrètes (grille 8×8, même esprit que PixelGlyphs) pour
// les natures de lien les plus « chargées » émotionnellement. Volontairement
// absentes de Famille/Lien pour ne pas surcharger le cas courant.
function NatureIcon({ nature }) {
  const common = { viewBox: '0 0 8 8', width: 8, height: 8, fill: 'currentColor', 'aria-hidden': true }
  switch (nature) {
    case 'Confiance':
    case 'Admiration':
      return (
        <svg {...common}>
          <rect x="1" y="2" width="2" height="2" />
          <rect x="5" y="2" width="2" height="2" />
          <rect x="2" y="4" width="4" height="1" />
          <rect x="3" y="5" width="2" height="1" />
          <rect x="3.5" y="6" width="1" height="1" />
        </svg>
      )
    case 'Protection':
      return (
        <svg {...common}>
          <rect x="2" y="0" width="4" height="1" />
          <rect x="1" y="1" width="6" height="3" />
          <rect x="2" y="4" width="4" height="2" />
          <rect x="3" y="6" width="2" height="1" />
        </svg>
      )
    case 'Rivalité':
    case 'Trahison':
      return (
        <svg {...common}>
          <rect x="0" y="0" width="1" height="1" />
          <rect x="1" y="1" width="1" height="1" />
          <rect x="2" y="2" width="1" height="1" />
          <rect x="1" y="3" width="1" height="1" />
          <rect x="3" y="3" width="1" height="1" />
          <rect x="2" y="4" width="1" height="1" />
          <rect x="4" y="5" width="1" height="1" />
          <rect x="5" y="6" width="1" height="1" />
          <rect x="6" y="7" width="1" height="1" />
        </svg>
      )
    case 'Tension':
      return (
        <svg {...common}>
          <rect x="4" y="0" width="1" height="2" />
          <rect x="2" y="2" width="2" height="1" />
          <rect x="4" y="3" width="1" height="1" />
          <rect x="3" y="4" width="2" height="1" />
          <rect x="4" y="5" width="1" height="2" />
        </svg>
      )
    case 'Distance':
      return (
        <svg {...common}>
          <rect x="0" y="3" width="2" height="2" />
          <rect x="6" y="3" width="2" height="2" />
        </svg>
      )
    default:
      return null
  }
}

function RelationPanel({ edge, byId, onClose }) {
  if (!edge) return null
  const a = byId[edge.a]
  const b = byId[edge.b]
  if (!a || !b) return null
  const rows = []
  if (edge.fromA) rows.push({ from: a, to: b, rel: edge.fromA })
  if (edge.fromB) rows.push({ from: b, to: a, rel: edge.fromB })

  return (
    <div className="relation-graph__panel" role="dialog" aria-label={`Relation entre ${fullName(a)} et ${fullName(b)}`}>
      <button type="button" className="relation-graph__panel-close" onClick={onClose} aria-label="Fermer">
        ×
      </button>
      <div className="relation-graph__panel-pair">
        <Portrait character={a} size="sm" />
        <span className="relation-graph__panel-versus" aria-hidden="true">
          ⟷
        </span>
        <Portrait character={b} size="sm" />
      </div>
      {rows.length === 0 ? (
        <p className="relation-graph__panel-empty">Aucun détail renseigné pour ce lien.</p>
      ) : (
        rows.map((r, i) => (
          <p key={i} className="relation-graph__panel-row">
            <Link to={`/personnages/${r.from.id}`}>{fullName(r.from)}</Link>
            <span className="relation-graph__panel-arrow" aria-hidden="true">
              {' '}
              →{' '}
            </span>
            <Link to={`/personnages/${r.to.id}`}>{fullName(r.to)}</Link>
            {r.rel.type && <strong> : {r.rel.type}</strong>}
            {r.rel.description && <span> — {r.rel.description}</span>}
            {(r.rel.nature || r.rel.intensity) && (
              <span className="relation-graph__panel-tags">
                {r.rel.nature && <span className="relation-graph__tag">{r.rel.nature}</span>}
                {r.rel.intensity && <span className="relation-graph__tag relation-graph__tag--ghost">{r.rel.intensity}</span>}
              </span>
            )}
          </p>
        ))
      )}
    </div>
  )
}

function Legend({ natures }) {
  if (natures.length === 0) return null
  return (
    <div className="relation-graph__legend" aria-hidden="true">
      {natures.map((n) => (
        <span key={n} className="relation-graph__legend-item">
          <span
            className="relation-graph__legend-swatch"
            style={{
              background: NATURE_STYLE[n].color,
              opacity: NATURE_STYLE[n].dash ? 0.6 : 1,
            }}
          />
          <NatureIcon nature={n} />
          {n}
        </span>
      ))}
    </div>
  )
}

export default function RelationGraph({ members, centerId }) {
  const [hoveredId, setHoveredId] = useState(null)
  const [activeEdge, setActiveEdge] = useState(null)
  const narrow = useNarrow()

  const byId = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members])
  const edges = useMemo(() => collectEdges(members), [members])

  const resolvedCenterId = useMemo(() => {
    if (centerId && byId[centerId]) return centerId
    if (members.length === 0) return null
    const degree = degreeMap(members, edges)
    return members.reduce((best, m) => ((degree.get(m.id) || 0) > (degree.get(best.id) || 0) ? m : best), members[0]).id
  }, [centerId, byId, members, edges])

  const center = resolvedCenterId ? byId[resolvedCenterId] : null
  const satellites = useMemo(() => members.filter((m) => m.id !== resolvedCenterId), [members, resolvedCenterId])

  const centerEdges = useMemo(
    () => edges.filter((e) => e.a === resolvedCenterId || e.b === resolvedCenterId),
    [edges, resolvedCenterId],
  )

  const buckets = useMemo(() => {
    const b = { up: [], down: [], side: [] }
    satellites.forEach((s) => {
      const edge = centerEdges.find((e) => e.a === s.id || e.b === s.id)
      const bucket = edge ? bucketForCenterEdge(edge, resolvedCenterId) : 'side'
      b[bucket].push(s)
    })
    return b
  }, [satellites, centerEdges, resolvedCenterId])

  const positions = useMemo(() => {
    if (!center) return {}
    const pos = { [center.id]: { x: CX, y: CY } }
    const place = (list, angles, radius) => {
      list.forEach((m, i) => {
        const rad = (angles[i] * Math.PI) / 180
        pos[m.id] = { x: CX + Math.cos(rad) * radius, y: CY + Math.sin(rad) * radius }
      })
    }
    place(buckets.up, spreadAngles(buckets.up.length, -160, -20), RADIUS.up)
    place(buckets.down, spreadAngles(buckets.down.length, 20, 160), RADIUS.down)
    const right = buckets.side.filter((_, i) => i % 2 === 0)
    const left = buckets.side.filter((_, i) => i % 2 === 1)
    place(right, fanAround(0, right.length, 60), RADIUS.side)
    place(left, fanAround(180, left.length, 60), RADIUS.side)
    return pos
  }, [center, buckets])

  const renderEdges = useMemo(() => {
    return edges
      .map((e, i) => {
        const pa = positions[e.a]
        const pb = positions[e.b]
        if (!pa || !pb) return null
        const rel = primaryRelation(e, resolvedCenterId)
        const nature = classifyNature(rel)
        const intensity = classifyIntensity(rel)
        const { d, mid } = edgeGeometry(pa, pb, i % 2 === 0 ? 1 : -1)
        return { ...e, rel, nature, intensity, label: rel?.type || '', d, mid }
      })
      .filter(Boolean)
  }, [edges, positions, resolvedCenterId])

  const neighborIds = useMemo(() => {
    if (!hoveredId) return null
    const set = new Set([hoveredId])
    renderEdges.forEach((e) => {
      if (e.a === hoveredId) set.add(e.b)
      if (e.b === hoveredId) set.add(e.a)
    })
    return set
  }, [hoveredId, renderEdges])

  const usedNatures = useMemo(() => {
    const set = new Set(renderEdges.map((e) => e.nature))
    return NATURE_ORDER.filter((n) => set.has(n))
  }, [renderEdges])

  if (!center || renderEdges.length === 0) {
    return <p className="adm-muted">Aucun lien renseigné entre les membres.</p>
  }

  if (narrow) {
    const order = [...buckets.up, ...buckets.side, ...buckets.down]
    return (
      <div className="relation-graph relation-graph--mobile">
        <div className="relation-graph__mobile-center">
          <Portrait character={center} size="lg" />
          <strong>{fullName(center)}</strong>
        </div>
        <ul className="relation-graph__mobile-list">
          {order.map((s) => {
            const edge = renderEdges.find(
              (e) => (e.a === resolvedCenterId && e.b === s.id) || (e.b === resolvedCenterId && e.a === s.id),
            )
            return (
              <li key={s.id} className="relation-graph__mobile-row">
                <Link to={`/personnages/${s.id}`} className="relation-graph__mobile-portrait-link">
                  <Portrait character={s} size="sm" />
                  <span>{fullName(s)}</span>
                </Link>
                {edge?.label && (
                  <button
                    type="button"
                    className="relation-graph__pill"
                    style={{ borderColor: NATURE_STYLE[edge.nature].color, color: NATURE_STYLE[edge.nature].color }}
                    onClick={() => setActiveEdge(edge)}
                  >
                    <NatureIcon nature={edge.nature} />
                    {edge.label}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
        <Legend natures={usedNatures} />
        <RelationPanel edge={activeEdge} byId={byId} onClose={() => setActiveEdge(null)} />
      </div>
    )
  }

  return (
    <div className="relation-graph">
      <div className="relation-graph__stage" style={{ aspectRatio: `${VBW} / ${VBH}` }}>
        <svg className="relation-graph__lines" viewBox={`0 0 ${VBW} ${VBH}`} preserveAspectRatio="none" aria-hidden="true">
          {renderEdges.map((e) => {
            const dimmed = hoveredId ? !(e.a === hoveredId || e.b === hoveredId) : false
            const active = hoveredId ? e.a === hoveredId || e.b === hoveredId : false
            const style = NATURE_STYLE[e.nature]
            return (
              <g
                key={e.key}
                className={`relation-graph__edge${dimmed ? ' is-dimmed' : ''}${active ? ' is-active' : ''}`}
              >
                <path
                  d={e.d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={7}
                  style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                  onClick={() => setActiveEdge(e)}
                  role="button"
                  tabIndex={-1}
                />
                <path
                  d={e.d}
                  fill="none"
                  stroke={style.color}
                  strokeDasharray={style.dash || undefined}
                  strokeWidth={INTENSITY_WIDTH[e.intensity]}
                  strokeOpacity={INTENSITY_OPACITY[e.intensity]}
                  style={{ pointerEvents: 'none' }}
                />
              </g>
            )
          })}
        </svg>

        <div className="relation-graph__cartouches">
          {renderEdges
            .filter((e) => e.label)
            .map((e) => {
              const dimmed = hoveredId ? !(e.a === hoveredId || e.b === hoveredId) : false
              return (
                <button
                  key={e.key}
                  type="button"
                  className={`relation-graph__pill${dimmed ? ' is-dimmed' : ''}`}
                  style={{ ...pct(e.mid.x, e.mid.y), borderColor: NATURE_STYLE[e.nature].color, color: NATURE_STYLE[e.nature].color }}
                  onClick={() => setActiveEdge(e)}
                >
                  <NatureIcon nature={e.nature} />
                  {e.label}
                </button>
              )
            })}
        </div>

        <div className="relation-graph__nodes">
          {[center, ...satellites].map((n) => {
            const p = positions[n.id]
            if (!p) return null
            const isCenter = n.id === center.id
            const dimmed = neighborIds ? !neighborIds.has(n.id) : false
            const active = hoveredId === n.id
            return (
              <Link
                key={n.id}
                to={`/personnages/${n.id}`}
                className={`relation-graph__node${isCenter ? ' relation-graph__node--center' : ''}${dimmed ? ' is-dimmed' : ''}${active ? ' is-active' : ''}`}
                style={pct(p.x, p.y)}
                onMouseEnter={() => setHoveredId(n.id)}
                onMouseLeave={() => setHoveredId(null)}
                onFocus={() => setHoveredId(n.id)}
                onBlur={() => setHoveredId(null)}
              >
                {isCenter && <span className="relation-graph__halo" aria-hidden="true" />}
                <Portrait character={n} size={isCenter ? 'lg' : 'md'} />
                <span className="relation-graph__name">{n.firstName || n.lastName}</span>
              </Link>
            )
          })}
        </div>
      </div>

      <Legend natures={usedNatures} />
      <RelationPanel edge={activeEdge} byId={byId} onClose={() => setActiveEdge(null)} />
    </div>
  )
}
