import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', { url: 'https://woltar.test', pretendToBeVisual: true })
for (const name of ['window', 'document', 'Node', 'HTMLElement', 'Element', 'MutationObserver', 'DOMParser', 'getComputedStyle', 'localStorage']) {
  Object.defineProperty(globalThis, name, { value: dom.window[name], configurable: true })
}
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window)
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window)
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { default: React, act, useState } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const cache = path.join(process.cwd(), 'node_modules', '.cache')
await mkdir(cache, { recursive: true })
const directory = await mkdtemp(path.join(cache, 'journal-ui-test-'))
await build({ entryPoints: ['src/components/ArticleEditor/ArticleComposer.jsx'], outfile: path.join(directory, 'composer.mjs'), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, define: { 'import.meta.env': '{"DEV":false}' }, logLevel: 'silent' })
const { default: ArticleComposer } = await import(pathToFileURL(path.join(directory, 'composer.mjs')))
let root
after(async () => {
  if (root) await act(() => root.unmount())
  const resolved = path.resolve(directory)
  assert.equal(path.dirname(resolved), path.resolve(cache))
  assert.ok(path.basename(resolved).startsWith('journal-ui-test-'))
  await rm(resolved, { recursive: true, force: true })
  dom.window.close()
})

const initial = { id: 'ancien', title: 'Le récit original', body: '## Un souvenir\n\nUne **histoire**.\n\n- Une liste', excerpt: '', date: '2026-09-05', author: 'Nova', category: 'fan-art', visibility: 'draft', cover: '', gallery: [], characters: [], locations: [], tags: [] }
const key = 'woltar:journal-draft:account:test:ancien'
let submissions = []
function Harness({ readOnly = false, saving = false, failSave = false }) {
  const [form, setForm] = useState(initial)
  return React.createElement(MemoryRouter, { future: { v7_startTransition: true, v7_relativeSplatPath: true } }, React.createElement(ArticleComposer, {
    form, onChange: setForm, onSave: async (visibility) => {
      if (failSave) return false
      const saved = { ...form, visibility, ownerUserId: 'test', updatedAt: '2026-09-05T12:00:00Z' }
      submissions.push(saved)
      setForm(saved)
      return saved
    }, saving, readOnly, flash: '', isNew: false, backTo: '/compte/articles', data: {}, uploadEnabled: false, draftScope: 'account:test:ancien',
  }))
}
async function mount(props = {}) {
  if (root) await act(() => root.unmount())
  root = createRoot(document.getElementById('app'))
  await act(async () => { root.render(React.createElement(Harness, props)); await new Promise((resolve) => setTimeout(resolve, 15)) })
}
async function click(label) {
  const button = [...document.querySelectorAll('button')].find((element) => element.textContent.trim() === label)
  assert.ok(button, `button ${label} exists`)
  await act(async () => { button.click(); await new Promise((resolve) => setTimeout(resolve, 5)) })
}

test('composer preserves legacy body through preview and metadata save; successful save clears local draft and dirty state', async () => {
  localStorage.clear()
  await mount()
  await click('Aperçu')
  assert.ok(document.querySelector('.article-composer__preview h2'))
  await click('Écrire')
  const title = document.querySelector('#article-title')
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(title, 'Le titre modifié')
    title.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  assert.equal(JSON.parse(localStorage.getItem(key)).form.title, 'Le titre modifié')
  assert.equal(JSON.parse(localStorage.getItem(key)).form.body, initial.body)
  await click('Publier')
  assert.equal(submissions.at(-1).title, 'Le titre modifié')
  assert.equal(submissions.at(-1).body, initial.body)
  assert.equal(submissions.at(-1).visibility, 'published')
  assert.equal(localStorage.getItem(key), null)
  assert.equal(document.querySelector('.article-composer__local').textContent, 'À jour')
  const unload = new window.Event('beforeunload', { cancelable: true })
  window.dispatchEvent(unload)
  assert.equal(unload.defaultPrevented, false)
})

test('recovery is offered explicitly, restored without publication, and unpublished by draft action', async () => {
  localStorage.setItem(key, JSON.stringify({ version: 1, savedAt: '2026-09-05T12:00:00Z', form: { ...initial, title: 'Copie retrouvée', body: '<p>Texte retrouvé</p>', visibility: 'published' } }))
  await mount()
  assert.equal(document.querySelector('#article-title').value, initial.title)
  const before = submissions.length
  await click('Restaurer')
  assert.equal(document.querySelector('#article-title').value, 'Copie retrouvée')
  assert.match(document.querySelector('[contenteditable]').textContent, /Texte retrouvé/)
  assert.equal(submissions.length, before)
  await click('Repasser en brouillon')
  assert.equal(submissions.at(-1).visibility, 'draft')
  assert.equal(localStorage.getItem(key), null)
  assert.equal(document.querySelector('.article-composer__local').textContent, 'À jour')
})

test('read-only and saving states disable publishing, metadata and editor interaction', async () => {
  for (const props of [{ readOnly: true }, { saving: true }]) {
    await mount(props)
    assert.equal(document.querySelector('#article-title').disabled, true)
    assert.equal(document.querySelector('#f-author').disabled, true)
    assert.equal(document.querySelector('[contenteditable]').getAttribute('contenteditable'), 'false')
    for (const button of document.querySelectorAll('.article-composer__actions button, .article-editor__toolbar button')) assert.equal(button.disabled, true)
  }
})

test('failed save retains local working copy and navigation warning', async () => {
  localStorage.setItem(key, JSON.stringify({ version: 1, savedAt: '2026-09-05T12:00:00Z', form: { ...initial, title: 'Travail à conserver' } }))
  await mount({ failSave: true })
  await click('Restaurer')
  await click('Publier')
  assert.equal(JSON.parse(localStorage.getItem(key)).form.title, 'Travail à conserver')
  assert.equal(document.querySelector('.article-composer__status').textContent, 'Brouillon')
  const unload = new window.Event('beforeunload', { cancelable: true })
  window.dispatchEvent(unload)
  assert.equal(unload.defaultPrevented, true)
})
