// src/components/WorldMap/WorldMap.jsx
//
// Carte stylisée (pas une carte géographique littérale) de Woltar : place les
// villes sur un petit réseau abstrait, avec Sétia comme capitale/hub d'où
// partent les liens vers les autres villes. Sert de repère visuel + accès
// rapide ; la grille de fiches ville juste en dessous (voir Locations.jsx)
// reste la source du détail.
import { Link } from 'react-router-dom'
import { WORLD_MAP_POSITIONS, WORLD_MAP_HUB } from '../../lib/worldMap.js'
import './WorldMap.css'

export default function WorldMap({ cities }) {
  const nodes = cities
    .map((city) => (WORLD_MAP_POSITIONS[city.id] ? { ...city, ...WORLD_MAP_POSITIONS[city.id] } : null))
    .filter(Boolean)

  const hub = nodes.find((n) => n.id === WORLD_MAP_HUB)
  const others = hub ? nodes.filter((n) => n.id !== hub.id) : nodes

  if (nodes.length === 0) return null

  return (
    <div className="world-map" role="group" aria-label="Carte des villes de Woltar">
      <svg className="world-map__canvas" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {hub && others.map((n) => (
          <line key={n.id} x1={hub.x} y1={hub.y} x2={n.x} y2={n.y} className="world-map__link" />
        ))}
      </svg>
      {nodes.map((n) => (
        <Link
          key={n.id}
          to={`/lieux/${n.id}`}
          className={`world-map__node${n.muted ? ' world-map__node--muted' : ''}${n.id === WORLD_MAP_HUB ? ' world-map__node--hub' : ''}`}
          style={{ left: `${n.x}%`, top: `${n.y}%` }}
        >
          <span className="world-map__dot" />
          <span className="world-map__label">{n.name}</span>
        </Link>
      ))}
    </div>
  )
}
