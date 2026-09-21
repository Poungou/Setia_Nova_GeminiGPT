import { useParams, Link } from 'react-router-dom'
import { MapPin, Users, Shield, ArrowUpRight, Network, BookOpen } from 'lucide-react'
import { usePublicClanState, usePublicCharacters, usePublicLocations } from '../../lib/publicData.js'
import { imgSrc, imgFocus } from '../../lib/image.js'
import CharacterCard from '../../components/CharacterCard/CharacterCard.jsx'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import Prose from '../../components/Prose/Prose.jsx'
import ReportButton from '../../components/ReportButton/ReportButton.jsx'
import RelationGraph from '../../components/RelationGraph/RelationGraph.jsx'
import './ClanDetail.css'

export default function ClanDetail() {
  const { id } = useParams()
  const { clan, loading, error } = usePublicClanState(id)
  const characters = usePublicCharacters()
  const locations = usePublicLocations()
  if (loading) return <section className="container clan-detail"><p role="status">À la rencontre du clan…</p></section>
  if (!clan) return <section className="container clan-detail"><p role={loading ? 'status' : 'alert'}>{loading ? 'À la rencontre du clan…' : error ? 'Cette fiche est indisponible pour le moment.' : 'Ce clan est introuvable.'}</p><Link className="btn" to="/clans">← Les clans</Link></section>
  const members = (clan.members || []).map(cid => characters.find(c => c.id === cid)).filter(Boolean)
  const places = (clan.locations || []).map(lid => locations.find(l => l.id === lid)).filter(Boolean)
  const emblem = imgSrc(clan.emblem)
  const initials = clan.name.replace(/^clan\s+/i, '').split(/\s+/).slice(0, 2).map(word => word[0]).join('')
  return <PageTransition><article className="container clan-detail">
    <Link className="clan-detail__back" to="/clans">← Explorer les clans</Link>
    <header className="clan-hero">
      <div className="clan-hero__identity"><span className="eyebrow"><Shield size={15} /> Une histoire, des liens</span><h1>{clan.name}</h1>{clan.description && <Prose markdown={clan.description} className="clan-detail__lead" />}
        <nav className="clan-hero__nav" aria-label="Dans cette fiche"><a href="#clan-members"><Users size={16} />Les membres</a>{members.length > 1 && <a href="#clan-relations"><Network size={16} />Leurs liens</a>}{clan.history && <a href="#clan-history"><BookOpen size={16} />L’histoire</a>}</nav>
      </div>
      <div className="clan-hero__seal" aria-label={`Blason de ${clan.name}`}><div className="clan-hero__seal-inner">{emblem ? <img src={emblem} alt={clan.name} style={{ objectPosition: imgFocus(clan.emblem) }} /> : <><Shield size={24} aria-hidden="true" /><span>{initials}</span><small>Clan</small></>}</div></div>
    </header>
    <div className="clan-facts"><div><MapPin size={20} /><span><small>Résidence</small><strong>{clan.residence || 'Un lieu reste à écrire'}</strong></span></div><div><Users size={20} /><span><small>Visages du clan</small><strong>{members.length} membre{members.length > 1 ? 's' : ''}</strong></span></div><div><Shield size={20} /><span><small>Dans l’univers</small><Link to="/culture">Découvrir les cultures <ArrowUpRight size={14} /></Link></span></div></div>
    <section className="clan-panel" id="clan-members"><div className="clan-section-heading"><div><span className="eyebrow">Celles et ceux qui lui donnent vie</span><h2>Les visages du clan</h2></div><span className="clan-count">{String(members.length).padStart(2, '0')}</span></div>{members.length ? <div className="clan-members-grid">{members.map((member, i) => <CharacterCard key={member.id} character={member} index={i} />)}</div> : <div className="empty-state"><Users size={26} /><p>Les membres de ce clan n’ont pas encore été renseignés.</p></div>}</section>
    {places.length > 0 && <section className="clan-panel"><div className="clan-section-heading"><div><span className="eyebrow">Des lieux pour se retrouver</span><h2>Les ancrages du clan</h2></div><MapPin size={24} /></div><div className="clan-places">{places.map(place => <Link className="clan-place" key={place.id} to={`/lieux/${place.id}`}><span className="eyebrow">{place.type || 'Lieu'}</span><h3>{place.name}</h3><p>{place.shortDescription || place.location || 'Explorer ce lieu du clan.'}</p><span className="clan-place__link">Entrer dans ce lieu <ArrowUpRight size={18} /></span></Link>)}</div></section>}
    {members.length > 1 && <section className="clan-panel clan-panel--relations" id="clan-relations"><div className="clan-section-heading"><div><span className="eyebrow">D’un destin à l’autre</span><h2>La constellation des liens</h2></div><Network size={24} /></div><RelationGraph members={members} centerId={clan.centerCharacterId} /></section>}
    {clan.history && <section className="clan-panel clan-panel--history" id="clan-history"><span className="eyebrow">La mémoire du clan</span><h2>Une histoire à transmettre</h2><Prose markdown={clan.history} /></section>}
    <ReportButton contentType="clans" record={clan} />
    <footer className="clan-detail__footer"><Link className="btn" to="/clans">← Tous les clans</Link><Link to="/univers">Poursuivre l’exploration de l’univers →</Link></footer>
  </article></PageTransition>
}
