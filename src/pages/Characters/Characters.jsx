import { isCharacterLinked } from '../../lib/characterLinks.js'
import { useMemo, useState } from 'react'
import { usePublicCharacters, usePublicPlayers } from '../../lib/publicData.js'
import { Link, useSearchParams } from 'react-router-dom'
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
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  // Filtre principal de la galerie : "Joueur" (qui a créé le personnage),
  // pas le clan — voir la demande "remplacer le filtre Clan par Joueur".
  // Peut être pré-rempli via ?joueur=<userId> (lien "Voir tous ses
  // personnages" depuis une carte joueur).
  const joueur = searchParams.get('joueur') || 'all'
  const [clan, setClan] = useState('all')
  const [canon, setCanon] = useState('all')
  const [sort, setSort] = useState('number')

  const handleJoueurChange = (value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value === 'all') next.delete('joueur')
      else next.set('joueur', value)
      return next
    }, { replace: true })
  }

  // Joueurs réellement présents dans les données publiques (profils publics
  // uniquement — voir usePublicPlayers / /__public/api/players), plus une
  // entrée "Personnages officiels" pour les fiches canon sans ownerUserId,
  // et une entrée "PNJ" indépendante de la propriété (`isPnj`, préparé côté
  // admin — un PNJ peut appartenir à n'importe quel joueur ou au système).
  const joueurOptions = useMemo(() => {
    const hasSystemCharacter = characters.some((c) => (!c.ownerUserId || c.ownerUserId === 'system'))
    const hasPnj = characters.some((c) => c.isPnj === true)
    const known = players
      .map((p) => ({ value: p.userId, label: p.name }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'))
    const withSystem = hasSystemCharacter ? [{ value: 'system', label: 'Personnages officiels' }, ...known] : known
    return hasPnj ? [{ value: 'pnj', label: '— PNJ —' }, ...withSystem] : withSystem
  }, [characters, players])

  // Clans réellement présents dans les données (pas de liste figée : si un
  // nouveau clan apparaît dans une fiche, il apparaît ici automatiquement).
  // .trim() défensif : une donnée avec un espace parasite ("Nakamura ") ne
  // doit jamais recréer une entrée en double dans ce filtre.
  const clanOptions = useMemo(() => {
    const values = new Set(characters.map((c) => c.clan?.trim()).filter(Boolean))
    return Array.from(values).sort((a, b) => a.localeCompare(b, 'fr'))
  }, [characters])

  const filtered = useMemo(() => {
    const list = characters.filter((c) => {
      const statusOk = status === 'all' ? true : c.status === status
      const joueurOk =
        joueur === 'all' ? true
        : joueur === 'pnj' ? c.isPnj === true
        : joueur === 'system' ? (!c.ownerUserId || c.ownerUserId === 'system')
        : isCharacterLinked(c, joueur, players.find((player) => player.userId === joueur)?.characters?.map((character) => character.id) || [])
      const clanOk = clan === 'all' ? true : (c.clan || '').trim() === clan
      const canonOk = canon === 'all' ? true : c.canon === canon
      return statusOk && joueurOk && clanOk && canonOk && matchesQuery(c, query)
    })
    const sorted = [...list].sort(sort === 'name' ? compareByName : compareByNumber)
    return sorted
  }, [characters, players, query, status, joueur, clan, canon, sort])

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
          <div className="characters-page__section-head"><span className="eyebrow">Joueurs</span><h2 id="players-title">Les joueurs — qui sont-ils ?</h2></div>
          <Link to="/joueurs" className="btn">Rencontrer les joueurs →</Link>
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
          <h2 id="gallery-title">Tous les personnages</h2>
        </div>

        <div className="characters-page__controls">
          <SearchBar value={query} onChange={setQuery} />
          <FilterBar filters={FILTERS} active={status} onChange={setStatus} />
          {joueurOptions.length > 0 && (
            <label className="characters-page__select characters-page__select--primary">
              <span className="eyebrow">Joueur</span>
              <select value={joueur} onChange={(e) => handleJoueurChange(e.target.value)}>
                <option value="all">Tous les joueurs</option>
                {joueurOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          )}
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
