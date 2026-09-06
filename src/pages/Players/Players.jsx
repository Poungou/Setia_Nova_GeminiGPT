import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { usePublicCharacters, usePublicPlayersState } from '../../lib/publicData.js'
import { imgSrc } from '../../lib/image.js'
import CharacterCard from '../../components/CharacterCard/CharacterCard.jsx'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import Prose from '../../components/Prose/Prose.jsx'
import '../Characters/Characters.css'
import './Players.css'

const SECTIONS = [['player_intro', 'Présentation RP'], ['writing_style', 'Style d’écriture'], ['univers', 'Univers'], ['tw', 'Thèmes sensibles · TW'], ['rhythm', 'Rythme']]

function Avatar({ player }) {
  const src = imgSrc(player.profile?.avatar)
  return <span className="players-avatar">{src ? <img src={src} alt="" loading="lazy" /> : player.name?.[0] || '?'}</span>
}

export default function Players() {
  const { players, loading, error } = usePublicPlayersState()
  const [query, setQuery] = useState('')
  const filtered = players.filter((player) => [player.name, player.profile?.player_intro, player.profile?.writing_style, player.profile?.univers].join(' ').toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr')))
  return <PageTransition><section className="container players-page">
    <div className="section-heading"><span className="eyebrow">Communauté RP</span><h1 className="section-title">Les joueurs</h1><p>Des plumes, des univers et des histoires à partager.</p></div>
    <label className="players-search">Rechercher un joueur<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pseudo, style ou univers…" /></label>
    {loading && <p role="status">Chargement des joueurs…</p>}
    {error && <p role="alert">Les profils sont momentanément indisponibles. Réessaie en rechargeant la page.</p>}
    {!loading && !error && !filtered.length && <p>Aucun profil public ne correspond pour le moment.</p>}
    <div className="players-gallery">{filtered.map((player) => <Link key={player.userId} to={`/joueurs/${encodeURIComponent(player.userId)}`} className="players-card">
      <Avatar player={player} /><h2>#{player.name}</h2>
      {player.profile?.player_intro && <p className="players-card__intro">{player.profile.player_intro}</p>}
      <p className="players-card__rhythm">{[player.profile?.writing_style, player.profile?.rhythm].filter(Boolean).join(' · ')}</p>
      <small>{player.characters?.length || 0} personnage(s) rattaché(s)</small>
    </Link>)}</div>
  </section></PageTransition>
}

export function PlayerDetail() {
  const { id } = useParams()
  const { players, loading, error } = usePublicPlayersState()
  const characters = usePublicCharacters()
  const player = players.find((entry) => entry.userId === id)
  const linked = new Set(player?.characters?.map((character) => character.id) || [])
  return <PageTransition><section className="container players-page">
    <Link to="/joueurs" className="eyebrow">← Tous les joueurs</Link>
    {loading ? <p role="status">Chargement du profil…</p> : error ? <p role="alert">Le profil est momentanément indisponible.</p> : !player ? <h1>Profil privé ou introuvable</h1> : <>
      <header className="players-detail-head"><Avatar player={player} /><div><span className="eyebrow">Joueur · fiche publique</span><h1 className="section-title">#{player.name}</h1>{player.profile?.ig_username && <p>En jeu : {player.profile.ig_username}</p>}</div></header>
      {player.profile?.image_source && <small>Crédit avatar : {player.profile.image_source}</small>}
      <div className="players-profile">{SECTIONS.map(([field, label]) => player.profile?.[field] && <section key={field}><h2>{label}</h2><Prose markdown={player.profile[field]} /></section>)}</div>
      <h2>Personnages rattachés</h2>
      <div className="characters-page__grid">{characters.filter((character) => linked.has(character.id)).map((character, index) => <CharacterCard key={character.id} character={character} index={index} />)}</div>
      {!linked.size && <p>Aucun personnage public rattaché pour le moment.</p>}
    </>}
  </section></PageTransition>
}
