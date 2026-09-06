// src/pages/Players/Players.jsx
//
// Refonte UX/UI de la section Joueurs (liste `/joueurs` + fiche publique
// `/joueurs/:id`), alignée sur la maquette validée : hero plus riche,
// onglets qui basculent réellement le contenu, colonne latérale "profil
// rapide", carrousel de personnages mis en avant. Aucune donnée nouvelle :
// uniquement les champs déjà exposés par /__public/api/players (voir
// worker/lib/playerProfiles.js) — y compris `createdAt`, déjà renvoyé par
// l'API mais jusqu'ici inutilisé côté public (sert désormais à "Membre
// depuis"). Pas de champ "dernière activité" ni "préférences" dans le
// schéma : ces rubriques de la maquette n'ont volontairement pas été
// reproduites plutôt que d'inventer une donnée (règle §35 du site).
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BookOpen, PenLine, Globe, ShieldAlert, Clock, Users, Gamepad2, ArrowUpRight } from 'lucide-react'
import { usePublicCharacters, usePublicPlayersState } from '../../lib/publicData.js'
import CharacterCarousel from '../../components/CharacterCarousel/CharacterCarousel.jsx'
import PlayerCard, { PlayerAvatar, playerBadges } from '../../components/PlayerCard/PlayerCard.jsx'
import SearchBar from '../../components/SearchBar/SearchBar.jsx'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import Reveal from '../../components/Reveal/Reveal.jsx'
import Prose from '../../components/Prose/Prose.jsx'
import '../Characters/Characters.css'
import './Players.css'

// Onglets de la fiche publique : chaque rubrique (nav ET contenu) n'apparaît
// que si le champ correspondant est réellement rempli — jamais de rubrique
// vide, jamais de texte inventé.
const SECTIONS = [
  { id: 'a-propos', field: 'player_intro', label: 'À propos', Icon: BookOpen },
  { id: 'style', field: 'writing_style', label: 'Style RP', Icon: PenLine },
  { id: 'univers', field: 'univers', label: 'Univers', Icon: Globe },
  { id: 'tw', field: 'tw', label: 'TW', Icon: ShieldAlert },
  { id: 'rythme', field: 'rhythm', label: 'Rythme', Icon: Clock },
]

const SORT_OPTIONS = [
  { value: 'recent', label: 'Plus récents' },
  { value: 'name', label: 'Alphabétique' },
]

function linkedCharactersFor(player, characters) {
  const ids = new Set((player.characters || []).map((c) => c.id))
  return characters.filter((c) => ids.has(c.id))
}

function compareByNumber(a, b) {
  const na = Number.parseInt(a.number, 10)
  const nb = Number.parseInt(b.number, 10)
  if (Number.isNaN(na) && Number.isNaN(nb)) return 0
  if (Number.isNaN(na)) return 1
  if (Number.isNaN(nb)) return -1
  return na - nb
}

// Courte "accroche" pour le hero/la citation latérale : première phrase (ou
// première ligne si plus courte) de la présentation RP, tronquée si
// nécessaire. Le texte complet reste affiché tel quel dans l'onglet
// "À propos" — cette fonction ne fait que choisir OÙ couper l'affichage,
// jamais réécrire le texte de la propriétaire.
function firstLine(text) {
  const clean = String(text || '').trim()
  if (!clean) return ''
  const sentence = clean.split(/(?<=[.!?])\s/)[0] || clean
  const line = clean.split('\n')[0] || clean
  const pick = sentence.length <= line.length ? sentence : line
  return pick.length > 160 ? `${pick.slice(0, 157)}…` : pick
}

function formatMemberSince(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date)
}

