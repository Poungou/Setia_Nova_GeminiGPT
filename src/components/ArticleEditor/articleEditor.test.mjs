import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://woltar.test', pretendToBeVisual: true })
for (const name of ['window', 'document', 'Node', 'HTMLElement', 'Element', 'MutationObserver', 'DOMParser', 'getComputedStyle']) {
  Object.defineProperty(globalThis, name, { value: dom.window[name], configurable: true })
}
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window)
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window)
const { Editor } = await import('@tiptap/core')
const { articleExtensions } = await import('./editorExtensions.js')
const { articleHtml, articleText, isSafeArticleUrl, sanitizeArticleHtml } = await import('./articleContent.js')
const instances = []
function editor(body = '', overrides = {}) {
  const instance = new Editor({ element: document.createElement('div'), extensions: articleExtensions(), content: articleHtml(body), ...overrides })
  instances.push(instance)
  return instance
}
after(() => { instances.forEach((instance) => instance.destroy()); dom.window.close() })

test('legacy Markdown is displayed visually without emitting a body rewrite on open or selection', async () => {
  const original = '## Ancien article\n\nDu **texte** et un [lien](https://example.com).\n\n- Une ligne\n- Deux lignes'
  let persisted = original
  let updates = 0
  const instance = editor(original, { onUpdate: ({ editor }) => { updates++; persisted = editor.getHTML() } })
  await new Promise((resolve) => setTimeout(resolve, 5))
  assert.match(instance.getHTML(), /<h2>Ancien article<\/h2>/)
  assert.match(instance.getHTML(), /<strong>texte<\/strong>/)
  instance.commands.setTextSelection(3)
  assert.equal(updates, 0)
  assert.equal(persisted, original)
  instance.commands.insertContent('nouveau ')
  assert.equal(updates, 1)
  assert.match(persisted, /nouveau/)
})

test('headings, bold, italic, quotes, lists, separators and history use actual editor commands', () => {
  const instance = editor('Un récit')
  instance.commands.selectAll()
  instance.commands.toggleBold()
  instance.commands.toggleItalic()
  assert.match(instance.getHTML(), /<strong><em>Un récit<\/em><\/strong>/)
  instance.commands.setHeading({ level: 2 })
  assert.match(instance.getHTML(), /<h2>/)
  instance.commands.toggleBlockquote()
  assert.match(instance.getHTML(), /<blockquote>/)
  instance.commands.toggleBlockquote()
  instance.commands.setParagraph()
  instance.commands.toggleBulletList()
  assert.match(instance.getHTML(), /<ul><li>/)
  instance.commands.toggleOrderedList()
  assert.match(instance.getHTML(), /<ol><li>/)
  instance.commands.setTextSelection(instance.state.doc.content.size - 1)
  instance.commands.setHorizontalRule()
  assert.match(instance.getHTML(), /<hr>/)
  assert.equal(instance.commands.undo(), true)
  assert.equal(instance.commands.redo(), true)
  assert.match(instance.getHTML(), /<hr>/)
})

test('figure image, alt text and caption survive save/reopen and caption remains plain text', () => {
  const instance = editor('Le récit')
  instance.commands.insertContent({ type: 'articleFigure', attrs: { src: '/media/portrait.webp', alt: 'Un portrait', caption: 'Dessin © Nova <script>alert(1)</script>' } })
  const html = instance.getHTML()
  assert.match(html, /<figure><img src="\/media\/portrait.webp" alt="Un portrait"><figcaption>/)
  assert.match(html, /&lt;script&gt;/)
  const reopened = editor(html)
  let figure
  reopened.state.doc.descendants((node) => { if (node.type.name === 'articleFigure') figure = node })
  assert.equal(figure.attrs.caption, 'Dessin © Nova <script>alert(1)</script>')
  assert.equal(figure.attrs.src, '/media/portrait.webp')
  assert.equal(figure.attrs.alt, 'Un portrait')
})

test('existing Markdown tables, code, inline images and links survive an unrelated text edit', () => {
  const instance = editor('| Lieu | Nom |\n| --- | --- |\n| Port | Nova |\n\n```js\nconst x = 1\n```\n\n![Image](https://example.com/a.webp)\n\n[Une page](/journal)')
  instance.commands.insertContent('Un ajout')
  const result = editor(instance.getHTML()).getHTML()
  assert.match(result, /<table/)
  assert.match(result, /Port/)
  assert.match(result, /<pre><code/)
  assert.match(result, /src="https:\/\/example.com\/a.webp"/)
  assert.match(result, /href="\/journal"/)
})

test('links are editable and dangerous schemes cannot be inserted by link commands', () => {
  const instance = editor('Visiter Woltar')
  instance.commands.selectAll()
  instance.commands.setLink({ href: 'https://example.com' })
  assert.match(instance.getHTML(), /href="https:\/\/example.com"/)
  instance.commands.unsetLink()
  instance.commands.setLink({ href: 'javascript:alert(1)' })
  assert.doesNotMatch(instance.getHTML(), /href=/)
})

test('import, paste and public rendering reject scripts, handlers and unsafe media/link URLs', () => {
  const hostile = '<script>alert(1)</script><p onclick="alert(1)">Texte</p><a href="javascript:alert(1)">Lien</a><figure><img src="data:image/svg+xml,bad" onerror="alert(1)"><figcaption>Légende</figcaption></figure><img src="//tracking.test/a"><iframe src="https://evil.test"></iframe>'
  for (const result of [sanitizeArticleHtml(hostile), articleHtml(hostile), editor(hostile).getHTML()]) {
    assert.doesNotMatch(result, /<script|onclick|onerror|javascript:|data:image|\/\/tracking|<iframe/)
    assert.match(result, /Texte/)
  }
})

test('URL validation accepts only supported absolute and site-local forms', () => {
  for (const value of ['https://example.com/a.webp', 'http://example.com', '/media/image.webp']) assert.equal(isSafeArticleUrl(value, true), true, value)
  for (const value of ['javascript:alert(1)', 'data:image/png;base64,a', '//example.com', '/\\example.com', 'https://', 'https://a.test/\nx', 'file:///a']) assert.equal(isSafeArticleUrl(value, true), false, value)
  assert.equal(isSafeArticleUrl('mailto:nova@example.com'), true)
  assert.equal(isSafeArticleUrl('#chapitre'), true)
  assert.equal(isSafeArticleUrl('#chapitre', true), false)
})

test('excerpt and reading count receive decoded plain text from both formats', () => {
  assert.equal(articleText('<h2>Une &amp; deux</h2><p><strong>Histoires</strong> vivantes.</p><figure><img src="/a.webp"><figcaption>Crédit Nova</figcaption></figure>'), 'Une & deux Histoires vivantes. Crédit Nova')
  assert.equal(articleText('## Un titre\n\nUne **histoire**.'), 'Un titre Une histoire.')
})

test('external reset is silent and read-only mode disables contenteditable', () => {
  let updates = 0
  const instance = editor('Avant', { onUpdate: () => updates++ })
  instance.commands.setContent(articleHtml('Après'), { emitUpdate: false })
  assert.equal(updates, 0)
  instance.setEditable(false)
  assert.equal(instance.isEditable, false)
  assert.equal(instance.view.dom.getAttribute('contenteditable'), 'false')
  instance.setEditable(true)
  assert.equal(instance.isEditable, true)
})
