import assert from 'node:assert/strict'
import { test } from 'node:test'
import { JSDOM } from 'jsdom'
import { build } from 'esbuild'
import { mkdirSync, mkdtempSync, rmSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

test('Compact footer: production/dev, themes and top link; existing community profiles reused without writes', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://test.local' })
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  globalThis.localStorage = dom.window.localStorage
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const React = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { MemoryRouter } = await import('react-router-dom')
  const { act, createElement: h } = React
  const root = createRoot(document.getElementById('root'))
  const cache = path.resolve('node_modules/.cache')
  mkdirSync(cache, { recursive: true })
  const temporary = mkdtempSync(path.join(cache, 'footer-community-'))
  const originalFetch = globalThis.fetch
  try {
    const mount = (element) => act(async () => root.render(h(MemoryRouter, { future: { v7_startTransition: true, v7_relativeSplatPath: true } }, element)))
    for (const dev of [false, true]) {
      const outfile = path.join(temporary, `${dev}.mjs`)
      await build({ stdin: { contents: "export {default as Footer} from './src/components/Footer/Footer.jsx'; export {default as Community} from './src/admin/AdminCommunityPage.jsx';", resolveDir: process.cwd() }, outfile, bundle: true, platform: 'node', format: 'esm', packages: 'external', loader: { '.css': 'empty' }, jsx: 'automatic', define: { 'import.meta.env': JSON.stringify({ DEV: dev }) } })
      const { Footer, Community } = await import(pathToFileURL(outfile))
      for (const width of [375, 1440]) {
        window.innerWidth = width
        await mount(h(Footer))
        const footer = document.querySelector('footer')
        assert.equal(Boolean(footer.querySelector('a[href="/admin"]')), dev)
        assert.equal(footer.querySelector('a[href="/compte"]'), null)
        const select = footer.querySelector('select[aria-label="Thème"]')
        assert.deepEqual([...select.options].map((option) => option.value), ['dark', 'light', 'woltar'])
        for (const theme of ['light', 'woltar', 'dark']) {
          await act(async () => { select.value = theme; select.dispatchEvent(new window.Event('change', { bubbles: true })) })
          assert.equal(document.documentElement.dataset.theme, theme)
          assert.equal(localStorage.getItem('woltar-theme'), theme)
        }
        let scroll
        window.scrollTo = (options) => { scroll = options }
        await act(async () => footer.querySelector('a[href="#top"]').click())
        assert.equal(scroll.top, 0)
      }
      const profile = { exists: true, profile_public: true, avatar: '/avatar.webp', player_intro: 'Présentation conservée', writing_style: 'Style conservé', univers: 'Univers conservé', tw: 'TW conservés', rhythm: 'Rythme conservé', ig_username: 'PseudoIG', linked_character_ids: ['associated', 'draft'] }
      const snapshot = JSON.stringify(profile)
      const characters = [{ id: 'owned', firstName: 'Owned', ownerUserId: 'alice' }, { id: 'associated', firstName: 'Associated', ownerUserId: 'bob' }, { id: 'draft', firstName: 'Draft', ownerUserId: 'bob', visibility: 'draft' }, { id: 'other', ownerUserId: 'bob' }]
      globalThis.fetch = async (url, init) => {
        assert(!init?.method || init.method === 'GET', 'displaying profiles must not write data')
        const body = String(url).endsWith('/users') ? { users: [{ id: 'alice', name: 'Alice' }] } : String(url).endsWith('/profile') ? { profile } : { data: { characters } }
        return { ok: true, json: async () => structuredClone(body) }
      }
      await mount(h(Community))
      assert.equal(document.querySelector('h1').textContent, 'Joueurs')
      assert(document.body.textContent.includes('3 personnage(s) rattaché(s)'))
      assert(document.querySelector('a[href="/joueurs/alice"]'))
      assert(document.querySelector('a[href="/personnages/owned"]'))
      assert(document.querySelector('a[href="/personnages/associated"]'))
      assert(!document.querySelector('a[href="/personnages/draft"]'))
      await act(async () => [...document.querySelectorAll('button')].find((button) => button.textContent === 'Modifier').click())
      const values = [...document.querySelectorAll('input, textarea')].map((input) => input.value)
      for (const field of ['player_intro', 'writing_style', 'univers', 'tw', 'rhythm', 'ig_username']) assert(values.includes(profile[field]))
      assert.equal(JSON.stringify(profile), snapshot)
    }
    const routes = readFileSync('src/admin/AdminApp.jsx', 'utf8')
    assert(routes.includes('path="players" element={<AdminCommunityPage />}'))
    for (const route of ['community', 'creator/*']) assert(routes.includes(`path="${route}" element={<Navigate to="/admin/players" replace />}`))
  } finally {
    await act(async () => root.unmount())
    globalThis.fetch = originalFetch
    dom.window.close()
    assert.equal(path.dirname(temporary), cache)
    assert(path.basename(temporary).startsWith('footer-community-'))
    rmSync(temporary, { recursive: true, force: true })
  }
})
