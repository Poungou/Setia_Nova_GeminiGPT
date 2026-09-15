/* global localStorage, document, innerWidth */
// Run with Vite on port 5182. Browser dependency is the existing optional
// node_modules/.cache/header-browser installation; fixtures stay in memory.
import assert from 'node:assert/strict'
import { chromium } from '../node_modules/.cache/header-browser/node_modules/playwright-core/index.mjs'
import { cultureRequest } from '../worker/lib/cultureService.js'

const base = 'http://127.0.0.1:5182'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' })
let user = { id: 'alice', name: 'Alice', role: 'user' }
let tags = [{ id: 'coutumes', name: 'Coutumes' }, { id: 'cuisine', name: 'Cuisine' }, { id: 'croyances', name: 'Croyances' }]
let posts = [
  { id: 'test-1', title: 'Le thé des retrouvailles', summary: 'Une tasse offerte au retour d’un long voyage.', body: '## Un geste qui rassemble\nLe thé est servi avant même de raconter le voyage.', tagIds: ['coutumes'], ownerUserId: 'alice', authorName: 'Alice', createdAt: '2026-09-14T10:00:00Z', updatedAt: '2026-09-14T10:00:00Z' },
  { id: 'test-2', title: 'La fête des lanternes', summary: 'Quand les rues s’illuminent, chacun confie un souhait à la nuit.', body: 'Une fête imaginée pour ce test.', tagIds: ['croyances'], ownerUserId: 'bob', authorName: 'Bob', createdAt: '2026-09-13T10:00:00Z', updatedAt: '2026-09-13T10:00:00Z' },
  { id: 'test-3', title: 'Le pain des départs', summary: 'Un peu de miel, quelques épices et un souvenir à emporter.', body: 'Une recette imaginée pour ce test.', tagIds: ['cuisine'], ownerUserId: 'bob', authorName: 'Bob', createdAt: '2026-09-12T10:00:00Z', updatedAt: '2026-09-12T10:00:00Z' },
]
const store = {
  posts: async () => posts, post: async id => posts.find(p => p.id === id), tags: async () => tags,
  savePost: async p => { posts = [...posts.filter(v => v.id !== p.id), p] },
  deletePost: async id => { posts = posts.filter(p => p.id !== id) },
  saveTag: async t => { tags = [...tags.filter(v => v.id !== t.id), t] },
  deleteTag: async id => { tags = tags.filter(t => t.id !== id); posts = posts.map(p => ({ ...p, tagIds: p.tagIds.filter(t => t !== id) })) },
}
await context.addInitScript(() => localStorage.setItem('woltar-theme', 'light'))
await context.route('**/*', async route => {
  const req = route.request(), url = new URL(req.url())
  if (url.origin !== base) return route.abort()
  if (url.pathname === '/__auth/api/session') return route.fulfill({ json: { user } })
  if (url.pathname.startsWith('/__admin/api/collections/')) return route.fulfill({ json: { data: [] } })
  if (url.pathname.startsWith('/__culture/api/')) {
    const response = await cultureRequest(new Request(url, { method: req.method(), headers: req.headers(), ...(!['GET', 'HEAD'].includes(req.method()) ? { body: req.postData() } : {}) }), url.pathname.split('/').slice(3), { store, getUser: async () => user })
    return route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() })
  }
  if (url.pathname.startsWith('/__') && req.method() !== 'GET') return route.abort()
  return route.continue()
})
const page = await context.newPage()
const errors = []
page.on('pageerror', error => errors.push(error.message))
const noOverflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
try {
  await page.goto(`${base}/culture`)
  await page.getByRole('heading', { name: 'Le thé des retrouvailles' }).waitFor()
  await page.screenshot({ path: 'node_modules/.cache/culture-desktop.png', fullPage: true })
  await page.getByRole('button', { name: '#Cuisine', exact: true }).click()
  assert.equal(await page.locator('.culture-card').count(), 1)
  await page.getByRole('button', { name: 'Tout le carnet' }).click()
  await page.getByRole('link', { name: 'Partager ma culture' }).click()
  await page.getByLabel('Titre', { exact: true }).fill('Notre rituel du matin')
  await page.getByLabel('Votre récit').fill('Un récit **en gras**. <script>alert(1)</script>')
  await page.getByLabel('#Coutumes').check()
  await page.getByRole('button', { name: 'Publier ma culture' }).click()
  await page.getByRole('heading', { name: 'Notre rituel du matin' }).waitFor()
  assert.equal(await page.locator('.culture-paper script').count(), 0)
  await page.getByRole('link', { name: 'Modifier', exact: true }).click()
  await page.getByLabel('Titre', { exact: true }).fill('Notre rituel du soir')
  await page.getByRole('button', { name: 'Enregistrer les modifications' }).click()
  await page.getByRole('heading', { name: 'Notre rituel du soir' }).waitFor()
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await page.getByRole('button', { name: 'Oui, supprimer' }).click()
  await page.waitForURL(`${base}/culture`)
  user = { id: 'admin', name: 'Admin', role: 'admin' }
  await page.goto(`${base}/admin/culture`)
  await page.getByLabel('Nouveau hashtag').fill('Rituels')
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
  const row = page.locator('li').filter({ hasText: '#Rituels' })
  await row.getByRole('button', { name: 'Renommer' }).click()
  await page.getByLabel('Renommer le hashtag').fill('RituelsPartagés')
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await page.locator('li').filter({ hasText: '#RituelsPartagés' }).getByRole('button', { name: 'Supprimer' }).click()
  await page.getByRole('button', { name: 'Supprimer le hashtag', exact: true }).click()
  await page.waitForFunction(() => !document.body.textContent.includes('#RituelsPartagés'))
  for (const theme of ['light', 'dark', 'woltar']) {
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 })
      await page.evaluate(value => localStorage.setItem('woltar-theme', value), theme)
      for (const route of ['/culture', '/culture/nouveau', '/clans/nakamura']) {
        await page.goto(base + route)
        await page.locator(route === '/clans/nakamura' ? '.clan-hero' : route.endsWith('nouveau') ? '.culture-fields' : '.culture-card').first().waitFor()
        await noOverflow()
        if (theme === 'light' && route !== '/culture/nouveau' && width !== 768) await page.screenshot({ path: `node_modules/.cache/${route.includes('clans') ? 'clan' : 'culture'}-${width}.png`, fullPage: route === '/culture' })
      }
    }
  }
  user = null
  await page.goto(`${base}/culture/test-1`)
  await page.getByRole('heading', { name: 'Le thé des retrouvailles' }).waitFor()
  assert.equal(await page.getByRole('link', { name: 'Modifier', exact: true }).count(), 0)
  assert.deepEqual(errors, [])
  console.log('Culture UI: publication, modification, suppression, filtres, hashtags admin, lecture publique et 27 vues responsive OK.')
} finally { await browser.close() }
