// src/lib/publicData.js
//
// Lecture « live » des personnages/Personas publiés, depuis /__public/api/*
// (servi en dev par plugins/woltar-public.js, en prod par le Worker
// Cloudflare — voir worker/routes/public.js). Chaque hook initialise son
// état avec les données statiques déjà présentes dans le bundle
// (src/data/characters.js, personas.js) pour un premier rendu instantané
// sans attendre le réseau, puis se met à jour avec la réponse serveur —
// c'est ce qui permet à une fiche créée/modifiée depuis /compte d'apparaître
// sur le site public sans reconstruire le site.
//
// Si le fetch échoue (site figé en preview statique, coupure réseau...), on
// garde simplement les données statiques déjà affichées : aucune régression
// par rapport à l'ancien comportement 100 % statique.

import { useEffect, useState } from 'react'
import { allCharacters as staticCharacters, characters as staticPublicCharacters } from '../data/characters.js'
import { getPersonaByCharacterId } from '../data/personas.js'

const BASE = '/__public/api'

async function getJson(url) {
  const res = await fetch(url, { credentials: 'omit' })
  if (!res.ok) throw new Error(`Erreur ${res.status}`)
  const body = await res.json().catch(() => ({}))
  return body.data
}

// Liste des personnages publiés (pour /personnages).
export function usePublicCharacters() {
  const [characters, setCharacters] = useState(staticPublicCharacters)

  useEffect(() => {
    let alive = true
    getJson(`${BASE}/characters`)
      .then((data) => {
        if (alive && Array.isArray(data)) setCharacters(data)
      })
      .catch(() => {
        // pas de backend joignable (preview statique, coupure réseau...) :
        // on garde les données statiques déjà affichées.
      })
    return () => {
      alive = false
    }
  }, [])

  return characters
}

// Une fiche personnage précise (pour /personnages/:id).
export function usePublicCharacter(id) {
  const [character, setCharacter] = useState(() => staticCharacters.find((c) => c.id === id) || null)

  useEffect(() => {
    setCharacter(staticCharacters.find((c) => c.id === id) || null)
    if (!id) return undefined
    let alive = true
    getJson(`${BASE}/characters/${encodeURIComponent(id)}`)
      .then((data) => {
        if (alive && data) setCharacter(data)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [id])

  return character
}

// La Persona IA active d'un personnage, si elle existe (jamais les champs
// privés — voir worker/lib/publicStore.js, PUBLIC_PERSONA_FIELDS).
export function usePublicPersona(characterId) {
  const [persona, setPersona] = useState(() =>
    characterId ? getPersonaByCharacterId(characterId) || null : null,
  )

  useEffect(() => {
    setPersona(characterId ? getPersonaByCharacterId(characterId) || null : null)
    if (!characterId) return undefined
    let alive = true
    getJson(`${BASE}/personas/${encodeURIComponent(characterId)}`)
      .then((data) => {
        if (alive) setPersona(data || null)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [characterId])

  return persona
}
