import { useMemo, useState } from 'react'
import { usePublicCharacters } from '../../lib/publicData.js'
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
