import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TEST_SITE_KEY = '1x00000000000000000000AA'

function readEnvValue(envFile, name) {
  const line = readFileSync(envFile, 'utf8')
    .split(/\r?\n/)
    .find((entry) => new RegExp(`^\\s*${name}\\s*=`).test(entry))
  return line ? line.replace(new RegExp(`^\\s*${name}\\s*=\\s*`), '').trim().replace(/^(["'])(.*)\1$/, '$2') : ''
}

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name)
    return entry.isDirectory() ? listFiles(file) : [file]
  })
}

export function checkRelease({ distDir = path.join(ROOT, 'dist'), envFile = path.join(ROOT, '.env.local') } = {}) {
  let publicSiteKey = process.env.VITE_TURNSTILE_SITE_KEY || ''
  if (!publicSiteKey) {
    try {
      publicSiteKey = readEnvValue(envFile, 'VITE_TURNSTILE_SITE_KEY')
    } catch {
      publicSiteKey = ''
    }
  }
  if (!publicSiteKey) throw new Error('VITE_TURNSTILE_SITE_KEY est absente de l’environnement et de .env.local.')

  let files
  try {
    files = listFiles(distDir)
  } catch {
    throw new Error('dist/ est introuvable. Lance npm run build.')
  }

  let hasTestKey = false
  let hasPublicKey = false
  for (const file of files) {
    const content = readFileSync(file)
    hasTestKey ||= content.includes(Buffer.from(TEST_SITE_KEY))
    hasPublicKey ||= content.includes(Buffer.from(publicSiteKey))
  }

  if (hasTestKey) throw new Error('La clé publique Turnstile de test est présente dans dist/.')
  if (!hasPublicKey) throw new Error('La clé publique Turnstile de .env.local est absente de dist/.')
  return true
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    checkRelease()
    console.log('check-release: OK')
  } catch (error) {
    console.error(`check-release: ÉCHEC - ${error.message}`)
    process.exitCode = 1
  }
}
