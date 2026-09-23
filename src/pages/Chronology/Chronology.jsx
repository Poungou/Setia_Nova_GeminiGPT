import { useSearchParams } from 'react-router-dom'
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
  const timeline = timelines.find(item => item.id === params.get('auteur')) || timelines[0]
  const authorName = item => item.authorName || players.find(player => player.userId === item.ownerUserId)?.name || ((!item.ownerUserId || item.ownerUserId === 'system') && timelineMetadata.find(entry => entry.id === item.id)?.authorName) || 'Auteur·ice non renseigné·e'
  const author = timeline && (players.find(player => player.userId === timeline.ownerUserId || (timeline.ownerUserId === 'system' && player.name === authorName(timeline))) || { name: authorName(timeline) })

  return <PageTransition>
    <section className="container chrono-page">
      {timelines.length > 1 && <label className="chrono-selector">Chronologie à consulter
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
      </> : <div className="empty-state"><h1>Chronologies</h1><p>Aucune chronologie publiée pour l’instant.</p></div>}
    </section>
  </PageTransition>
}
