import { Node, mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { TableKit } from '@tiptap/extension-table'
import Placeholder from '@tiptap/extension-placeholder'
import { isSafeArticleUrl } from './articleContent.js'

// A figure is a single selectable block. Its caption is editable with the image panel.
export const ArticleFigure = Node.create({
  name: 'articleFigure',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: '', parseHTML: (element) => element.querySelector('img')?.getAttribute('src') || '' },
      alt: { default: '', parseHTML: (element) => element.querySelector('img')?.getAttribute('alt') || '' },
      caption: { default: '', parseHTML: (element) => element.querySelector('figcaption')?.textContent || '' },
    }
  },
  parseHTML() { return [{ tag: 'figure', getAttrs: (element) => Boolean(element.querySelector('img')) && null }] },
  renderHTML({ node }) {
    const { src, alt, caption } = node.attrs
    return ['figure', {}, ['img', { src: isSafeArticleUrl(src, true) ? src : '', alt }], ...(caption ? [['figcaption', {}, caption]] : [])]
  },
})

export function articleExtensions() {
  return [
    StarterKit.configure({
      // Appending a paragraph on mount would emit an update and rewrite legacy body content.
      trailingNode: false,
      link: {
        openOnClick: false,
        defaultProtocol: 'https',
        isAllowedUri: (url) => isSafeArticleUrl(url),
        HTMLAttributes: { target: null, rel: 'noopener noreferrer' },
      },
    }),
    Image.extend({
      renderHTML({ HTMLAttributes }) {
        return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          src: isSafeArticleUrl(HTMLAttributes.src, true) ? HTMLAttributes.src : '',
        })]
      },
    }).configure({ allowBase64: false }),
    ArticleFigure,
    // Existing Markdown tables remain editable when an older article is opened.
    TableKit,
    Placeholder.configure({ placeholder: 'Une histoire commence ici…' }),
  ]
}
