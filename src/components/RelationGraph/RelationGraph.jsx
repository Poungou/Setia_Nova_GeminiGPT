import { Link } from 'react-router-dom'
import { imgSrc } from '../../lib/image.js'
import './RelationGraph.css'

const W = 640
const H = 460
const CX = W / 2
const CY = H / 2

function initials(c) {
  return ((c.firstName?.[0] || '') + (c.lastName?.[0] || '')).toUpperCase()
}

// Regroupe les relations en arêtes non orientées entre membres du clan.
function buildEdges(members) {
  const ids = new Set(members.map((m) => m.id))
  const map = new Map()
  members.forEach((m) => {
    ;(m.relations || []).forEach((rel) => {
      if (!ids.has(rel.characterId)) return
      const key = [m.id, rel.characterId].sort().join('::')
      const entry = map.get(key) || { a: m.id, b: rel.characterId, labels: new Set() }
      if (rel.type) entry.labels.add(rel.type)
      map.set(key, entry)
    })
  })
  return [...map.values()]
}

export default function RelationGraph({ members }) {
  const nodes = members.map((m, i) => {
    const angle = (i / members.length) * Math.PI * 2 - Math.PI / 2
    const r = members.length <= 2 ? 90 : 168
    return { ...m, x: CX + Math.cos(angle) * r, y: CY + Math.sin(angle) * r }
  })
  const pos = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const edges = buildEdges(members)

  if (!edges.length) {
    return <p className="adm-muted">Aucun lien renseigné entre les membres.</p>
  }

  return (
    <div className="relation-graph">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Schéma des liens entre membres du clan">
        <defs>
          {nodes.map(
            (n) =>
              imgSrc(n.portrait) && (
                <clipPath key={n.id} id={`clip-${n.id}`}>
                  <circle cx={n.x} cy={n.y} r={34} />
                </clipPath>
              ),
          )}
        </defs>

        {edges.map((e) => {
          const a = pos[e.a]
          const b = pos[e.b]
          const mx = (a.x + b.x) / 2
          const my = (a.y + b.y) / 2
          const label = [...e.labels].join(' / ')
          return (
            <g key={`${e.a}-${e.b}`} className="relation-graph__edge">
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
              {label && (
                <text x={mx} y={my} dy="-4" textAnchor="middle">
                  {label}
                </text>
              )}
            </g>
          )
        })}

        {nodes.map((n) => (
          <Link key={n.id} to={`/personnages/${n.id}`} className="relation-graph__node">
            <circle cx={n.x} cy={n.y} r={34} className="relation-graph__disc" />
            {imgSrc(n.portrait) ? (
              <image
                href={imgSrc(n.portrait)}
                x={n.x - 34}
                y={n.y - 34}
                width={68}
                height={68}
                clipPath={`url(#clip-${n.id})`}
                preserveAspectRatio="xMidYMid slice"
              />
            ) : (
              <text x={n.x} y={n.y} dy="0.35em" textAnchor="middle" className="relation-graph__initials">
                {initials(n)}
              </text>
            )}
            <text x={n.x} y={n.y + 52} textAnchor="middle" className="relation-graph__name">
              {n.firstName || n.lastName}
            </text>
          </Link>
        ))}
      </svg>
    </div>
  )
}
