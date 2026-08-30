import './Ambient.css'

// Décor de fond : halos colorés qui dérivent lentement + fines poussières
// d'étoiles. Purement décoratif, sous le contenu, sans interaction.
// L'animation se coupe avec prefers-reduced-motion (voir Ambient.css).
export default function Ambient() {
  return (
    <div className="ambient" aria-hidden="true">
      <span className="ambient__blob ambient__blob--wine" />
      <span className="ambient__blob ambient__blob--midnight" />
      <span className="ambient__blob ambient__blob--violet" />
      <div className="ambient__dust" />
    </div>
  )
}
