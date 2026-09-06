// plugins/lib/siteSettings.js
//
// Équivalent dev-only (Vite, pas de D1) de worker/lib/siteSettings.js : même
// forme clé/valeur, stockée dans un fichier JSON local plutôt que la table
// D1 `site_settings` (voir plugins/data/*.json pour le même principe côté
// comptes/profils). Sert pour l'instant uniquement à la musique de fond
// globale (clé "music").

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

function filePath(root) {
  return path.join(root, 'plugins', 'data', 'site-settings.json')
}

async function loadAll(root) {
  const file = filePath(root)
  if (!existsSync(file)) return {}
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return {}
  }
}

export async function getSiteSetting(root, key) {
  const all = await loadAll(root)
  return all[key] ?? null
}

export async function setSiteSetting(root, key, data) {
  const dir = path.join(root, 'plugins', 'data')
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })
  const all = await loadAll(root)
  all[key] = data
  await writeFile(filePath(root), JSON.stringify(all, null, 2) + '\n', 'utf8')
  return data
}
