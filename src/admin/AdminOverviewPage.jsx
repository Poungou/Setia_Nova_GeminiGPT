// src/admin/AdminOverviewPage.jsx — « Vue d'ensemble » (design-ref/3).
// Uniquement des compteurs réels. Tout ce qui n'existe pas encore (validation,
// signalements, stockage, activité, fiches les plus vues) reste « Bientôt ».
// Le rôle admin est contrôlé côté serveur (session + routes /__admin/api) ;
// cette page ne fait aucun contrôle de rôle de son côté.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listUsers } from '../lib/authApi.js'
import { useAdmin } from './useAdmin.js'

const PATHS = {
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1M17 4a3.5 3.5 0 0 1 0 7M22 20v-1a5 5 0 0 0-3-4.5',
  user: 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM5 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  pin: 'M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12zM12 7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  pen: 'M4 20l4-1L19 8a2.1 2.1 0 0 0-3-3L5 16zM14 7l3 3',
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9.5h.01',
  music: 'M9 18V6l10-2v12M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3zM19 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3z',
  hash: 'M5 9h14M5 15h14M10 4L8 20M16 4l-2 16',
  adminShield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4',
  arrow: 'M7 17L17 7M8 7h9v9',
}

function Icon({ name, size = 18, stroke = 1.6 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  )
}

const DAY = 24 * 60 * 60 * 1000
const DRAFT_COLLECTIONS = ['characters', 'clans', 'locations', 'posts', 'timelines']

const CONTENT = [
  { key: 'characters', to: '/admin/characters', title: 'Personnages', sub: 'Fiches et portraits', icon: 'user' },
  { key: 'clans', to: '/admin/clans', title: 'Clans', sub: 'Familles et liens', icon: 'shield' },
  { key: 'locations', to: '/admin/locations', title: 'Lieux', sub: 'Décors de l’univers', icon: 'pin' },
  { key: 'posts', to: '/admin/posts', title: 'Articles', sub: 'Journal', icon: 'pen' },
]

const PUBLISH = [
  { to: '/admin/home', title: 'Accueil du site', sub: 'Textes, images et repères', icon: 'home' },
  { to: '/admin/home/home#home-group-accueil-de-la-galerie', title: 'Galerie', sub: 'Illustrations et médias', icon: 'image' },
  { to: '/admin/music', title: 'Musique du site', sub: 'Ambiance sonore', icon: 'music' },
  { to: '/admin/culture', title: 'Culture & hashtags', sub: 'Repères de la communauté', icon: 'hash' },
]

function SoonPill() {
  return <span className="ov-soon adm-mono">Bientôt</span>
}

function SoonPanel({ label, text, ariaLabel }) {
  return (
    <section className="ov-panel ov-panel--soon" aria-label={ariaLabel || label}>
      <div className="ov-panel__head"><div className="adm-mono ov-eyebrow">{label}</div><SoonPill /></div>
      <svg viewBox="0 0 272 64" className="ov-chart" aria-hidden="true"><path d="M0 48H272" stroke="rgba(200,210,255,.22)" strokeWidth="1" strokeDasharray="3 4" fill="none" /></svg>
      <p>{text}</p>
    </section>
  )
}

