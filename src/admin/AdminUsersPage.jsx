import { useEffect, useMemo, useRef, useState } from 'react'
import { KeyRound, Plus, RefreshCw } from 'lucide-react'
import { createUser, deleteUser, getUserProfile, listUsers, setUserRight, setUserRole, updateUser, updateUserProfile } from '../lib/authApi.js'
import {
  ASSIGNABLE_ROLES, RIGHTS, RIGHT_LABELS, RIGHT_STATE_TEXT, ROLE_BASE_RIGHTS, ROLE_LEVELS, ROLE_SUMMARY, ROLE_TAGLINE,
  previewRightState, roleLabel,
} from '../lib/roles.js'
import { getCollection } from './adminApi.js'
import { isCharacterLinked } from '../lib/characterLinks.js'

// Formulaire de création : droits AJOUTÉS au rôle choisi.
const PERMISSIONS = RIGHTS.map((right) => [right, RIGHT_LABELS[right]])

const ROLE_ORDER = ['admin', 'creator', 'journalist', 'guest']

const formatDay = (iso) => {
  const time = Date.parse(iso || '')
  return Number.isFinite(time) ? new Date(time).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''
}
const formatLongDay = (iso) => {
  const time = Date.parse(iso || '')
  return Number.isFinite(time) ? new Date(time).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : ''
}
const fold = (text) => String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const initialOf = (user) => (user?.name || user?.email || '?').trim().charAt(0).toUpperCase()

