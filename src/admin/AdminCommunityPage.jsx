import { useEffect, useState } from 'react'
import { Plus, RefreshCw, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { createUserProfile, deleteUserProfile, getUserProfile, listUsers, updateUserProfile } from '../lib/authApi.js'
import { getAccountBootstrap } from '../lib/accountApi.js'
import { isCharacterLinked } from '../lib/characterLinks.js'

const FIELDS = [
  ['avatar', 'Avatar', 'input'],
  ['image_source', 'Source / credit image', 'input'],
  ['player_intro', 'Quelques mots', 'textarea'],
  ['writing_style', "Style d'ecriture", 'textarea'],
  ['univers', 'Univers', 'textarea'],
  ['tw', 'TW', 'textarea'],
  ['rhythm', 'Rythme', 'textarea'],
  ['ig_username', 'Pseudo IG', 'input'],
]

function emptyProfile() {
  return {
    avatar: '', image_source: '', player_intro: '', writing_style: '', univers: '', tw: '', rhythm: '', ig_username: '', profile_public: false,
  }
}

function fileToAvatarDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Choisis un fichier image.'))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error || new Error('Image illisible.'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('Image illisible.'))
      image.onload = () => {
        const maxEdge = 512
        const scale = Math.min(1, maxEdge / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.width * scale))
        canvas.height = Math.max(1, Math.round(image.height * scale))
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/webp', 0.82))
      }
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