export default function Players() {
  const { players, loading, error } = usePublicPlayersState()
  const characters = usePublicCharacters()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recent')

  const filtered = useMemo(() => {
    const q = query.toLocaleLowerCase('fr')
    const list = players.filter((player) =>
      [player.name, player.profile?.player_intro, player.profile?.writing_style, player.profile?.univers, player.profile?.rhythm]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('fr')
        .includes(q),
    )
    const sorted = [...list]
    if (sort === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    } else {
      sorted.sort((a, b) => new Date(b.profile?.createdAt || 0) - new Date(a.profile?.createdAt || 0))
    }
    return sorted
  }, [players, query, sort])

  return (
    <PageTransition>
      <section className="container players-page">
        <Reveal className="section-heading">
          <span className="eyebrow">Joueurs</span>
          <h1 className="section-title">Les joueurs</h1>
          <p className="characters-page__intro">Des plumes, des univers et des histoires à partager.</p>
        </Reveal>

        <div className="characters-page__controls">
          <SearchBar value={query} onChange={setQuery} placeholder="Pseudo, style ou univers…" />
          <label className="characters-page__select characters-page__select--primary">
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

        {loading && (
          <p role="status" className="players-page__status">
            Chargement des joueurs…
          </p>
        )}
        {error && (
          <p role="alert" className="players-page__status">
            Les profils sont momentanément indisponibles. Réessaie en rechargeant la page.
          </p>
        )}

        {!loading && !error && (
          <p className="characters-page__count">
            {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
          </p>
        )}

        {!loading && !error && !filtered.length && (
          <div className="empty-state">
            <strong>Aucun profil ne correspond</strong>
            Essaie un autre pseudo, un autre style ou un autre univers.
          </div>
        )}

        {filtered.length > 0 && (
          <div className="players-page__grid">
            {filtered.map((player) => (
              <PlayerCard key={player.userId} player={player} characters={linkedCharactersFor(player, characters)} />
            ))}
          </div>
        )}
      </section>
    </PageTransition>
  )
}

export function PlayerDetail() {
  const { id } = useParams()
  const { players, loading, error } = usePublicPlayersState()
  const characters = usePublicCharacters()
  const player = players.find((entry) => entry.userId === id) || null

  const tabs = useMemo(() => (player ? SECTIONS.filter((s) => player.profile?.[s.field]) : []), [player])
  const [activeId, setActiveId] = useState(null)

  // Une fiche joueur peut être ouverte depuis une autre (lien "Propriétaire"
  // d'un personnage, par exemple) sans démontage du composant — l'onglet
  // actif doit repartir sur la première rubriques disponible à chaque
  // changement de profil, jamais rester bloqué sur un id qui n'existe pas
  // pour ce joueur-ci.
  useEffect(() => {
    setActiveId(tabs[0]?.id ?? null)
  }, [id, tabs])

  if (loading) {
    return (
      <PageTransition>
        <section className="container players-page" role="status" aria-live="polite">
          Chargement du profil…
        </section>
      </PageTransition>
    )
  }

  if (error) {
    return (
      <PageTransition>
        <section className="container players-page" role="alert">
          <h1 className="section-title">Le profil n’a pas pu être chargé.</h1>
          <p>Réessaie dans quelques instants.</p>
        </section>
      </PageTransition>
    )
  }

  if (!player) {
    return (
      <PageTransition>
        <section className="container players-page">
          <Link to="/joueurs" className="eyebrow">
            ← Tous les joueurs
          </Link>
          <h1 className="section-title">Profil privé ou introuvable</h1>
        </section>
      </PageTransition>
    )
  }

  const linked = linkedCharactersFor(player, characters).sort(compareByNumber)
  const badges = playerBadges(player.profile)
  const teaser = player.profile?.player_intro ? firstLine(player.profile.player_intro) : ''
  const memberSince = player.profile?.createdAt ? formatMemberSince(player.profile.createdAt) : ''
  const activeSection = tabs.find((s) => s.id === activeId) || tabs[0] || null
  const hasQuickProfile = Boolean(player.profile?.ig_username || memberSince)

  return (
    <PageTransition>
      <article className="player-detail">
        <section className="players-hero">
          <div className="container players-hero__inner">
            <figure className="players-hero__avatar-wrap">
              <PlayerAvatar player={player} size="lg" />
              {player.profile?.image_source && <figcaption className="image-source">Crédit avatar : {player.profile.image_source}</figcaption>}
            </figure>

            <div className="players-hero__info">
              <Link to="/joueurs" className="eyebrow players-hero__back">
                ← Tous les joueurs
              </Link>
              <span className="eyebrow">Joueur · fiche publique</span>
              <h1 className="players-hero__name">#{player.name}</h1>
              {teaser && <p className="players-hero__teaser">{teaser}</p>}

              {badges.length > 0 && (
                <div className="players-hero__badges">
                  {badges.map(({ field, label, Icon }) => (
                    <span key={field} className="badge">
                      <Icon size={12} aria-hidden="true" />
                      {label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {(tabs.length > 0 || linked.length > 0) && (
            <div className="container">
              <div role="tablist" aria-label="Sections du profil" className="players-tabs">
                {tabs.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={activeSection?.id === s.id}
                    className={`players-tabs__item${activeSection?.id === s.id ? ' is-active' : ''}`}
                    onClick={() => setActiveId(s.id)}
                  >
                    <s.Icon size={14} aria-hidden="true" />
                    {s.label}
                  </button>
                ))}
                {linked.length > 0 && (
                  <a href="#personnages" className="players-tabs__item players-tabs__item--link">
                    <Users size={14} aria-hidden="true" />
                    Personnages
                  </a>
                )}
              </div>
            </div>
          )}
        </section>

        <div className="container players-body">
          <div className="players-body__main">
            {activeSection ? (
              <Reveal key={activeSection.id} as="section" id={activeSection.id} role="tabpanel" className="players-section">
                <h2 className="eyebrow section-card-title section-card-title--icon">
                  <activeSection.Icon size={15} aria-hidden="true" />
                  {activeSection.label}
                </h2>
                <Prose markdown={player.profile[activeSection.field]} className="prose--tight" />
              </Reveal>
            ) : (
              <div className="empty-state">
                <strong>Profil encore vierge</strong>
                Cette joueuse ou ce joueur n’a pas encore rempli sa présentation RP.
              </div>
            )}
          </div>

          {(hasQuickProfile || teaser) && (
            <aside className="players-body__aside">
              {hasQuickProfile && (
                <div className="character-aside-block">
                  <h2 className="eyebrow aside-heading">
                    <Gamepad2 size={14} className="players-aside-icon" aria-hidden="true" />
                    Profil rapide
                  </h2>
                  <dl className="players-facts">
                    {player.profile?.ig_username && (
                      <div>
                        <dt>En jeu</dt>
                        <dd>{player.profile.ig_username}</dd>
                      </div>
                    )}
                    {memberSince && (
                      <div>
                        <dt>Membre depuis</dt>
                        <dd>{memberSince}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {teaser && (
                <div className="character-aside-block">
                  <blockquote className="players-quote">« {teaser} »</blockquote>
                </div>
              )}
            </aside>
          )}
        </div>

        <Reveal as="section" id="personnages" className="container players-characters">
          <div className="players-characters__head">
            <h2 className="eyebrow aside-heading">
              <Users size={16} className="players-aside-icon" aria-hidden="true" />
              Personnages rattachés{linked.length > 0 ? ` (${linked.length})` : ''}
            </h2>
            {linked.length > 0 && (
              <Link to={`/personnages?joueur=${encodeURIComponent(player.userId)}`} className="players-characters__all">
                Voir tous les personnages <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            )}
          </div>
          {linked.length > 0 ? (
            <CharacterCarousel characters={linked} shuffle={false} />
          ) : (
            <div className="empty-state">
              <strong>Aucun personnage public rattaché</strong>
              Cette section se remplira au fil des publications.
            </div>
          )}
        </Reveal>
      </article>
    </PageTransition>
  )
}
