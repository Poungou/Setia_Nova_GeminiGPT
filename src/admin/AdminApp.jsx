// src/admin/AdminApp.jsx
import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AdminProvider } from './AdminContext.jsx'
import { useAdmin } from './useAdmin.js'
import AdminLayout from './AdminLayout.jsx'
import CollectionListPage from './CollectionListPage.jsx'
import CollectionEditPage from './CollectionEditPage.jsx'
import { COLLECTION_NAMES } from './schema.js'
import { isUnlocked, unlock, lock } from './localAuth.js'
import './admin.css'

function Gate({ onOpen }) {
  const [pass, setPass] = useState('')
  const [err, setErr] = useState(false)
  return (
    <div className="adm-gate">
      <form
        className="adm-gate__card"
        onSubmit={(e) => {
          e.preventDefault()
          if (unlock(pass)) onOpen()
          else setErr(true)
        }}
      >
        <h1>Administration Woltar</h1>
        <p className="adm-muted">Accès local. La connexion Google arrivera avec la mise en ligne.</p>
        <input
          className="adm-input"
          type="password"
          autoFocus
          placeholder="Phrase d’accès"
          value={pass}
          onChange={(e) => {
            setPass(e.target.value)
            setErr(false)
          }}
        />
        {err && <p className="adm-error">Phrase incorrecte.</p>}
        <button className="adm-btn adm-btn--primary" type="submit">Entrer</button>
      </form>
    </div>
  )
}

function Loading() {
  const { loading } = useAdmin()
  if (!loading) return null
  return <div className="adm-loading">Chargement des données…</div>
}

export default function AdminApp() {
  const [open, setOpen] = useState(isUnlocked())

  if (!open) return <Gate onOpen={() => setOpen(true)} />

  return (
    <AdminProvider>
      <Loading />
      <Routes>
        <Route
          element={
            <AdminLayout
              onLock={() => {
                lock()
                setOpen(false)
              }}
            />
          }
        >
          <Route index element={<Navigate to={COLLECTION_NAMES[0]} replace />} />
          <Route path=":collection" element={<CollectionListPage />} />
          <Route path=":collection/:id" element={<CollectionEditPage />} />
        </Route>
      </Routes>
    </AdminProvider>
  )
}
