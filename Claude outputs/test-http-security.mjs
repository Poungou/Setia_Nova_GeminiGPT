import assert from 'node:assert/strict'
import worker from '../worker/index.js'

const env = {
  ASSETS: {
    async fetch() {
      return new Response('<!doctype html><html></html>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    },
  },
}

const required = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

const html = await worker.fetch(new Request('https://test.local/'), env)
for (const [name, value] of Object.entries(required)) assert.equal(html.headers.get(name), value)
assert.match(html.headers.get('Content-Security-Policy'), /default-src 'self'/)
assert.match(html.headers.get('Content-Security-Policy'), /frame-ancestors 'none'/)

const api = await worker.fetch(new Request('https://test.local/__auth/api/unknown'), env)
for (const [name, value] of Object.entries(required)) assert.equal(api.headers.get(name), value)
assert.match(api.headers.get('Content-Security-Policy'), /object-src 'none'/)

console.log('HTTP security headers: OK')