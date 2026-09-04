// plugins/lib/clanMembers.js
//
// Équivalent dev (sans D1) de la table `clan_members` (voir
// migrations/0004_clans_and_members.sql). Un clan canon (ownerUserId absent
// ou "system", ex. Nakamura) garde ses membres embarqués dans
// src/data/clans.json (`members: [...]`, édité depuis /admin). Un clan créé
// depuis un compte joueur (/compte) stocke ses membres ici, dans un fichier
// ignoré par git — même principe que plugins/data/users.json.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

function file(root) {
  return path.join(root, 'plugins', 'data', 'clan-members.json')
}

async function load(root) {
  const f = file(root)
  if (!existsSync(f)) return []
  return JSON.parse(await readFile(f, 'utf8'))
}

async function save(root, rows) {
  await mkdir(path.dirname(file(root)), { recursive: true })
  await writeFile(file(root), JSON.stringify(rows, null, 2) + '\n', 'utf8')
}

export async function listClanMembers(root, clanId) {
  const rows = await load(root)
  return rows
    .filter((r) => r.clanId === clanId)
    .sort((a, b) => (a.order || 0) - (b.order || 0) || String(a.addedAt).localeCompare(String(b.addedAt)))
}

export async function addClanMember(root, clanId, characterId, { role = '', order = 0 } = {}) {
  const rows = await load(root)
  const now = new Date().toISOString()
  const idx = rows.findIndex((r) => r.clanId === clanId && r.characterId === characterId)
  if (idx >= 0) {
    rows[idx] = { ...rows[idx], role, order }
  } else {
    rows.push({ clanId, characterId, role, order, addedAt: now })
  }
  await save(root, rows)
  return listClanMembers(root, clanId)
}

export async function removeClanMember(root, clanId, characterId) {
  const rows = await load(root)
  await save(
    root,
    rows.filter((r) => !(r.clanId === clanId && r.characterId === characterId)),
  )
}

// Nettoyage à la suppression d'un clan de compte.
export async function removeClan(root, clanId) {
  const rows = await load(root)
  await save(
    root,
    rows.filter((r) => r.clanId !== clanId),
  )
}

// Résout la liste d'ids de personnages membres d'un clan, quelle que soit sa
// source (canon ou compte) — utilisé par plugins/woltar-public.js pour que
// /clans et /clans/:id renvoient toujours `members` sous la même forme.
export async function resolveClanMembers(root, clan) {
  if (!clan) return []
  if (!clan.ownerUserId || clan.ownerUserId === 'system') return clan.members || []
  const rows = await listClanMembers(root, clan.id)
  return rows.map((r) => r.characterId)
}
