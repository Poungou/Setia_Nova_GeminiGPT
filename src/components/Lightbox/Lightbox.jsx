import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import './Lightbox.css'

// Galerie cliquable + visionneuse plein écran.
// images : liste de chaînes, ou d'objets { src, alt, label, to, source }
export default function Lightbox({ images = [], className = 'lightbox-grid' }) {
  const items = images
    .map((i) => (typeof i === 'string' ? { src: i } : i))
    .filter((i) => i && i.src)
  const [index, setIndex] = useState(null)
  const open = index !== null

  const close = useCallback(() => setIndex(null), [])
  const prev = useCallback(() => setIndex((i) => (i - 1 + items.length) % items.length), [items.length])
  const next = useCallback(() => setIndex((i) => (i + 1) % items.length), [items.length])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, close, prev, next])

  if (!items.length) return null

  const current = open ? items[index] : null

  return (
    <>
      <div className={className}>
        {items.map((img, i) => (
          <button key={`${img.src}-${i}`} type="button" className="lightbox-thumb" onClick={() => setIndex(i)}>
            <img src={img.src} alt={img.alt || img.label || ''} loading="lazy" />
            {img.label && <span className="lightbox-thumb__cap">{img.label}</span>}
          </button>
        ))}
      </div>

      {open &&
        createPortal(
          <div className="lightbox-overlay" onClick={close} role="dialog" aria-modal="true">
            <button className="lightbox-btn lightbox-btn--close" onClick={close} aria-label="Fermer">
              <X size={22} />
            </button>
            {items.length > 1 && (
              <button
                className="lightbox-btn lightbox-btn--prev"
                onClick={(e) => {
                  e.stopPropagation()
                  prev()
                }}
                aria-label="Précédent"
              >
                <ChevronLeft size={26} />
              </button>
            )}
            <figure className="lightbox-figure" onClick={(e) => e.stopPropagation()}>
              <img src={current.src} alt={current.alt || current.label || ''} />
              {(current.label || current.source || current.credit || current.to) && (
                <figcaption>
                  {current.label && <span>{current.label}</span>}
                  {(current.source || current.credit) && (
                    <span className="lightbox-figure__source">Source : {current.source || current.credit}</span>
                  )}
                  {current.to && (
                    <Link to={current.to} className="lightbox-figure__link">
                      voir la source →
                    </Link>
                  )}
                </figcaption>
              )}
            </figure>
            {items.length > 1 && (
              <button
                className="lightbox-btn lightbox-btn--next"
                onClick={(e) => {
                  e.stopPropagation()
                  next()
                }}
                aria-label="Suivant"
              >
                <ChevronRight size={26} />
              </button>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}
