import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import Lightbox from '../Lightbox/Lightbox.jsx'
import './GalleryGroup.css'

// Un groupe d'images de la galerie (un personnage, un lieu, un billet).
// - Une seule image : affichée directement, pas d'accordéon inutile.
// - Plusieurs images : section repliable ("menu déplant") qui s'ouvre sur un
//   carrousel horizontal défilable, plutôt qu'un pavé de vignettes identiques.
export default function GalleryGroup({ label, to, items, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const trackRef = useRef(null)

  if (items.length <= 1) {
    return (
      <div className="gallery-group gallery-group--single">
        <Lightbox images={items} className="gallery-grid" />
        {to ? (
          <Link to={to} className="gallery-group__single-label">
            {label}
          </Link>
        ) : (
          <span className="gallery-group__single-label">{label}</span>
        )}
      </div>
    )
  }

  const scroll = (dir) => {
    trackRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' })
  }

  return (
    <div className="gallery-group">
      <button
        type="button"
        className="gallery-group__header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <ChevronDown
          className={'gallery-group__chevron' + (open ? ' is-open' : '')}
          size={16}
          aria-hidden="true"
        />
        <span className="gallery-group__title">{label}</span>
        <span className="gallery-group__count">{items.length}</span>
      </button>

      {open && (
        <div className="gallery-group__body">
          {to && (
            <Link to={to} className="gallery-group__link">
              Voir la fiche →
            </Link>
          )}
          <div className="gallery-carousel">
            <button
              type="button"
              className="gallery-carousel__nav gallery-carousel__nav--prev"
              onClick={() => scroll(-1)}
              aria-label="Précédent"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="gallery-carousel__track" ref={trackRef}>
              <Lightbox images={items} className="gallery-carousel__grid" />
            </div>
            <button
              type="button"
              className="gallery-carousel__nav gallery-carousel__nav--next"
              onClick={() => scroll(1)}
              aria-label="Suivant"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
