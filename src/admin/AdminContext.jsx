// src/admin/AdminContext.jsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminAvailable, getCollection, saveCollection } from './adminApi.js'
import { COLLECTION_NAMES } from './schema.js'
import { AdminCtx } from './useAdmin.js'

// Repli lecture seule (build de prod) : on lit les JSON empaquetés.
import charactersJson from '../data/characters.json'
import locationsJson from '../data/locations.json'
import clansJson from '../data/clans.json'
import eventsJson from '../data/events.json'
import archivesJson from '../data/archives.json'
import postsJson from '../data/posts.json'
import aetherJson from '../data/aether.json'
import homeJson from '../data/home.json'

const BUNDLED = {
  home: homeJson,
  characters: charactersJson,
  locations: locationsJson,
  clans: clansJson,
  events: eventsJson,
  archives: archivesJson,
  posts: postsJson,
  aether: aetherJson,
}

export function AdminProvider({ children, currentUser = null }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (!adminAvailable) {
        setData({ ...BUNDLED })
        return
      }
      const entries = await Promise.all(
        COLLECTION_NAMES.map(async (name) => [name, await getCollection(name)]),
      )
      setData(Object.fromEntries(entries))
    } catch (e) {
      setError(String(e.message || e))
      setData({ ...BUNDLED })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = useCallback(async (name, rows) => {
    await saveCollection(name, rows)
    setData((d) => ({ ...d, [name]: rows }))
  }, [])

  const value = useMemo(
    () => ({ data, loading, error, reload: load, save, readOnly: !adminAvailable, currentUser }),
    [data, loading, error, load, save, currentUser],
  )

  return <AdminCtx.Provider value={value}>{children}</AdminCtx.Provider>
}
