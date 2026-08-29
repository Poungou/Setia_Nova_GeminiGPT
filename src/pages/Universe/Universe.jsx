import { Link } from 'react-router-dom'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import './Universe.css'

const CHAPTERS = [
  {
    title: 'Woltar',
    text: "Nom de l'univers. Les habitants sont appelés « woltarien » / « woltarienne » (pluriel employé en RP : « woltarions »).",
    to: null,
  },
  {
    title: 'Sétia',
    text: 'Lieu central de Woltar.',
    to: '/lieux',
  },
  {
    title: 'Clan Nakamura',
    text: "L'un des axes principaux de la vitrine.",
    to: '/clans/nakamura',
  },
  {
    title: 'Lieux',
    text: 'Manoir de Sétia, Le Joyeux Lutin, Palais des Astres, et d’autres à venir.',
    to: '/lieux',
  },
  {
    title: 'Chronologie',
    text: 'Les événements marquants de Woltar, dans l’ordre.',
    to: '/chronologie',
  },
  {
    title: 'Culture',
    text: 'Coutumes, société, politique, magie, technologie — à documenter progressivement.',
    to: null,
  },
]

export default function Universe() {
  return (
    <PageTransition>
      <section className="container universe-page">
        <div className="section-heading">
          <span className="eyebrow">Encyclopédie</span>
          <h1 className="section-title">
            LES ARCHIVES
            <br />
            DE WOLTAR
          </h1>
        </div>

        <div className="universe-grid">
          {CHAPTERS.map((chapter) => {
            const content = (
              <>
                <h2>{chapter.title}</h2>
                <p>{chapter.text}</p>
              </>
            )
            return chapter.to ? (
              <Link key={chapter.title} to={chapter.to} className="universe-card">
                {content}
              </Link>
            ) : (
              <div key={chapter.title} className="universe-card universe-card--static">
                {content}
              </div>
            )
          })}
        </div>
      </section>
    </PageTransition>
  )
}
