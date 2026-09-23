import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SCHEMA } from '../admin/schema.js'

// Tracés SVG repris tels quels des maquettes design-ref/ (viewBox 24×24).
const PATHS = {
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  user: 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM5 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  pin: 'M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12zM12 7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  pen: 'M4 20l4-1L19 8a2.1 2.1 0 0 0-3-3L5 16zM14 7l3 3',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  leaf: 'M20 4c-8 0-13 4-13 11l-3 5M20 4c0 8-4 12-11 12M9 16l6-6',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9.5h.01',
  sparkle: 'M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2z',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  adminShield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4',
  logout: 'M9 4H5v16h4M16 8l4 4-4 4M20 12H9',
  arrow: 'M7 17L17 7M8 7h9v9',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  chevron: 'M9 6l6 6-6 6',
  menu: 'M4 7h16M4 12h16M4 17h10',
  close: 'M6 6l12 12M18 6L6 18',
}

export function Icon({ name, size = 18, strokeWidth = 1.6, className, style }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={style}
    ><path d={PATHS[name]} /></svg>
  )
}

const SECTIONS = [
  { key: 'characters', route: 'personnages', title: 'Mes personnages', short: 'Personnages', chip: 'Personnage', icon: 'user', desc: 'Des visages, des caractères et des histoires à faire grandir.', heroCta: 'Ouvrir mes fiches' },
  { key: 'clans', route: 'clans', title: 'Mes familles', short: 'Familles', chip: 'Famille', icon: 'shield', desc: 'Les liens et les familles qui donnent corps à ton univers.' },
  { key: 'locations', route: 'lieux', title: 'Mes lieux', short: 'Lieux', chip: 'Lieu', icon: 'pin', desc: 'Des décors pour accueillir les prochaines rencontres.' },
  { key: 'posts', route: 'articles', title: 'Mes articles', short: 'Articles', chip: 'Article', icon: 'pen', desc: 'Les nouvelles et les récits que tu souhaites partager.' },
  { key: 'timelines', route: 'chronologies', title: 'Mes chronologies', short: 'Chronologies', icon: 'clock', desc: 'Les moments clés, au fil de tes histoires.' },
]

const CULTURE = { title: 'Mes cultures', short: 'Cultures', icon: 'leaf', desc: 'Traditions, croyances et rituels de ton univers.' }

const COMPLETENESS_LABELS = 'Identité · Caractère · Apparence · Histoire · Relations'
const SECTION_TOTAL = 5

const filled = (value) => (Array.isArray(value) ? value.length > 0 : String(value ?? '').trim() !== '')

// Une fiche personnage compte 5 sections ; chacune est « remplie » si ses champs
// le sont. Seuls les personnages ont ces 5 sections : pour le reste, la
// complétude n'est pas calculable (null).
function characterSections(row) {
  return [
    filled(row.firstName) && ['title', 'age', 'gender', 'species', 'origin', 'residence', 'occupation'].some((k) => filled(row[k])),
    filled(row.character),
    filled(row.appearance),
    filled(row.biography),
    Array.isArray(row.relations) && row.relations.some((rel) => filled(rel?.characterId)),
  ].filter(Boolean).length
}

const initials = (text) => {
  const words = String(text || '?').split(/[\s-]+/).filter(Boolean)
  return (words.length > 1 ? words.slice(0, 2).map((w) => w[0]).join('') : (words[0] || '?').slice(0, 2)).toUpperCase()
}
const fold = (text) => String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const pad = (n) => String(n).padStart(2, '0')

function Segments({ full = 0, partial = 0, total = SECTION_TOTAL }) {
  return (
    <span className="acc-seg" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => <i key={i} className={i < full ? 'f' : i === full && partial ? 'f is-partial' : ''} />)}
    </span>
  )
}

