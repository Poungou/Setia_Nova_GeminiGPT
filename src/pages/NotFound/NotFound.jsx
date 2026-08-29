import { Link } from 'react-router-dom'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import './NotFound.css'

export default function NotFound() {
  return (
    <PageTransition>
      <section className="container not-found">
        <span className="eyebrow">404</span>
        <h1 className="section-title">Cette page n&rsquo;existe pas (encore).</h1>
        <p>Peut-être une histoire qui reste à écrire.</p>
        <Link to="/" className="btn btn-primary">
          Retour à l&rsquo;accueil
        </Link>
      </section>
    </PageTransition>
  )
}
