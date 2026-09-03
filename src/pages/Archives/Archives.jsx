import { archives } from '../../data/archives.js'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import Reveal from '../../components/Reveal/Reveal.jsx'
import '../Universe/Universe.css'

export default function Archives() {
  return (
    <PageTransition>
      <section className="container universe-page">
        <Reveal className="section-heading">
          <span className="eyebrow">Textes RP</span>
          <h1 className="section-title">Récits et notes</h1>
        </Reveal>

        {archives.length > 0 ? (
          <div className="universe-grid">
            {archives.map((arc) => (
              <div key={arc.id} className="universe-card universe-card--static">
                <span className="eyebrow">{arc.arc}</span>
                <h2>{arc.title}</h2>
                <p>{arc.dateRP}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>Aucun texte RP pour l&rsquo;instant</strong>
            Les scènes retranscrites apparaîtront ici, organisées par arc.
          </div>
        )}
      </section>
    </PageTransition>
  )
}