export default function AdminOverviewPage() {
  const { data, readOnly } = useAdmin()
  const [users, setUsers] = useState(null)

  useEffect(() => {
    if (readOnly) return undefined
    let alive = true
    listUsers()
      .then((body) => { if (alive) setUsers(body.users || []) })
      .catch(() => {})
    return () => { alive = false }
  }, [readOnly])

  const count = (key) => (data ? (data[key]?.length ?? 0) : null)
  const rows = data ? DRAFT_COLLECTIONS.flatMap((key) => data[key] || []) : null
  const drafts = rows ? rows.filter((row) => row.visibility === 'draft').length : null
  const published = rows ? rows.length - drafts : null
  const recent = users ? users.filter((u) => Date.now() - Date.parse(u.createdAt || '') < 7 * DAY).length : null
  const show = (n) => (n === null ? '—' : n)

  return (
    <div className="ov">
      <section className="ov-hero">
        <div>
          <div className="adm-mono ov-hero__eyebrow">Pilotage · Woltar Nova</div>
          <h1>Le pouls de <em>Woltar Nova.</em></h1>
          <p>Ce qui bouge, ce qui manque, ce qui se prépare.</p>
        </div>
        <div className="ov-hero__actions">
          <Link to="/" className="ov-btn ov-btn--ghost">Voir la vitrine<Icon name="arrow" stroke={1.8} /></Link>
          <span className="ov-btn ov-btn--primary is-disabled" aria-disabled="true">Ouvrir la modération<SoonPill /></span>
        </div>
      </section>

      <section className="ov-kpis" aria-label="Indicateurs">
        <Link to="/admin/users" className="ov-kpi">
          <div className="adm-mono ov-kpi__label">Utilisateurs</div>
          <div className="ov-kpi__value">
            <span className="ov-num">{show(users ? users.length : null)}</span>
            <span className="ov-kpi__cap">{recent ? `dont ${recent} sur 7 jours` : 'comptes'}</span>
          </div>
        </Link>
        <div className="ov-kpi">
          <div className="adm-mono ov-kpi__label">Brouillons</div>
          <div className="ov-kpi__value">
            <span className="ov-num">{show(drafts)}</span>
            <span className="ov-kpi__cap">{drafts ? 'à terminer' : 'rien en attente'}</span>
          </div>
        </div>
        <div className="ov-kpi">
          <div className="adm-mono ov-kpi__label">Contenus publiés</div>
          <div className="ov-kpi__value">
            <span className="ov-num">{show(published)}</span>
            <span className="ov-kpi__cap">{rows ? `sur ${rows.length} fiches` : ''}</span>
          </div>
        </div>
        <div className="ov-kpi">
          <div className="adm-mono ov-kpi__label">Stockage images</div>
          <div className="ov-kpi__value"><SoonPill /></div>
        </div>
      </section>

      <div className="ov-cols">
        <div className="ov-left">
          <section aria-label="File de modération">
            <div className="ov-section-head"><div className="adm-mono ov-eyebrow">File de modération</div></div>
            <div className="ov-panel ov-panel--soon ov-queue">
              <SoonPill />
              <p>La file de modération apparaîtra ici, quand elle existera.</p>
            </div>
          </section>

          <section aria-label="Contenus">
            <div className="ov-section-head"><div className="adm-mono ov-eyebrow">Contenus</div></div>
            <div className="ov-grid">
              {CONTENT.map(({ key, to, title, sub, icon }) => (
                <Link key={key} to={to} className="ov-tile">
                  <span className="ov-tile__ic"><Icon name={icon} /></span>
                  <span className="ov-tile__text"><span className="ov-tile__title">{title}</span><span className="ov-tile__sub">{sub}</span></span>
                  <span className="ov-tile__count">{show(count(key))}</span>
                </Link>
              ))}
            </div>
          </section>

          <section aria-label="Publication du site">
            <div className="ov-section-head"><div className="adm-mono ov-eyebrow">Publication du site</div></div>
            <div className="ov-grid">
              {PUBLISH.map(({ to, title, sub, icon }) => (
                <Link key={title} to={to} className="ov-tile">
                  <span className="ov-tile__ic"><Icon name={icon} /></span>
                  <span className="ov-tile__text"><span className="ov-tile__title">{title}</span><span className="ov-tile__sub">{sub}</span></span>
                  <span className="adm-mono ov-lnk">Modifier</span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <aside className="ov-right">
          <SoonPanel label="Activité récente" ariaLabel="Activité récente" text="Le fil d’activité de l’espace apparaîtra ici." />
          <SoonPanel label="Fiches les plus vues" text="Le classement des fiches les plus visitées apparaîtra ici." />
          <section className="ov-panel" aria-label="Sécurité">
            <div className="adm-mono ov-eyebrow">Accès</div>
            <div className="ov-access">
              <Icon name="adminShield" size={22} />
              <div>Réservé au rôle admin, vérifié côté serveur.</div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
