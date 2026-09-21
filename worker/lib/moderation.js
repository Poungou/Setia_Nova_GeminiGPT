// worker/lib/moderation.js
//
// Circuit de modération des contenus créés par les comptes (personnages,
// clans, lieux, articles, chronologies) et signalements publics.
//
//   draft ──envoyer──▶ pending ──valider──▶ published
//                        │  ├──corriger──▶ needs_changes ──renvoyer──▶ pending
//                        │  └──refuser───▶ hidden (archive, jamais supprimé)
//   published ──signalement « masquer »──▶ needs_changes
//
// Le contenu canon (JSON compilé) et le contenu « system » ne passent JAMAIS
// par ce circuit : seules les lignes D1 d'un compte y entrent.
// Tout est vérifié ici, côté Worker ; l'état vit dans des colonnes (jamais
// dans le JSON `data`) pour ne pas pouvoir être forgé par un client.

import { randomUUID } from 'node:crypto'
import { httpError } from './authStore.js'
import {
  getCharacter, getClan, getLocation, getPost, getTimeline,
  listCharacters, listClans, listLocations, listPosts, listTimelines,
} from './contentStore.js'
import { checkRateLimit, clientIp } from './rateLimit.js'
import { assertSameOrigin } from './originGuard.js'

export const MODERATED_COLLECTIONS = {
  characters: { table: 'characters', get: getCharacter, list: listCharacters },
  clans: { table: 'clans', get: getClan, list: listClans },
  locations: { table: 'locations', get: getLocation, list: listLocations },
  posts: { table: 'posts', get: getPost, list: listPosts },
  timelines: { table: 'timelines', get: getTimeline, list: listTimelines },
}

// Types de contenu qu'un visiteur peut signaler (fiches publiques).
export const REPORTABLE_TYPES = ['characters', 'clans', 'locations']
export const REPORT_REASONS = ['shocking', 'no_permission', 'other']

const NOTE_MAX = 1000
const REPORT_DETAILS_MAX = 500
const REPORT_MAX_PER_HOUR = 5
const ID_PATTERN = /^[A-Za-z0-9_\-.~:@+]{1,200}$/

function nowIso() {
  return new Date().toISOString()
}

// Retire les caractères de contrôle (sauf saut de ligne et tabulation).
function stripControl(value) {
  return Array.from(String(value ?? ''))
    .filter((char) => {
      const code = char.charCodeAt(0)
      return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127)
    })
    .join('')
}

function cleanNote(value, { required }) {
  const note = stripControl(value).trim().slice(0, NOTE_MAX)
  if (required && !note) throw httpError(400, 'Un message est obligatoire pour cette action.')
  return note
}

function assertCollection(collection) {
  const source = MODERATED_COLLECTIONS[collection]
  if (!source) throw httpError(404, 'Collection inconnue.')
  return source
}

function isSystemOwned(record) {
  return !record?.ownerUserId || record.ownerUserId === 'system'
}

// Contenu d'un compte, existant en D1, hors canon. Sinon 404 : le canon est
// invisible pour ce circuit.
async function getReviewable(env, collection, id) {
  const source = assertCollection(collection)
  if (!ID_PATTERN.test(String(id || ''))) throw httpError(404, 'Contenu introuvable.')
  const record = await source.get(env, id)
  if (!record || isSystemOwned(record)) throw httpError(404, 'Contenu introuvable.')
  return { source, record }
}

// visibility : null = ne pas toucher au champ JSON `visibility`.
async function writeReview(env, source, id, { status, note, submittedAt, reviewedAt, reviewedBy, visibility = null }) {
  await env.WOLTAR_DB
    .prepare(
      `UPDATE ${source.table} SET review_status = ?, review_note = ?, submitted_at = ?, reviewed_at = ?, reviewed_by = ?,
         data = CASE WHEN ? IS NULL THEN data ELSE json_set(data, '$.visibility', ?) END
       WHERE id = ?`,
    )
    .bind(status, note, submittedAt, reviewedAt, reviewedBy, visibility, visibility, id)
    .run()
}

// --- Côté auteur -------------------------------------------------------------

