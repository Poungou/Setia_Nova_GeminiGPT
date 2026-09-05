import test from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('', { url: 'https://woltar.test' })
globalThis.window = dom.window
globalThis.document = dom.window.document
const { composeGazette } = await import('./gazetteLayout.js')
const paragraph = (label) => `<p>${label} ${'chronique '.repeat(100)}</p>`
const fragment = (layout) => JSDOM.fragment(layout.sections.map((section) => section.html).join(''))

test('short articles stay single-column and long prose enables columns', () => {
  assert.equal(composeGazette({ body: '<p>Une note brève.</p>' }).sections[0].columns, false)
  const layout = composeGazette({ body: [1, 2, 3, 4].map(paragraph).join('') })
  assert.equal(layout.long, true)
  assert.equal(layout.sections[0].columns, true)
  assert.equal(fragment(layout).querySelectorAll('.gazette-dropcap').length, 1)
})

test('cover is integrated after the opening, preserves real captions, and never mutates saved content', () => {
  const post = { category: 'news', body: '<p>Ouverture.</p><p>Suite.</p>', cover: { src: '/art.webp', caption: '<b>Illustration</b>', credit: 'Alice' } }
  const original = JSON.stringify(post)
  const result = fragment(composeGazette(post))
  assert.deepEqual([...result.children].map((node) => node.tagName), ['P', 'FIGURE', 'P'])
  assert.equal(result.querySelector('figcaption b'), null)
  assert.match(result.querySelector('figcaption').textContent, /Illustration/)
  assert.match(result.querySelector('.gazette-image-credit').textContent, /Alice/)
  assert.equal(JSON.stringify(post), original)
  assert.equal(fragment(composeGazette({ ...post, category: 'fan-art' })).firstElementChild.tagName, 'FIGURE')
})

test('existing cover images are not duplicated and unsafe body markup is removed', () => {
  const result = fragment(composeGazette({ cover: '/art.webp', body: '<p>Texte</p><figure><img src="/art.webp" onerror="alert(1)"></figure><script>alert(1)</script>' }))
  assert.equal(result.querySelectorAll('img').length, 1)
  assert.equal(result.querySelector('[onerror], script'), null)
  assert.equal(fragment(composeGazette({ body: '<p>Texte</p>', cover: 'javascript:alert(1)' })).querySelector('img'), null)
})

test('an interior illustration spans sections without dropping or reordering text', () => {
  const body = paragraph('A') + paragraph('B') + '<figure><img src="/inside.webp"><figcaption>Au port</figcaption></figure>' + paragraph('C') + paragraph('D')
  const layout = composeGazette({ body })
  assert.deepEqual(layout.sections.map((section) => section.kind), ['flow', 'illustration', 'flow'])
  assert.deepEqual([...fragment(layout).querySelectorAll('p')].map((p) => p.textContent.trim()[0]), ['A', 'B', 'C', 'D'])
  assert.equal(fragment(layout).querySelector('figcaption').textContent, 'Au port')
})

test('editorial notes are identified from existing content only', () => {
  const result = fragment(composeGazette({ body: '<blockquote><p>À retenir : le port est ouvert.</p></blockquote><p>Introduction.</p><blockquote><p>Une voix au loin.</p></blockquote>' }))
  assert.equal(result.querySelectorAll('.gazette-note').length, 1)
  assert.equal(result.querySelectorAll('.gazette-quotation--aside').length, 1)
  assert.equal(result.querySelector('.gazette-dropcap').textContent, 'Introduction.')
})
