import { useEffect, useState } from 'react'
import { KeyRound, Plus, RefreshCw, ShieldCheck } from 'lucide-react'
import { createUser, getUserProfile, listUsers, updateUser, updateUserProfile } from '../lib/authApi.js'

const PERMISSIONS = [
  ['create_character', 'Personnages'],
  ['create_clan', 'Clans'],
  ['create_location', 'Lieux'],
]

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({
    name: '', email: '', password: '', passwordConfirmation: '', role: 'user', status: 'Membre', active: true,
    permissions: { create_character: false, create_clan: false, create_location: false },
  })
  const [profileUser, setProfileUser] = useState(null)
  const [profile, setProfile] = useState(null)

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

  const editProfile = async (user) => { setProfileUser(user); try { setProfile((await getUserProfile(user.id)).profile) } catch (e) { setError(String(e.message || e)) } }
  const saveProfile = async () => { try { await updateUserProfile(profileUser.id, profile); setFlash('Profil RP mis à jour.'); setProfileUser(null) } catch (e) { setError(String(e.message || e)) } }

  const setFormValue = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const setPermission = (key, value) =>
    setForm((current) => ({ ...current, permissions: { ...current.permissions, [key]: value } }))

  const submitCreate = async (event) => {
    event.preventDefault()
    setFormError('')
    if (!form.name.trim() || !form.password) {
      setFormError('Le pseudo et le mot de passe sont obligatoires.')
      return
    }
    if (form.password.length < 8) {
      setFormError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (form.password !== form.passwordConfirmation) {
      setFormError('La confirmation du mot de passe ne correspond pas.')
      return
    }
    setCreating(true)
    try {
      const body = await createUser(form)
      setUsers((current) => [...current, body.user])
      setShowCreate(false)
      setForm({
        name: '', email: '', password: '', passwordConfirmation: '', role: 'user', status: 'Membre', active: true,
        permissions: { create_character: false, create_clan: false, create_location: false },
      })
      setFlash('Utilisateur créé.')
    } catch (e) {
      setFormError(String(e.message || e))
    } finally {
      setCreating(false)
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
        <button type="button" className="adm-btn adm-btn--primary" onClick={() => { setFormError(''); setShowCreate(true) }}>
          <Plus size={15} /> Créer un utilisateur
        </button>
      </header>

      {loading && <p className="adm-muted">Chargement...</p>}
      {error && <div className="adm-banner adm-banner--error">{error}</div>}
      {flash && <div className="adm-banner adm-banner--ok">{flash}</div>}

      {showCreate && (
        <form className="adm-form" onSubmit={submitCreate}>
          <fieldset className="adm-fieldset">
            <legend>Créer un utilisateur</legend>
            <div className="adm-field"><label htmlFor="new-user-name">Pseudo</label><input id="new-user-name" className="adm-input" value={form.name} onChange={(e) => setFormValue('name', e.target.value)} required /></div>
            <div className="adm-field"><label htmlFor="new-user-email">Adresse email (facultatif)</label><input id="new-user-email" className="adm-input" type="email" value={form.email} onChange={(e) => setFormValue('email', e.target.value)} /></div>
            <div className="adm-field"><label htmlFor="new-user-password">Mot de passe temporaire</label><input id="new-user-password" className="adm-input" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setFormValue('password', e.target.value)} required /></div>
            <div className="adm-field"><label htmlFor="new-user-password-confirmation">Confirmation</label><input id="new-user-password-confirmation" className="adm-input" type="password" autoComplete="new-password" value={form.passwordConfirmation} onChange={(e) => setFormValue('passwordConfirmation', e.target.value)} required /></div>
            <div className="adm-field"><label htmlFor="new-user-role">Rôle technique</label><select id="new-user-role" className="adm-input" value={form.role} onChange={(e) => setFormValue('role', e.target.value)}><option value="user">user</option><option value="admin">admin</option></select></div>
            <div className="adm-field"><label htmlFor="new-user-status">Statut</label><select id="new-user-status" className="adm-input" value={form.status} onChange={(e) => setFormValue('status', e.target.value)}><option value="Membre">Membre</option><option value="RPiste">RPiste</option><option value="Invité">Invité</option></select></div>
            <div className="adm-field"><span>Permissions Nova-Setia</span>{PERMISSIONS.map(([permission, label]) => <label className="adm-check" key={permission}><input type="checkbox" checked={form.permissions[permission]} onChange={(e) => setPermission(permission, e.target.checked)} disabled={form.role === 'admin'} />{label}</label>)}</div>
            <label className="adm-check"><input type="checkbox" checked={form.active} onChange={(e) => setFormValue('active', e.target.checked)} />Compte actif</label>
            {formError && <p className="adm-error">{formError}</p>}
            <div className="adm-edit__actions"><button type="button" className="adm-btn adm-btn--ghost" onClick={() => setShowCreate(false)}>Annuler</button><button type="submit" className="adm-btn adm-btn--primary" disabled={creating}>{creating ? 'Création...' : 'Créer le compte'}</button></div>
          </fieldset>
        </form>
      )}

      <ul className="adm-cards">
        {users.map((user) => (
          <li key={user.id}>
            <article className="adm-card adm-card--static">
              <div className="adm-card__body">
                <strong>
                  {user.name || user.email}
                  {user.role === 'admin' && <ShieldCheck size={14} aria-label="Admin" />}
                </strong>
                <span className="adm-muted">{user.email || 'Aucun email'}</span>
                <span className="adm-muted">Statut : {user.status || 'Membre'} · Rôle : {user.role}</span>
                <span className="adm-muted">Créé le : {user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '—'}</span>
                <span className="adm-muted">Contenu : {user.contentCounts?.characters || 0} personnages · {user.contentCounts?.clans || 0} clans · {user.contentCounts?.locations || 0} lieux</span>
                <div className="adm-user-permissions">
                  <strong>Permissions Nova-Setia</strong>
                  {PERMISSIONS.map(([permission, label]) => (
                    <label className="adm-check" key={permission}>
                      <input
                        type="checkbox"
                        checked={user.role === 'admin' || user.permissions?.[permission] === true}
                        disabled={user.role === 'admin'}
                        onChange={(e) => patch(user.id, { permissions: { [permission]: e.target.checked } })}
                      />
                      {label} {user.role === 'admin' ? '✓' : ''}
                    </label>
                  ))}
                </div>
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
              <form
                key={`${user.id}-${user.email || 'none'}`}
                className="adm-user-email"
                onSubmit={(e) => {
                  e.preventDefault()
                  patch(user.id, { email: e.currentTarget.elements.email.value })
                }}
              >
                <input className="adm-input" name="email" type="email" defaultValue={user.email || ''} placeholder="Email facultatif" />
                <button type="submit" className="adm-btn adm-btn--ghost">Enregistrer email</button>
                {user.email && <button type="button" className="adm-btn adm-btn--ghost" onClick={() => patch(user.id, { email: '' })}>Supprimer l’adresse email</button>}
              </form>
              <select
                className="adm-input adm-user-control"
                value={user.status || 'Membre'}
                onChange={(e) => patch(user.id, { status: e.target.value })}
              >
                <option value="Membre">Membre</option>
                <option value="RPiste">RPiste</option>
                <option value="Invité">Invité</option>
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
              <button type="button" className="adm-btn adm-btn--ghost" onClick={() => editProfile(user)}>Profil RP</button>
              {profileUser?.id === user.id && profile && <div className="adm-user-profile-editor"><label>Avatar<input className="adm-input" value={profile.avatar} onChange={(e) => setProfile({ ...profile, avatar: e.target.value })} /></label><label>Source / crédit image<input className="adm-input" value={profile.image_source} onChange={(e) => setProfile({ ...profile, image_source: e.target.value })} /></label><label>Quelques mots<textarea className="adm-input" value={profile.player_intro} onChange={(e) => setProfile({ ...profile, player_intro: e.target.value })} /></label><label>Style d’écriture<textarea className="adm-input" value={profile.writing_style} onChange={(e) => setProfile({ ...profile, writing_style: e.target.value })} /></label><label>Univers<textarea className="adm-input" value={profile.univers} onChange={(e) => setProfile({ ...profile, univers: e.target.value })} /></label><label>TW<textarea className="adm-input" value={profile.tw} onChange={(e) => setProfile({ ...profile, tw: e.target.value })} /></label><label>Rythme<textarea className="adm-input" value={profile.rhythm} onChange={(e) => setProfile({ ...profile, rhythm: e.target.value })} /></label><label>Pseudo IG<input className="adm-input" value={profile.ig_username} onChange={(e) => setProfile({ ...profile, ig_username: e.target.value })} /></label><label className="adm-check"><input type="checkbox" checked={profile.profile_public} onChange={(e) => setProfile({ ...profile, profile_public: e.target.checked })} />Profil public</label><button type="button" className="adm-btn adm-btn--primary" onClick={saveProfile}>Enregistrer le profil</button></div>}
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
