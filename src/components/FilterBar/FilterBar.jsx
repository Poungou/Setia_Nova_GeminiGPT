import './FilterBar.css'

export default function FilterBar({ filters, active, onChange }) {
  return (
    <div className="filter-bar" role="group" aria-label="Filtrer les personnages">
      {filters.map((f) => (
        <button
          key={f.value}
          className={'filter-bar__item' + (active === f.value ? ' is-active' : '')}
          onClick={() => onChange(f.value)}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
