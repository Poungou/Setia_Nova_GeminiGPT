import { useCallback, useEffect, useRef, useState } from 'react'
import { Music, Play, Pause, SkipForward } from 'lucide-react'
import { getMusicSettings } from '../../lib/musicApi.js'
import './AmbientAudio.css'

// Lecteur de musique de fond global, configurable depuis l'admin local
// (Musique du site, voir src/admin/AdminMusicPage.jsx) — évolution du
// précédent bouton "Ambiance sonore" (piste unique fixe /media/ambiance.mp3)
// plutôt qu'un second système : même emplacement/rôle, capacités étendues
// (playlist, volume, piste suivante). Monté une seule fois à la racine du
// site public (voir App.jsx) : un seul <audio>, jamais de lecture multiple
// simultanée, et la lecture ne redémarre pas en changeant de page tant que
// ce composant reste monté.
const ENABLED_KEY = 'nova-setia-music-enabled'
const LEGACY_ENABLED_KEY = 'nova-setia-ambient-sound'
const LEGACY_WOLTAR_KEY = 'woltar-ambient-audio'
const VOLUME_KEY = 'nova-setia-music-volume'
const TRACK_KEY = 'nova-setia-music-track'

function readEnabled() {
  if (typeof window === 'undefined') return false
  try {
    const raw = window.localStorage.getItem(ENABLED_KEY)
    if (raw === 'on') return true
    if (raw === 'off') return false

    // Compat : ancien bouton "Ambiance sonore" (piste fixe unique).
    const legacy = window.localStorage.getItem(LEGACY_ENABLED_KEY)
    if (legacy === 'on') return true
    if (legacy === 'off') return false
    const legacyWoltar = window.localStorage.getItem(LEGACY_WOLTAR_KEY)
    if (!legacyWoltar) return false
    const parsed = JSON.parse(legacyWoltar)
    return Boolean(parsed.playing && !parsed.muted)
  } catch {
    return false
  }
}

// Distingue "jamais choisi" de "explicitement coupé" : l'autoplay ne doit
// tenter de démarrer que pour une visiteuse qui n'a encore jamais réglé la
// musique, jamais reproposer la lecture à quelqu'un qui l'a coupée.
function hasStoredPreference() {
  if (typeof window === 'undefined') return true
  try {
    return (
      window.localStorage.getItem(ENABLED_KEY) !== null ||
      window.localStorage.getItem(LEGACY_ENABLED_KEY) !== null ||
      window.localStorage.getItem(LEGACY_WOLTAR_KEY) !== null
    )
  } catch {
    return true
  }
}

function writeEnabled(enabled) {
  try {
    window.localStorage.setItem(ENABLED_KEY, enabled ? 'on' : 'off')
  } catch {
    // Stockage indisponible : le choix reste simplement local a la session.
  }
}

function readVolume(fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(VOLUME_KEY)
    const n = Number(raw)
    return raw !== null && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback
  } catch {
    return fallback
  }
}

function writeVolume(volume) {
  try {
    window.localStorage.setItem(VOLUME_KEY, String(volume))
  } catch {
    /* ignore */
  }
}

function readTrackIndex(max) {
  if (typeof window === 'undefined') return 0
  try {
    const n = Number(window.localStorage.getItem(TRACK_KEY))
    return Number.isInteger(n) && n >= 0 && n < max ? n : 0
  } catch {
    return 0
  }
}

function writeTrackIndex(index) {
  try {
    window.localStorage.setItem(TRACK_KEY, String(index))
  } catch {
    /* ignore */
  }
}

