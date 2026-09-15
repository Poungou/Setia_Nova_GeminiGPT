import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, UserRound, Shield, MapPin, PenLine, CalendarClock, Feather, Lock, Sparkles, LayoutTemplate } from 'lucide-react'
import { cultureApi } from '../lib/cultureApi.js'

const SECTIONS = [
  ['characters', 'personnages', 'Mes personnages', 'Des visages, des caractères et des histoires à faire grandir.', UserRound],
  ['clans', 'clans', 'Mes clans', 'Les liens et les familles qui donnent corps à ton univers.', Shield],
  ['locations', 'lieux', 'Mes lieux', 'Des décors pour accueillir les prochaines rencontres.', MapPin],
  ['posts', 'articles', 'Mes articles', 'Les nouvelles et les récits que tu souhaites partager.', PenLine],
  ['timelines', 'chronologies', 'Mes chronologies', 'Les moments clés, au fil de tes histoires.', CalendarClock],
]

export default function AccountDashboard({ data, user, canCreate, profileAllowed }) {
  const [cultureCount, setCultureCount] = useState(null)
  const sections = SECTIONS.filter(([key]) => canCreate(user, key) || data[key]?.length)
  const rows = SECTIONS.flatMap(([key]) => data[key] || [])
  const drafts = rows.filter(row => row.visibility === 'draft').length
  useEffect(() => {
    let alive = true
    cultureApi('posts')
      .then(posts => {
        if (alive) setCultureCount(posts.filter(post => post.ownerUserId === user.id).length)
      })
      .catch(() => {
        if (alive) setCultureCount(0)
      })
    return () => { alive = false }
  }, [user.id])
  return <div className="account-dashboard">
    <header className="account-welcome">
      <div><span className="eyebrow">Mon espace · Woltar Nova</span><h1>Bienvenue, <em>{user.name || 'à toi'}.</em></h1><p>Ton atelier d’histoires. Retrouve tes créations et donne vie à la suite.</p><span className="account-status">{user.role === 'admin' ? 'Administration' : user.status || 'Membre'}</span></div>
      <div className="account-welcome__note"><Sparkles size={24} aria-hidden="true" /><p>Un personnage, une rencontre,<br />une nouvelle page à écrire.</p><Link to="/" className="account-link">Revenir à la vitrine <ArrowUpRight size={16} /></Link></div>
    </header>
    <div className="account-overview"><span><strong>{rows.length}</strong> fiches accessibles</span><span><strong>{drafts}</strong> brouillons</span><span><strong>{rows.length - drafts}</strong> fiches publiées</span></div>
    <div className="account-heading"><h2>Mes créations</h2><span>À chaque histoire, son espace</span></div>
    <div className="account-grid">
      {sections.map(([key, route, title, description, Icon]) => <Link key={key} to={`/compte/${route}`} className="account-tile">
        <div className="account-tile__top"><Icon size={22} aria-hidden="true" /><span>{String((data[key] || []).length).padStart(2, '0')}</span></div>
        <h3>{title}</h3><p>{description}</p><span className="account-tile__foot">Ouvrir mes fiches <ArrowUpRight size={18} aria-hidden="true" /></span>
      </Link>)}
      <Link to="/culture?mes=1" className="account-tile account-tile--culture"><div className="account-tile__top"><Feather size={22} aria-hidden="true" /><span>{cultureCount === null ? '—' : String(cultureCount).padStart(2, '0')}</span></div><h3>Mes cultures</h3><p>Traditions, croyances et rituels : partage ce qui rend ton univers singulier.</p><span className="account-tile__foot">Retrouver mes contributions <ArrowUpRight size={18} aria-hidden="true" /></span></Link>
    </div>
    <section className="account-personal" aria-label="Profil et réglages">
      {profileAllowed && <Link to="/compte/profil"><UserRound size={22} aria-hidden="true" /><div><h3>Mon profil joueur</h3><p>Présente ta plume, tes envies et ton rythme de jeu.</p></div><ArrowUpRight size={18} /></Link>}
      <Link to="/compte/securite"><Lock size={22} aria-hidden="true" /><div><h3>Sécurité du compte</h3><p>Ton adresse email et ton mot de passe.</p></div><ArrowUpRight size={18} /></Link>
      {user.role === 'admin' && <Link to="/admin/home/home"><LayoutTemplate size={22} aria-hidden="true" /><div><h3>Personnaliser l’accueil</h3><p>Textes, liens, illustration et fonds du site.</p></div><ArrowUpRight size={18} /></Link>}
    </section>
  </div>
}
