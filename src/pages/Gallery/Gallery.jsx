import { useMemo, useRef } from 'react'
import { ArrowDownRight, Compass, Sparkles } from 'lucide-react'
import { collectArtworks, ARTWORK_SOURCES } from '../../lib/artworks.js'
import { usePublicCharacters, usePublicLocations, usePublicPosts } from '../../lib/publicData.js'
import { useCulture } from '../Culture/useCulture.js'
import useHomeSettings from '../../lib/useHomeSettings.js'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import Reveal from '../../components/Reveal/Reveal.jsx'
import FilterBar from '../../components/FilterBar/FilterBar.jsx'
import Lightbox from '../../components/Lightbox/Lightbox.jsx'
import './Gallery.css'

// Mélange Fisher–Yates : tirage sans biais, ne modifie pas le tableau d'origine.
function shuffle(list) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// Regroupe une liste d'images par entité (`to`, la route de destination),
// et ajoute un repère "3/24" à la légende quand un groupe contient plusieurs
// images — pour distinguer les vignettes entre elles au survol.
function groupByEntity(items) {
  const map = new Map()
  items.forEach((item) => {
    const key = item.to || item.label
    if (!map.has(key)) map.set(key, { key, label: item.label, to: item.to, items: [] })
    map.get(key).items.push(item)
  })
  return [...map.values()].map((group) => ({
    ...group,
    items: group.items.map((item, i) => ({
      ...item,
      label: group.items.length > 1 ? `${group.label} — ${i + 1}/${group.items.length}` : group.label,
    })),
  }))
}

export default function Gallery() {
  const people = usePublicCharacters()
  const places = usePublicLocations()
  const posts = usePublicPosts()
  const { posts: cultures } = useCulture()
  const homeSettings = useHomeSettings()
  const all = useMemo(
    () => collectArtworks({ people, places, posts, cultures }),
    [people, places, posts, cultures],
  )

  const sectionRefs = useRef({})

  // Une section par catégorie (Personnages, Lieux, Culture, Journal) —
  // toujours affichées ensemble plutôt qu'un simple filtre qui cache tout le
  // reste. Une catégorie sans aucune image renseignée n'est pas affichée.
  const sections = useMemo(
    () =>
      ARTWORK_SOURCES.map((source) => {
        const items = all
          .filter((a) => a.source === source.value)
          .map((a) => ({ src: a.src, label: a.title, alt: a.title, to: a.to, source: a.credit }))
        return { ...source, groups: groupByEntity(items), count: items.length }
      }).filter((section) => section.count > 0),
    [all],
  )

  const jumpTo = (value) => {
    sectionRefs.current[value]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const configuredFeatured = homeSettings.galleryHeroImages || []
  // Si aucune image n'est choisie à la main dans l'admin (Accueil → Accueil
  // de la galerie), la mosaïque tire 6 œuvres au hasard parmi TOUTES les
  // images publiées du site, à chaque chargement de la page. La sélection
  // manuelle, quand elle existe, reste prioritaire et fixe.
  const featured = useMemo(() => {
    if (configuredFeatured.length > 0) {
      return configuredFeatured
        .map((value) => ({ src: typeof value === 'string' ? value : value.src, title: 'Œuvre sélectionnée', source: 'personnages' }))
        .filter((item) => item.src)
    }
    return shuffle(all).slice(0, 6)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all])

  return (
    <PageTransition>
      <section className="container gallery-page">
        <Reveal className="gallery-hero">
          <div className="gallery-hero__copy">
            <span className="eyebrow"><Sparkles size={14} /> Galerie vivante</span>
            <h1 className="section-title">Entrez dans<br /><em>la galerie.</em></h1>
            <p className="gallery-page__intro">
              Portraits, fragments de mondes et visions d’artistes : chaque image ouvre une porte sur Woltar.
            </p>
            <button className="gallery-hero__cta" type="button" onClick={() => jumpTo(sections[0]?.value)}>
              Explorer les œuvres <ArrowDownRight size={17} />
            </button>
          </div>
          {featured.length > 0 && (
            <div className="gallery-hero__mosaic" aria-label="Aperçu des œuvres">
              {featured.map((item, index) => (
                <button key={`${item.src}-${index}`} type="button" className={`gallery-hero__tile gallery-hero__tile--${index + 1}`} onClick={() => jumpTo(item.source)}>
                  <img src={item.src} alt={item.title} />
                  <span>{item.title}</span>
                </button>
              ))}
              <div className="gallery-hero__stamp"><Compass size={19} /><span>à fouiller</span></div>
            </div>
          )}
        </Reveal>

        <div className="gallery-page__manifesto">
          <span><strong>{all.length}</strong> œuvres à découvrir</span>
          <span><strong>{sections.length}</strong> univers visuels</span>
          <span className="gallery-page__manifesto-note">ouvrez grand les yeux <span>✦</span></span>
        </div>

        {sections.length > 0 && (
          <div className="gallery-page__controls">
            <FilterBar
              filters={sections.map((s) => ({ value: s.value, label: s.label }))}
              active={null}
              onChange={jumpTo}
            />
            <span className="gallery-page__count">
              {all.length} image{all.length > 1 ? 's' : ''} · cliquez pour entrer
            </span>
          </div>
        )}

        {sections.length > 0 ? (
          sections.map((section) => (
            <section key={section.value} id={`galerie-${section.value}`} className="gallery-section gallery-section--badges" ref={(el) => { sectionRefs.current[section.value] = el }}>
              <div className="gallery-section__header">
                <div><span className="eyebrow">À explorer</span><h2 className="gallery-section__title">{section.value === 'personnages' ? 'Visages de Woltar' : section.label}</h2></div>
                <span className="gallery-section__count">{section.count} œuvres · choisissez un badge</span>
              </div>
              <div className="gallery-badge-grid">
                {section.groups.map((group, index) => (
                  <Lightbox key={group.key} images={group.items} renderTrigger={(open) => (
                    <button type="button" className="gallery-character-badge" onClick={open} aria-label={`Explorer les ${group.items.length} œuvres : ${group.label}`}>
                      <span className="gallery-character-badge__portrait"><img src={group.items[0].src} alt="" loading="lazy" /></span>
                      <span className="gallery-character-badge__name">{group.label}</span>
                      <span className="gallery-character-badge__mark">{String(index + 1).padStart(2, '0')} · {group.items.length} œuvre{group.items.length > 1 ? 's' : ''}</span>
                    </button>
                  )} />
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="empty-state">
            <strong>Aucune image pour l&rsquo;instant</strong>
            Ajoute des couvertures et des galeries dans le journal, les fiches ou le carnet des cultures.
          </div>
        )}
      </section>
    </PageTransition>
  )
}
