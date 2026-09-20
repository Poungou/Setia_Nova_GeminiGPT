import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { checkRelease } from './check-release.mjs'

const TEST_SITE_KEY = '1x00000000000000000000AA'

test('check-release accepts the configured public key and rejects the test key', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'woltar-release-check-'))
  const distDir = path.join(root, 'dist')
  const envFile = path.join(root, '.env.local')
  mkdirSync(distDir)
  writeFileSync(envFile, 'VITE_TURNSTILE_SITE_KEY=real-public-site-key\n')
  try {
    writeFileSync(path.join(distDir, 'good.js'), 'const key = "real-public-site-key"')
    assert.equal(checkRelease({ distDir, envFile }), true)

    writeFileSync(path.join(distDir, 'bad.js'), `const key = "${TEST_SITE_KEY}"`)
    assert.throws(() => checkRelease({ distDir, envFile }), /clé publique Turnstile de test/i)

    rmSync(path.join(distDir, 'bad.js'))
    writeFileSync(path.join(distDir, 'good.js'), 'const key = "another-public-site-key"')
    assert.throws(() => checkRelease({ distDir, envFile }), /clé publique Turnstile de .env.local est absente/i)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
