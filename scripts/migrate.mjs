// scripts/migrate.mjs
//
// Migration unique : pousse les données statiques de src/data/ vers Supabase.
// À lancer UNE fois, une fois le schéma créé (supabase/schema.sql).
//
//   1. Récupère la clé "service_role" : Supabase → Settings → API → service_role
//      (⚠️ secret absolu — ne jamais la committer ni la mettre côté navigateur)
//   2. Crée un fichier .env.migrate (ignoré par git) :
//        SUPABASE_URL=https://xxxx.supabase.co
//        SUPABASE_SERVICE_ROLE_KEY=eyJ...
//   3. npm run migrate
//
// Le script est idempotent : relançable sans créer de doublons (upsert par id).

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

import { characters } from '../src/data/characters.js'
import { locations } from '../src/data/locations.js'
import { clans } from '../src/data/clans.js'
import { events } from '../src/data/events.js'
import { archives } from '../src/data/archives.js'

// --- config -----------------------------------------------------------------
function loadEnv() {
  try {
    const raw = readFileSync(new URL('../.env.migrate', import.meta.url), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
      if (m) process.env[m[1]] ??= m[2].trim()
    }
  } catch {
    /* pas de fichier .env.migrate — on tentera les variables du shell */
  }
}
loadEnv()

const URL_ = process.env.SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL_ || !KEY) {
  console.error(
    'Manque SUPABASE_URL et/ou SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Crée un fichier .env.migrate (voir en-tête de ce script).',
  )
  process.exit(1)
}

const db = createClient(URL_, KEY, { auth: { persistSession: false } })

// --- mapping statique -> lignes de base ------------------------------------
const str = (v) => (v == null ? '' : String(v))
const arr = (v) => (Array.isArray(v) ? v : [])

const characterRows = characters.map((c, i) => ({
  id: c.id,
  number: str(c.number),
  first_name: str(c.firstName),
  last_name: str(c.lastName),
  nickname: str(c.nickname),
  title: str(c.title),
  clan: str(c.clan),
  status: str(c.status) || 'to-develop',
  canon: str(c.canon) || 'draft',
  age: str(c.age),
  gender: str(c.gender),
  species: str(c.species),
  origin: str(c.origin),
  residence: str(c.residence),
  occupation: str(c.occupation),
  short_description: str(c.shortDescription),
  personality: str(c.character),
  appearance: str(c.appearance),
  biography: str(c.biography),
  portrait: str(c.portrait),
  traits: arr(c.traits),
  location_ids: arr(c.locations),
  tags: arr(c.tags),
  gallery: arr(c.gallery),
  sort_order: Number(c.number) || i + 1,
}))

const relationRows = characters.flatMap((c) =>
  arr(c.relations).map((r) => ({
    source_id: c.id,
    target_id: r.characterId,
    type: str(r.type),
    description: str(r.description),
  })),
)

const locationRows = locations.map((l, i) => ({
  id: l.id,
  name: str(l.name),
  type: str(l.type),
  canon: str(l.canon) || 'draft',
  location: str(l.location),
  owner: str(l.owner),
  faction: str(l.faction),
  status: str(l.status),
  short_description: str(l.shortDescription),
  description: str(l.description),
  history: str(l.history),
  image: str(l.image),
  character_ids: arr(l.characters),
  gallery: arr(l.gallery),
  sort_order: i + 1,
}))

const clanRows = clans.map((c, i) => ({
  id: c.id,
  name: str(c.name),
  canon: str(c.canon) || 'draft',
  emblem: str(c.emblem),
  description: str(c.description),
  history: str(c.history),
  residence: str(c.residence),
  location_ids: arr(c.locations),
  member_ids: arr(c.members),
  sort_order: i + 1,
}))

const eventRows = events.map((e, i) => ({
  id: e.id,
  title: str(e.title),
  date_rp: str(e.dateRP),
  sort_order: Number(e.order) || i + 1,
  description: str(e.description),
  character_ids: arr(e.characters),
  location_ids: arr(e.locations),
  image: str(e.image),
  importance: str(e.importance),
  tags: arr(e.tags),
}))

const archiveRows = archives.map((a, i) => ({
  id: a.id,
  arc: str(a.arc),
  title: str(a.title),
  date_rp: str(a.dateRP),
  character_ids: arr(a.characters),
  location_ids: arr(a.locations),
  body: str(a.text),
  sort_order: i + 1,
}))

// --- exécution -------------------------------------------------------------
async function upsert(table, rows, opts = {}) {
  if (!rows.length) {
    console.log(`· ${table}: rien à migrer`)
    return
  }
  const { error } = await db.from(table).upsert(rows, opts)
  if (error) {
    console.error(`✗ ${table}:`, error.message)
    process.exitCode = 1
  } else {
    console.log(`✓ ${table}: ${rows.length} ligne(s)`)
  }
}

console.log(`Migration vers ${URL_}\n`)
await upsert('characters', characterRows)
await upsert('locations', locationRows)
await upsert('clans', clanRows)
await upsert('events', eventRows)
await upsert('archives', archiveRows)

// relations : on repart à zéro (pas d'id stable dans les données source)
{
  const { error: delErr } = await db
    .from('character_relations')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (delErr) console.error('✗ character_relations (purge):', delErr.message)
  await upsert('character_relations', relationRows, { defaultToNull: true })
}

console.log('\nTerminé.')
