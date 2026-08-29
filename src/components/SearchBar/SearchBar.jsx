import { Search } from 'lucide-react'
import './SearchBar.css'

export default function SearchBar({ value, onChange, placeholder = 'Rechercher un nom, un clan, un lieu…' }) {
  return (
    <div className="search-bar">
      <Search size={18} aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Rechercher"
      />
    </div>
  )
}
