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

function startsWith(bytes, signature, offset = 0) {
  return signature.every((value, index) => bytes[offset + index] === value)
}

function hasValidMagic(mime, bytes) {
  if (mime === 'image/png') return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (mime === 'image/jpeg') return startsWith(bytes, [0xff, 0xd8, 0xff])
  if (mime === 'image/webp') return startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  if (mime === 'image/gif') return startsWith(bytes, [0x47, 0x49, 0x46, 0x38]) && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61
  if (mime === 'audio/mpeg' || mime === 'audio/mp3') return startsWith(bytes, [0x49, 0x44, 0x33]) || (bytes[0] === 0xff && [0xf2, 0xf3, 0xfb].includes(bytes[1]))
  if (mime === 'audio/ogg') return startsWith(bytes, [0x4f, 0x67, 0x67, 0x53])
  if (['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'].includes(mime)) return startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x41, 0x56, 0x45], 8)
  return false
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
  if (!hasValidMagic(parsed.mime, buffer)) throw httpError(415, 'Le contenu du fichier ne correspond pas à son type annoncé.')

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