// Copie de travail des droits d'un compte : ce qu'il a d'AJOUTÉ hors rôle et ce
// qui lui est RETIRÉ. Rien n'est envoyé au serveur avant « Enregistrer ».
const draftFrom = (user) => ({
  role: user?.role || 'guest',
  added: new Set(RIGHTS.filter((right) => user?.permissions?.[right] === true)),
  revoked: new Set(user?.revokedRights || []),
})
const isOn = (state) => state === 'role' || state === 'added'

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({
    name: '', email: '', password: '', passwordConfirmation: '', role: 'guest', active: true,
    permissions: { create_character: false, create_clan: false, create_location: false, create_journal_article: false, create_timeline: false },
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
        name: '', email: '', password: '', passwordConfirmation: '', role: 'guest', active: true,
        permissions: { create_character: false, create_clan: false, create_location: false, create_journal_article: false, create_timeline: false },
      })
      setFlash('Utilisateur créé.')
    } catch (e) {
      setFormError(String(e.message || e))
    } finally {
      setCreating(false)
    }
  }


  const [selectedId, setSelectedId] = useState(null)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState(() => draftFrom(null))
  const [applying, setApplying] = useState(false)
  const detailRef = useRef(null)

  const sorted = useMemo(
    () => [...users].sort((a, b) => (ROLE_LEVELS[a.role] ?? 3) - (ROLE_LEVELS[b.role] ?? 3) || String(b.createdAt).localeCompare(String(a.createdAt))),
    [users],
  )
  const needle = fold(query.trim())
  const filtered = needle ? sorted.filter((user) => fold(`${user.name} ${user.email}`).includes(needle)) : sorted
  const counts = ROLE_ORDER.map((role) => users.filter((user) => (user.role === 'user' ? 'guest' : user.role) === role).length)
  const selected = users.find((user) => user.id === selectedId) || null

  // Premier compte non admin sélectionné par défaut (l'admin est déjà en haut de la liste).
  useEffect(() => {
    if (selectedId || users.length === 0) return
    const first = sorted.find((user) => user.role !== 'admin') || sorted[0]
    setSelectedId(first.id)
    setDraft(draftFrom(first))
  }, [users, sorted, selectedId])

  const dirty = Boolean(selected) && (
    draft.role !== selected.role
    || RIGHTS.some((right) => draft.added.has(right) !== (selected.permissions?.[right] === true))
    || RIGHTS.some((right) => draft.revoked.has(right) !== (selected.revokedRights || []).includes(right))
  )

  const selectUser = (user) => {
    if (user.id === selectedId) return
    if (dirty && !window.confirm('Des changements ne sont pas enregistrés. Les abandonner ?')) return
    setSelectedId(user.id)
    setDraft(draftFrom(user))
    setError('')
    setFlash('')
    if (window.innerWidth < 1000) requestAnimationFrame(() => detailRef.current?.scrollIntoView({ block: 'start' }))
  }

  const cancelDraft = () => { if (selected) setDraft(draftFrom(selected)) }

  const chooseRole = (role) => setDraft((current) => ({ ...current, role }))

  const toggleRight = (right) => {
    setDraft((current) => {
      const state = previewRightState(current.role, current.added, current.revoked, right)
      const added = new Set(current.added)
      const revoked = new Set(current.revoked)
      if (isOn(state)) {
        if ((ROLE_BASE_RIGHTS[current.role] || []).includes(right)) revoked.add(right)
        added.delete(right)
      } else if (state === 'revoked') {
        revoked.delete(right)
      }
      return { ...current, added, revoked }
    })
  }

  // Le Worker refait tous les contrôles : rôle d'abord, puis chaque droit dont
  // l'état voulu diffère de l'état réel renvoyé par le serveur.
  const applyDraft = async () => {
    if (!selected || applying || !dirty) return
    setApplying(true)
    setError('')
    setFlash('')
    try {
      let current = selected
      if (draft.role !== current.role) current = (await setUserRole(current.id, draft.role)).user
      for (const right of RIGHTS) {
        const wanted = isOn(previewRightState(draft.role, draft.added, draft.revoked, right))
        if (wanted !== (current.rights || []).includes(right)) current = (await setUserRight(current.id, right, wanted)).user
      }
      setUsers((rows) => rows.map((row) => (row.id === current.id ? { ...row, ...current } : row)))
      setDraft(draftFrom(current))
      setFlash('Compte mis à jour.')
    } catch (e) {
      setError(String(e.message || e))
      await load()
    } finally {
      setApplying(false)
    }
  }


  const previewStates = Object.fromEntries(RIGHTS.map((right) => [right, previewRightState(draft.role, draft.added, draft.revoked, right)]))
  const detailLevel = ROLE_LEVELS[selected?.role] ?? 3

  return (
    <div className="ov ur">
      <section className="ov-hero">
        <div>
          <div className="adm-mono ov-hero__eyebrow">Pilotage · Utilisateurs</div>
          <h1>Qui peut <em>faire quoi.</em></h1>
          <p>Un rôle donne des droits de base. Tu peux ensuite retirer un droit précis à un compte.</p>
        </div>
        <div className="ov-hero__actions">
          <button type="button" className="ov-btn ov-btn--ghost" onClick={load}><RefreshCw size={15} aria-hidden="true" />Recharger</button>
          <button type="button" className="ov-btn ov-btn--primary" onClick={() => { setFormError(''); setShowCreate(true) }}><Plus size={15} aria-hidden="true" />Créer un utilisateur</button>
        </div>
      </section>

      {loading && <p className="adm-muted" role="status">Chargement...</p>}
      {error && <div className="adm-banner adm-banner--error" role="alert">{error}</div>}
      {flash && <div className="adm-banner adm-banner--ok" role="status">{flash}</div>}

      {showCreate && (
        <form className="adm-form" onSubmit={submitCreate}>
          <fieldset className="adm-fieldset">
            <legend>Créer un utilisateur</legend>
            <div className="adm-field"><label htmlFor="new-user-name">Pseudo</label><input id="new-user-name" className="adm-input" value={form.name} onChange={(e) => setFormValue('name', e.target.value)} required /></div>
            <div className="adm-field"><label htmlFor="new-user-email">Email *</label><input id="new-user-email" className="adm-input" type="email" required value={form.email} onChange={(e) => setFormValue('email', e.target.value)} /></div>
            <div className="adm-field"><label htmlFor="new-user-password">Mot de passe temporaire</label><input id="new-user-password" className="adm-input" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setFormValue('password', e.target.value)} required /></div>
            <div className="adm-field"><label htmlFor="new-user-password-confirmation">Confirmation</label><input id="new-user-password-confirmation" className="adm-input" type="password" autoComplete="new-password" value={form.passwordConfirmation} onChange={(e) => setFormValue('passwordConfirmation', e.target.value)} required /></div>
            <div className="adm-field"><label htmlFor="new-user-role">Rôle</label><select id="new-user-role" className="adm-input" value={form.role} onChange={(e) => setFormValue('role', e.target.value)}>{ASSIGNABLE_ROLES.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</select></div>
            <div className="adm-field"><span>Permissions Woltar Nova</span>{PERMISSIONS.map(([permission, label]) => <label className="adm-check" key={permission}><input type="checkbox" checked={form.permissions[permission]} onChange={(e) => setPermission(permission, e.target.checked)} disabled={form.role === 'admin'} />{label}</label>)}</div>
            <label className="adm-check"><input type="checkbox" checked={form.active} onChange={(e) => setFormValue('active', e.target.checked)} />Compte actif</label>
            {formError && <p className="adm-error">{formError}</p>}
            <div className="adm-edit__actions"><button type="button" className="adm-btn adm-btn--ghost" onClick={() => setShowCreate(false)}>Annuler</button><button type="submit" className="adm-btn adm-btn--primary" disabled={creating}>{creating ? 'Création...' : 'Créer le compte'}</button></div>
          </fieldset>
        </form>
      )}

      <section className="ur-roles" aria-label="Hiérarchie des rôles">
        {ROLE_ORDER.map((role, i) => (
          <div key={role} className="ur-roles__cell">
            <div className="ur-roles__top"><span className="ur-lvl" aria-hidden="true">{i}</span><span className="adm-mono ur-roles__name">{roleLabel(role)}</span></div>
            <div className={`ur-roles__count${role === 'admin' ? ' is-accent' : ''}`}><span className="visually-hidden">Niveau {i}, {roleLabel(role)} : </span>{counts[i]}</div>
            <div className="ur-roles__cap">{ROLE_TAGLINE[role]}</div>
          </div>
        ))}
      </section>

      <div className="ur-cols">
        <section className="ur-panel ur-list" aria-label="Comptes">
          <div className="ur-list__head">
            <div className="adm-mono ur-eyebrow">Comptes · {users.length}</div>
            <input type="search" className="ur-search" placeholder="Chercher un compte" aria-label="Chercher un compte" autoComplete="off"
              value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setQuery('')} />
          </div>
          <ul>
            {filtered.map((user) => {
              const role = user.role === 'user' ? 'guest' : user.role
              return (
                <li key={user.id}>
                  <button type="button" className={`ur-user${user.id === selectedId ? ' is-on' : ''}`} aria-current={user.id === selectedId ? 'true' : undefined} onClick={() => selectUser(user)}>
                    <span className="ur-av" aria-hidden="true">{initialOf(user)}</span>
                    <span className="ur-user__text">
                      <span className="ur-user__name">{user.name || user.email}{user.disabled && <span className="ur-user__off"> · désactivé</span>}</span>
                      <span className="ur-user__sub">{role === 'admin' ? 'Compte admin' : `Créé le ${formatDay(user.createdAt) || '—'}`}</span>
                    </span>
                    <span className="ur-lvl" aria-hidden="true">{ROLE_LEVELS[role]}</span>
                    <span className="adm-mono ur-tag">{roleLabel(role)}</span>
                  </button>
                </li>
              )
            })}
            {!loading && filtered.length === 0 && <li className="ur-empty">{users.length === 0 ? 'Aucun compte créé pour le moment.' : 'Aucun compte ne correspond à cette recherche.'}</li>}
          </ul>
        </section>

        <section className="ur-detail" aria-label="Compte sélectionné" ref={detailRef} tabIndex={-1}>
          {!selected && <div className="ur-panel ur-empty">Choisis un compte dans la liste.</div>}
          {selected && (
            <>
              <div className="ur-panel ur-head">
                <span className="ur-av ur-av--lg" aria-hidden="true">{initialOf(selected)}</span>
                <div className="ur-head__text">
                  <h2 className="ur-head__name">{selected.name || selected.email}</h2>
                  <div className="ur-head__sub">{selected.createdAt ? `Créé le ${formatLongDay(selected.createdAt)}` : 'Date de création inconnue'}{selected.email ? ` · ${selected.email}` : ''}</div>
                </div>
                <span className="ur-chip is-w adm-mono">Niveau {detailLevel} · {roleLabel(selected.role)}</span>
              </div>

              <div className="ur-panel">
                <div className="adm-mono ur-eyebrow" id="ur-role-title">1 · Rôle du compte</div>
                {selected.role === 'admin' ? (
                  <p className="ur-note">Ce compte a le rôle Admin : tous les droits, sans exception. Il ne se modifie pas ici.</p>
                ) : (
                  <div className="ur-roles-pick" role="radiogroup" aria-labelledby="ur-role-title">
                    {ASSIGNABLE_ROLES.map((role) => (
                      <label key={role} className={`ur-rolecard${draft.role === role ? ' is-on' : ''}`}>
                        <input type="radio" name="ur-role" value={role} checked={draft.role === role} onChange={() => chooseRole(role)} />
                        <span className="ur-rad" aria-hidden="true" />
                        <span>
                          <span className="ur-rolecard__name">{roleLabel(role)} <span className="adm-mono ur-rolecard__lvl">Niv. {ROLE_LEVELS[role]}</span></span>
                          <span className="ur-rolecard__desc">{ROLE_SUMMARY[role]}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                <p className="ur-note">Le rôle Admin ne se donne pas ici : il est réservé à ton compte.</p>
              </div>

              <div className="ur-panel">
                <div className="ur-rights__head"><div className="adm-mono ur-eyebrow">2 · Droits précis</div><div className="ur-rights__hint">Coupe un interrupteur pour retirer un droit</div></div>
                <ul className="ur-rights">
                  {RIGHTS.map((right) => {
                    const state = previewStates[right]
                    const locked = selected.role === 'admin' || state === 'none'
                    const on = isOn(state)
                    return (
                      <li key={right} className="ur-sw">
                        <button type="button" role="switch" aria-checked={on} aria-labelledby={`ur-sw-${right}`} aria-describedby={`ur-st-${right}`}
                          className={`ur-tg${on ? '' : ' is-off'}${locked ? ' is-locked' : ''}`} disabled={locked} onClick={() => toggleRight(right)}><span aria-hidden="true" /></button>
                        <span className={`ur-sw__label${on ? '' : ' is-muted'}`} id={`ur-sw-${right}`}>{RIGHT_LABELS[right]}</span>
                        <span id={`ur-st-${right}`} className={`adm-mono ur-state is-${state}`}>{RIGHT_STATE_TEXT[state]}</span>
                      </li>
                    )
                  })}
                  <li className="ur-sw">
                    <button type="button" role="switch" aria-checked="true" aria-labelledby="ur-sw-own" aria-describedby="ur-st-own" className="ur-tg is-locked" disabled><span aria-hidden="true" /></button>
                    <span className="ur-sw__label" id="ur-sw-own">Modifier son compte</span>
                    <span id="ur-st-own" className="adm-mono ur-state">Toujours actif</span>
                  </li>
                </ul>
              </div>

              <div className="ur-actions">
                <button type="button" className="ov-btn ov-btn--primary" disabled={!dirty || applying} onClick={applyDraft}>{applying ? 'Enregistrement…' : 'Enregistrer'}</button>
                <button type="button" className="ov-btn ov-btn--ghost" disabled={!dirty || applying} onClick={cancelDraft}>Annuler</button>
                {dirty && <span className="ur-actions__note adm-mono" role="status">Changements non enregistrés</span>}
              </div>

              <div className="ur-panel ur-account">
                <div className="adm-mono ur-eyebrow">3 · Le compte</div>
                <div className="ur-account__grid">
                  <label className="adm-check">
                    <input type="checkbox" checked={Boolean(selected.disabled)} onChange={(e) => patch(selected.id, { disabled: e.target.checked })} />
                    Compte désactivé
                  </label>
                  <form
                    key={`${selected.id}-${selected.email || 'none'}`}
                    className="adm-user-email"
                    onSubmit={(e) => {
                      e.preventDefault()
                      patch(selected.id, { email: e.currentTarget.elements.email.value })
                    }}
                  >
                    <label className="visually-hidden" htmlFor="ur-email">Email du compte</label>
                    <input id="ur-email" className="adm-input" name="email" type="email" defaultValue={selected.email || ''} placeholder="Email facultatif" />
                    <button type="submit" className="adm-btn adm-btn--ghost">Enregistrer email</button>
                    {selected.email && <button type="button" className="adm-btn adm-btn--ghost" onClick={() => patch(selected.id, { email: '' })}>Supprimer l’adresse</button>}
                  </form>
                  <dl className="adm-user-meta">
                    <div><dt>Personnages</dt><dd>{selected.contentCounts?.characters || 0}</dd></div>
                    <div><dt>Clans</dt><dd>{selected.contentCounts?.clans || 0}</dd></div>
                    <div><dt>Lieux</dt><dd>{selected.contentCounts?.locations || 0}</dd></div>
                  </dl>
                  <div className="ur-account__buttons">
                    <button type="button" className="adm-btn adm-btn--ghost" onClick={() => resetPassword(selected)}><KeyRound size={14} /> Réinitialiser le mot de passe</button>
                    <button type="button" className="adm-btn adm-btn--ghost" disabled={saving} onClick={() => editProfile(selected)}>Profil RP et personnages</button>
                    <button type="button" className="adm-btn adm-btn--danger" onClick={() => removeUser(selected)}>Supprimer</button>
                  </div>
                  <code className="adm-card__id">{selected.id}</code>
                </div>
              {profileUser?.id === selected.id && profile && (
                <div className="adm-selected-profile-editor">
                  <fieldset className="adm-profile-block" disabled={saving}>
                    <legend>Personnages rattachés</legend>
                    <p className="adm-muted">Les personnages dont ce compte est propriétaire principal restent automatiquement rattachés. Ici, tu peux rattacher ou détacher les liens complémentaires, sans modifier la propriété ni supprimer de personnage.</p>
                    <ul>
                      {characters.filter((character) => isCharacterLinked(character, selected.id, profile.linked_character_ids)).map((character) => (
                        <li key={character.id}>
                          {[character.firstName, character.lastName].filter(Boolean).join(' ') || character.name || character.id}
                          {character.ownerUserId === selected.id && <span className="adm-pill">Propriétaire principal</span>}
                          {character.visibility === 'draft' && <span className="adm-pill">Brouillon · non public</span>}
                        </li>
                      ))}
                    </ul>
                    {!characters.some((character) => isCharacterLinked(character, selected.id, profile.linked_character_ids)) && <p className="adm-muted">Aucun personnage rattaché.</p>}
                    <span>Sélection multiple des personnages disponibles</span>
                    <div className="adm-character-links">
                      {characters.map((character) => (
                        <label className="adm-check" key={character.id}>
                          <input type="checkbox" disabled={character.ownerUserId === selected.id} checked={isCharacterLinked(character, selected.id, linkedIds)} onChange={(e) => setLinkedIds((ids) => e.target.checked ? [...new Set([...ids, character.id])] : ids.filter((id) => id !== character.id))} />
                          {[character.firstName, character.lastName].filter(Boolean).join(' ') || character.name || character.id}
                          <small className="adm-muted">{character.id}{character.ownerUserId === selected.id ? ' · Propriétaire principal' : character.ownerUserId && character.ownerUserId !== 'system' ? ` · Propriétaire : ${users.find((owner) => owner.id === character.ownerUserId)?.name || character.ownerUserId}` : ' · Officiel'}</small>
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
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