// draft | needs_changes -> pending. Réservé à l'auteur du contenu.
export async function submitForReview(env, user, collection, id) {
  const { source, record } = await getReviewable(env, collection, id)
  if (record.ownerUserId !== user.id) throw httpError(403, 'Tu ne peux envoyer que tes propres contenus.')
  if (record.reviewStatus === 'pending') throw httpError(409, 'Ce contenu est déjà en cours de relecture.')
  if (record.reviewStatus === 'published') throw httpError(409, 'Ce contenu est déjà publié.')
  if (record.reviewStatus === 'hidden') throw httpError(403, 'Ce contenu a été refusé : il ne peut pas être renvoyé.')
  await writeReview(env, source, id, {
    status: 'pending',
    note: record.reviewNote || '',
    submittedAt: nowIso(),
    reviewedAt: record.reviewedAt || null,
    reviewedBy: record.reviewedBy || null,
    visibility: 'draft',
  })
  return source.get(env, id)
}

// --- File de modération (admin) ---------------------------------------------

async function ownerNames(env, records) {
  const ids = [...new Set(records.map((record) => record.ownerUserId).filter(Boolean))]
  if (!ids.length) return new Map()
  const placeholders = ids.map(() => '?').join(',')
  const { results } = await env.WOLTAR_DB.prepare(`SELECT id, name FROM users WHERE id IN (${placeholders})`).bind(...ids).all()
  return new Map((results || []).map((row) => [row.id, row.name]))
}

async function collectContent(env, predicate) {
  const items = []
  for (const [collection, source] of Object.entries(MODERATED_COLLECTIONS)) {
    for (const record of await source.list(env)) {
      if (isSystemOwned(record) || !predicate(record)) continue
      items.push({ collection, id: record.id, record })
    }
  }
  const names = await ownerNames(env, items.map((item) => item.record))
  return items.map((item) => ({ ...item, ownerName: names.get(item.record.ownerUserId) || '' }))
}

export async function getModerationCounts(env) {
  let pending = 0
  for (const source of Object.values(MODERATED_COLLECTIONS)) {
    const row = await env.WOLTAR_DB
      .prepare(`SELECT COUNT(*) AS count FROM ${source.table} WHERE review_status = 'pending' AND owner_user_id <> 'system'`)
      .first()
    pending += Number(row?.count || 0)
  }
  const reports = await env.WOLTAR_DB.prepare("SELECT COUNT(*) AS count FROM content_reports WHERE status = 'open'").first()
  return { pending, reports: Number(reports?.count || 0) }
}

// Plus ancien en premier.
export async function listPending(env) {
  const items = await collectContent(env, (record) => record.reviewStatus === 'pending')
  return items.sort((a, b) => String(a.record.submittedAt || '').localeCompare(String(b.record.submittedAt || '')))
}

async function reportRows(env, status) {
  const sql = status === 'open'
    ? "SELECT * FROM content_reports WHERE status = 'open' ORDER BY created_at ASC"
    : "SELECT * FROM content_reports WHERE status <> 'open' ORDER BY handled_at DESC LIMIT 50"
  const { results } = await env.WOLTAR_DB.prepare(sql).all()
  return results || []
}

function reportToRecord(row) {
  return {
    id: row.id,
    contentType: row.content_type,
    contentId: row.content_id,
    reason: row.reason,
    details: row.details || '',
    createdAt: row.created_at,
    status: row.status,
    handledAt: row.handled_at || null,
    handledBy: row.handled_by || null,
  }
}

export async function listReports(env) {
  const reports = []
  for (const row of await reportRows(env, 'open')) {
    const report = reportToRecord(row)
    const source = MODERATED_COLLECTIONS[report.contentType]
    const record = source ? await source.get(env, report.contentId) : null
    reports.push({ ...report, record: record && !isSystemOwned(record) ? record : null })
  }
  return reports
}

export async function listHistory(env) {
  const decided = await collectContent(env, (record) => Boolean(record.reviewedAt))
  decided.sort((a, b) => String(b.record.reviewedAt).localeCompare(String(a.record.reviewedAt)))
  const reports = (await reportRows(env, 'handled')).map(reportToRecord)
  return { content: decided.slice(0, 100), reports }
}

