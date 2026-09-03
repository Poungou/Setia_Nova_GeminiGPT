import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import './AmbientAudio.css'

// Point d'accroche pour une future ambiance sonore legere.
// Aucun autoplay force : si le navigateur bloque la lecture, on revient au
// silence sans afficher d'erreur au visiteur.
const TRACK_SRC = '/media/ambiance.mp3'
const STORAGE_KEY = 'nova-setia-ambient-sound'
const LEGACY_STORAGE_KEY = 'woltar-ambient-audio'
const TARGET_VOLUME = 0.15

function readEnabled() {
  if (typeof window === 'undefined') return false

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === 'on') return true
    if (raw === 'off') return false

    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!legacy) return false
    const parsed = JSON.parse(legacy)
    return Boolean(parsed.playing && !parsed.muted)
  } catch {
    return false
  }
}

function writeEnabled(enabled) {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off')
  } catch {
    // Stockage indisponible : le choix reste simplement local a la session.
  }
}

export default function AmbientAudio() {
  const audioRef = useRef(null)
  const [enabled, setEnabled] = useState(readEnabled)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    writeEnabled(enabled)
  }, [enabled])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || unavailable) return

    audio.volume = TARGET_VOLUME
    audio.muted = !enabled

    if (enabled) {
      audio.play().catch(() => setEnabled(false))
    } else {
      audio.pause()
    }
  }, [enabled, unavailable])

  if (unavailable) return null

  return (
    <div className="ambient-audio" role="group" aria-label="Ambiance sonore">
      <audio ref={audioRef} src={TRACK_SRC} loop preload="none" onError={() => setUnavailable(true)} />
      <button
        type="button"
        className="ambient-audio__btn"
        onClick={() => setEnabled((value) => !value)}
        aria-label={enabled ? 'Couper le son' : 'Activer le son'}
        aria-pressed={enabled}
      >
        {enabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
      </button>
    </div>
  )
}
