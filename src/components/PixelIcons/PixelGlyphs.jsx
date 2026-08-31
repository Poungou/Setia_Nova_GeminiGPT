// Mini glyphes monochromes « pixel », dans le même esprit que le reste du
// système PixelIcons (voir PixelHeart/PixelFrame/PixelPaopu) mais en version
// discrète : quelques rects sur une grille 8×8, une seule couleur
// (`currentColor`), pas d'animation. Utilisés comme petits accents devant
// les intitulés Relations / Lieux associés / Événements clés sur la fiche
// personnage — un détail « jeu vidéo rétro » subtil, pas un sprite.

const common = {
  width: 12,
  height: 12,
  viewBox: '0 0 8 8',
  fill: 'currentColor',
  'aria-hidden': true,
  focusable: false,
  className: 'pixel-glyph',
  style: { shapeRendering: 'crispEdges' },
}

// Deux petits nœuds reliés — Relations.
export function GlyphRelations(props) {
  return (
    <svg {...common} {...props}>
      <rect x="0" y="1" width="2" height="2" />
      <rect x="6" y="5" width="2" height="2" />
      <rect x="2" y="3" width="1" height="1" />
      <rect x="3" y="4" width="1" height="1" />
      <rect x="4" y="4" width="1" height="1" />
      <rect x="5" y="4" width="1" height="1" />
    </svg>
  )
}

// Petite épingle de lieu — Lieux associés.
export function GlyphLocation(props) {
  return (
    <svg {...common} {...props}>
      <rect x="2" y="0" width="4" height="1" />
      <rect x="1" y="1" width="1" height="2" />
      <rect x="6" y="1" width="1" height="2" />
      <rect x="2" y="1" width="4" height="2" />
      <rect x="3" y="3" width="2" height="2" />
      <rect x="3" y="6" width="2" height="1" />
    </svg>
  )
}

// Petit repère chronologique — Événements clés.
export function GlyphEvents(props) {
  return (
    <svg {...common} {...props}>
      <rect x="2" y="0" width="4" height="1" />
      <rect x="1" y="1" width="1" height="5" />
      <rect x="6" y="1" width="1" height="5" />
      <rect x="2" y="6" width="4" height="1" />
      <rect x="3" y="2" width="1" height="2" />
      <rect x="4" y="3" width="2" height="1" />
    </svg>
  )
}
