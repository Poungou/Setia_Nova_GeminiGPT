import { events } from '../../data/events.js'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import '../Universe/Universe.css'
import './Chronology.css'

export default function Chronology() {
  return (
    <PageTransition>
      <section className="container universe-page">
        <div className="section-heading">
          <span className="eyebrow">Récit</span>
          <h1 className="section-title">Chronologie</h1>
        </div>

        {events.length > 0 ? (
          <ol className="chronology-list">
            {events
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((event) => (
                <li key={event.id}>
                  <span className="eyebrow">{event.dateRP}</span>
                  <h2>{event.title}</h2>
                  <p>{event.description}</p>
                </li>
              ))}
          </ol>
        ) : (
          <div className="empty-state">
            <strong>La chronologie est encore vierge</strong>
            Les événements marquants de Woltar apparaîtront ici au fil du RP.
          </div>
        )}
      </section>
    </PageTransition>
  )
}
