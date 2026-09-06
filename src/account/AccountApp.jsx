import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CalendarClock, ChevronDown, ChevronUp, Lock, LogOut, MapPin, PenLine, Plus, Save, Shield, Trash2, UserRound, X } from 'lucide-react'
import {
  accountBackendAvailable,
  confirmEmail,
  forgotPassword,
  loginAccount,
  logoutAccount,
  registerAccount,
  resetPassword as resetPasswordRequest,
} from '../lib/authApi.js'
import {
  changeEmail,
  changePassword,
  createAccountRow,
  deleteAccountRow,
  getAccountBootstrap,
  getPlayerProfile,
  updateAccountRow,
  savePlayerProfile,
  uploadAvatar,
} from '../lib/accountApi.js'
import { SCHEMA } from '../admin/schema.js'
import { Field } from '../admin/Fields.jsx'
import ThemeToggle from '../components/ThemeToggle/ThemeToggle.jsx'
import ClanComposer from '../components/ClanComposer/ClanComposer.jsx'
import '../admin/admin.css'

const ArticleComposer = lazy(() => import('../components/ArticleEditor/ArticleComposer.jsx'))

const SECTIONS = {
  personnages: { collection: 'characters', label: 'Mes personnages', singular: 'personnage' },
  clans: { collection: 'clans', label: 'Mes clans', singular: 'clan' },
  lieux: { collection: 'locations', label: 'Mes lieux', singular: 'lieu' },
  articles: { collection: 'posts', label: 'Mes articles', singular: 'article' },
  chronologies: { collection: 'timelines', label: 'Mes chronologies', singular: 'chronologie' },
}

const CREATE_PERMISSION_BY_COLLECTION = {
  characters: 'create_character',
  clans: 'create_clan',
  locations: 'create_location',
  posts: 'create_journal_article',
  timelines: 'create_timeline',
}

function canCreate(user, collection) {
  return user?.role === 'admin' || user?.permissions?.[CREATE_PERMISSION_BY_COLLECTION[collection]] === true
}

function canManagePlayerProfile(user) {
  return user?.role === 'admin' || user?.status === 'RPiste'
}

