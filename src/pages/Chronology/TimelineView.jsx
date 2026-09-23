import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePublicCharacters, usePublicLocations } from '../../lib/publicData.js'
import Prose from '../../components/Prose/Prose.jsx'
import { eventContent, filterTimelineEvents, eventImportance } from './timelineView.js'

const characterName = character => [character.firstName, character.lastName].filter(Boolean).join(' ')

export function EventRow({ event, characters, locations }) {
  const { points, archive } = eventContent(event)
  const importance = eventImportance(event)
  return <li className={`chrono-event chrono-event--${importance}`}>
    <span className="chrono-event__marker" aria-hidden="true" />
    <article className="chrono-event__body">
      <div className="chrono-event__meta">
        {event.dateRP && <span>{event.dateRP}</span>}
        <span>{importance === 'majeur' ? 'Tournant majeur' : importance === 'notable' ? 'Notable' : 'Repère'}</span>
        {(event.spoiler === true || event.spoiler === 'true') && <span>Contient des spoilers</span>}
      </div>
      <h2>{event.title || 'Événement sans titre'}</h2>
      {points.length ? <ul className="chrono-event__points">{points.map((point, index) => <li key={index}><Prose markdown={point} /></li>)}</ul> : <p className="chrono-empty">Pas encore développé</p>}
      <div className="chrono-event__links">
        {(event.characters || []).map(id => {
          const character = characters.find(item => item.id === id)
          return character ? <Link className="chrono-pill" key={id} to={`/personnages/${id}`}>{characterName(character)}</Link> : null
        })}
        {(event.locations || []).map(id => {
          const location = locations.find(item => item.id === id)
          return location ? <Link className="chrono-pill" key={id} to={`/lieux/${id}`}>{location.name}</Link> : null
        })}
        {(event.tags || []).map(tag => <Link key={tag} className="chrono-pill" to={`/tag/${encodeURIComponent(tag)}`}>#{tag}</Link>)}
      </div>
      {archive && <details className="chrono-event__archive"><summary>Lire l’archive complète</summary><Prose markdown={archive} /></details>}
    </article>
  </li>
}

export default function TimelineView({ timeline }) {
  const characters = usePublicCharacters()
  const locations = usePublicLocations()
  const [query, setQuery] = useState('')
  const [character, setCharacter] = useState('')
  const [location, setLocation] = useState('')
  const [majorOnly, setMajorOnly] = useState(false)
  const events = timeline.events || []
  const visible = filterTimelineEvents(events, { query, character, location, majorOnly })
  const linkedCharacters = characters.filter(item => events.some(event => event.characters?.includes(item.id)))
  const linkedLocations = locations.filter(item => events.some(event => event.locations?.includes(item.id)))
  return <>
    <form className="chrono-filters" onSubmit={event => event.preventDefault()} aria-label="Filtrer les événements">
      <label>Recherche<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher un événement" /></label>
      <label>Personnage<select value={character} onChange={event => setCharacter(event.target.value)}><option value="">Tous les personnages</option>{linkedCharacters.map(item => <option key={item.id} value={item.id}>{characterName(item)}</option>)}</select></label>
      <label>Lieu<select value={location} onChange={event => setLocation(event.target.value)}><option value="">Tous les lieux</option>{linkedLocations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="chrono-filters__check"><input type="checkbox" checked={majorOnly} onChange={event => setMajorOnly(event.target.checked)} /> Majeurs seulement</label>
    </form>
    <div className="chrono-results"><p role="status">{visible.length} événement{visible.length > 1 ? 's' : ''}</p><div className="chrono-legend" aria-label="Importance des événements"><span>Repère</span><span>Notable</span><span>Tournant majeur</span></div></div>
    {visible.length ? <ol className="chrono-events">{visible.map(event => <EventRow key={event.id} event={event} characters={characters} locations={locations} />)}</ol> : <p className="chrono-empty">{events.length ? 'Aucun événement ne correspond aux filtres.' : 'Aucun événement enregistré pour l’instant.'}</p>}
  </>
}
