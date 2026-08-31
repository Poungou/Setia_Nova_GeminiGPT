import './PixelIcons.css'

// Étoile paopu — illustration fournie par l'utilisatrice
// (illustration_site/paopu.png), rognée sur son contenu réel (le fichier
// source est un canevas 1536×1024 avec l'étoile posée dedans, beaucoup de
// vide transparent autour) puis réduite pour un usage en icône inline.
// Remplace l'ancien rendu SVG pixel-art dessiné à la main (grille 9×9).
// Le PNG rogné n'est pas carré (ratio largeur/hauteur ≈ 0.82, à cause de
// la feuille qui dépasse en haut) : `size` fixe la hauteur affichée, la
// largeur suit proportionnellement pour ne jamais déformer l'étoile.
const ASPECT = 197 / 240 // largeur / hauteur du PNG rogné (public/icons/paopu.png)

export default function PixelPaopu({ size = 18, className = '', title }) {
  const height = size
  const width = Math.round(size * ASPECT)
  return (
    <img
      src="/icons/paopu.png"
      alt={title || ''}
      aria-hidden={title ? undefined : true}
      width={width}
      height={height}
      loading="lazy"
      className={`pixel-icon pixel-icon--paopu ${className}`.trim()}
    />
  )
}
