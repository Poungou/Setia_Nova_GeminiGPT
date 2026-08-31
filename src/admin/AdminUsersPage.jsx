import { useEffect, useState } from 'react'
import { KeyRound, RefreshCw, ShieldCheck } from 'lucide-react'
import { listUsers, updateUser } from '../lib/authApi.js'

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const body = await listUsers()
      setUsers(body.users || [])
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // Pas de flux "mot de passe oublié" self-service par e-mail pour
  // l'instant (aucun fournisseur d'envoi configuré) : un admin peut fixer
  // un nouveau mot de passe ici, sans avoir à toucher D1 à la main.
  const resetPassword = async (user) => {
    const password = window.prompt(
      `Nouveau mot de passe pour ${user.email} (8 caractères minimum).\nTransmets-le ensuite à la personne par un canal sûr.`,
    )
    if (!password) return
    await patch(user.id, { password })
  }

  const patch = async (id, changes) => {
    setFlash('')
    try {
      const body = await updateUser(id, changes)
      setUsers((rows) => rows.map((u) => (u.id === id ? body.user : u)))
      setFlash('Utilisateur mis à jour.')
    } catch (e) {
      setError(String(e.message || e))
    }
  }

  return (
    <div className="adm-list">
      <header className="adm-list__head">
        <div>
          <h1>Utilisateurs</h1>
          <p className="adm-muted">{users.length} compte(s)</p>
        </div>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={load}>
          <RefreshCw size={15} /> Recharger
        </button>
      </header>

      {loading && <p className="adm-muted">Chargement...</p>}
      {error && <div className="adm-banner adm-banner--error">{error}</div>}
      {flash && <div className="adm-banner adm-banner--ok">{flash}</div>}

      <ul className="adm-cards">
        {users.map((user) => (
          <li key={user.id}>
            <article className="adm-card adm-card--static">
              <div className="adm-card__body">
                <strong>
                  {user.name || user.email}
                  {user.role === 'admin' && <ShieldCheck size={14} aria-label="Admin" />}
                </strong>
                <span className="adm-muted">{user.email}</span>
                <code className="adm-card__id">{user.id}</code>
              </div>
              <select
                className="adm-input adm-user-control"
                value={user.role}
                onChange={(e) => patch(user.id, { role: e.target.value })}
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
              <label className="adm-check">
                <input
                  type="checkbox"
                  checked={Boolean(user.disabled)}
                  onChange={(e) => patch(user.id, { disabled: e.target.checked })}
                />
                Désactivé
              </label>
              <button
                type="button"
                className="adm-btn adm-btn--ghost"
                onClick={() => resetPassword(user)}
              >
                <KeyRound size={14} /> Réinitialiser le mot de passe
              </button>
            </article>
          </li>
        ))}
        {!loading && users.length === 0 && (
          <li className="adm-muted">Aucun compte créé pour le moment.</li>
        )}
      </ul>
    </div>
  )
}
