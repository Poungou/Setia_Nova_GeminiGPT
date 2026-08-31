import { getFrameMeta } from '../../lib/frames.js'
import './PixelIcons.css'

// Cadre de vignette personnage — illustration fournie par l'utilisatrice
// (pack "cadre_grand_[couleur]", voir public/frames/ + le lib src/lib/frames.js
// pour la logique de choix de teinte). Remplace le rendu pixel-art dessiné à
// la main du 1er jet, jugé insuffisant. `frameColor` doit être l'une des
// teintes de FRAME_COLORS ('bleu' | 'gris' | 'rouge' | 'violet').
export default function PixelFrame({ frameColor = 'gris', className = '' }) {
  const meta = getFrameMeta(frameColor)
  return (
    <img
      src={meta.src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      className={`pixel-icon pixel-icon--frame ${className}`.trim()}
    />
  )
}
