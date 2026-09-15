import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import './Lightbox.css'
import SafeImage from '../SafeImage/SafeImage.jsx'

// Galerie cliquable + visionneuse plein écran.
// images : liste de chaînes, ou d'objets { src, alt, label, to, source }
export default function Lightbox({ images = [], className = 'lightbox-grid' }) {
  const items = images
    .map((i) => (typeof i === 'string' ? { src: i } : i))
    .filter((i) => i && i.src)
  const [selected, setSelected] = useState(null)
  const index = items.findIndex(item => item.src === selected)
  const open = index >= 0
  const dialogRef = useRef(null)
  const itemSources = JSON.stringify(items.map(item => item.src))

  const close = useCallback(() => setSelected(null), [])
  const move = useCallback(delta => {
    const sources = JSON.parse(itemSources)
    setSelected(src => sources[(sources.indexOf(src) + delta + sources.length) % sources.length])
  }, [itemSources])
  const prev = useCallback(() => move(-1), [move])
  const next = useCallback(() => move(1), [move])

  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement
    const overflow = document.body.style.overflow
    dialogRef.current?.querySelector('button')?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'Tab') {
        const controls = [...dialogRef.current.querySelectorAll('button, a[href]')]
        const first = controls[0], last = controls[controls.length - 1]
        if (e.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) { e.preventDefault(); last?.focus() }
        else if (!e.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) { e.preventDefault(); first?.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [open, close, prev, next])

  if (!items.length) return null

  const current = open ? items[index] : null

  return (
    <>
      <div className={className}>
        {items.map((img, i) => (
          <button key={`${img.src}-${i}`} type="button" className="lightbox-thumb" aria-label={`Agrandir ${img.alt || img.label || 'l’illustration'}`} onClick={() => setSelected(img.src)}>
            <SafeImage src={img.src} alt={img.alt || img.label || ''} loading="lazy" />
            {img.label && <span className="lightbox-thumb__cap">{img.label}</span>}
          </button>
        ))}
      </div>

      {open &&
        createPortal(
          <div ref={dialogRef} className="lightbox-overlay" onClick={close} role="dialog" aria-modal="true" aria-label="Illustration agrandie">
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
              <SafeImage src={current.src} alt={current.alt || current.label || ''} />
              {(current.label || current.source || current.credit || current.to) && (
                <figcaption>
                  {current.label && <span>{current.label}</span>}
                  {(current.source || current.credit) && (
                    <span className="lightbox-figure__source">Source : {current.source || current.credit}</span>
                  )}
                  {current.to && (
                    <Link to={current.to} className="lightbox-figure__link" onClick={close}>
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
