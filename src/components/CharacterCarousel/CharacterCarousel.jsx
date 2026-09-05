// src/components/CharacterCarousel/CharacterCarousel.jsx
//
// Carrousel "Visages de Woltar" de l'accueil — remplace l'ancienne grille
// figée sur les 4 premiers personnages de src/data/characters.js (donc
// uniquement les personnages canon de Poungou). Alimenté par
// usePublicCharacters() (voir src/lib/publicData.js) : la liste complète,
// déjà filtrée côté serveur aux personnages publiés (visibility !== draft),
// tous propriétaires confondus.
//
// Réutilise CharacterCard tel quel (portrait, cadre, initiales, navigation
// vers la fiche) via sa nouvelle variante `compact` plutôt que de recréer
// une carte parallèle — seule la présentation change (pas de titre RP, pas
// de résumé, pas de bouton "voir la fiche" : juste portrait + nom +
// hashtag joueur + clan/statut discret), pour garder une bande compacte.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useReducedMotion } from 'framer-motion'
import CharacterCard from '../CharacterCard/CharacterCard.jsx'
import './CharacterCarousel.css'

function shuffle(list) {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// #Officiel pour les fiches sans propriétaire (ownerUserId absent ou
// 'system'), #Pseudo pour les personnages liés à un compte joueur — voir
// worker/lib/publicStore.js#listPublicCharacterOwners pour la source de ces
// pseudos (indépendante d'un profil RP public).
function hashtagFor(character, ownerNameById) {
  const ownerId = character.ownerUserId
  if (!ownerId || ownerId === 'system') return '#Officiel'
  const name = ownerNameById.get(ownerId)
  return name ? `#${name}` : null
}

export default function CharacterCarousel({ characters, owners = [] }) {
  const reduceMotion = useReducedMotion()
  const ownerNameById = useMemo(() => new Map(owners.map((o) => [o.userId, o.name])), [owners])
  // Rotation légère : un nouvel ordre à chaque chargement de la page plutôt
  // que toujours les mêmes personnages en tête — sans aller jusqu'à un
  // auto-défilement, qui serait plus agressif que ce que demande la DA.
  const shuffled = useMemo(() => shuffle(characters), [characters])

  const trackRef = useRef(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(true)

  const updateEdges = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    setAtStart(el.scrollLeft <= 4)
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    updateEdges()
    window.addEventListener('resize', updateEdges)
    return () => window.removeEventListener('resize', updateEdges)
  }, [shuffled, updateEdges])

  const scrollByCards = (direction) => {
    const el = trackRef.current
    if (!el) return
    const amount = Math.min(el.clientWidth * 0.8, 640) * direction
    el.scrollBy({ left: amount, behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  if (shuffled.length === 0) return null

  return (
    <div className="character-carousel">
      <button
        type="button"
        className="character-carousel__arrow character-carousel__arrow--prev"
        onClick={() => scrollByCards(-1)}
        disabled={atStart}
        aria-label="Voir les personnages précédents"
      >
        <ChevronLeft size={18} aria-hidden="true" />
      </button>

      <div
        className="character-carousel__track"
        ref={trackRef}
        onScroll={updateEdges}
        role="region"
        aria-label="Visages de Woltar"
      >
        {shuffled.map((c, i) => (
          <div className="character-carousel__slide" key={c.id}>
            <CharacterCard character={c} index={i} compact hashtag={hashtagFor(c, ownerNameById)} />
          </div>
        ))}
      </div>

      <button
        type="button"
        className="character-carousel__arrow character-carousel__arrow--next"
        onClick={() => scrollByCards(1)}
        disabled={atEnd}
        aria-label="Voir les personnages suivants"
      >
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </div>
  )
}
