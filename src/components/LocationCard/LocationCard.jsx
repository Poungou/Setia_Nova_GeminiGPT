import { Link } from 'react-router-dom'
import './LocationCard.css'

export default function LocationCard({ location }) {
  return (
    <Link to={`/lieux/${location.id}`} className="location-card">
      <div className="location-card__media">
        {location.image ? (
          <img src={location.image} alt={location.name} loading="lazy" />
        ) : (
          <span className="location-card__glyph" aria-hidden="true" />
        )}
      </div>
      <div className="location-card__body">
        {location.type && <span className="eyebrow">{location.type}</span>}
        <h3>{location.name}</h3>
        <p>{location.shortDescription || <span className="dash">—</span>}</p>
      </div>
    </Link>
  )
}
