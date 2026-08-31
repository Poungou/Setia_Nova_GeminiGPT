// src/lib/pixelIcon.js
//
// Petit utilitaire pour dessiner des icônes "pixel art" en SVG à partir
// d'une grille texte (chaque ligne = une rangée, un caractère = un pixel).
// N'importe quel caractère différent de « . » ou « espace » compte comme
// un pixel plein. `shape-rendering: crispEdges` (posé par les composants
// PixelIcons/*) garde les bords nets à toutes les tailles.

export function pixelRects(bitmap) {
  const rects = []
  bitmap.forEach((row, y) => {
    ;[...row].forEach((ch, x) => {
      if (ch !== '.' && ch !== ' ') rects.push({ x, y })
    })
  })
  return rects
}

export function pixelGrid(bitmap) {
  const cols = bitmap[0]?.length || 0
  const rows = bitmap.length
  return { cols, rows, rects: pixelRects(bitmap) }
}
