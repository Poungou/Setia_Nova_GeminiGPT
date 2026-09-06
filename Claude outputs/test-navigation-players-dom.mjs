import assert from 'node:assert/strict'
import { test } from 'node:test'
import { JSDOM } from 'jsdom'
import { build } from 'esbuild'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { normalizeTimelineEvents } from '../src/lib/timelineEvents.js'

test('DOM: universal navigation, account access, public players, nested spoilers and Aether disclosure', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://test.local' })
  dom.window.HTMLElement.prototype.scrollTo = () => {}
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const React = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { MemoryRouter, useLocation } = await import('react-router-dom')
  const { act, createElement: h } = React
  const cache = path.resolve('node_modules/.cache')
  mkdirSync(cache, { recursive: true })
  const temporary = mkdtempSync(path.join(cache, 'nova-ux-'))
  const originalFetch = globalThis.fetch
  const root = createRoot(document.getElementById('root'))
  const player = { userId: 'alice', name: 'Alice', profile: { player_intro: 'Une plume curieuse', rhythm: 'Hebdomadaire' }, characters: [] }
  globalThis.fetch = async (url) => ({ ok: true, json: async () => String(url).includes('/session') ? { user: { name: 'Alice' } } : { data: [player] } })
  try {
    await build({
      stdin: { contents: "export {default as Header} from './src/components/Header/Header.jsx'; export {default as Players} from './src/pages/Players/Players.jsx'; export {default as Timeline} from './src/pages/Chronology/TimelineAccordionItem.jsx'; export {default as About} from './src/components/AetherAbout/AetherAbout.jsx'; export {default as Chat} from './src/components/ChatWidget/ChatWidget.jsx';", resolveDir: process.cwd() },
      outfile: path.join(temporary, 'components.mjs'), bundle: true, platform: 'node', format: 'esm', packages: 'external', loader: { '.css': 'empty' }, jsx: 'automatic', define: { 'import.meta.env': '{}' },
      plugins: [{ name: 'no-animation', setup(builder) {
        builder.onResolve({ filter: /framer-motion|PageTransition\/PageTransition|Reveal\/Reveal/ }, (args) => ({ path: args.path, namespace: 'animation' }))
        builder.onLoad({ filter: /.*/, namespace: 'animation' }, () => ({ contents: "import React from 'react'; export default function Wrapper({children}){return children}; export const AnimatePresence=Wrapper; export const useReducedMotion=()=>true; export const motion=Object.assign((component)=>component,{div:({children,id,role,className,'aria-labelledby':label})=>React.createElement('div',{id,role,className,'aria-labelledby':label},children)});", loader: 'js', resolveDir: process.cwd() }))
      } }],
    })
    const { Header, Players, Timeline, About, Chat } = await import(pathToFileURL(path.join(temporary, 'components.mjs')))
    function LocationProbe() { return h('output', { id: 'current-route' }, useLocation().pathname) }
    const mount = async (element, route = '/journal') => act(async () => { root.render(h(MemoryRouter, { key: route, initialEntries: [route], future: { v7_startTransition: true, v7_relativeSplatPath: true } }, element)) })
    const click = async (element) => { assert(element); await act(async () => element.click()) }
    await mount(h(Header))
    assert.equal(document.querySelector('.site-header__account').getAttribute('href'), '/compte')
    assert.equal(document.querySelector('.site-header__account').textContent, 'Alice')
    const caret = document.querySelector('.site-header__nav--desktop .site-header__caret')
    await click(caret)
    assert.equal(caret.getAttribute('aria-expanded'), 'true')
    assert.equal(document.getElementById('universe-desktop').hidden, false)
    await act(async () => document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    assert.equal(document.getElementById('universe-desktop').hidden, true)
    assert.equal(document.activeElement, caret)
    await click(caret)
    await act(async () => document.body.dispatchEvent(new window.Event('pointerdown', { bubbles: true })))
    assert.equal(caret.getAttribute('aria-expanded'), 'false')
    await click(document.querySelector('.site-header__toggle'))
    const mobile = document.getElementById('navigation-mobile')
    await click(mobile.querySelector('.site-header__caret'))
    assert.equal(document.querySelectorAll('#universe-mobile a').length, 3)
    await click(document.querySelector('#universe-mobile a[href="/lieux"]'))
    assert.equal(document.getElementById('navigation-mobile'), null)
    await click(document.querySelector('.site-header__toggle'))
    await click(document.querySelector('#navigation-mobile .site-header__caret'))
    assert(document.querySelector('#universe-mobile a[href="/chronologie"]'), 'still works after changing route')

    // Assert router navigation, not merely the menu closing. Browser tests
    // additionally cover hit testing and native Enter/Space activation.
    for (const origin of ['/univers', '/journal']) {
      for (const mobile of [false, true]) {
        for (const destination of ['/clans', '/lieux', '/chronologie']) {
          for (const method of ['click', 'space']) {
            await mount(h(React.Fragment, null, h(Header), h(LocationProbe)), `${origin}?case=${mobile}-${destination}-${method}`)
            if (mobile) await click(document.querySelector('.site-header__toggle'))
            const trigger = document.querySelector(mobile ? '#navigation-mobile .site-header__caret' : '.site-header__nav--desktop .site-header__caret')
            await click(trigger)
            const entry = document.querySelector(`${mobile ? '#universe-mobile' : '#universe-desktop'} a[href="${destination}"]`)
            await act(async () => { trigger.focus(); entry.focus() })
            assert.equal(trigger.getAttribute('aria-expanded'), 'true', 'focus within menu must not close it')
            if (method === 'click') await click(entry)
            else await act(async () => entry.dispatchEvent(new window.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })))
            assert.equal(document.getElementById('current-route').textContent, destination)
            assert.equal(document.getElementById('universe-desktop').hidden, true)
            assert.equal(document.getElementById('navigation-mobile'), null)
          }
        }
      }
    }
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ user: null }) })
    await mount(h(Header), '/visiteur')
    assert.equal(document.querySelector('.site-header__account').textContent, 'Connexion')
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ data: [player] }) })
    await mount(h(Players), '/joueurs')
    assert(document.querySelector('a[href="/joueurs/alice"]'))
    assert(document.body.textContent.includes('Hebdomadaire'))
    const events = normalizeTimelineEvents([{ id: 'spoiler', title: 'Un événement', description: 'CONTENUSECRET', spoiler: true }, { id: 'normal', title: 'Un autre', description: 'CONTENUVISIBLE', spoiler: 'false' }])
    assert.equal(events[1].spoiler, false)
    const timeline = { id: 'test', title: 'Chronologie', spoiler: true, events }
    await mount(h(Timeline, { timeline, isOpen: true, onToggle() {}, reduce: true }), '/chronologie')
    assert(!document.body.textContent.includes('CONTENUVISIBLE'))
    await click([...document.querySelectorAll('button')].find((button) => button.textContent === 'Afficher quand même'))
    assert(document.body.textContent.includes('CONTENUVISIBLE'))
    assert(!document.body.textContent.includes('CONTENUSECRET'))
    await click([...document.querySelectorAll('button')].find((button) => button.textContent === 'Afficher ce spoiler'))
    assert(document.body.textContent.includes('CONTENUSECRET'))
    await mount(h(About), '/aether')
    assert(document.body.textContent.includes('GPT-5.6 Luna'))
    assert(document.querySelector('details summary'))
    await mount(h(Chat, { title: 'Aether', sendMessage: async () => 'Réponse', greeting: 'Bonjour' }), '/chat')
    assert.equal(window.localStorage.length, 0)
    assert.equal(window.sessionStorage.length, 0)
  } finally {
    await act(async () => root.unmount())
    globalThis.fetch = originalFetch
    dom.window.close()
    assert.equal(path.dirname(temporary), cache)
    assert(path.basename(temporary).startsWith('nova-ux-'))
    rmSync(temporary, { recursive: true, force: true })
  }
})
