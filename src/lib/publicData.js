// src/lib/publicData.js
//
// Lecture « live » des personnages publiés, depuis /__public/api/* (servi
// en dev par plugins/woltar-public.js, en prod par le Worker Cloudflare —
// voir worker/routes/public.js). Chaque hook initialise son état avec les
// données statiques déjà présentes dans le bundle (src/data/characters.js)
// pour un premier rendu instantané sans attendre le réseau, puis se met à
// jour avec la réponse serveur — c'est ce qui permet à une fiche
// créée/modifiée depuis /compte d'apparaître sur le site public sans
// reconstruire le site.
//
// Si le fetch échoue (site figé en preview statique, coupure réseau...), on
// garde simplement les données statiques déjà affichées : aucune régression
// par rapport à l'ancien comportement 100 % statique.
//
// Historique — tâche « Aether » : `usePublicPersona` (Persona RP publique
// d'un personnage) a été retiré — le système de Personas est supprimé.

import { useEffect, useState } from 'react'
import { allCharacters as staticCharacters, characters as staticPublicCharacters } from '../data/characters.js'
import { clans as staticClans, getClanById as getStaticClanById } from '../data/clans.js'
import { locations as staticLocations, getLocationById as getStaticLocationById } from '../data/locations.js'

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

// Liste des clans publiés (pour /univers, /clans) — inclut le clan canon
// (Nakamura) et les clans créés depuis un compte joueur, une fois publiés.
export function usePublicClans() {
  const [clans, setClans] = useState(staticClans)

  useEffect(() => {
    let alive = true
    getJson(`${BASE}/clans`)
      .then((data) => {
        if (alive && Array.isArray(data)) setClans(data)
      })
      .catch(() => {
        // pas de backend joignable : on garde les données statiques.
      })
    return () => {
      alive = false
    }
  }, [])

  return clans
}

// Une fiche clan précise (pour /clans/:id).
export function usePublicClan(id) {
  const [clan, setClan] = useState(() => getStaticClanById(id) || null)

  useEffect(() => {
    setClan(getStaticClanById(id) || null)
    if (!id) return undefined
    let alive = true
    getJson(`${BASE}/clans/${encodeURIComponent(id)}`)
      .then((data) => {
        if (alive && data) setClan(data)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [id])

  return clan
}

export function usePublicPlayers() {
  const [players, setPlayers] = useState([])
  useEffect(() => {
    let alive = true
    getJson(`${BASE}/players`).then((data) => { if (alive && Array.isArray(data)) setPlayers(data) }).catch(() => {})
    return () => { alive = false }
  }, [])
  return players
}

export function usePublicLocations() {
  const [locations, setLocations] = useState(staticLocations)

  useEffect(() => {
    let alive = true
    getJson(`${BASE}/locations`)
      .then((data) => {
        if (alive && Array.isArray(data)) setLocations(data)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  return locations
}

export function usePublicLocation(id) {
  const [location, setLocation] = useState(() => getStaticLocationById(id) || null)

  useEffect(() => {
    setLocation(getStaticLocationById(id) || null)
    if (!id) return undefined
    let alive = true
    getJson(`${BASE}/locations/${encodeURIComponent(id)}`)
      .then((data) => {
        if (alive && data) setLocation(data)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [id])

  return location
}
