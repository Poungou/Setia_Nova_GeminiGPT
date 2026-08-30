import { useParams, Link, Navigate } from 'react-router-dom'
import { getClanById } from '../../data/clans.js'
import { characters } from '../../data/characters.js'
import CharacterCard from '../../components/CharacterCard/CharacterCard.jsx'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import Reveal from '../../components/Reveal/Reveal.jsx'
import Prose from '../../components/Prose/Prose.jsx'
import RelationGraph from '../../components/RelationGraph/RelationGraph.jsx'
import './ClanDetail.css'

export default function ClanDetail() {
  const { id } = useParams()
  const clan = getClanById(id)

  if (!clan) {
    return <Navigate to="/univers" replace />
  }

  const members = (clan.members || [])
    .map((cid) => characters.find((c) => c.id === cid))
    .filter(Boolean)

  return (
    <PageTransition>
      <article className="container clan-detail">
        <Reveal className="section-heading">
          <span className="eyebrow">Clan</span>
          <h1 className="section-title">{clan.name}</h1>
        </Reveal>

        {clan.description && (
          <Reveal as="section" className="character-section">
            <Prose markdown={clan.description} className="prose--tight" />
          </Reveal>
        )}

        <section className="character-section">
          <h2 className="eyebrow">Résidence</h2>
          {clan.residence ? <p>{clan.residence}</p> : <span className="dash">—</span>}
        </section>

        {members.length > 1 && (
          <Reveal as="section" className="character-section">
            <h2 className="eyebrow">Liens du clan</h2>
            <RelationGraph members={members} />
          </Reveal>
        )}

        <section className="character-section">
          <h2 className="eyebrow">Membres</h2>
          {members.length > 0 ? (
            <div className="characters-page__grid">
              {members.map((m, i) => (
                <CharacterCard key={m.id} character={m} index={i} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucun membre renseigné</strong>
            </div>
          )}
        </section>

        {clan.history && (
          <Reveal as="section" className="character-section">
            <h2 className="eyebrow">Histoire</h2>
            <Prose markdown={clan.history} className="prose--tight" />
          </Reveal>
        )}

        <p>
          <Link to="/univers" className="btn">
            ← Retour à l&rsquo;univers
          </Link>
        </p>
      </article>
    </PageTransition>
  )
}
