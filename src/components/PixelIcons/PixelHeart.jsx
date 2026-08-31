import { pixelGrid } from '../../lib/pixelIcon.js'
import './PixelIcons.css'

// Cœur pixel-art façon Kingdom Hearts. `color` teinte le cœur (couleur
// associée au personnage, cf. characters.json → champ `color`) ; sans
// couleur définie, il retombe sur un ton neutre du thème.
const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...']
const { cols, rows, rects } = pixelGrid(HEART)

export default function PixelHeart({ color, size = 16, className = '', title }) {
  return (
    <svg
      className={`pixel-icon pixel-icon--heart ${className}`.trim()}
      width={size}
      height={size}
      viewBox={`0 0 ${cols} ${rows}`}
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      style={{ color: color || 'var(--ivory-faint)' }}
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width="1" height="1" fill="currentColor" />
      ))}
    </svg>
  )
}
