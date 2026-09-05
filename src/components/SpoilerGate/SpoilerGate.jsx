// src/components/SpoilerGate/SpoilerGate.jsx
//
// Garde-fou spoiler générique : affiche un avertissement + un bouton
// "Afficher quand même" au lieu du contenu directement. Utilisé pour les
// chronologies (globale et par personnage) qui peuvent révéler à l'avance
// des éléments importants de l'histoire — voir Chronology.jsx et
// CharacterDetail.jsx. Pas de mémorisation entre rendus : un aller-retour
// sur la page RÉ-affiche l'avertissement (comportement volontaire, pas un
// bug — on ne veut pas qu'un choix "montré une fois" saute la protection
// pour un autre visiteur du même appareil).
import { useState } from 'react'
import './SpoilerGate.css'

export default function SpoilerGate({ message, buttonLabel = 'Afficher quand même', children, className = '' }) {
  const [revealed, setRevealed] = useState(false)

  if (revealed) return children

  return (
    <div className={`spoiler-gate ${className}`.trim()}>
      <p className="spoiler-gate__message">{message}</p>
      <button type="button" className="btn spoiler-gate__btn" onClick={() => setRevealed(true)}>
        {buttonLabel}
      </button>
    </div>
  )
}