// decision : approve | request_changes | reject — uniquement sur un contenu `pending`.
export async function decideContent(env, actor, collection, id, decision, rawNote) {
  const { source, record } = await getReviewable(env, collection, id)
  if (record.reviewStatus !== 'pending') throw httpError(409, 'Ce contenu n’est pas en attente de validation.')
  const now = nowIso()
  const base = { submittedAt: record.submittedAt || null, reviewedAt: now, reviewedBy: actor.id }

  if (decision === 'approve') {
    await writeReview(env, source, id, { ...base, status: 'published', note: '', visibility: 'published' })
  } else if (decision === 'request_changes') {
    await writeReview(env, source, id, { ...base, status: 'needs_changes', note: cleanNote(rawNote, { required: true }), visibility: 'draft' })
  } else if (decision === 'reject') {
    await writeReview(env, source, id, { ...base, status: 'hidden', note: cleanNote(rawNote, { required: true }), visibility: 'draft' })
  } else {
    throw httpError(400, 'Décision inconnue.')
  }
  return source.get(env, id)
}

// --- Signalements -------------------------------------------------------------

// Route publique : aucun compte requis, aucune donnée sur la personne.
export async function createReport(env, request, body) {
  assertSameOrigin(request)
  await checkRateLimit(env, `report:ip:${clientIp(request)}`, { max: REPORT_MAX_PER_HOUR, windowMs: 60 * 60 * 1000 })

  const contentType = String(body?.contentType || '')
  const contentId = String(body?.contentId || '')
  const reason = String(body?.reason || '')
  if (!REPORTABLE_TYPES.includes(contentType)) throw httpError(400, 'Type de contenu invalide.')
  if (!ID_PATTERN.test(contentId)) throw httpError(400, 'Identifiant invalide.')
  if (!REPORT_REASONS.includes(reason)) throw httpError(400, 'Motif invalide.')
  const details = stripControl(body?.details).trim().slice(0, REPORT_DETAILS_MAX)

  // Le contenu doit exister (D1, compte) et être publié.
  const record = await MODERATED_COLLECTIONS[contentType].get(env, contentId)
  if (!record || isSystemOwned(record) || record.reviewStatus !== 'published' || record.visibility === 'draft') {
    throw httpError(404, 'Contenu introuvable.')
  }

  await env.WOLTAR_DB
    .prepare('INSERT INTO content_reports (id, content_type, content_id, reason, details, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(`report_${randomUUID()}`, contentType, contentId, reason, details, nowIso(), 'open')
    .run()
  return { ok: true }
}

// decision : keep | hide. « Masquer » repasse le contenu en `needs_changes`
// (avec message obligatoire) ; tous les signalements ouverts sur ce contenu
// sont alors clos.
export async function handleReport(env, actor, reportId, decision, rawNote) {
  const row = await env.WOLTAR_DB.prepare('SELECT * FROM content_reports WHERE id = ?').bind(String(reportId || '')).first()
  if (!row) throw httpError(404, 'Signalement introuvable.')
  if (row.status !== 'open') throw httpError(409, 'Ce signalement est déjà traité.')
  const now = nowIso()

  if (decision === 'keep') {
    await env.WOLTAR_DB
      .prepare("UPDATE content_reports SET status = 'kept', handled_at = ?, handled_by = ? WHERE id = ?")
      .bind(now, actor.id, row.id)
      .run()
    return { ok: true, status: 'kept' }
  }

  if (decision === 'hide') {
    const note = cleanNote(rawNote, { required: true })
    const { source, record } = await getReviewable(env, row.content_type, row.content_id)
    await writeReview(env, source, record.id, {
      status: 'needs_changes',
      note,
      submittedAt: record.submittedAt || null,
      reviewedAt: now,
      reviewedBy: actor.id,
      visibility: 'draft',
    })
    await env.WOLTAR_DB
      .prepare("UPDATE content_reports SET status = 'hidden', handled_at = ?, handled_by = ? WHERE content_type = ? AND content_id = ? AND status = 'open'")
      .bind(now, actor.id, row.content_type, row.content_id)
      .run()
    return { ok: true, status: 'hidden' }
  }

  throw httpError(400, 'Décision inconnue.')
}
