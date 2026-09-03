import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, LogOut, Plus, Save, Trash2, UserRound } from 'lucide-react'
import { accountBackendAvailable, loginAccount, logoutAccount, registerAccount } from '../lib/authApi.js'
import {
  createAccountRow,
  deleteAccountRow,
  getAccountBootstrap,
  updateAccountRow,
} from '../lib/accountApi.js'
import { SCHEMA } from '../admin/schema.js'
import { Field } from '../admin/Fields.jsx'
import ThemeToggle from '../components/ThemeToggle/ThemeToggle.jsx'
import '../admin/admin.css'

const SECTIONS = {
  personnages: { collection: 'characters', label: 'Mes personnages', singular: 'personnage' },
}

function AccountBackendUnavailable() {
  return (
    <div className="adm-gate">
      <div className="adm-gate__card">
        <h1>Espace Nova-Setia</h1>
        <p className="adm-hint">
          {"L'espace compte n'est pas actif sur ce build Cloudflare tant que le stockage persistant D1 et les routes serveur n'ont pas ete valides."}
        </p>
        <p className="adm-hint">Les comptes locaux restent disponibles avec npm run dev.</p>
        <Link to="/" className="adm-btn adm-btn--ghost">
          Retour au site
        </Link>
      </div>
    </div>
  )
}

function AuthGate({ onSession }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      const body =
        mode === 'register'
          ? await registerAccount({ name, email, password })
          : await loginAccount({ email, password })
      onSession(body.user)
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="adm-gate">
      <form
        className="adm-gate__card"
        onSubmit={async (e) => {
          e.preventDefault()
          await submit()
        }}
      >
        <h1>Espace Nova-Setia</h1>
        <div className="adm-markdown__tabs">
          <button type="button" className={mode === 'login' ? 'is-active' : ''} onClick={() => setMode('login')}>
            Connexion
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'is-active' : ''}
            onClick={() => setMode('register')}
          >
            Inscription
          </button>
        </div>
        {mode === 'register' && (
          <input
            className="adm-input"
            placeholder="Nom affiché"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
        <input
          className="adm-input"
          type="email"
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="adm-input"
          type="password"
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {mode === 'register' && (
          <p className="adm-hint">Les nouveaux comptes sont créés avec le rôle user.</p>
        )}
        {error && <p className="adm-error">{error}</p>}
        <button className="adm-btn adm-btn--primary" type="submit" disabled={busy}>
          {busy ? 'Patiente...' : mode === 'register' ? 'Créer mon compte' : 'Me connecter'}
        </button>
        <Link to="/" className="adm-btn adm-btn--ghost">
          Retour au site
        </Link>
      </form>
    </div>
  )
}

function Dashboard({ data }) {
  const characters = data?.characters || []
  return (
    <div className="adm-list">
      <header className="adm-list__head">
        <div>
          <h1>Mon espace</h1>
          <p className="adm-muted">Tes personnages.</p>
        </div>
      </header>
      <ul className="adm-cards">
        <li>
          <Link to="/compte/personnages" className="adm-card">
            <div className="adm-card__body">
              <strong>Mes personnages</strong>
              <span className="adm-muted">{characters.length} fiche(s)</span>
            </div>
            <Plus size={16} />
          </Link>
        </li>
      </ul>
    </div>
  )
}

