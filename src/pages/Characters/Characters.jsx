import { useMemo, useState } from 'react'
import { characters } from '../../data/characters.js'
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
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')

  const filtered = useMemo(() => {
    return characters.filter((c) => {
      const statusOk = status === 'all' ? true : c.status === status
      return statusOk && matchesQuery(c, query)
    })
  }, [query, status])

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
