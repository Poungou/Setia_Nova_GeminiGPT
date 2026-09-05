import { useEffect, useRef, useState } from 'react'
import { KeyRound, Plus, RefreshCw, ShieldCheck } from 'lucide-react'
import { createUser, deleteUser, getUserProfile, listUsers, updateUser, updateUserProfile } from '../lib/authApi.js'
import { getCollection } from './adminApi.js'
import { isCharacterLinked } from '../lib/characterLinks.js'

const PERMISSIONS = [
  ['create_character', 'Personnages'],
  ['create_clan', 'Clans'],
  ['create_location', 'Lieux'],
  ['create_journal_article', 'Articles de journal'],
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
    permissions: { create_character: false, create_clan: false, create_location: false, create_journal_article: false },
  })
  const [profileUser, setProfileUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [characters, setCharacters] = useState([])
  const [linkedIds, setLinkedIds] = useState([])
  const [saving, setSaving] = useState(false)
  const profileRequest = useRef(0)

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

  const removeUser = async (user) => {
    if (!window.confirm(`Supprimer définitivement le compte « ${user.name || user.email} » ? Cette action est irréversible.`)) return
    setError('')
    try {
      await deleteUser(user.id)
      setUsers((rows) => rows.filter((row) => row.id !== user.id))
      setFlash('Utilisateur supprimé.')
    } catch (e) {
      setError(String(e.message || e))
    }
  }

  const editProfile = async (user) => {
    const request = ++profileRequest.current
    setProfileUser(user)
    setProfile(null)
    setError('')
    setFlash('')
    try {
      const [body, rows] = await Promise.all([getUserProfile(user.id), getCollection('characters')])
      if (request !== profileRequest.current) return
      setProfile(body.profile)
      setCharacters(rows)
      setLinkedIds(body.profile.linked_character_ids || [])
    } catch (e) { if (request === profileRequest.current) setError(String(e.message || e)) }
  }
  const saveProfile = async (linksOnly = false) => {
    setSaving(true)
    setError('')
    setFlash('')
    try {
      const payload = linksOnly ? { linked_character_ids: linkedIds } : Object.fromEntries(Object.entries(profile).filter(([key]) => key !== 'linked_character_ids'))
      const body = await updateUserProfile(profileUser.id, payload)
      setProfile((current) => linksOnly ? { ...current, linked_character_ids: body.profile.linked_character_ids } : body.profile)
      if (linksOnly) setLinkedIds(body.profile.linked_character_ids)
      setFlash(linksOnly ? 'Rattachements enregistrés.' : 'Profil RP mis à jour.')
    } catch (e) { setError(String(e.message || e)) }
    finally { setSaving(false) }
  }

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
    const trimmedEmail = form.email.trim()
    if (!trimmedEmail) {
      setFormError('L’adresse email est obligatoire pour créer un compte.')
      return
    }
    // Format volontairement permissif, même règle que côté serveur (voir
    // worker/lib/authStore.js#assertRequiredEmail) — ce contrôle évite un
    // aller-retour réseau inutile, il ne remplace jamais la validation
    // backend (seule autorité, non contournable par appel API direct).
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFormError('Cette adresse email n’est pas valide.')
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
        permissions: { create_character: false, create_clan: false, create_location: false, create_journal_article: false },
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
            <div className="adm-field"><label htmlFor="new-user-email">Email *</label><input id="new-user-email" className="adm-input" type="email" required value={form.email} onChange={(e) => setFormValue('email', e.target.value)} /></div>
            <div className="adm-field"><label htmlFor="new-user-password">Mot de passe temporaire</label><input id="new-user-password" className="adm-input" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setFormValue('password', e.target.value)} required /></div>
            <div className="adm-field"><label htmlFor="new-user-password-confirmation">Confirmation</label><input id="new-user-password-confirmation" className="adm-input" type="password" autoComplete="new-password" value={form.passwordConfirmation} onChange={(e) => setFormValue('passwordConfirmation', e.target.value)} required /></div>
            <div className="adm-field"><label htmlFor="new-user-role">Rôle technique</label><select id="new-user-role" className="adm-input" value={form.role} onChange={(e) => setFormValue('role', e.target.value)}><option value="user">user</option><option value="admin">admin</option></select></div>
            <div className="adm-field"><label htmlFor="new-user-status">Statut</label><select id="new-user-status" className="adm-input" value={form.status} onChange={(e) => setFormValue('status', e.target.value)}><option value="Membre">Membre</option><option value="RPiste">RPiste</option><option value="Invité">Invité</option></select></div>
            <div className="adm-field"><span>Permissions Woltar Nova</span>{PERMISSIONS.map(([permission, label]) => <label className="adm-check" key={permission}><input type="checkbox" checked={form.permissions[permission]} onChange={(e) => setPermission(permission, e.target.checked)} disabled={form.role === 'admin'} />{label}</label>)}</div>
            <label className="adm-check"><input type="checkbox" checked={form.active} onChange={(e) => setFormValue('active', e.target.checked)} />Compte actif</label>
            {formError && <p className="adm-error">{formError}</p>}
            <div className="adm-edit__actions"><button type="button" className="adm-btn adm-btn--ghost" onClick={() => setShowCreate(false)}>Annuler</button><button type="submit" className="adm-btn adm-btn--primary" disabled={creating}>{creating ? 'Création...' : 'Créer le compte'}</button></div>
          </fieldset>
        </form>
      )}

      <ul className="adm-cards">
        {users.map((user) => (
          <li key={user.id}>
            <article className="adm-card adm-card--static adm-user-card">
              <div className="adm-user-card__main">
                <div className="adm-user-card__identity">
                  <strong>
                    {user.name || user.email}
                    {user.role === 'admin' && <ShieldCheck size={14} aria-label="Admin" />}
                  </strong>
                  <span className="adm-muted">{user.email || 'Aucun email'}</span>
                </div>

                <dl className="adm-user-meta">
                  <div><dt>Statut</dt><dd>{user.status || 'Membre'}</dd></div>
                  <div><dt>Rôle</dt><dd>{user.role}</dd></div>
                  <div><dt>Créé le</dt><dd>{user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '—'}</dd></div>
                  <div><dt>Personnages</dt><dd>{user.contentCounts?.characters || 0}</dd></div>
                  <div><dt>Clans</dt><dd>{user.contentCounts?.clans || 0}</dd></div>
                  <div><dt>Lieux</dt><dd>{user.contentCounts?.locations || 0}</dd></div>
                </dl>

                <div className="adm-user-permissions">
                  <span className="adm-user-permissions__label">Permissions Woltar Nova</span>
                  <div className="adm-user-permissions__grid">
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
                </div>

                <code className="adm-card__id">{user.id}</code>
              </div>

              <div className="adm-user-card__actions">
                <div className="adm-user-actions-group">
                  <select
                    className="adm-input adm-user-control"
                    value={user.role}
                    onChange={(e) => patch(user.id, { role: e.target.value })}
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
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
                    {user.email && <button type="button" className="adm-btn adm-btn--ghost" onClick={() => patch(user.id, { email: '' })}>Supprimer l’adresse</button>}
                  </form>
                </div>

                <div className="adm-user-actions-group adm-user-actions-group--sensitive">
                  <button type="button" className="adm-btn adm-btn--ghost" onClick={() => resetPassword(user)}>
                    <KeyRound size={14} /> Réinitialiser le mot de passe
                  </button>
                  <button type="button" className="adm-btn adm-btn--ghost" disabled={saving} onClick={() => editProfile(user)}>Profil RP et personnages</button>
                </div>

                <div className="adm-user-actions-group adm-user-actions-group--danger">
                  <button type="button" className="adm-btn adm-btn--danger" onClick={() => removeUser(user)}>Supprimer</button>
                </div>
              </div>

              {profileUser?.id === user.id && profile && (
                <div className="adm-user-profile-editor">
                  <fieldset className="adm-profile-block" disabled={saving}>
                    <legend>Personnages rattachés</legend>
                    <p className="adm-muted">Les personnages dont ce compte est propriétaire principal restent automatiquement rattachés. Ici, tu peux rattacher ou détacher les liens complémentaires, sans modifier la propriété ni supprimer de personnage.</p>
                    <ul>
                      {characters.filter((character) => isCharacterLinked(character, user.id, profile.linked_character_ids)).map((character) => (
                        <li key={character.id}>
                          {[character.firstName, character.lastName].filter(Boolean).join(' ') || character.name || character.id}
                          {character.ownerUserId === user.id && <span className="adm-pill">Propriétaire principal</span>}
                          {character.visibility === 'draft' && <span className="adm-pill">Brouillon · non public</span>}
                        </li>
                      ))}
                    </ul>
                    {!characters.some((character) => isCharacterLinked(character, user.id, profile.linked_character_ids)) && <p className="adm-muted">Aucun personnage rattaché.</p>}
                    <span>Sélection multiple des personnages disponibles</span>
                    <div className="adm-character-links">
                      {characters.map((character) => (
                        <label className="adm-check" key={character.id}>
                          <input type="checkbox" disabled={character.ownerUserId === user.id} checked={isCharacterLinked(character, user.id, linkedIds)} onChange={(e) => setLinkedIds((ids) => e.target.checked ? [...new Set([...ids, character.id])] : ids.filter((id) => id !== character.id))} />
                          {[character.firstName, character.lastName].filter(Boolean).join(' ') || character.name || character.id}
                          <small className="adm-muted">{character.id}{character.ownerUserId === user.id ? ' · Propriétaire principal' : character.ownerUserId && character.ownerUserId !== 'system' ? ` · Propriétaire : ${users.find((owner) => owner.id === character.ownerUserId)?.name || character.ownerUserId}` : ' · Officiel'}</small>
                        </label>
                      ))}
                    </div>
                    <button type="button" className="adm-btn adm-btn--primary" onClick={() => saveProfile(true)}>{saving ? 'Enregistrement…' : 'Enregistrer les rattachements'}</button>
                  </fieldset>
                  <fieldset className="adm-profile-block">
                    <legend>Identité visuelle</legend>
                    <div className="adm-profile-avatar-row">
                      <div className="adm-profile-avatar-preview">
                        {profile.avatar ? <img src={profile.avatar} alt="" /> : <span>Aperçu</span>}
                      </div>
                      <div className="adm-profile-avatar-fields">
                        <label>Avatar (chemin ou URL)<input className="adm-input" value={profile.avatar} onChange={(e) => setProfile({ ...profile, avatar: e.target.value })} /></label>
                        <label>Source / crédit image<input className="adm-input" value={profile.image_source} onChange={(e) => setProfile({ ...profile, image_source: e.target.value })} /></label>
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="adm-profile-block">
                    <legend>Présentation RP</legend>
                    <label>Quelques mots<textarea className="adm-input" value={profile.player_intro} onChange={(e) => setProfile({ ...profile, player_intro: e.target.value })} /></label>
                    <label>Style d’écriture<textarea className="adm-input" value={profile.writing_style} onChange={(e) => setProfile({ ...profile, writing_style: e.target.value })} /></label>
                    <label>Univers<textarea className="adm-input" value={profile.univers} onChange={(e) => setProfile({ ...profile, univers: e.target.value })} /></label>
                    <label>TW<textarea className="adm-input" value={profile.tw} onChange={(e) => setProfile({ ...profile, tw: e.target.value })} /></label>
                    <label>Rythme<textarea className="adm-input" value={profile.rhythm} onChange={(e) => setProfile({ ...profile, rhythm: e.target.value })} /></label>
                  </fieldset>

                  <fieldset className="adm-profile-block">
                    <legend>Compte RP</legend>
                    <label>Pseudo IG<input className="adm-input" value={profile.ig_username} onChange={(e) => setProfile({ ...profile, ig_username: e.target.value })} /></label>
                    <label className="adm-check"><input type="checkbox" checked={profile.profile_public} onChange={(e) => setProfile({ ...profile, profile_public: e.target.checked })} />Profil public</label>
                    <button type="button" className="adm-btn adm-btn--primary" disabled={saving} onClick={() => saveProfile()}>Enregistrer le profil</button>
                  </fieldset>
                </div>
              )}
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