export default function AdminCommunityPage() {
  const [users, setUsers] = useState([])
  const [profiles, setProfiles] = useState({})
  const [characters, setCharacters] = useState([])
  const [editingUser, setEditingUser] = useState(null)
  const [draft, setDraft] = useState(null)
  const [creating, setCreating] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')
  const [avatarBusy, setAvatarBusy] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [body, account] = await Promise.all([listUsers(), getAccountBootstrap()])
      const rows = body.users || []
      const entries = await Promise.all(rows.map(async (user) => [user.id, (await getUserProfile(user.id)).profile]))
      setUsers(rows)
      setProfiles(Object.fromEntries(entries))
      setCharacters(account.data?.characters || [])
    } catch (requestError) {
      setError(String(requestError.message || requestError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const startEdit = (user) => {
    setEditingUser(user)
    setDraft({ ...emptyProfile(), ...(profiles[user.id] || {}) })
    setFlash('')
  }

  const chooseAvatar = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setAvatarBusy(true)
    setError('')
    try {
      const avatar = await fileToAvatarDataUrl(file)
      setDraft((current) => ({ ...current, avatar }))
    } catch (requestError) {
      setError(String(requestError.message || requestError))
    } finally {
      setAvatarBusy(false)
    }
  }

  const save = async () => {
    if (!editingUser || !draft) return
    setError('')
    try {
      const body = await updateUserProfile(editingUser.id, draft)
      setProfiles((current) => ({ ...current, [editingUser.id]: body.profile }))
      setEditingUser(null)
      setDraft(null)
      setFlash('Profil joueur enregistre.')
    } catch (requestError) {
      setError(String(requestError.message || requestError))
    }
  }

  const create = async () => {
    const user = users.find((entry) => entry.id === selectedUserId)
    if (!user) return
    setError('')
    try {
      const body = await createUserProfile(user.id)
      setProfiles((current) => ({ ...current, [user.id]: body.profile }))
      setCreating(false)
      setSelectedUserId('')
      setEditingUser(user)
      setDraft(body.profile)
      setFlash('Profil joueur créé.')
    } catch (requestError) {
      setError(String(requestError.message || requestError))
    }
  }

  const togglePublic = async (user) => {
    const profile = profiles[user.id]
    if (!profile) return
    try {
      const body = await updateUserProfile(user.id, { ...profile, profile_public: !profile.profile_public })
      setProfiles((current) => ({ ...current, [user.id]: body.profile }))
    } catch (requestError) {
      setError(String(requestError.message || requestError))
    }
  }

  const remove = async (user) => {
    if (!window.confirm(`Supprimer uniquement la fiche joueur de ${user.name || user.email} ? Le compte et ses contenus seront conservés.`)) return
    try {
      await deleteUserProfile(user.id)
      setProfiles((current) => { const next = { ...current }; delete next[user.id]; return next })
      setFlash('Profil joueur supprimé.')
    } catch (requestError) {
      setError(String(requestError.message || requestError))
    }
  }

  const profileUsers = users.filter((user) => profiles[user.id]?.exists)
  const availableUsers = users.filter((user) => !profiles[user.id]?.exists)

  return (
    <div className="adm-list">
      <header className="adm-list__head">
        <div><h1>Joueurs</h1><p className="adm-muted">{profileUsers.length} profil(s) joueur · mêmes profils que la galerie publique</p><Link to="/joueurs">Voir les joueurs →</Link></div>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={load}><RefreshCw size={15} /> Recharger</button>
        <button type="button" className="adm-btn adm-btn--primary" onClick={() => setCreating(true)}><Plus size={15} /> Créer un profil joueur</button>
      </header>
      {loading && <p className="adm-muted">Chargement...</p>}
      {error && <div className="adm-banner adm-banner--error">{error}</div>}
      {flash && <div className="adm-banner adm-banner--ok">{flash}</div>}
      {creating && <div className="adm-user-profile-editor"><label htmlFor="player-user">Utilisateur concerné<select id="player-user" className="adm-input" value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}><option value="">Sélectionner un compte</option>{availableUsers.map((user) => <option key={user.id} value={user.id}>{user.name || user.email} - {user.status || 'Membre'}</option>)}</select></label><div className="adm-edit__actions"><button type="button" className="adm-btn adm-btn--ghost" onClick={() => setCreating(false)}>Annuler</button><button type="button" className="adm-btn adm-btn--primary" disabled={!selectedUserId} onClick={create}>Créer</button></div></div>}
      <ul className="adm-cards">
        {profileUsers.map((user) => {
          const profile = profiles[user.id]
          const linkedCharacters = characters.filter((character) => isCharacterLinked(character, user.id, profile.linked_character_ids || []))
          return <li key={user.id}>
            <article className="adm-card adm-card--static">
              <div className="adm-card__body">
                {profile.avatar && <img className="player-card__avatar" src={profile.avatar} alt="" />}
                <strong>{user.name || user.email}</strong>
                <span className="adm-muted">Statut : {user.status || 'Membre'}</span>
                <span className="adm-muted">Compte associé : {user.id}</span>
                <span className="adm-muted">Profil public : {profile.profile_public ? 'oui' : 'non'}</span>
                <span className="adm-muted">{linkedCharacters.length} personnage(s) rattaché(s), brouillons inclus</span>
                {profile.profile_public && !user.disabled && <Link to={`/joueurs/${encodeURIComponent(user.id)}`}>Voir le profil public</Link>}
                {linkedCharacters.length > 0 && <ul className="adm-muted">{linkedCharacters.map((character) => <li key={character.id}>{character.visibility === 'draft' ? <span>{[character.firstName, character.lastName].filter(Boolean).join(' ') || character.id} · brouillon</span> : <Link to={`/personnages/${encodeURIComponent(character.id)}`}>{[character.firstName, character.lastName].filter(Boolean).join(' ') || character.id}</Link>}</li>)}</ul>}
                <span className="adm-muted">Modifié le : {profile.updatedAt ? new Date(profile.updatedAt).toLocaleDateString('fr-FR') : '—'}</span>
              </div>
              <button type="button" className="adm-btn adm-btn--primary" onClick={() => startEdit(user)}>Modifier</button>
              <button type="button" className="adm-btn adm-btn--ghost" onClick={() => togglePublic(user)}>{profile.profile_public ? 'Dépublier' : 'Publier'}</button>
              <button type="button" className="adm-btn adm-btn--danger" onClick={() => remove(user)}><Trash2 size={14} /> Supprimer</button>
              {editingUser?.id === user.id && draft && <div className="adm-user-profile-editor">
                <label>Avatar
                  <input className="adm-input" type="file" accept="image/*" onChange={chooseAvatar} disabled={avatarBusy} />
                  {avatarBusy && <span className="adm-muted">Préparation de l’image...</span>}
                  {draft.avatar && <img className="player-card__avatar" src={draft.avatar} alt="Aperçu de l’avatar" />}
                </label>
                {FIELDS.filter(([key]) => key !== 'avatar').map(([key, label, type]) => <label key={key}>{label}{type === 'textarea'
                  ? <textarea className="adm-input" rows="4" value={draft[key] || ''} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />
                  : <input className="adm-input" value={draft[key] || ''} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />}
                </label>)}
                <label className="adm-check"><input type="checkbox" checked={draft.profile_public} onChange={(event) => setDraft({ ...draft, profile_public: event.target.checked })} />Profil public</label>
                <div className="adm-edit__actions"><button type="button" className="adm-btn adm-btn--ghost" onClick={() => { setEditingUser(null); setDraft(null) }}>Annuler</button><button type="button" className="adm-btn adm-btn--primary" onClick={save}>Enregistrer</button></div>
              </div>}
            </article>
          </li>
        })}
        {!loading && profileUsers.length === 0 && <li className="adm-muted">Aucun profil joueur créé pour le moment.</li>}
      </ul>
    </div>
  )
}
