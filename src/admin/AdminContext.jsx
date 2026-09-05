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
import timelinesJson from '../data/timelines.json'

const BUNDLED = {
  home: homeJson,
  characters: charactersJson,
  locations: locationsJson,
  clans: clansJson,
  events: eventsJson,
  archives: archivesJson,
  posts: postsJson,
  aether: aetherJson,
  timelines: timelinesJson,
}

export function AdminProvider({ children, currentUser = null }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [readOnly, setReadOnly] = useState(!adminAvailable)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (!adminAvailable) {
        setData({ ...BUNDLED })
        setReadOnly(true)
        return
      }
      const entries = await Promise.all(
        COLLECTION_NAMES.map(async (name) => [name, await getCollection(name)]),
      )
      setData(Object.fromEntries(entries))
      setReadOnly(false)
    } catch (e) {
      setError(String(e.message || e))
      setData({ ...BUNDLED })
      setReadOnly(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = useCallback(async (name, rows) => {
    if (readOnly) throw new Error('Mode lecture seule.')
    const savedRows = await saveCollection(name, rows)
    setData((d) => ({ ...d, [name]: savedRows }))
    return savedRows
  }, [readOnly])

  const value = useMemo(
    () => ({ data, loading, error, reload: load, save, readOnly, currentUser }),
    [data, loading, error, load, save, readOnly, currentUser],
  )

  return <AdminCtx.Provider value={value}>{children}</AdminCtx.Provider>
}
