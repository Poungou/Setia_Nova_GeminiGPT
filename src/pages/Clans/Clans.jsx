import { Link } from 'react-router-dom'
import { clans } from '../../data/clans.js'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import '../Universe/Universe.css'

export default function Clans() {
  return (
    <PageTransition>
      <section className="container universe-page">
        <div className="section-heading">
          <span className="eyebrow">Sociétés</span>
          <h1 className="section-title">Clans de Woltar</h1>
        </div>
        <div className="universe-grid">
          {clans.map((clan) => (
            <Link key={clan.id} to={`/clans/${clan.id}`} className="universe-card">
              <h2>{clan.name}</h2>
              <p>{clan.description || '—'}</p>
            </Link>
          ))}
        </div>
      </section>
    </PageTransition>
  )
}
