import { articleHtml, isSafeArticleUrl } from '../../components/ArticleEditor/articleContent.js'
import { imgCredit, imgSrc } from '../../lib/image.js'

const countWords = (value) => (value || '').trim().split(/\s+/).filter(Boolean).length
const textWords = (element) => countWords(element.textContent)

// A read-only projection of the saved body. Never serialize this back to the editor.
export function composeGazette(post) {
  const template = document.createElement('template')
  template.innerHTML = articleHtml(post.body)
  const root = template.content
  const paragraphs = [...root.querySelectorAll('p')].filter((p) => p.textContent.trim() && !p.closest('blockquote, aside, figure, li'))
  const words = paragraphs.reduce((total, p) => total + textWords(p), 0)
  const long = words >= 360 && paragraphs.length >= 4
  paragraphs[0]?.classList.add('gazette-dropcap')

  root.querySelectorAll('blockquote, aside, .rp-note').forEach((element) => {
    const note = element.matches('aside, .rp-note') || /^(à retenir|note de la rédaction)\b/i.test(element.textContent.trim())
    element.classList.add(note ? 'gazette-note' : 'gazette-quotation')
    if (!note && textWords(element) <= 70) element.classList.add('gazette-quotation--aside')
  })

  const image = post.cover || post.gallery?.[0]
  const src = imgSrc(image)
  if (isSafeArticleUrl(src, true) && ![...root.querySelectorAll('img')].some((img) => img.getAttribute('src') === src)) {
    const figure = document.createElement('figure')
    figure.className = 'gazette-illustration gazette-illustration--main'
    const img = document.createElement('img')
    img.src = src
    img.alt = typeof image === 'object' ? image.alt || '' : ''
    figure.append(img)
    const caption = typeof image === 'object' ? image.caption || image.label || '' : ''
    const credit = imgCredit(image)
    if (caption || credit) {
      const legend = document.createElement('figcaption')
      if (caption) legend.append(document.createTextNode(caption))
      if (credit) {
        const source = document.createElement('span')
        source.className = 'gazette-image-credit'
        source.textContent = `Crédit : ${credit}`
        legend.append(source)
      }
      figure.append(legend)
    }
    if (post.category !== 'fan-art' && paragraphs[0]?.parentNode === root) paragraphs[0].after(figure)
    else root.prepend(figure)
  }

  // Keep every block in its original reading order. A central illustration may span
  // the sheet, separating two runs of columns rather than being a giant hero image.
  const sections = []
  let run = []
  let precedingWords = 0
  let spreadUsed = false
  const elements = [...root.children]
  const proseWords = (element) => element.matches('figure, blockquote, aside') ? 0 : textWords(element)
  const totalWords = elements.reduce((sum, element) => sum + proseWords(element), 0)
  const flush = () => {
    if (!run.length) return
    const runWords = run.reduce((sum, element) => sum + proseWords(element), 0)
    sections.push({ kind: 'flow', columns: long && runWords >= 180, html: run.map((element) => element.outerHTML).join('') })
    run = []
  }
  // Preserve bare text nodes from legacy HTML, too.
  for (const node of [...root.childNodes]) {
    if (node.nodeType === 3 && node.textContent.trim()) {
      const paragraph = document.createElement('p')
      paragraph.textContent = node.textContent
      node.replaceWith(paragraph)
    }
  }
  for (const element of [...root.children]) {
    const figure = element.matches('figure') && !element.classList.contains('gazette-illustration--main')
    const explicitWide = figure && element.matches('.full-width, [data-align="wide"]')
    const automaticWide = figure && long && !spreadUsed && precedingWords >= 120 && totalWords - precedingWords >= 120 && !element.matches('.align-left, .align-right, [data-align="left"], [data-align="right"]')
    if (explicitWide || automaticWide) {
      flush()
      sections.push({ kind: 'illustration', html: element.outerHTML })
      spreadUsed = true
    } else run.push(element)
    precedingWords += proseWords(element)
  }
  flush()
  return { long, words, sections }
}
