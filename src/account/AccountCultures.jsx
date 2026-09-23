import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { cultureApi } from '../lib/cultureApi.js'

// « Mes cultures » : la page personnelle, dans l'espace compte (même coque et
// mêmes cartes que Mes personnages / Mes clans...). Elle ne montre que les
// contributions de la personne connectée. Lire, écrire et modifier une culture
// passe encore par les pages du carnet public (/culture/...).
export default function AccountCultures({ user }) {
  const [state, setState] = useState({ loading: true, error: '', posts: [] })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let alive = true
    setState((current) => ({ ...current, loading: true, error: '' }))
    cultureApi('posts')
      .then((posts) => {
        if (alive) setState({ loading: false, error: '', posts: posts.filter((post) => post.ownerUserId === user.id) })
      })
      .catch((error) => {
        if (alive) setState({ loading: false, error: String(error.message || error), posts: [] })
      })
    return () => {
      alive = false
    }
  }, [user.id, version])

  const { loading, error, posts } = state

  return (
    <div className="adm-list">
      <header className="adm-list__head">
        <div>
          <h1>Mes cultures</h1>
          <p className="adm-muted">{loading ? 'Chargement…' : `${posts.length} contribution(s)`}</p>
        </div>
        <Link to="/culture/nouveau" className="adm-btn adm-btn--primary">
          <Plus size={16} /> Partager une culture
        </Link>
      </header>
      {error && (
        <div className="adm-banner adm-banner--error" role="alert">
          {error} <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setVersion((v) => v + 1)}>Réessayer</button>
        </div>
      )}
      <ul className="adm-cards">
        {posts.map((post) => (
          <li key={post.id}>
            <Link to={`/culture/${encodeURIComponent(post.id)}/modifier`} className="adm-card">
              <div className="adm-card__body">
                <strong>{post.title}</strong>
                <span className="adm-muted">{post.summary || new Date(post.createdAt).toLocaleDateString('fr-FR')}</span>
              </div>
              <code className="adm-card__id">{post.id}</code>
            </Link>
            <Link to={`/culture/${encodeURIComponent(post.id)}`} className="adm-btn adm-btn--ghost" aria-label={`Lire la page publique : ${post.title}`}>
              Voir la page
            </Link>
          </li>
        ))}
        {!loading && !error && posts.length === 0 && (
          <li className="adm-muted">Aucune culture partagée pour le moment. Racontez une tradition, une fête ou une croyance de votre univers.</li>
        )}
      </ul>
    </div>
  )
}
