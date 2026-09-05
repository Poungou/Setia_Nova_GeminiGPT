import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, Link } from 'react-router-dom'
import { AdminProvider } from './AdminContext.jsx'
import { useAdmin } from './useAdmin.js'
import AdminLayout from './AdminLayout.jsx'
import CollectionListPage from './CollectionListPage.jsx'
import CollectionEditPage from './CollectionEditPage.jsx'
import AdminUsersPage from './AdminUsersPage.jsx'
import AdminCommunityPage from './AdminCommunityPage.jsx'
import { COLLECTION_NAMES } from './schema.js'
import { getSession, loginAccount, loginLocalAdmin, logoutAccount } from '../lib/authApi.js'
import './admin.css'

function Gate({ onOpen }) {
  const localGate = import.meta.env.DEV
  const [pass, setPass] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    setErr('')
    try {
      const body = localGate ? await loginLocalAdmin(pass) : await loginAccount({ email, password })
      if (body.user?.role !== 'admin') throw new Error('Compte non admin.')
      onOpen(body.user)
    } catch (e) {
      setErr(String(e.message || e))
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
        <h1>Administration Woltar Nova</h1>
        <p className="adm-muted">
          {localGate
            ? 'Accès local protégé côté serveur.'
            : 'Connexion avec un compte administrateur Woltar Nova.'}
        </p>

        {localGate ? (
          <input
            className="adm-input"
            type="password"
            autoFocus
            placeholder="Phrase d’accès"
            value={pass}
            onChange={(e) => {
              setPass(e.target.value)
              setErr('')
            }}
          />
        ) : (
          <>
            <input
              className="adm-input"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="Email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setErr('')
              }}
            />
            <input
              className="adm-input"
              type="password"
              autoComplete="current-password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setErr('')
              }}
            />
          </>
        )}

        {err && <p className="adm-error">{err}</p>}
        <button className="adm-btn adm-btn--primary" type="submit" disabled={busy}>
          {busy ? 'Connexion...' : 'Entrer'}
        </button>
        <Link to="/compte" className="adm-btn adm-btn--ghost">
          Espace utilisateur
        </Link>
      </form>
    </div>
  )
}

function Loading() {
  const { loading } = useAdmin()
  if (!loading) return null
  return <div className="adm-loading">Chargement des données...</div>
}

export default function AdminApp() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let alive = true
    getSession()
      .then((body) => {
        if (alive && body.user?.role === 'admin') setSession(body.user)
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setChecking(false)
      })
    return () => {
      alive = false
    }
  }, [])

  if (checking) return <div className="adm-loading">Vérification de la session...</div>

  if (!session) return <Gate onOpen={setSession} />

  return (
    <AdminProvider currentUser={session}>
      <Loading />
      <Routes>
        <Route
          element={
            <AdminLayout
              currentUser={session}
              onLock={async () => {
                await logoutAccount().catch(() => {})
                setSession(null)
              }}
            />
          }
        >
          <Route index element={<Navigate to={COLLECTION_NAMES[0]} replace />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="community" element={<AdminCommunityPage />} />
          <Route path="creator/*" element={<Navigate to="/admin/community" replace />} />
          <Route path=":collection" element={<CollectionListPage />} />
          <Route path=":collection/:id" element={<CollectionEditPage />} />
        </Route>
      </Routes>
    </AdminProvider>
  )
}
