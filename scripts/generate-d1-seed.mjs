#!/usr/bin/env node
// scripts/generate-d1-seed.mjs
//
// Génère d1-seed.sql à partir de src/data/characters.json et
// src/data/personas.json, pour peupler la base D1 avec les fiches déjà
// créées en local. N'accède PAS au réseau et ne touche PAS D1 directement —
// ce script écrit juste un fichier .sql à rejouer toi-même avec wrangler.
//
// Ne migre PAS les comptes utilisateurs (plugins/data/users.json) : crée
// plutôt un nouveau compte via /__auth/api/register une fois le Worker en
// ligne — le tout premier compte créé devient automatiquement admin (voir
// worker/lib/authStore.js).
//
// Usage :
//   node scripts/generate-d1-seed.mjs
//   npx wrangler d1 execute woltar-db --local --file=./d1-seed.sql
//   npx wrangler d1 execute woltar-db --remote --file=./d1-seed.sql

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const dataDir = path.join(root, 'src', 'data')
const outFile = path.join(root, 'd1-seed.sql')

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

async function readJson(name) {
  try {
    return JSON.parse(await readFile(path.join(dataDir, `${name}.json`), 'utf8'))
  } catch {
    return []
  }
}

function characterStatements(rows) {
  const now = new Date().toISOString()
  return rows.map((row) => {
    const { id, ownerUserId, ...rest } = row
    const data = JSON.stringify({ ...rest, id })
    const values = [
      sqlString(id),
      sqlString(ownerUserId || 'system'),
      sqlString(data),
      sqlString(row.createdAt || now),
      sqlString(row.updatedAt || now),
    ]
    return `INSERT OR REPLACE INTO characters (id, owner_user_id, data, created_at, updated_at) VALUES (${values.join(', ')});`
  })
}

function personaStatements(rows) {
  const now = new Date().toISOString()
  return rows.map((row) => {
    const { id, ownerUserId, characterId, ...rest } = row
    const data = JSON.stringify({ ...rest, id, characterId })
    const values = [
      sqlString(id),
      sqlString(characterId || ''),
      sqlString(ownerUserId || 'system'),
      sqlString(data),
      sqlString(row.createdAt || now),
      sqlString(row.updatedAt || now),
    ]
    return `INSERT OR REPLACE INTO personas (id, character_id, owner_user_id, data, created_at, updated_at) VALUES (${values.join(', ')});`
  })
}

async function main() {
  const characters = await readJson('characters')
  const personas = await readJson('personas')

  const lines = [
    '-- Généré par scripts/generate-d1-seed.mjs — ne pas éditer à la main.',
    '-- Personnages',
    ...characterStatements(characters),
    '',
    '-- Personas IA',
    ...personaStatements(personas),
    '',
  ]

  await writeFile(outFile, lines.join('\n') + '\n', 'utf8')
  console.log(`Fichier généré : ${outFile}`)
  console.log(`  ${characters.length} personnage(s), ${personas.length} Persona(s).`)
  console.log('  Aucun compte utilisateur inclus — crée un compte via /__auth/api/register une fois en ligne.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