function Tile({ to, icon, index, title, short, desc, count, cta, empty, hero, children }) {
  return (
    <Link to={to} className={`acc-tile${hero ? ' acc-tile--hero' : ''}${empty ? ' is-empty' : ''}`}>
      <div className="acc-tile__main">
        <div className="acc-tile__top"><Icon name={icon} /><span className="acc-mono acc-tile__idx">{index}</span></div>
        <div className="acc-tile__body"><h3><span className="acc-desktop-only">{title}</span><span className="acc-mobile-only">{short}</span></h3><p>{desc}</p></div>
        <div className="acc-tile__foot">
          <span className="acc-tile__count">{count}</span>
          <span className="acc-mono acc-lnk">{cta}<Icon name={empty ? 'plus' : 'arrow'} size={14} strokeWidth={1.8} /></span>
        </div>
      </div>
      {children}
    </Link>
  )
}

export default function AccountDashboard({ data, user, canCreate, profileAllowed, cultureCount }) {
  const [query, setQuery] = useState('')
  const list = (key) => data[key] || []
  const rows = SECTIONS.flatMap(({ key }) => list(key))
  const drafts = rows.filter((row) => row.visibility === 'draft').length
  const published = rows.length - drafts
  const sections = SECTIONS.filter(({ key }) => canCreate(user, key) || list(key).length)

  // « Reprendre » et « Fiches à enrichir » ne concernent que les fiches de la
  // personne connectée (ownerUserId), jamais celles des autres comptes.
  const mine = (key) => list(key).filter((row) => row.ownerUserId === user.id)
  const myCharacters = mine('characters').map((row) => ({ row, sections: characterSections(row) }))
  const average = myCharacters.length ? myCharacters.reduce((sum, c) => sum + c.sections, 0) / myCharacters.length : null
  const percent = average === null ? null : Math.round((average / SECTION_TOTAL) * 100)
  const toEnrich = myCharacters.filter((c) => c.sections < SECTION_TOTAL).sort((a, b) => b.sections - a.sections)

  const lastEdited = SECTIONS
    .flatMap(({ key, route }) => mine(key).map((row) => ({ key, route, row, time: Date.parse(row.updatedAt || '') })))
    .filter((entry) => Number.isFinite(entry.time))
    .sort((a, b) => b.time - a.time)[0]
  const lastSections = lastEdited?.key === 'characters' ? characterSections(lastEdited.row) : null

  const emptyNames = [
    ...sections.filter(({ key }) => !list(key).length).map(({ short }) => short),
    ...(cultureCount === 0 ? [CULTURE.short] : []),
  ]

  const creatable = SECTIONS.filter(({ key, chip }) => chip && canCreate(user, key))
  const firstCreatable = SECTIONS.find(({ key }) => canCreate(user, key))

  const needle = fold(query.trim())
  const results = needle
    ? SECTIONS.flatMap(({ key, route }) => list(key).map((row) => ({ route, id: row.id, title: SCHEMA[key].title(row), kind: key })))
      .filter((entry) => fold(entry.title).includes(needle)).slice(0, 6)
    : []

  const characters = list('characters')
  const cells = characters.length > 8 ? characters.slice(0, 7) : characters
  const rest = characters.length - cells.length

  const resumeProgress = lastSections === null ? null : (
    <>
      <Segments full={lastSections} />
      <span className="acc-mono"><span className="acc-desktop-only">{lastSections} sur {SECTION_TOTAL} sections</span><span className="acc-mobile-only">{lastSections}/{SECTION_TOTAL}</span></span>
    </>
  )

  const tileFor = ({ key, route, title, short, desc, icon, heroCta }, i) => {
    const count = list(key).length
    const empty = count === 0
    const to = empty && canCreate(user, key) ? `/compte/${route}/new` : `/compte/${route}`
    return (
      <Tile key={key} to={to} icon={icon} index={pad(i + 1)} title={title} short={short} desc={desc} count={count}
        cta={empty ? 'Commencer' : heroCta || 'Ouvrir'} empty={empty} hero={key === 'characters' && !empty}>
        {key === 'characters' && !empty && (
          <div className="acc-mosaic" aria-hidden="true">
            {cells.map((row) => <div key={row.id} className="acc-av">{initials(SCHEMA.characters.title(row))}</div>)}
            {rest > 0 && <div className="acc-av acc-av--more acc-mono">+{rest}</div>}
          </div>
        )}
      </Tile>
    )
  }

  return (
    <div className="acc">
      <div className="acc-topbar">
        <div className="acc-mono acc-crumb">Woltar Nova <span>/</span> <b>Mon espace</b></div>
        <div className="acc-search">
          <label>
            <Icon name="search" size={16} strokeWidth={1.8} />
            <input type="search" value={query} placeholder="Rechercher une fiche…" aria-label="Rechercher une fiche"
              autoComplete="off" onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setQuery('')} />
          </label>
          {needle && (
            <ul className="acc-search__results" aria-label="Résultats de recherche">
              {results.map((entry) => (
                <li key={`${entry.kind}:${entry.id}`}><Link to={`/compte/${entry.route}/${encodeURIComponent(entry.id)}`} onClick={() => setQuery('')}>
                  <span>{entry.title}</span><span className="acc-mono">{SECTIONS.find((s) => s.key === entry.kind).chip || 'Chronologie'}</span>
                </Link></li>
              ))}
              {results.length === 0 && <li className="acc-search__none">Aucune fiche trouvée.</li>}
            </ul>
          )}
        </div>
      </div>

      <section className="acc-hero">
        <div>
          <div className="acc-mono acc-hero__eyebrow"><span className="acc-desktop-only">Mon espace · Woltar Nova</span><span className="acc-mobile-only">Mon espace</span></div>
          <h1>Bienvenue, <em>{user.name || 'à toi'}.</em></h1>
          <p>Ton atelier d’histoires. Reprends là où tu en étais.</p>
        </div>
        {firstCreatable && (
          <div className="acc-hero__actions">
            <Link to={`/compte/${firstCreatable.route}/new`} className="acc-btn"><Icon name="plus" strokeWidth={1.8} />Écrire une nouvelle fiche</Link>
            <div className="acc-chips">
              {creatable.map(({ route, chip }) => <Link key={route} to={`/compte/${route}/new`} className="acc-mono acc-chip">{chip}</Link>)}
            </div>
          </div>
        )}
      </section>

      <section className="acc-kpis" aria-label="Indicateurs">
        <div className="acc-kpi">
          <div className="acc-mono acc-kpi__label"><span className="acc-desktop-only">Fiches publiées</span><span className="acc-mobile-only">Publiées</span></div>
          <div className="acc-kpi__value"><span className="acc-num">{published}</span><span className="acc-kpi__cap">sur {rows.length} accessibles</span></div>
        </div>
        <div className="acc-kpi">
          <div className="acc-mono acc-kpi__label">Brouillons</div>
          <div className="acc-kpi__value"><span className="acc-num">{drafts}</span><span className="acc-kpi__cap">{drafts ? 'à terminer' : 'rien en attente'}</span></div>
        </div>
        <div className="acc-kpi">
          <div className="acc-mono acc-kpi__label"><span className="acc-desktop-only">Complétude moyenne</span><span className="acc-mobile-only">Complétude</span></div>
          <div className="acc-kpi__value acc-kpi__value--pct">
            <span className="acc-num">{percent === null ? '—' : percent}</span>{percent !== null && <span className="acc-num acc-pct">%</span>}
          </div>
          {average !== null && <Segments full={Math.floor(average)} partial={average % 1} />}
        </div>
        <div className="acc-kpi">
          <div className="acc-mono acc-kpi__label">Sections vides</div>
          <div className="acc-kpi__value"><span className="acc-num">{emptyNames.length}</span><span className="acc-kpi__cap">{emptyNames.join(', ') || 'tout est commencé'}</span></div>
        </div>
      </section>

      <div className="acc-cols">
        <div className="acc-left">
          {lastEdited && (
            <section aria-label="Reprendre" className="acc-resume-wrap">
              <div className="acc-mono acc-eyebrow">Reprendre</div>
              <div className="acc-tile acc-tile--hero acc-resume">
                <div className="acc-av acc-resume__av">{initials(SCHEMA[lastEdited.key].title(lastEdited.row))}</div>
                <div className="acc-resume__text">
                  <div className="acc-mono acc-resume__kicker">Dernière fiche modifiée</div>
                  <div className="acc-resume__title">{SCHEMA[lastEdited.key].title(lastEdited.row)}</div>
                  {SCHEMA[lastEdited.key].subtitle(lastEdited.row) && <div className="acc-resume__sub">{SCHEMA[lastEdited.key].subtitle(lastEdited.row)}</div>}
                  {lastSections !== null && <div className="acc-resume__progress acc-desktop-only">{resumeProgress}</div>}
                </div>
                {lastSections !== null && <div className="acc-resume__progress acc-mobile-only">{resumeProgress}</div>}
                <Link to={`/compte/${lastEdited.route}/${encodeURIComponent(lastEdited.row.id)}`} className="acc-btn acc-resume__btn">
                  <span>Continuer<span className="acc-mobile-only"> la fiche</span></span><Icon name="arrow" strokeWidth={1.8} className="acc-desktop-only" />
                </Link>
              </div>
            </section>
          )}

          <section aria-label="Mes créations" className="acc-creations">
            <div className="acc-creations__head"><div className="acc-mono acc-eyebrow">Mes créations</div><div className="acc-creations__note">À chaque histoire, son espace</div></div>
            <div className="acc-grid">
              {sections.map((section, i) => tileFor(section, i))}
              <Tile to="/compte/cultures" icon={CULTURE.icon} index={pad(sections.length + 1)} title={CULTURE.title} short={CULTURE.short} desc={CULTURE.desc}
                count={cultureCount === null ? '—' : cultureCount} cta={cultureCount === 0 ? 'Commencer' : 'Ouvrir'} empty={cultureCount === 0} />
              {profileAllowed && (
                <Link to="/compte/profil" className="acc-tile acc-tile--profile">
                  <Icon name="sparkle" size={22} className="acc-tile__pico" />
                  <div className="acc-tile__body"><h3><span className="acc-desktop-only">Mon profil joueur</span><span className="acc-mobile-only">Profil joueur</span></h3><p>Présente ta plume, tes envies et ton rythme de jeu.</p></div>
                  <span className="acc-mono acc-lnk acc-desktop-only">Modifier<Icon name="arrow" size={14} strokeWidth={1.8} /></span>
                  <Icon name="chevron" size={20} className="acc-tile__chev" />
                </Link>
              )}
            </div>
          </section>
        </div>

        <aside className="acc-right">
          <section className="acc-panel" aria-label="Fiches à enrichir">
            <div className="acc-panel__head"><div className="acc-mono acc-eyebrow">Fiches à enrichir</div><div className="acc-mono acc-panel__count">{toEnrich.length}</div></div>
            <div className="acc-enrich">
              {toEnrich.slice(0, 3).map(({ row, sections: n }) => (
                <Link key={row.id} to={`/compte/personnages/${encodeURIComponent(row.id)}`} className="acc-enrich__item">
                  <div className="acc-av acc-enrich__av">{initials(SCHEMA.characters.title(row))}</div>
                  <div className="acc-enrich__text">
                    <div className="acc-enrich__row"><span>{SCHEMA.characters.title(row)}</span><span className="acc-mono">{n * (100 / SECTION_TOTAL)}%</span></div>
                    <div className="acc-enrich__sub">{row.clan || SCHEMA.characters.subtitle(row) || '—'}</div>
                    <Segments full={n} />
                  </div>
                </Link>
              ))}
              {toEnrich.length === 0 && <p className="acc-panel__empty">{myCharacters.length ? 'Toutes tes fiches sont complètes.' : 'Aucun personnage pour le moment.'}</p>}
            </div>
            <div className="acc-panel__legend">{COMPLETENESS_LABELS}</div>
          </section>

          <section className="acc-panel acc-panel--soon acc-visits" aria-label="Visites">
            <div className="acc-panel__head"><div className="acc-mono acc-eyebrow">Visites de tes fiches</div><div className="acc-mono acc-soon">Bientôt</div></div>
            <svg viewBox="0 0 272 64" className="acc-visits__chart" aria-hidden="true"><path d="M0 48H272" stroke="rgba(226,214,255,.22)" strokeWidth="1" strokeDasharray="3 4" fill="none" /></svg>
            <p>Ici apparaîtront les visites sur tes personnages, tes lieux et tes articles.</p>
          </section>
        </aside>
      </div>
    </div>
  )
}