function AccountList({ data }) {
  const { section } = useParams()
  const config = SECTIONS[section]
  const rows = data?.[config?.collection] || []
  const schema = config ? SCHEMA[config.collection] : null

  if (!config || !schema) return <Navigate to="/compte" replace />

  return (
    <div className="adm-list">
      <header className="adm-list__head">
        <div>
          <h1>{config.label}</h1>
          <p className="adm-muted">{rows.length} fiche(s)</p>
        </div>
        <Link to={`/compte/${section}/new`} className="adm-btn adm-btn--primary">
          <Plus size={16} /> Creer un {config.singular}
        </Link>
      </header>
      <ul className="adm-cards">
        {rows.map((row) => (
          <li key={row.id}>
            <Link to={`/compte/${section}/${encodeURIComponent(row.id)}`} className="adm-card">
              <div className="adm-card__body">
                <strong>{schema.title(row)}</strong>
              <span className="adm-muted">{schema.subtitle(row) || '—'}</span>
              </div>
              <code className="adm-card__id">{row.id}</code>
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="adm-muted">Aucun contenu pour le moment.</li>}
      </ul>
    </div>
  )
}

function AccountEdit({ data, reload }) {
  const { section, id } = useParams()
  const navigate = useNavigate()
  const config = SECTIONS[section]
  const collection = config?.collection
  const schema = collection ? SCHEMA[collection] : null
  const rows = data?.[collection] || []
  const isNew = id === 'new'
  const existing = isNew ? null : rows.find((row) => row.id === decodeURIComponent(id || ''))
  const [form, setForm] = useState(() => ({ ...(schema?.defaults || {}), ...(existing || {}) }))
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState('')
  const skipReset = useRef(false)

  useEffect(() => {
    if (skipReset.current) {
      skipReset.current = false
      return
    }
    setForm({ ...(schema?.defaults || {}), ...(existing || {}) })
    setFlash('')
  }, [schema, existing, collection, id])

  const fields = useMemo(() => {
    if (!schema) return {}
    const groups = {}
    for (const field of schema.fields) {
      if (field.key === 'ownerUserId') continue
      ;(groups[field.group || 'Autres'] ||= []).push(field)
    }
    return groups
  }, [schema])

  if (!config || !schema) return <Navigate to="/compte" replace />
  if (!isNew && !existing) {
    return (
      <p className="adm-muted">
        Fiche introuvable. <Link to={`/compte/${section}`}>Retour à la liste</Link>
      </p>
    )
  }

  const computedId = isNew ? schema.makeId(form) : existing.id

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const onSave = async () => {
    if (saving) return
    if (isNew && !computedId) {
      setFlash('error:Renseigne les champs nécessaires pour créer un identifiant.')
      return
    }
    setSaving(true)
    setFlash('')
    try {
      const row = { ...schema.defaults, ...form, id: computedId }
      const saved = isNew
        ? await createAccountRow(collection, row)
        : await updateAccountRow(collection, existing.id, row)
      skipReset.current = true
      setForm(saved)
      await reload()
      setFlash('saved')
      if (isNew) navigate(`/compte/${section}/${encodeURIComponent(saved.id)}`, { replace: true })
    } catch (e) {
      skipReset.current = false
      setFlash(`error:${e.message || e}`)
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async () => {
    if (isNew || saving) return
    if (!window.confirm(`Supprimer « ${schema.title(form)} » ?`)) return
    setSaving(true)
    try {
      await deleteAccountRow(collection, existing.id)
      await reload()
      navigate(`/compte/${section}`, { replace: true })
    } catch (e) {
      setFlash(`error:${e.message || e}`)
      setSaving(false)
    }
  }

  return (
    <div className="adm-edit">
      <header className="adm-edit__head">
        <Link to={`/compte/${section}`} className="adm-btn adm-btn--ghost">
          <ArrowLeft size={15} /> {config.label}
        </Link>
        <div className="adm-edit__title">
          <h1>{isNew ? `Nouveau ${config.singular}` : schema.title(form)}</h1>
          <code>{computedId || '(identifiant à venir)'}</code>
        </div>
        <div className="adm-edit__actions">
          {!isNew && (
            <button type="button" className="adm-btn adm-btn--danger" onClick={onDelete} disabled={saving}>
              <Trash2 size={15} /> Supprimer
            </button>
          )}
          <button type="button" className="adm-btn adm-btn--primary" onClick={onSave} disabled={saving}>
            <Save size={15} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </header>

      {flash === 'saved' && <div className="adm-banner adm-banner--ok">Enregistré.</div>}
      {flash.startsWith('error:') && <div className="adm-banner adm-banner--error">{flash.slice(6)}</div>}

      <form
        className="adm-form"
        onSubmit={(e) => {
          e.preventDefault()
          onSave()
        }}
      >
        {Object.entries(fields).map(([group, groupFields]) => (
          <fieldset key={group} className="adm-fieldset">
            <legend>{group}</legend>
            {groupFields.map((field) => (
              <div key={field.key} className={`adm-field adm-field--${field.type}`}>
                <label htmlFor={`f-${field.key}`}>{field.label}</label>
                {field.hint && <p className="adm-hint">{field.hint}</p>}
                <Field
                  field={field}
                  value={form[field.key]}
                  onChange={(value) => setField(field.key, value)}
                  allData={data}
                  disabled={saving}
                  uploadEnabled={import.meta.env.DEV && !saving}
                />
              </div>
            ))}
          </fieldset>
        ))}
      </form>
    </div>
  )
}

function Workspace({ user, onLogout }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const body = await getAccountBootstrap()
      setData(body.data)
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="adm">
      <aside className="adm-side">
        <div className="adm-side__head">
          <Link to="/" className="adm-side__logo">Nova-Setia</Link>
          <span className="adm-side__tag">Compte</span>
        </div>
        <nav className="adm-nav">
          <NavLink to="/compte" end className="adm-nav__link">
            <UserRound size={16} /> Mon espace
          </NavLink>
          <NavLink to="/compte/personnages" className="adm-nav__link">
            <UserRound size={16} /> Mes personnages
          </NavLink>
          {user.role === 'admin' && (
            <NavLink to="/admin" className="adm-nav__link">
              Admin
            </NavLink>
          )}
        </nav>
        <div className="adm-side__foot">
          <span className="adm-muted">{user.name || user.email}</span>
          <ThemeToggle />
          <button
            type="button"
            className="adm-btn adm-btn--ghost"
            onClick={async () => {
              await logoutAccount().catch(() => {})
              onLogout()
            }}
          >
            <LogOut size={15} /> Déconnexion
          </button>
          <Link to="/" className="adm-btn adm-btn--ghost">Voir le site</Link>
        </div>
      </aside>
      <main className="adm-main">
        {loading && <div className="adm-banner">Chargement...</div>}
        {error && <div className="adm-banner adm-banner--error">{error}</div>}
        {data && (
          <Routes>
            <Route index element={<Dashboard data={data} />} />
            <Route path=":section" element={<AccountList data={data} />} />
            <Route path=":section/:id" element={<AccountEdit data={data} reload={load} />} />
          </Routes>
        )}
      </main>
    </div>
  )
}

export default function AccountApp() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(accountBackendAvailable)

  useEffect(() => {
    if (!accountBackendAvailable) return undefined
    let alive = true
    import('../lib/authApi.js')
      .then(({ getSession }) => getSession())
      .then((body) => {
        if (alive) setSession(body.user || null)
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setChecking(false)
      })
    return () => {
      alive = false
    }
  }, [])

  if (!accountBackendAvailable) return <AccountBackendUnavailable />
  if (checking) return <div className="adm-loading">Vérification de la session...</div>
  if (!session) return <AuthGate onSession={setSession} />
  return <Workspace user={session} onLogout={() => setSession(null)} />
}