function AccountBackendUnavailable() {
  return (
    <div className="adm-gate">
      <div className="adm-gate__card">
        <h1>Espace Woltar Nova</h1>
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
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Format volontairement permissif — même règle que côté serveur (voir
  // worker/lib/authStore.js#assertRequiredEmail) : on écarte les fautes de
  // frappe évidentes sans être trop strict. La vérification serveur reste la
  // seule autorité : ce contrôle ne fait qu'éviter un aller-retour réseau
  // inutile, il ne remplace jamais la validation backend.
  const EMAIL_FORMAT_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const submit = async () => {
    setError('')
    if (mode === 'register') {
      const trimmedEmail = email.trim()
      if (!trimmedEmail) {
        setError('L’adresse email est obligatoire pour créer un compte.')
        return
      }
      if (!EMAIL_FORMAT_RE.test(trimmedEmail)) {
        setError('Cette adresse email n’est pas valide.')
        return
      }
    }
    setBusy(true)
    try {
      const body =
        mode === 'register'
          ? await registerAccount({ name, email, password })
          : await loginAccount({ identifier, password })
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
        <h1>Espace Woltar Nova</h1>
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
        {mode === 'register' ? (
          <>
            <label htmlFor="account-email" className="adm-field__label">Email *</label>
            <input
              id="account-email"
              className="adm-input"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </>
        ) : (
          <>
            <label htmlFor="account-identifier" className="adm-field__label">Pseudo</label>
            <input
              id="account-identifier"
              className="adm-input"
              type="text"
              name="identifier"
              autoComplete="username"
              placeholder="Poungou"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </>
        )}
        <input
          className="adm-input"
          type="password"
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {mode === 'register' && (
          <p className="adm-hint">Les nouveaux comptes sont créés avec le rôle user. Une adresse email valide est obligatoire.</p>
        )}
        {mode === 'login' && (
          <>
            <p className="adm-hint">Pseudo. Tu peux aussi utiliser ton adresse email si elle est associée à ton compte.</p>
            <Link to="/compte/mot-de-passe-oublie" className="adm-hint">Mot de passe oublié ?</Link>
          </>
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

// Mot de passe oublié — accessible sans session (voir AccountApp ci-dessous
// et worker/routes/auth.js#forgot-password). Réponse toujours identique que
// l'adresse existe ou non : le message affiché ne change jamais selon la
// réalité du compte, pour ne rien révéler.
function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(String(err.message || err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="adm-gate">
      <form className="adm-gate__card" onSubmit={submit}>
        <h1>Mot de passe oublié</h1>
        {sent ? (
          <p className="adm-hint">
            Si un compte existe avec cette adresse, un email de réinitialisation vient d’être envoyé. Vérifie ta
            boîte de réception (et tes spams).
          </p>
        ) : (
          <>
            <p className="adm-hint">
              Indique l’adresse email de ton compte : tu recevras un lien pour choisir un nouveau mot de passe.
            </p>
            <input
              className="adm-input"
              type="email"
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && <p className="adm-error">{error}</p>}
            <button className="adm-btn adm-btn--primary" type="submit" disabled={busy}>
              {busy ? 'Envoi...' : 'Envoyer le lien'}
            </button>
          </>
        )}
        <Link to="/compte" className="adm-btn adm-btn--ghost">
          Retour à la connexion
        </Link>
      </form>
    </div>
  )
}

// Page ouverte depuis le lien envoyé par email (?token=...) — jamais de
// session exigée ici, le jeton à usage unique prouve l'identité (voir
// worker/lib/authStore.js#resetPassword).
function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [newPassword, setNewPassword] = useState('')
  const [confirmValue, setConfirmValue] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmValue) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }
    setBusy(true)
    try {
      await resetPasswordRequest(token, newPassword)
      setDone(true)
    } catch (err) {
      setError(String(err.message || err))
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <div className="adm-gate">
        <div className="adm-gate__card">
          <h1>Lien invalide</h1>
          <p className="adm-hint">Ce lien de réinitialisation est incomplet ou invalide.</p>
          <Link to="/compte" className="adm-btn adm-btn--ghost">
            Retour à la connexion
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="adm-gate">
      <form className="adm-gate__card" onSubmit={submit}>
        <h1>Nouveau mot de passe</h1>
        {done ? (
          <>
            <p className="adm-hint">Ton mot de passe a été mis à jour. Tu peux te reconnecter.</p>
            <Link to="/compte" className="adm-btn adm-btn--primary">
              Se connecter
            </Link>
          </>
        ) : (
          <>
            <input
              className="adm-input"
              type="password"
              autoComplete="new-password"
              placeholder="Nouveau mot de passe"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <input
              className="adm-input"
              type="password"
              autoComplete="new-password"
              placeholder="Confirmer le mot de passe"
              value={confirmValue}
              onChange={(e) => setConfirmValue(e.target.value)}
              required
            />
            {error && <p className="adm-error">{error}</p>}
            <button className="adm-btn adm-btn--primary" type="submit" disabled={busy}>
              {busy ? 'Patiente...' : 'Choisir ce mot de passe'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}

// Page ouverte depuis le lien de confirmation envoyé à la NOUVELLE adresse
// (voir worker/routes/account.js#change-email). Pas de session exigée : le
// jeton suffit, et la personne peut ne plus être connectée sur cet appareil.
function ConfirmEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [status, setStatus] = useState('pending')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setError('Ce lien de confirmation est incomplet ou invalide.')
      return undefined
    }
    let alive = true
    confirmEmail(token)
      .then(() => {
        if (alive) setStatus('ok')
      })
      .catch((err) => {
        if (alive) {
          setStatus('error')
          setError(String(err.message || err))
        }
      })
    return () => {
      alive = false
    }
  }, [token])

  return (
    <div className="adm-gate">
      <div className="adm-gate__card">
        <h1>Confirmation d’adresse email</h1>
        {status === 'pending' && <p className="adm-hint">Vérification en cours...</p>}
        {status === 'ok' && <p className="adm-hint">Ta nouvelle adresse email est confirmée.</p>}
        {status === 'error' && <p className="adm-error">{error}</p>}
        <Link to="/compte" className="adm-btn adm-btn--ghost">
          Retour à l’espace compte
        </Link>
      </div>
    </div>
  )
}

// Section "Sécurité du compte" de l'espace connecté : changer l'email,
// changer le mot de passe, se déconnecter. Le mot de passe actuel est
// toujours revérifié côté serveur (worker/routes/account.js /
// plugins/woltar-account.js) — jamais seulement ici.
function SecuritySection({ user, onLogout }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [pwFlash, setPwFlash] = useState('')

  const [emailPassword, setEmailPassword] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)
  const [emailFlash, setEmailFlash] = useState('')

  const onChangePassword = async (e) => {
    e.preventDefault()
    setPwFlash('')
    if (newPassword !== confirmPassword) {
      setPwFlash('error:Les deux mots de passe ne correspondent pas.')
      return
    }
    setPwBusy(true)
    try {
      await changePassword({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPwFlash('ok:Mot de passe mis à jour. Tes autres sessions ouvertes ailleurs ont été déconnectées.')
    } catch (err) {
      setPwFlash(`error:${err.message || err}`)
    } finally {
      setPwBusy(false)
    }
  }

  const onChangeEmail = async (e) => {
    e.preventDefault()
    setEmailFlash('')
    setEmailBusy(true)
    try {
      await changeEmail({ newEmail, currentPassword: emailPassword })
      setEmailPassword('')
      setNewEmail('')
      setEmailFlash(
        'ok:Un email de confirmation vient d’être envoyé à la nouvelle adresse. Le changement ne sera effectif qu’après avoir cliqué sur le lien reçu.',
      )
    } catch (err) {
      setEmailFlash(`error:${err.message || err}`)
    } finally {
      setEmailBusy(false)
    }
  }

  return (
    <div className="adm-edit">
      <header className="adm-edit__head">
        <div className="adm-edit__title">
          <h1>Sécurité du compte</h1>
          <code>{user.email || 'Aucune adresse email'}</code>
        </div>
      </header>

      <form className="adm-form" onSubmit={onChangeEmail}>
        <fieldset className="adm-fieldset">
          <legend>Modifier mon adresse email</legend>
          <p className="adm-hint">
            Adresse actuelle : {user.email || 'Aucune adresse email associée'}
            {user.pendingEmail
              ? ` — changement en attente vers ${user.pendingEmail} (vérifie tes emails pour confirmer)`
              : ''}
          </p>
          <div className="adm-field">
            <label htmlFor="sec-new-email">Nouvelle adresse</label>
            <input
              id="sec-new-email"
              className="adm-input"
              type="email"
              autoComplete="email"
              placeholder="Nouvelle adresse email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
          </div>
          <div className="adm-field">
            <label htmlFor="sec-email-password">Mot de passe actuel</label>
            <input
              id="sec-email-password"
              className="adm-input"
              type="password"
              autoComplete="current-password"
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              required
            />
          </div>
          {emailFlash.startsWith('ok:') && <div className="adm-banner adm-banner--ok">{emailFlash.slice(3)}</div>}
          {emailFlash.startsWith('error:') && (
            <div className="adm-banner adm-banner--error">{emailFlash.slice(6)}</div>
          )}
          <button type="submit" className="adm-btn adm-btn--primary" disabled={emailBusy}>
            {emailBusy ? 'Envoi...' : 'Modifier mon adresse email'}
          </button>
        </fieldset>
      </form>

      <form className="adm-form" onSubmit={onChangePassword}>
        <fieldset className="adm-fieldset">
          <legend>Modifier mon mot de passe</legend>
          <div className="adm-field">
            <label htmlFor="sec-current-password">Mot de passe actuel</label>
            <input
              id="sec-current-password"
              className="adm-input"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="adm-field">
            <label htmlFor="sec-new-password">Nouveau mot de passe</label>
            <input
              id="sec-new-password"
              className="adm-input"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div className="adm-field">
            <label htmlFor="sec-confirm-password">Confirmer le nouveau mot de passe</label>
            <input
              id="sec-confirm-password"
              className="adm-input"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {pwFlash.startsWith('ok:') && <div className="adm-banner adm-banner--ok">{pwFlash.slice(3)}</div>}
          {pwFlash.startsWith('error:') && <div className="adm-banner adm-banner--error">{pwFlash.slice(6)}</div>}
          <button type="submit" className="adm-btn adm-btn--primary" disabled={pwBusy}>
            {pwBusy ? 'Mise à jour...' : 'Modifier mon mot de passe'}
          </button>
        </fieldset>
      </form>

      <fieldset className="adm-fieldset">
        <legend>Déconnexion</legend>
        <button
          type="button"
          className="adm-btn adm-btn--danger"
          onClick={async () => {
            await logoutAccount().catch(() => {})
            onLogout()
          }}
        >
          <LogOut size={15} /> Déconnexion
        </button>
      </fieldset>
    </div>
  )
}

function PlayerProfileSection() {
  const [profile, setProfile] = useState(null)
  const [characters, setCharacters] = useState([])
  const [flash, setFlash] = useState('')
  useEffect(() => {
    Promise.all([getPlayerProfile(), getAccountBootstrap()])
      .then(([profileBody, accountBody]) => {
        setProfile(profileBody.profile)
        setCharacters((accountBody.data?.characters || []).filter((character) => accountBody.user.role === 'admin' || character.ownerUserId === accountBody.user.id))
      })
      .catch((error) => setFlash(`error:${error.message || error}`))
  }, [])
  if (!profile) return <div className="adm-banner">Chargement du profil...</div>
  const set = (key, value) => setProfile((current) => ({ ...current, [key]: value }))
  const save = async (event) => { event.preventDefault(); setFlash(''); try { const body = await savePlayerProfile(profile); setProfile(body.profile); setFlash('ok:Profil joueur enregistré.') } catch (error) { setFlash(`error:${error.message || error}`) } }
  const fields = [['player_intro', 'Quelques mots'], ['writing_style', 'Style d’écriture'], ['univers', 'Univers'], ['tw', 'TW'], ['rhythm', 'Rythme']]
  return <div className="adm-edit"><header className="adm-edit__head"><div className="adm-edit__title"><h1>Mon profil joueur</h1><p className="adm-muted">Les personnages dont tu es propriétaire sont automatiquement rattachés. Les liens complémentaires sont gérés dans Admin &gt; Utilisateurs.</p></div></header><form className="adm-form" onSubmit={save}><fieldset className="adm-fieldset"><legend>Profil public</legend><div className="adm-field"><label htmlFor="profile-avatar">Photo de profil</label><Field field={{ type: 'image', key: 'avatar' }} value={profile.avatar} onChange={(v) => set('avatar', v)} disabled={false} uploadEnabled uploadFn={uploadAvatar} allowFocus={false} /></div><div className="adm-field"><label htmlFor="profile-image-source">Source / crédit image</label><input id="profile-image-source" className="adm-input" value={profile.image_source} onChange={(e) => set('image_source', e.target.value)} /></div>{fields.map(([key, label]) => <div className="adm-field" key={key}><label htmlFor={`profile-${key}`}>{label}</label><textarea id={`profile-${key}`} className="adm-input" rows="4" value={profile[key]} onChange={(e) => set(key, e.target.value)} /></div>)}<div className="adm-field"><label htmlFor="profile-ig">Pseudo IG</label><input id="profile-ig" className="adm-input" value={profile.ig_username} onChange={(e) => set('ig_username', e.target.value)} /></div><div className="adm-field"><span>Personnages liés</span>{characters.length === 0 ? <span className="adm-muted">Aucun personnage créé par ce compte.</span> : characters.map((character) => <label className="adm-check" key={character.id}><input type="checkbox" disabled={character.ownerUserId === profile.userId} checked={character.ownerUserId === profile.userId || (profile.linked_character_ids || []).includes(character.id)} onChange={(e) => set('linked_character_ids', e.target.checked ? [...(profile.linked_character_ids || []), character.id] : (profile.linked_character_ids || []).filter((id) => id !== character.id))} />{[character.firstName, character.lastName].filter(Boolean).join(' ') || character.name || character.id}</label>)}</div><label className="adm-check"><input type="checkbox" checked={profile.profile_public} onChange={(e) => set('profile_public', e.target.checked)} />Profil public</label>{flash.startsWith('ok:') && <div className="adm-banner adm-banner--ok">{flash.slice(3)}</div>}{flash.startsWith('error:') && <div className="adm-banner adm-banner--error">{flash.slice(6)}</div>}<button type="submit" className="adm-btn adm-btn--primary">{profile.exists ? 'Enregistrer' : 'Créer ma fiche joueur'}</button></fieldset></form></div>
}

function Dashboard({ data, user }) {
  const characters = data?.characters || []
  const clans = data?.clans || []
  const locations = data?.locations || []
  const posts = data?.posts || []
  const timelines = data?.timelines || []
  return (
    <div className="adm-list">
      <header className="adm-list__head">
        <div>
          <h1>Mon espace</h1>
          <p className="adm-muted">Statut : {user.status || 'Membre'}</p>
        </div>
      </header>
      <ul className="adm-cards">
        {canManagePlayerProfile(user) && <li>
          <Link to="/compte/profil" className="adm-card">
            <div className="adm-card__body"><strong>Mon profil joueur</strong><span className="adm-muted">Créer ou modifier ma fiche publique</span></div>
            <Plus size={16} />
          </Link>
        </li>}
        {(canCreate(user, 'characters') || characters.length > 0) && <li>
          <Link to="/compte/personnages" className="adm-card">
            <div className="adm-card__body">
              <strong>Mes personnages</strong>
              <span className="adm-muted">{characters.length} fiche(s)</span>
            </div>
            <Plus size={16} />
          </Link>
        </li>}
        {(canCreate(user, 'clans') || clans.length > 0) && <li>
          <Link to="/compte/clans" className="adm-card">
            <div className="adm-card__body">
              <strong>Mes clans</strong>
              <span className="adm-muted">{clans.length} fiche(s)</span>
            </div>
            <Plus size={16} />
          </Link>
        </li>}
        {(canCreate(user, 'locations') || locations.length > 0) && <li>
          <Link to="/compte/lieux" className="adm-card">
            <div className="adm-card__body">
              <strong>Mes lieux</strong>
              <span className="adm-muted">{locations.length} fiche(s)</span>
            </div>
            <MapPin size={16} />
          </Link>
        </li>}
        {(canCreate(user, 'posts') || posts.length > 0) && <li>
          <Link to="/compte/articles" className="adm-card">
            <div className="adm-card__body"><strong>Mes articles</strong><span className="adm-muted">{posts.length} fiche(s)</span></div>
            <PenLine size={16} />
          </Link>
        </li>}
        {(canCreate(user, 'timelines') || timelines.length > 0) && <li>
          <Link to="/compte/chronologies" className="adm-card">
            <div className="adm-card__body"><strong>Mes chronologies</strong><span className="adm-muted">{timelines.length} fiche(s)</span></div>
            <CalendarClock size={16} />
          </Link>
        </li>}
      </ul>
    </div>
  )
}

function AccountList({ data, user, reload }) {
  const { section } = useParams()
  const [deleting, setDeleting] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const config = SECTIONS[section]
  const rows = data?.[config?.collection] || []
  const schema = config ? SCHEMA[config.collection] : null

  if (!config || !schema) return <Navigate to="/compte" replace />

  const deleteArticle = async (row) => {
    if (deleting || section !== 'articles' || user?.role !== 'admin') return
    if (!window.confirm(`Supprimer définitivement l’article « ${schema.title(row)} » ? Cette action est irréversible.`)) return
    setDeleting(row.id)
    setDeleteError('')
    try {
      await deleteAccountRow('posts', row.id)
      await reload()
    } catch (error) {
      setDeleteError(String(error.message || error))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="adm-list">
      <header className="adm-list__head">
        <div>
          <h1>{config.label}</h1>
          <p className="adm-muted">{rows.length} fiche(s)</p>
        </div>
        {canCreate(user, config.collection) && (
          <Link to={`/compte/${section}/new`} className="adm-btn adm-btn--primary">
            <Plus size={16} /> Creer un {config.singular}
          </Link>
        )}
      </header>
      {deleteError && <div className="adm-banner adm-banner--error" role="alert">{deleteError}</div>}
      <ul className="adm-cards">
        {rows.map((row) => (
          <li key={row.id}>
            <Link to={`/compte/${section}/${encodeURIComponent(row.id)}`} className="adm-card">
              <div className="adm-card__body">
                <strong>{schema.title(row)}</strong>
                <span className="adm-muted">{schema.subtitle(row) || '—'}</span>
                {user?.role === 'admin' && row.ownerUserId && row.ownerUserId !== user.id && (
                  <span className="adm-muted">Propriétaire : {row.ownerUserId}</span>
                )}
              </div>
              <code className="adm-card__id">{row.id}</code>
            </Link>
            {section === 'articles' && user?.role === 'admin' && (
              <button type="button" className="adm-btn adm-btn--danger" disabled={deleting !== null}
                onClick={() => deleteArticle(row)} aria-label={`Supprimer l’article ${schema.title(row)}`}>
                <Trash2 size={15} /> {deleting === row.id ? 'Suppression…' : 'Supprimer l’article'}
              </button>
            )}
          </li>
        ))}
        {rows.length === 0 && <li className="adm-muted">Aucun contenu pour le moment.</li>}
      </ul>
    </div>
  )
}

// Gestion des membres, des liens et de l'aperçu du sociogramme d'un clan de
// compte — voir src/components/ClanComposer/ClanComposer.jsx (Refonte
// composeur de clan). Vivait auparavant ici sous la forme d'un simple
// <select> + liste (ClanMembersEditor) ; la logique de rattachement
// (POST/DELETE sur /collections/clans/:id/members, table clan_members à
// part du champ `members` de la fiche clan) n'a pas changé, seule sa
// présentation visuelle a été déplacée dans ce composant dédié.

// Éditeur des événements d'une chronologie de compte. Contrairement aux
// membres d'un clan (ClanComposer, table clan_members à part), les
// événements d'une chronologie sont un simple tableau embarqué
// dans sa propre fiche JSON (voir migrations/0012_timelines.sql et
// src/lib/timelineEvents.js) : pas d'appel serveur ici, juste un état local
// propagé par `onChange` vers le formulaire générique (form.events),
// enregistré avec le reste de la fiche au clic sur « Enregistrer ». Le
// réordonnancement se fait par boutons haut/bas plutôt que par glisser-
// déposer, pour rester simple et accessible au clavier.
function emptyTimelineEvent() {
  return { id: '', title: '', dateRP: '', description: '', characters: [], locations: [], importance: '', spoiler: false }
}

function TimelineEventsEditor({ events, onChange, data, disabled }) {
  const list = Array.isArray(events) ? events : []

  const updateEvent = (index, patch) => {
    onChange(list.map((event, i) => (i === index ? { ...event, ...patch } : event)))
  }

  const addEvent = () => {
    onChange([...list, emptyTimelineEvent()])
  }

  const removeEvent = (index) => {
    if (!window.confirm('Supprimer cet événement de la chronologie ?')) return
    onChange(list.filter((_, i) => i !== index))
  }

  const moveEvent = (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= list.length) return
    const next = [...list]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <fieldset className="adm-fieldset">
      <legend>Événements de la chronologie</legend>
      <p className="adm-hint">
        L’ordre ci-dessous est celui affiché sur le site. La date/période RP est un texte libre — utile pour un
        calendrier propre à l’univers (« an 12 », « avant le Sceau »...), sans format imposé.
      </p>
      <ul className="adm-cards">
        {list.map((event, index) => (
          <li key={index} className="adm-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' }}>
            <div className="adm-edit__actions">
              <button
                type="button"
                className="adm-btn adm-btn--ghost"
                disabled={disabled || index === 0}
                onClick={() => moveEvent(index, -1)}
                aria-label="Monter l’événement"
              >
                <ChevronUp size={15} />
              </button>
              <button
                type="button"
                className="adm-btn adm-btn--ghost"
                disabled={disabled || index === list.length - 1}
                onClick={() => moveEvent(index, 1)}
                aria-label="Descendre l’événement"
              >
                <ChevronDown size={15} />
              </button>
              <button
                type="button"
                className="adm-btn adm-btn--danger"
                disabled={disabled}
                onClick={() => removeEvent(index)}
                aria-label="Supprimer l’événement"
              >
                <X size={15} />
              </button>
            </div>
            <div className="adm-field">
              <label htmlFor={`event-${index}-title`}>Titre</label>
              <input
                id={`event-${index}-title`}
                className="adm-input"
                value={event.title || ''}
                disabled={disabled}
                onChange={(e) => updateEvent(index, { title: e.target.value })}
              />
            </div>
            <div className="adm-field">
              <label htmlFor={`event-${index}-date`}>Date / période RP</label>
              <input
                id={`event-${index}-date`}
                className="adm-input"
                value={event.dateRP || ''}
                disabled={disabled}
                onChange={(e) => updateEvent(index, { dateRP: e.target.value })}
              />
            </div>
            <div className="adm-field">
              <label htmlFor={`event-${index}-importance`}>Importance</label>
              <select
                id={`event-${index}-importance`}
                className="adm-input"
                value={event.importance || ''}
                disabled={disabled}
                onChange={(e) => updateEvent(index, { importance: e.target.value })}
              >
                <option value="">—</option>
                <option value="majeur">Majeur</option>
                <option value="mineur">Mineur</option>
              </select>
            </div>
            <div className="adm-field">
              <label className="adm-check"><input type="checkbox" checked={event.spoiler === true || event.spoiler === 'true'} disabled={disabled} onChange={(e) => updateEvent(index, { spoiler: e.target.checked })} />Masquer le contenu de cet événement (spoiler)</label>
              <label htmlFor={`event-${index}-description`}>Résumé</label>
              <textarea
                id={`event-${index}-description`}
                className="adm-input"
                rows="3"
                value={event.description || ''}
                disabled={disabled}
                onChange={(e) => updateEvent(index, { description: e.target.value })}
              />
            </div>
            <div className="adm-field">
              <label htmlFor={`event-${index}-characters`}>Personnages liés</label>
              <Field
                field={{ key: `event-${index}-characters`, type: 'refs', ref: 'characters' }}
                value={event.characters}
                allData={data}
                disabled={disabled}
                onChange={(value) => updateEvent(index, { characters: value })}
              />
            </div>
            <div className="adm-field">
              <label htmlFor={`event-${index}-locations`}>Lieux liés</label>
              <Field
                field={{ key: `event-${index}-locations`, type: 'refs', ref: 'locations' }}
                value={event.locations}
                allData={data}
                disabled={disabled}
                onChange={(value) => updateEvent(index, { locations: value })}
              />
            </div>
          </li>
        ))}
        {list.length === 0 && <li className="adm-muted">Aucun événement pour le moment.</li>}
      </ul>
      <button type="button" className="adm-btn adm-btn--primary" disabled={disabled} onClick={addEvent}>
        <Plus size={15} /> Ajouter un événement
      </button>
    </fieldset>
  )
}

function AccountEdit({ data, reload, user }) {
  const { section, id } = useParams()
  const navigate = useNavigate()
  const config = SECTIONS[section]
  const collection = config?.collection
  const schema = collection ? SCHEMA[collection] : null
  const rows = data?.[collection] || []
  const isNew = id === 'new'
  const existing = isNew ? null : rows.find((row) => row.id === decodeURIComponent(id || ''))
  const newRowDefaults = () => ({
    ...(collection === 'posts' && isNew ? { visibility: 'draft', author: user.name || '' } : {}),
    ...(collection === 'timelines' && isNew ? { visibility: 'draft' } : {}),
  })
  const [form, setForm] = useState(() => ({ ...(schema?.defaults || {}), ...newRowDefaults(), ...(existing || {}) }))
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState('')
  const skipReset = useRef(false)

  useEffect(() => {
    if (skipReset.current) {
      skipReset.current = false
      return
    }
    setForm({ ...(schema?.defaults || {}), ...newRowDefaults(), ...(existing || {}) })
    setFlash('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema, existing, collection, id, isNew, user.name])

  const fields = useMemo(() => {
    if (!schema) return {}
    const groups = {}
    for (const field of schema.fields) {
      if (field.key === 'ownerUserId') continue
      if (field.accountHidden) continue
      // Pour un clan, le personnage central se choisit dans l'aperçu du
      // sociogramme (ClanComposer, Bloc D) plutôt que via un <select> perdu
      // au milieu du formulaire d'identité — voir rendu conditionnel plus
      // bas dans ce composant.
      if (collection === 'clans' && field.key === 'centerCharacterId') continue
      ;(groups[field.group || 'Autres'] ||= []).push(field)
    }
    return groups
  }, [schema, collection])

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

  const onSave = async (visibility) => {
    if (saving) return
    if (isNew && !computedId) {
      setFlash('error:Renseigne les champs nécessaires pour créer un identifiant.')
      return
    }
    setSaving(true)
    setFlash('')
    try {
      const row = { ...schema.defaults, ...form, id: computedId, ...(typeof visibility === 'string' ? { visibility } : {}) }
      const saved = isNew
        ? await createAccountRow(collection, row)
        : await updateAccountRow(collection, existing.id, row)
      skipReset.current = true
      setForm(saved)
      await reload()
      setFlash('saved')
      if (isNew) navigate(`/compte/${section}/${encodeURIComponent(saved.id)}`, { replace: true })
      return saved
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

  if (collection === 'posts' && ((isNew && form.id) || (!isNew && form.id !== existing.id))) return <p className="adm-muted">Ouverture de l’article…</p>
  if (collection === 'posts') return <Suspense fallback={<p className="adm-muted">Ouverture de l’atelier…</p>}><ArticleComposer
    key={`account-${user.id}-${id}`} form={form} onChange={setForm} onSave={onSave} onDelete={onDelete}
    saving={saving} flash={flash} isNew={isNew} backTo="/compte/articles" data={data}
    uploadEnabled={false} draftScope={`account:${user.id}:${id}`}
  /></Suspense>

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
        {collection === 'clans' ? (
          <ClanComposer
            fieldGroups={fields}
            form={form}
            setField={setField}
            data={data}
            user={user}
            reload={reload}
            isNew={isNew}
            clanId={existing?.id}
            disabled={saving}
          />
        ) : (
          Object.entries(fields).map(([group, groupFields]) => (
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
          ))
        )}
      </form>

      {collection === 'timelines' && (
        <TimelineEventsEditor
          events={form.events || []}
          onChange={(events) => setField('events', events)}
          data={data}
          disabled={saving}
        />
      )}
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
          <Link to="/" className="adm-side__logo">Woltar Nova</Link>
          <span className="adm-side__tag">Compte</span>
        </div>
        <nav className="adm-nav">
          <NavLink to="/compte" end className="adm-nav__link">
            <UserRound size={16} /> Mon espace
          </NavLink>
          <NavLink to="/compte/personnages" className="adm-nav__link">
            <UserRound size={16} /> Mes personnages
          </NavLink>
          <NavLink to="/compte/clans" className="adm-nav__link">
            <Shield size={16} /> Mes clans
          </NavLink>
          {(canCreate(user, 'locations') || data?.locations?.length > 0) && (
            <NavLink to="/compte/lieux" className="adm-nav__link">
              <MapPin size={16} /> Mes lieux
            </NavLink>
          )}
          {(canCreate(user, 'posts') || data?.posts?.length > 0) && (
            <NavLink to="/compte/articles" className="adm-nav__link">
              <PenLine size={16} /> Mes articles
            </NavLink>
          )}
          {(canCreate(user, 'timelines') || data?.timelines?.length > 0) && (
            <NavLink to="/compte/chronologies" className="adm-nav__link">
              <CalendarClock size={16} /> Mes chronologies
            </NavLink>
          )}
          <NavLink to="/compte/securite" className="adm-nav__link">
            <Lock size={16} /> Sécurité
          </NavLink>
          {canManagePlayerProfile(user) && <NavLink to="/compte/profil" className="adm-nav__link">
            <UserRound size={16} /> Mon profil joueur
          </NavLink>}
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
            <Route index element={<Dashboard data={data} user={user} />} />
            <Route path="securite" element={<SecuritySection user={user} onLogout={onLogout} />} />
            {canManagePlayerProfile(user) && <Route path="profil" element={<PlayerProfileSection />} />}
            <Route path=":section" element={<AccountList data={data} user={user} reload={load} />} />
            <Route path=":section/:id" element={<AccountEdit data={data} reload={load} user={user} />} />
          </Routes>
        )}
      </main>
    </div>
  )
}

function AuthenticatedAccountApp() {
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

// Trois pages restent accessibles SANS session (liens ouverts depuis un
// email, potentiellement sur un autre appareil que celui connecté) : mot de
// passe oublié, choix du nouveau mot de passe, confirmation de nouvelle
// adresse email. Elles sont donc routées ICI, avant le contrôle de session
// d'AuthenticatedAccountApp ci-dessus — tout le reste de /compte/* continue
// de passer par la connexion habituelle.
export default function AccountApp() {
  return (
    <Routes>
      <Route path="mot-de-passe-oublie" element={<ForgotPasswordPage />} />
      <Route path="reinitialiser-mot-de-passe" element={<ResetPasswordPage />} />
      <Route path="confirmer-email" element={<ConfirmEmailPage />} />
      <Route path="*" element={<AuthenticatedAccountApp />} />
    </Routes>
  )
}
