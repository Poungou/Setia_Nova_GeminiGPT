import { useMemo, useState } from 'react'
import { collectArtworks, ARTWORK_SOURCES } from '../../lib/artworks.js'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import Reveal from '../../components/Reveal/Reveal.jsx'
import FilterBar from '../../components/FilterBar/FilterBar.jsx'
import Lightbox from '../../components/Lightbox/Lightbox.jsx'
import './Gallery.css'

export default function Gallery() {
  const all = useMemo(() => collectArtworks(), [])
  const [source, setSource] = useState('all')

  const items = useMemo(
    () =>
      (source === 'all' ? all : all.filter((a) => a.source === source)).map((a) => ({
        src: a.src,
        label: a.credit ? `${a.title} · ${a.credit}` : a.title,
        alt: a.title,
        to: a.to,
      })),
    [all, source],
  )

  return (
    <PageTransition>
      <section className="container gallery-page">
        <Reveal className="section-heading">
          <span className="eyebrow">Galerie</span>
          <h1 className="section-title">Illustrations de Woltar</h1>
          <p className="gallery-page__intro">
            Toutes les images de la vitrine — fan arts, portraits, lieux. Clique pour agrandir.
          </p>
        </Reveal>

        {all.length > 0 && (
          <div className="gallery-page__controls">
            <FilterBar filters={ARTWORK_SOURCES} active={source} onChange={setSource} />
            <span className="gallery-page__count">{items.length} image{items.length > 1 ? 's' : ''}</span>
          </div>
        )}

        {items.length > 0 ? (
          <Lightbox images={items} className="gallery-grid" />
        ) : (
          <div className="empty-state">
            <strong>Aucune image pour l&rsquo;instant</strong>
            Ajoute des couvertures et des galeries dans le journal ou les fiches.
          </div>
        )}
      </section>
    </PageTransition>
  )
}