export default function AmbientAudio() {
  const audioRef = useRef(null)
  const panelRef = useRef(null)
  const autoplayTried = useRef(false)
  const errorStreak = useRef(0)

  const [settings, setSettings] = useState(null)
  const [unavailable, setUnavailable] = useState(false)
  const [enabled, setEnabled] = useState(readEnabled)
  const [volume, setVolume] = useState(0.4)
  const [index, setIndex] = useState(0)
  const [expanded, setExpanded] = useState(false)

  // Les réglages viennent de l'admin (site_settings côté serveur) : simple
  // lecture publique, aucune donnée sensible, un échec réseau désactive
  // juste le lecteur sans jamais bloquer la navigation.
  useEffect(() => {
    let alive = true
    getMusicSettings()
      .then((data) => {
        if (!alive || !data) return
        setSettings(data)
        setVolume(readVolume(data.volume))
        if (data.resume) setIndex(readTrackIndex(Math.max(data.tracks.length, 1)))
      })
      .catch(() => alive && setUnavailable(true))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!expanded) return
    const onKeyDown = (e) => e.key === 'Escape' && setExpanded(false)
    const onPointerDown = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setExpanded(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [expanded])

  const tracks = settings?.tracks || []
  const track = tracks[index] || null

  useEffect(() => {
    writeEnabled(enabled)
  }, [enabled])
  useEffect(() => {
    writeVolume(volume)
  }, [volume])
  useEffect(() => {
    if (settings?.resume) writeTrackIndex(index)
  }, [index, settings])

  const next = useCallback(() => {
    if (tracks.length < 2) return
    if (settings?.shuffle) {
      let n = index
      while (n === index) n = Math.floor(Math.random() * tracks.length)
      setIndex(n)
      return
    }
    if (index >= tracks.length - 1) {
      if (settings?.loop) setIndex(0)
      else setEnabled(false)
      return
    }
    setIndex((i) => i + 1)
  }, [tracks.length, index, settings])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || unavailable || !track) return
    audio.volume = volume
    audio.loop = settings?.mode === 'single' || tracks.length === 1

    if (enabled) {
      audio.play().catch(() => setEnabled(false))
    } else {
      audio.pause()
    }
  }, [enabled, unavailable, track, volume, settings, tracks.length])  // Autoplay best-effort, une seule fois si l'admin l'a autorisé — jamais
  // insistant : un refus du navigateur repasse silencieusement en pause
  // (voir le .catch() ci-dessus), sans message d'erreur pour la visiteuse.
  useEffect(() => {
    if (!settings?.autoplay || autoplayTried.current || !track) return
    autoplayTried.current = true
    if (!hasStoredPreference()) setEnabled(true)
  }, [settings, track])

  if (unavailable || !settings || settings.mode === 'off' || tracks.length === 0) return null

  const showNext = tracks.length > 1

  return (
    <div className="ambient-audio" ref={panelRef}>
      <audio
        ref={audioRef}
        src={track?.src}
        preload="none"
        onCanPlay={() => {
          errorStreak.current = 0
        }}
        onEnded={next}
        onError={() => {
          // Garde-fou : si TOUTES les pistes échouent tour à tour (fichier
          // manquant/corrompu), on arrête plutôt que de boucler sans fin
          // sur des tentatives de lecture qui échouent systématiquement.
          errorStreak.current += 1
          if (errorStreak.current >= Math.max(tracks.length, 1)) {
            setUnavailable(true)
            return
          }
          if (showNext) next()
          else setUnavailable(true)
        }}
      />

      {expanded && (
        <div className="ambient-audio__panel" role="group" aria-label="Réglages de la musique">
          {track?.title && <p className="ambient-audio__title">{track.title}</p>}
          <div className="ambient-audio__row">
            <button
              type="button"
              className="ambient-audio__play"
              onClick={() => setEnabled((v) => !v)}
              aria-pressed={enabled}
              aria-label={enabled ? 'Mettre la musique en pause' : 'Lancer la musique'}
            >
              {enabled ? <Pause size={14} /> : <Play size={14} />}
            </button>
            {showNext && (
              <button type="button" className="ambient-audio__next" onClick={next} aria-label="Piste suivante">
                <SkipForward size={14} />
              </button>
            )}
            <input
              type="range"
              className="ambient-audio__volume"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume"
            />
          </div>
        </div>
      )}

      <button
        type="button"
        className="ambient-audio__btn"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label="Musique du site"
        title={track?.title || 'Musique du site'}
      >
        <Music size={15} />
      </button>
    </div>
  )
}

