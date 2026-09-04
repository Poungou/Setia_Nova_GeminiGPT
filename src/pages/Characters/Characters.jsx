import { useMemo, useState } from 'react'
import { usePublicCharacters, usePublicPlayers } from '../../lib/publicData.js'
import { imgSrc } from '../../lib/image.js'
import { Link } from 'react-router-dom'
import CharacterCard from '../../components/CharacterCard/CharacterCard.jsx'
import SearchBar from '../../components/SearchBar/SearchBar.jsx'
import FilterBar from '../../components/FilterBar/FilterBar.jsx'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import Reveal from '../../components/Reveal/Reveal.jsx'
import './Characters.css'

const FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'active', label: 'Actifs' },
  { value: 'to-develop', label: 'À développer' },
]

const CANON_OPTIONS = [
  { value: 'all', label: 'Toute fiabilité' },
  { value: 'confirmed', label: 'Confirmé' },
  { value: 'draft', label: 'Ébauche' },
]

const SORT_OPTIONS = [
  { value: 'number', label: 'Numéro' },
  { value: 'name', label: 'Nom (A→Z)' },
]

function compareByNumber(a, b) {
  const na = Number.parseInt(a.number, 10)
  const nb = Number.parseInt(b.number, 10)
  if (Number.isNaN(na) && Number.isNaN(nb)) return 0
  if (Number.isNaN(na)) return 1
  if (Number.isNaN(nb)) return -1
  return na - nb
}

function compareByName(a, b) {
  const nameA = [a.firstName, a.lastName].filter(Boolean).join(' ')
  const nameB = [b.firstName, b.lastName].filter(Boolean).join(' ')
  return nameA.localeCompare(nameB, 'fr')
}

const PROFILE_SECTIONS = [['player_intro', 'Quelques mots'], ['writing_style', 'Style d’écriture'], ['univers', 'Univers'], ['tw', 'TW'], ['rhythm', 'Rythme']]

function PlayerCard({ player }) {
  const avatar = imgSrc(player.profile?.avatar)
  return <details className="player-card">
    <summary className="player-card__summary">
      <span className="player-card__avatar">{avatar ? <img src={avatar} alt="" /> : player.name?.[0] || 'N'}</span>
      <span><strong>{player.name}</strong>{player.status === 'RPiste' && <small>RPiste</small>}</span>
      <span className="player-card__marker" aria-hidden="true" />
    </summary>
    <div className="player-card__content">
      {PROFILE_SECTIONS.map(([key, label]) => player.profile?.[key] && <section key={key}><h3>{label}</h3><p>{player.profile[key]}</p></section>)}
      <section><h3>Pseudo IG &amp; Personnages</h3>{player.profile?.ig_username && <p>Pseudo IG : {player.profile.ig_username}</p>}<ul>{(player.characters || []).map((character) => <li key={character.id}><Link to={`/personnages/${character.id}`}>{character.name}</Link></li>)}</ul></section>
    </div>
  </details>
}

function matchesQuery(character, query) {
  if (!query) return true
  const haystack = [
    character.firstName,
    character.lastName,
    character.nickname,
    character.clan,
    character.title,
    character.shortDescription,
    character.character,
    character.appearance,
    character.occupation,
    character.residence,
    ...(character.traits || []),
    ...(character.tags || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(query.toLowerCase())
}

export default function Characters() {
  const characters = usePublicCharacters()
  const players = usePublicPlayers()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [clan, setClan] = useState('all')
  const [canon, setCanon] = useState('all')
  const [sort, setSort] = useState('number')

  // Clans réellement présents dans les données (pas de liste figée : si un
  // nouveau clan apparaît dans une fiche, il apparaît ici automatiquement).
  const clanOptions = useMemo(() => {
    const values = new Set(characters.map((c) => c.clan).filter(Boolean))
    return Array.from(values).sort((a, b) => a.localeCompare(b, 'fr'))
  }, [characters])

  const filtered = useMemo(() => {
    const list = characters.filter((c) => {
      const statusOk = status === 'all' ? true : c.status === status
      const clanOk = clan === 'all' ? true : c.clan === clan
      const canonOk = canon === 'all' ? true : c.canon === canon
      return statusOk && clanOk && canonOk && matchesQuery(c, query)
    })
    const sorted = [...list].sort(sort === 'name' ? compareByName : compareByNumber)
    return sorted
  }, [characters, query, status, clan, canon, sort])

  const featured = useMemo(
    () => characters.filter((c) => c.is_featured === true).sort(compareByNumber),
    [characters],
  )
  return (
    <PageTransition>
      <section className="container characters-page">
        <Reveal className="section-heading">
          <span className="eyebrow">Personnages</span>
          <h1 className="section-title">Visages de Woltar</h1>
          <p className="characters-page__intro">
            Chaque visage conserve une histoire. Certaines sont encore en train de s&rsquo;écrire.
          </p>
        </Reveal>

        <Reveal as="section" className="players-section" aria-labelledby="players-title">
          <div className="characters-page__section-head"><span className="eyebrow">Communauté RP</span><h2 id="players-title">Les joueurs — qui sont-ils ?</h2></div>
          <div className="players-grid">{players.map((player) => <PlayerCard key={player.userId} player={player} />)}</div>
        </Reveal>

        <Reveal as="section" className="characters-featured" aria-labelledby="characters-featured-title">
          <div className="characters-page__section-head">
            <span className="eyebrow">Sélection</span>
            <h2 id="characters-featured-title">Personnages en avant</h2>
          </div>
          {featured.length > 0 ? (
            <div className="characters-page__grid characters-page__grid--featured">
              {featured.map((c, i) => (
                <CharacterCard key={c.id} character={c} index={i} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucun personnage mis en avant</strong>
              Active “Mettre en avant” dans l’admin pour composer cette sélection.
            </div>
          )}
        </Reveal>

        <div className="characters-page__section-head">
          <span className="eyebrow">Galerie</span>
          <h2>Tous les personnages</h2>
        </div>

        <div className="characters-page__controls">
          <SearchBar value={query} onChange={setQuery} />
          <FilterBar filters={FILTERS} active={status} onChange={setStatus} />
        </div>

        {(clanOptions.length > 0 || characters.length > 0) && (
          <div className="characters-page__secondary-controls">
            {clanOptions.length > 0 && (
              <label className="characters-page__select">
                <span className="eyebrow">Clan</span>
                <select value={clan} onChange={(e) => setClan(e.target.value)}>
                  <option value="all">Tous les clans</option>
                  {clanOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="characters-page__select">
              <span className="eyebrow">Fiabilité</span>
              <select value={canon} onChange={(e) => setCanon(e.target.value)}>
                {CANON_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="characters-page__select">
              <span className="eyebrow">Trier par</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <p className="characters-page__count">
          {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
        </p>

        {filtered.length > 0 ? (
          <div className="characters-page__grid">
            {filtered.map((c, i) => (
              <CharacterCard key={c.id} character={c} index={i} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>Aucun résultat</strong>
            Essaie un autre nom, un autre clan ou un autre lieu.
          </div>
        )}
      </section>
    </PageTransition>
  )
}
