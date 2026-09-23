import { Link, useSearchParams } from 'react-router-dom'
import { ArrowUpRight, ArrowLeft, BookOpen } from 'lucide-react'
import { usePublicTimelines, usePublicPlayers } from '../../lib/publicData.js'
import { PlayerAvatar } from '../../components/PlayerCard/PlayerCard.jsx'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import TimelineView from './TimelineView.jsx'
import timelineMetadata from '../../data/timelines.json'
import './Chronology.css'

export default function Chronology() {
  const timelines = usePublicTimelines()
  const players = usePublicPlayers()
  const [params, setParams] = useSearchParams()
  const timeline = timelines.find(item => item.id === params.get('auteur'))
  const authorName = item => item.authorName || players.find(player => player.userId === item.ownerUserId)?.name || ((!item.ownerUserId || item.ownerUserId === 'system') && timelineMetadata.find(entry => entry.id === item.id)?.authorName) || 'Auteur·ice non renseigné·e'
  const author = timeline && (players.find(player => player.userId === timeline.ownerUserId || (timeline.ownerUserId === 'system' && player.name === authorName(timeline))) || { name: authorName(timeline) })

  return <PageTransition>
    <section className="container chrono-page">
      {timeline && <Link className="chrono-back" to="/chronologie"><ArrowLeft size={16} /> Toutes les chronologies</Link>}
      {timeline && timelines.length > 1 && <label className="chrono-selector">Changer de chronologie
        <select value={timeline?.id || ''} onChange={event => setParams({ auteur: event.target.value })}>
          {timelines.map(item => <option key={item.id} value={item.id}>{authorName(item)} · {item.title}</option>)}
        </select>
      </label>}
      {timeline ? <>
        <header className="chrono-heading">
          <PlayerAvatar player={author} size="lg" />
          <div><span className="eyebrow">Chronologie personnelle</span><h1>{authorName(timeline)}</h1>
            <p>Les événements de cette chronologie, dans l’ordre choisi par son auteur·ice.</p>
          </div>
        </header>
        {timeline.spoiler && <p className="chrono-empty">Cette chronologie contient des spoilers.</p>}
        <TimelineView key={timeline.id} timeline={timeline} />
      </> : <>
        <header className="chrono-library-heading">
          <span className="eyebrow">Les récits de la communauté</span>
          <h1>Chronologies<span>À chaque plume, <em>son histoire.</em></span></h1>
          <p>Choisissez une chronologie pour découvrir ses événements, ses personnages et ses lieux.</p>
          <div className="chrono-library-heading__ornament" aria-hidden="true"><span /><BookOpen size={24} /><span /></div>
        </header>
        {params.has('auteur') && <p role="status" className="chrono-empty">Cette chronologie n’est pas disponible. Choisissez un récit ci-dessous.</p>}
        <div className="chrono-library-caption"><span>Choisir une chronologie</span><span>{timelines.length} publiée{timelines.length > 1 ? 's' : ''}</span></div>
        {timelines.length ? <div className="chrono-library">{timelines.map((item, index) => {
          const player = players.find(player => player.userId === item.ownerUserId || (item.ownerUserId === 'system' && player.name === authorName(item))) || { name: authorName(item) }
          const events = [...(item.events || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          return <Link className="chrono-volume" key={item.id} to={`/chronologie?auteur=${encodeURIComponent(item.id)}`}>
            <div className="chrono-volume__cover" aria-hidden="true"><span className="chrono-volume__number">{String(index + 1).padStart(2, '0')}</span><BookOpen size={40} strokeWidth={1} /><span className="chrono-volume__monogram">{authorName(item).slice(0, 1)}</span><span className="chrono-volume__cover-label">Chronologie personnelle</span></div>
            <div className="chrono-volume__content"><div className="chrono-volume__author"><PlayerAvatar player={player} /><span>{authorName(item)}</span></div><h2>{item.title}</h2>{item.description && <p>{item.description}</p>}<div className="chrono-volume__meta"><span>{events.length} événement{events.length > 1 ? 's' : ''}</span>{events[0]?.dateRP && <span>À partir de {events[0].dateRP}</span>}</div><span className="chrono-volume__open">Ouvrir la chronologie <ArrowUpRight size={18} /></span></div>
          </Link>
        })}</div> : <p className="chrono-empty">Aucune chronologie publiée pour l’instant.</p>}
      </>}
    </section>
  </PageTransition>
}
