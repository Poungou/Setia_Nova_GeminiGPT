import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { Bold, Italic, List, ListOrdered, Quote, Link2, ImagePlus, Minus, Undo2, Redo2, X, Upload } from 'lucide-react'
import { articleExtensions } from './editorExtensions.js'
import { articleHtml, isSafeArticleUrl, sanitizeArticleHtml } from './articleContent.js'
import { uploadImage } from '../../admin/adminApi.js'

export default function RichArticleEditor({ value, onChange, disabled, uploadEnabled }) {
  const lastValue = useRef(value)
  const change = useRef(onChange)
  change.current = onChange
  const [panel, setPanel] = useState(null)
  const [asset, setAsset] = useState({ url: '', alt: '', caption: '' })
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const editor = useEditor({
    extensions: articleExtensions(),
    content: articleHtml(value),
    editable: !disabled,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: { class: 'prose article-prose article-editor__canvas', role: 'textbox', 'aria-label': 'Corps de l’article', 'aria-multiline': 'true' },
      transformPastedHTML: sanitizeArticleHtml,
    },
    onUpdate: ({ editor: current }) => {
      const next = current.isEmpty ? '' : sanitizeArticleHtml(current.getHTML())
      lastValue.current = next
      change.current(next)
    },
  })

  useEffect(() => { editor?.setEditable(!disabled, false) }, [editor, disabled])
  useEffect(() => {
    if (editor && value !== lastValue.current) {
      editor.commands.setContent(articleHtml(value), { emitUpdate: false })
      lastValue.current = value
    }
  }, [editor, value])

  if (!editor) return <p className="adm-muted">Ouverture de la feuille…</p>

  const openPanel = (kind) => {
    const image = editor.getAttributes(editor.isActive('articleFigure') ? 'articleFigure' : 'image')
    setAsset(kind === 'image'
      ? { url: image.src || '', alt: image.alt || '', caption: image.caption || '' }
      : { url: editor.getAttributes('link').href || '', alt: '', caption: '' })
    setError('')
    setPanel(kind)
  }
  const closePanel = () => { setPanel(null); editor.commands.focus() }
  const insert = (event) => {
    event.preventDefault()
    if (disabled || uploading) return
    const url = asset.url.trim()
    if (!isSafeArticleUrl(url, panel === 'image')) {
      setError(panel === 'image' ? 'Utilisez une adresse https://… ou un chemin /media/…' : 'Utilisez une adresse https://…, /page ou mailto:…')
      return
    }
    if (panel === 'link') {
      if (editor.state.selection.empty && !editor.isActive('link')) {
        editor.chain().focus().insertContent({ type: 'text', text: url, marks: [{ type: 'link', attrs: { href: url } }] }).run()
      } else editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    } else {
      const attrs = { src: url, alt: asset.alt.trim(), caption: asset.caption.trim() }
      if (editor.isActive('articleFigure')) editor.chain().focus().updateAttributes('articleFigure', attrs).run()
      else editor.chain().focus().insertContent([{ type: 'articleFigure', attrs }, { type: 'paragraph' }]).run()
    }
    setPanel(null)
  }
  const pickImage = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || disabled || !uploadEnabled) return
    setUploading(true)
    setError('')
    try { setAsset((current) => ({ ...current, url: '' })); const url = await uploadImage(file); setAsset((current) => ({ ...current, url })) }
    catch (err) { setError(err.message || String(err)) }
    finally { setUploading(false) }
  }
  const button = (label, Icon, action, active = false, unavailable = false) => (
    <button key={label} type="button" title={label} aria-label={label} aria-pressed={active} disabled={disabled || unavailable}
      className={active ? 'is-active' : ''} onMouseDown={(event) => event.preventDefault()} onClick={action}><Icon size={17} /></button>
  )
  return (
    <div className="article-editor">
      <div className="article-editor__toolbar" role="toolbar" aria-label="Mise en forme de l’article">
        <select aria-label="Style du paragraphe" disabled={disabled} value={editor.isActive('heading') ? `h${editor.getAttributes('heading').level}` : 'p'}
          onChange={(event) => event.target.value === 'p' ? editor.chain().focus().setParagraph().run() : editor.chain().focus().setHeading({ level: Number(event.target.value.slice(1)) }).run()}>
          <option value="p">Paragraphe</option><option value="h2">Intertitre</option><option value="h3">Sous-titre</option>
          {editor.isActive('heading') && ![2, 3].includes(editor.getAttributes('heading').level) && <option value={`h${editor.getAttributes('heading').level}`}>Titre existant</option>}
        </select>
        <span className="article-editor__divider" />
        {button('Gras (Ctrl+B)', Bold, () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'))}
        {button('Italique (Ctrl+I)', Italic, () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'))}
        {button('Citation', Quote, () => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote'))}
        {button('Liste à puces', List, () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'))}
        {button('Liste numérotée', ListOrdered, () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'))}
        <span className="article-editor__divider" />
        {button('Insérer ou modifier un lien', Link2, () => openPanel('link'), editor.isActive('link'))}
        {button('Image et légende', ImagePlus, () => openPanel('image'), editor.isActive('articleFigure') || editor.isActive('image'))}
        {button('Séparateur', Minus, () => editor.chain().focus().setHorizontalRule().run())}
        <span className="article-editor__divider" />
        {button('Annuler', Undo2, () => editor.chain().focus().undo().run(), false, !editor.can().undo())}
        {button('Rétablir', Redo2, () => editor.chain().focus().redo().run(), false, !editor.can().redo())}
      </div>
      {panel && <form className="article-editor__insert" onSubmit={insert} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); closePanel() } }}>
        <div className="article-editor__insert-head"><strong>{panel === 'image' ? 'Une image dans le récit' : 'Ajouter un lien'}</strong><button type="button" className="adm-btn adm-btn--ghost" aria-label="Fermer le panneau" onClick={closePanel}><X size={16} /></button></div>
        <label>Adresse {panel === 'image' ? 'de l’image' : 'du lien'}<input autoFocus className="adm-input" value={asset.url} onChange={(event) => setAsset({ ...asset, url: event.target.value })} placeholder="https://…" disabled={disabled || uploading} /></label>
        {panel === 'image' && <>
          {uploadEnabled && <label className="adm-btn"><Upload size={15} />{uploading ? 'Envoi en cours…' : 'Importer une image'}<input type="file" accept="image/*" hidden disabled={disabled || uploading} onChange={pickImage} /></label>}
          {isSafeArticleUrl(asset.url, true) && <img className="article-editor__image-preview" src={asset.url} alt={asset.alt} />}
          <label>Description de l’image<input className="adm-input" value={asset.alt} placeholder="Pour les personnes qui ne peuvent pas voir l’image" onChange={(event) => setAsset({ ...asset, alt: event.target.value })} disabled={disabled} /></label>
          <label>Légende / crédit (facultatif)<input className="adm-input" value={asset.caption} onChange={(event) => setAsset({ ...asset, caption: event.target.value })} disabled={disabled} /></label>
        </>}
        {error && <p className="adm-error" role="alert">{error}</p>}
        <div className="article-editor__insert-actions">
          {panel === 'link' && editor.isActive('link') && <button type="button" className="adm-btn" disabled={disabled} onClick={() => { editor.chain().focus().extendMarkRange('link').unsetLink().run(); setPanel(null) }}>Retirer le lien</button>}
          <button type="button" className="adm-btn adm-btn--ghost" onClick={closePanel}>Annuler</button><button className="adm-btn adm-btn--primary" type="submit" disabled={disabled || uploading}>Appliquer</button>
        </div>
      </form>}
      <EditorContent editor={editor} />
      <div className="article-editor__foot">Sélectionnez du texte pour le mettre en forme. Cliquez sur une image puis sur <ImagePlus size={14} /> pour modifier sa légende.</div>
    </div>
  )
}
