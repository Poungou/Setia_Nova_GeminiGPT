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
import { characters as staticPublicCharacters } from '../data/characters.js'
import { clans as staticClans, getClanById as getStaticClanById } from '../data/clans.js'
import { locations as staticLocations, getLocationById as getStaticLocationById } from '../data/locations.js'
import { getPostById as getStaticPostById, posts as staticPosts } from '../data/posts.js'

const BASE = '/__public/api'

async function getJson(url) {
  const res = await fetch(url, { credentials: 'omit' })
  if (!res.ok) {
    const error = new Error(`Erreur ${res.status}`)
    error.status = res.status
    throw error
  }
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
  const fallback = staticPublicCharacters.find((c) => c.id === id) || null
  const [result, setResult] = useState({ id: null, character: null, loading: true, error: false })

  useEffect(() => {
    if (!id) return undefined
    let alive = true
    const staticCharacter = staticPublicCharacters.find((c) => c.id === id) || null
    getJson(`${BASE}/characters/${encodeURIComponent(id)}`)
      .then((data) => {
        if (alive) setResult({ id, character: data || null, loading: false, error: false })
      })
      .catch((error) => {
        if (!alive) return
        // A public 404 also invalidates the canon fallback (e.g. a hidden D1 override).
        const notFound = error.status === 404
        setResult({ id, character: notFound ? null : staticCharacter, loading: false, error: !notFound })
      })
    return () => {
      alive = false
    }
  }, [id])

  // Never render the previous character while a new route is being fetched.
  return result.id === id ? result : { character: fallback, loading: Boolean(id), error: false }
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

// Pseudo des propriétaires de personnages publiés — voir
// worker/lib/publicStore.js#listPublicCharacterOwners. Volontairement
// distinct de usePublicPlayers (qui ne liste que les comptes ayant publié un
// profil RP) : le carrousel d'accueil doit pouvoir afficher `#Pseudo` pour
// N'IMPORTE QUEL personnage possédant un propriétaire, profil publié ou non.
export function usePublicCharacterOwners() {
  const [owners, setOwners] = useState([])
  useEffect(() => {
    let alive = true
    getJson(`${BASE}/character-owners`).then((data) => { if (alive && Array.isArray(data)) setOwners(data) }).catch(() => {})
    return () => { alive = false }
  }, [])
  return owners
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

export function usePublicPosts() {
  const [posts, setPosts] = useState(staticPosts.filter((post) => post.visibility !== 'draft'))
  useEffect(() => {
    let alive = true
    getJson(`${BASE}/posts`).then((data) => { if (alive && Array.isArray(data)) setPosts(data) }).catch(() => {})
    return () => { alive = false }
  }, [])
  return posts
}

export function usePublicPost(id) {
  const [post, setPost] = useState(() => getStaticPostById(id) || null)
  const [loading, setLoading] = useState(Boolean(id))
  useEffect(() => {
    setPost(getStaticPostById(id) || null)
    setLoading(Boolean(id))
    if (!id) return undefined
    let alive = true
    getJson(`${BASE}/posts/${encodeURIComponent(id)}`)
      .then((data) => { if (alive && data) setPost(data) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [id])
  return { post, loading }
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
