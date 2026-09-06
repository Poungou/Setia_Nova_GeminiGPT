// plugins/lib/mediaStore.js
//
// Stockage média de dev (`npm run dev`) — écrit sur disque dans public/media/
// (images, comme avant) ou public/media/audio/ (nouveau, pistes musicales).
// Implémentation UNIQUE réutilisée par toutes les routes d'upload dev
// (plugins/woltar-admin.js pour la musique et les collections,
// plugins/woltar-account.js pour l'avatar joueur) — miroir exact de
// worker/lib/mediaStore.js (production, R2), mêmes règles de validation
// partagées via src/lib/mediaTypes.js.

import { writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { approxBase64Bytes, parseDataUrl, slugifyMediaName, validateMedia } from '../../src/lib/mediaTypes.js'

function httpError(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}

// { filename, dataUrl, kind } -> { path }. root = racine du projet (server.config.root).
export async function saveMediaLocal(root, { filename, dataUrl, kind }) {
  const parsed = parseDataUrl(dataUrl)
  if (!parsed) throw httpError(400, 'Fichier invalide.')

  const approxBytes = approxBase64Bytes(parsed.base64)
  const check = validateMedia({ kind, mime: parsed.mime, byteLength: approxBytes })
  if (!check.ok) throw httpError(check.status, check.message)

  const buffer = Buffer.from(parsed.base64, 'base64')
  const finalCheck = validateMedia({ kind: check.kind, mime: parsed.mime, byteLength: buffer.byteLength })
  if (!finalCheck.ok) throw httpError(finalCheck.status, finalCheck.message)

  const base = slugifyMediaName(String(filename || check.kind).replace(/\.[^.]+$/, ''))
  const finalName = `${base}-${Date.now().toString(36)}${finalCheck.ext}`

  // Images : conservées à plat dans public/media/ (inchangé, ~80 fichiers
  // déjà référencés ainsi dans src/data/*.json). Audio : nouveau
  // sous-dossier public/media/audio/ pour ne pas les mélanger.
  const subdir = check.kind === 'audio' ? path.join('media', 'audio') : 'media'
  const dir = path.join(root, 'public', subdir)
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, finalName), buffer)

  return { path: `/${subdir.split(path.sep).join('/')}/${finalName}` }
}
