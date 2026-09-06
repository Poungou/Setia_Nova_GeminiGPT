// src/admin/AdminMusicPage.jsx
//
// Section "Musique du site" — réglages globaux de la musique de fond
// (aucune musique / une piste en boucle / playlist), stockés via
// site_settings (voir src/lib/musicSettings.js, worker/lib/siteSettings.js).
// Page dédiée plutôt qu'une entrée SCHEMA générique : ce n'est pas une
// collection de fiches mais un unique blob de réglages + une petite liste
// de pistes (titre/URL/ordre/actif).
import { useEffect, useState } from 'react'
import { Save, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { getSiteSetting, saveSiteSetting } from './adminApi.js'
import { DEFAULT_MUSIC_SETTINGS, normalizeMusicSettings } from '../lib/musicSettings.js'
import { useAdmin } from './useAdmin.js'

const MODE_OPTIONS = [
  ['off', 'Aucune musique'],
  ['single', 'Une seule musique en boucle'],
  ['playlist', 'Playlist'],
]

function newTrack(order) {
  return { id: `track-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, title: '', src: '', order, active: true }
}

function moveTrack(tracks, index, dir) {
  const target = index + dir
  if (target < 0 || target >= tracks.length) return tracks
  const next = [...tracks]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next.map((t, i) => ({ ...t, order: i }))
}

export default function AdminMusicPage() {
  const { readOnly: adminReadOnly } = useAdmin()
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState('')

  useEffect(() => {
    let alive = true
    getSiteSetting('music')
      .then((data) => alive && setSettings(normalizeMusicSettings(data || {})))
      .catch(() => alive && setSettings(DEFAULT_MUSIC_SETTINGS))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  if (loading || !settings) return <p className="adm-muted">Chargement…</p>

  const set = (patch) => setSettings((s) => ({ ...s, ...patch }))
  const setTrack = (id, patch) => set({ tracks: settings.tracks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })
  const addTrack = () => set({ tracks: [...settings.tracks, newTrack(settings.tracks.length)] })
  const removeTrack = (id) => set({ tracks: settings.tracks.filter((t) => t.id !== id) })
  const reorder = (index, dir) => set({ tracks: moveTrack(settings.tracks, index, dir) })

  const onSave = async () => {
    if (adminReadOnly || saving) return
    setSaving(true)
    setFlash('')
    try {
      const clean = normalizeMusicSettings(settings)
      const saved = await saveSiteSetting('music', clean)
      setSettings(normalizeMusicSettings(saved || clean))
      setFlash('saved')
    } catch (e) {
      setFlash(`error:${e.message || e}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="adm-edit">
      <header className="adm-edit__head">
        <div className="adm-edit__title">
          <h1>Musique du site</h1>
          <code>site_settings · music</code>
        </div>
        <div className="adm-edit__actions">
          <button type="button" className="adm-btn adm-btn--primary" onClick={onSave} disabled={adminReadOnly || saving}>
            <Save size={15} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </header>

      {flash === 'saved' && <div className="adm-banner adm-banner--ok">Réglages musique enregistrés.</div>}
      {flash.startsWith('error:') && <div className="adm-banner adm-banner--error">{flash.slice(6)}</div>}

      <form className="adm-form" onSubmit={(e) => e.preventDefault()}>
        <fieldset className="adm-fieldset">
          <legend>Mode</legend>
          <div className="adm-field">
            <label htmlFor="music-mode">Lecture</label>
            <select
              id="music-mode"
              className="adm-input"
              value={settings.mode}
              disabled={adminReadOnly}
              onChange={(e) => set({ mode: e.target.value })}
            >
              {MODE_OPTIONS.map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </fieldset>

        <fieldset className="adm-fieldset">
          <legend>Options globales</legend>
          <div className="adm-field">
            <label htmlFor="music-volume">Volume par défaut ({Math.round(settings.volume * 100)}%)</label>
            <input
              id="music-volume"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.volume}
              disabled={adminReadOnly}
              onChange={(e) => set({ volume: Number(e.target.value) })}
            />
          </div>
          <label className="adm-field adm-field--boolean">
            <input type="checkbox" checked={settings.loop} disabled={adminReadOnly} onChange={(e) => set({ loop: e.target.checked })} />
            Lecture en boucle
          </label>
          <label className="adm-field adm-field--boolean">
            <input
              type="checkbox"
              checked={settings.shuffle}
              disabled={adminReadOnly}
              onChange={(e) => set({ shuffle: e.target.checked })}
            />
            Lecture aléatoire (playlist)
          </label>
          <label className="adm-field adm-field--boolean">
            <input
              type="checkbox"
              checked={settings.autoplay}
              disabled={adminReadOnly}
              onChange={(e) => set({ autoplay: e.target.checked })}
            />
            Autoplay si autorisé par le navigateur
          </label>
          <p className="adm-hint">
            Aucun autoplay agressif : la lecture démarre uniquement si le navigateur l’autorise, et jamais avant qu’une
            visiteuse ait déjà activé le son une première fois.
          </p>
          <label className="adm-field adm-field--boolean">
            <input
              type="checkbox"
              checked={settings.resume}
              disabled={adminReadOnly}
              onChange={(e) => set({ resume: e.target.checked })}
            />
            Reprendre la piste précédente si possible
          </label>
        </fieldset>

        {settings.mode !== 'off' && (
          <fieldset className="adm-fieldset">
            <legend>Pistes</legend>
            <div className="adm-music-tracks">
              {settings.tracks.length === 0 && <p className="adm-muted">Aucune piste. Ajoute-en une ci-dessous.</p>}
              {settings.tracks.map((track, i) => (
                <div key={track.id} className="adm-music-track">
                  <div className="adm-music-track__reorder">
                    <button type="button" className="adm-btn adm-btn--ghost" disabled={adminReadOnly || i === 0} onClick={() => reorder(i, -1)} aria-label="Monter">
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      className="adm-btn adm-btn--ghost"
                      disabled={adminReadOnly || i === settings.tracks.length - 1}
                      onClick={() => reorder(i, 1)}
                      aria-label="Descendre"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                  <input
                    className="adm-input"
                    placeholder="Titre"
                    value={track.title}
                    disabled={adminReadOnly}
                    onChange={(e) => setTrack(track.id, { title: e.target.value })}
                  />
                  <input
                    className="adm-input"
                    placeholder="Fichier audio ou URL (ex. /media/musique/piste.mp3)"
                    value={track.src}
                    disabled={adminReadOnly}
                    onChange={(e) => setTrack(track.id, { src: e.target.value })}
                  />
                  <label className="adm-music-track__active">
                    <input
                      type="checkbox"
                      checked={track.active}
                      disabled={adminReadOnly}
                      onChange={(e) => setTrack(track.id, { active: e.target.checked })}
                    />
                    Actif
                  </label>
                  <button type="button" className="adm-btn adm-btn--danger" disabled={adminReadOnly} onClick={() => removeTrack(track.id)} aria-label="Supprimer la piste">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="adm-btn" disabled={adminReadOnly} onClick={addTrack}>
              <Plus size={14} /> Ajouter une piste
            </button>
          </fieldset>
        )}
      </form>
    </div>
  )
}
