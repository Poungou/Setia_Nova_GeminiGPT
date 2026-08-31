import { useEffect, useRef, useState } from 'react'
import { Pause, Play, Volume2, VolumeX } from 'lucide-react'
import './AmbientAudio.css'

// Musique d'ambiance discrète du site. Pas de fichier fourni pour l'instant
// (voir TODO.md) : le lecteur s'efface tout seul (onError) tant que
// public/media/ambiance.mp3 n'existe pas — dépose le fichier à cet endroit
// exact pour l'activer, aucun autre changement de code nécessaire.
const TRACK_SRC = '/media/ambiance.mp3'
const STORAGE_KEY = 'woltar-ambient-audio'
const DEFAULT_VOLUME = 0.35

function readPrefs() {
  if (typeof window === 'undefined') return { volume: DEFAULT_VOLUME, muted: false, playing: false }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { volume: DEFAULT_VOLUME, muted: false, playing: false }
    const parsed = JSON.parse(raw)
    return {
      volume: typeof parsed.volume === 'number' ? Math.min(1, Math.max(0, parsed.volume)) : DEFAULT_VOLUME,
      muted: Boolean(parsed.muted),
      playing: Boolean(parsed.playing),
    }
  } catch {
    return { volume: DEFAULT_VOLUME, muted: false, playing: false }
  }
}

function writePrefs(prefs) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // stockage indisponible (navigation privée...) — pas bloquant, on
    // continue simplement sans mémoriser le choix.
  }
}

export default function AmbientAudio() {
  const audioRef = useRef(null)
  const [prefs, setPrefs] = useState(readPrefs)
  const [ready, setReady] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    writePrefs(prefs)
  }, [prefs])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = prefs.volume
    audio.muted = prefs.muted
  }, [prefs.volume, prefs.muted])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !ready || unavailable) return
    if (prefs.playing) {
      // Les navigateurs bloquent souvent la lecture automatique sans geste
      // utilisateur : si ça échoue, on repasse simplement en pause plutôt
      // que de laisser une erreur non gérée.
      audio.play().catch(() => setPrefs((p) => ({ ...p, playing: false })))
    } else {
      audio.pause()
    }
  }, [prefs.playing, ready, unavailable])

  if (unavailable) return null

  return (
    <div className="ambient-audio" role="group" aria-label="Musique d’ambiance">
      <audio
        ref={audioRef}
        src={TRACK_SRC}
        loop
        preload="none"
        onCanPlay={() => setReady(true)}
        onError={() => setUnavailable(true)}
      />
      <button
        type="button"
        className="ambient-audio__btn"
        onClick={() => setPrefs((p) => ({ ...p, playing: !p.playing }))}
        aria-label={prefs.playing ? 'Mettre la musique en pause' : 'Lancer la musique d’ambiance'}
        aria-pressed={prefs.playing}
      >
        {prefs.playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <button
        type="button"
        className="ambient-audio__btn"
        onClick={() => setPrefs((p) => ({ ...p, muted: !p.muted }))}
        aria-label={prefs.muted ? 'Réactiver le son' : 'Couper le son'}
        aria-pressed={prefs.muted}
      >
        {prefs.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </button>
      <input
        type="range"
        className="ambient-audio__volume"
        min={0}
        max={1}
        step={0.01}
        value={prefs.volume}
        onChange={(e) => setPrefs((p) => ({ ...p, volume: Number(e.target.value) }))}
        aria-label="Volume de la musique d’ambiance"
      />
    </div>
  )
}
