// src/admin/Fields.jsx
import { useRef, useState } from 'react'
import { X, Plus, Upload, Move } from 'lucide-react'
import { uploadImage, adminAvailable } from './adminApi.js'
import { imgSrc, imgFocus, makeImageValue } from '../lib/image.js'
import Prose from '../components/Prose/Prose.jsx'
import { SCHEMA } from './schema.js'

export function Field({ field, value, onChange, allData }) {
  const common = { id: `f-${field.key}`, disabled: !adminAvailable }
  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          {...common}
          className="adm-input"
          rows={3}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case 'prose':
    case 'markdown':
      return <MarkdownInput id={common.id} value={value || ''} onChange={onChange} />
    case 'number':
      return (
        <input
          {...common}
          type="number"
          className="adm-input"
          value={value ?? 0}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        />
      )
    case 'date':
      return (
        <input
          {...common}
          type="date"
          className="adm-input"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case 'select':
      return (
        <select {...common} className="adm-input" value={value || ''} onChange={(e) => onChange(e.target.value)}>
          {field.options.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      )
    case 'tags':
      return <TagsInput value={value || []} onChange={onChange} />
    case 'image':
      return <ImageInput value={value || ''} onChange={onChange} />
    case 'gallery':
      return <GalleryInput value={value || []} onChange={onChange} />
    case 'refs':
      return <RefsInput field={field} value={value || []} onChange={onChange} allData={allData} />
    case 'relations':
      return <RelationsInput value={value || []} onChange={onChange} allData={allData} />
    case 'characterSelect':
      return <CharacterSelectInput value={value || ''} onChange={onChange} allData={allData} />
    default:
      return (
        <input
          {...common}
          type="text"
          className="adm-input"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
  }
}

function MarkdownInput({ id, value, onChange }) {
  const [preview, setPreview] = useState(false)
  return (
    <div className="adm-markdown">
      <div className="adm-markdown__tabs">
        <button type="button" className={!preview ? 'is-active' : ''} onClick={() => setPreview(false)}>
          Écrire
        </button>
        <button type="button" className={preview ? 'is-active' : ''} onClick={() => setPreview(true)}>
          Aperçu
        </button>
      </div>
      {preview ? (
        value ? (
          <Prose markdown={value} className="adm-markdown__preview" />
        ) : (
          <p className="adm-markdown__preview adm-muted">(vide)</p>
        )
      ) : (
        <textarea
          id={id}
          className="adm-input adm-prose"
          rows={14}
          value={value}
          disabled={!adminAvailable}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
}

function TagsInput({ value, onChange }) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const t = draft.trim()
    if (t && !value.includes(t)) onChange([...value, t])
    setDraft('')
  }
  return (
    <div className="adm-tags">
      <div className="adm-chips">
        {value.map((t) => (
          <span key={t} className="adm-chip">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Retirer ${t}`}>
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="adm-row">
        <input
          className="adm-input"
          value={draft}
          disabled={!adminAvailable}
          placeholder="Ajouter…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
        />
        <button type="button" className="adm-btn" onClick={add} disabled={!adminAvailable}>
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}

function parseFocus(focus) {
  const m = /(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/.exec(focus || '')
  return m ? { x: Number(m[1]), y: Number(m[2]) } : { x: 50, y: 50 }
}

function ImageInput({ value, onChange }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const frameRef = useRef(null)
  const dragging = useRef(false)

  const src = imgSrc(value)
  const focus = imgFocus(value)
  const { x: fx, y: fy } = parseFocus(focus)

  const setSrc = (nextSrc) => onChange(makeImageValue(nextSrc, focus))
  const setFocus = (x, y) => {
    const cx = Math.min(100, Math.max(0, Math.round(x)))
    const cy = Math.min(100, Math.max(0, Math.round(y)))
    onChange(makeImageValue(src, `${cx}% ${cy}%`))
  }

  const pick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setErr('')
    try {
      onChange(makeImageValue(await uploadImage(file), focus))
    } catch (e2) {
      setErr(String(e2.message || e2))
    } finally {
      setBusy(false)
    }
  }

  const moveTo = (clientX, clientY) => {
    const rect = frameRef.current?.getBoundingClientRect()
    if (!rect) return
    setFocus(((clientX - rect.left) / rect.width) * 100, ((clientY - rect.top) / rect.height) * 100)
  }

  return (
    <div className="adm-image">
      {src ? (
        <>
          <div
            ref={frameRef}
            className="adm-focus"
            onPointerDown={(e) => {
              if (!adminAvailable) return
              dragging.current = true
              e.currentTarget.setPointerCapture(e.pointerId)
              moveTo(e.clientX, e.clientY)
            }}
            onPointerMove={(e) => dragging.current && moveTo(e.clientX, e.clientY)}
            onPointerUp={(e) => {
              dragging.current = false
              e.currentTarget.releasePointerCapture?.(e.pointerId)
            }}
          >
            <img src={src} alt="" style={{ objectPosition: `${fx}% ${fy}%` }} />
            <span className="adm-focus__dot" style={{ left: `${fx}%`, top: `${fy}%` }}>
              <Move size={12} />
            </span>
          </div>
          <p className="adm-hint">
            Glisse le point pour choisir la partie visible en vignette ({fx}% {fy}%).
          </p>
          <div className="adm-row">
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setFocus(50, 50)} disabled={!adminAvailable}>
              Recentrer
            </button>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => onChange('')}>
              Retirer
            </button>
          </div>
        </>
      ) : (
        <p className="adm-muted">Aucune image</p>
      )}
      <label className={`adm-btn ${adminAvailable ? '' : 'adm-btn--disabled'}`}>
        <Upload size={14} /> {busy ? 'Envoi…' : src ? 'Remplacer' : 'Choisir un fichier'}
        <input type="file" accept="image/*" hidden onChange={pick} disabled={!adminAvailable || busy} />
      </label>
      <input
        className="adm-input adm-input--mono"
        value={src}
        placeholder="/media/… ou URL"
        disabled={!adminAvailable}
        onChange={(e) => setSrc(e.target.value)}
      />
      {err && <p className="adm-error">{err}</p>}
    </div>
  )
}

function GalleryInput({ value, onChange }) {
  return (
    <div className="adm-gallery">
      {value.map((item, i) => (
        <div key={`${imgSrc(item)}-${i}`} className="adm-gallery__item">
          <img src={imgSrc(item)} alt="" />
          <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Retirer">
            <X size={12} />
          </button>
        </div>
      ))}
      <ImageInput value="" onChange={(p) => p && onChange([...value, imgSrc(p)])} />
    </div>
  )
}

function RefsInput({ field, value, onChange, allData }) {
  const rows = allData?.[field.ref] || []
  const s = SCHEMA[field.ref]
  const selected = new Set(value)
  return (
    <div className="adm-refs">
      <div className="adm-chips">
        {value.map((id) => {
          const row = rows.find((r) => r.id === id)
          return (
            <span key={id} className="adm-chip">
              {row ? s.title(row) : `${id} (introuvable)`}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== id))} aria-label="Retirer">
                <X size={12} />
              </button>
            </span>
          )
        })}
      </div>
      <select
        className="adm-input"
        value=""
        disabled={!adminAvailable}
        onChange={(e) => {
          if (e.target.value) onChange([...value, e.target.value])
        }}
      >
        <option value="">Ajouter…</option>
        {rows
          .filter((r) => !selected.has(r.id))
          .map((r) => (
            <option key={r.id} value={r.id}>
              {s.title(r)}
            </option>
          ))}
      </select>
    </div>
  )
}

// Sélecteur simple (un seul personnage) — utilisé par exemple pour lier une
// Persona IA à sa fiche personnage (`characterId`). Contrairement à `refs`
// (liste), il ne stocke qu'un seul id sous forme de chaîne.
function CharacterSelectInput({ value, onChange, allData }) {
  const chars = allData?.characters || []
  return (
    <select
      className="adm-input"
      value={value}
      disabled={!adminAvailable}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">— personnage —</option>
      {chars.map((c) => (
        <option key={c.id} value={c.id}>
          {SCHEMA.characters.title(c)}
        </option>
      ))}
    </select>
  )
}

function RelationsInput({ value, onChange, allData }) {
  const chars = allData?.characters || []
  const set = (i, patch) => onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  return (
    <div className="adm-relations">
      {value.map((rel, i) => (
        <div key={i} className="adm-relation">
          <select
            className="adm-input"
            value={rel.characterId || ''}
            disabled={!adminAvailable}
            onChange={(e) => set(i, { characterId: e.target.value })}
          >
            <option value="">— personnage —</option>
            {chars.map((c) => (
              <option key={c.id} value={c.id}>
                {SCHEMA.characters.title(c)}
              </option>
            ))}
          </select>
          <input
            className="adm-input"
            placeholder="Type (ex. Frère jumeau)"
            value={rel.type || ''}
            disabled={!adminAvailable}
            onChange={(e) => set(i, { type: e.target.value })}
          />
          <input
            className="adm-input"
            placeholder="Précision (optionnel)"
            value={rel.description || ''}
            disabled={!adminAvailable}
            onChange={(e) => set(i, { description: e.target.value })}
          />
          <button
            type="button"
            className="adm-btn adm-btn--ghost"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="adm-btn"
        disabled={!adminAvailable}
        onClick={() => onChange([...value, { characterId: '', type: '', description: '' }])}
      >
        <Plus size={14} /> Ajouter une relation
      </button>
    </div>
  )
}
