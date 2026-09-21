import { useEffect, useState } from 'react'
import { MODERATION_CHANGED, moderationApi } from '../lib/moderationApi.js'

// Compteurs réels de la file de modération ({ pending, reports }) ou null si la
// route n'existe pas sur ce build (ex. serveur de dev local sans D1).
export function useModerationCounts(refreshKey = '') {
  const [counts, setCounts] = useState(null)

  useEffect(() => {
    let alive = true
    const load = () => moderationApi.counts().then((data) => { if (alive) setCounts(data) }).catch(() => { if (alive) setCounts(null) })
    load()
    window.addEventListener(MODERATION_CHANGED, load)
    return () => {
      alive = false
      window.removeEventListener(MODERATION_CHANGED, load)
    }
  }, [refreshKey])

  return counts
}
