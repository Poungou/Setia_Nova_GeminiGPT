import { useEffect, useState } from 'react'
import { normalizeHomeSettings } from './homeSettings.js'

export default function useHomeSettings() {
  const [settings, setSettings] = useState(() => normalizeHomeSettings())
  useEffect(() => {
    const controller = new globalThis.AbortController()
    const refresh = () => fetch('/__public/api/home', { cache: 'no-store', credentials: 'omit', signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Accueil indisponible'); return response.json() })
      .then(body => { if (body.data && !controller.signal.aborted) setSettings(normalizeHomeSettings(body.data)) })
      .catch(() => {})
    refresh()
    window.addEventListener('focus', refresh)
    return () => { controller.abort(); window.removeEventListener('focus', refresh) }
  }, [])
  return settings
}
