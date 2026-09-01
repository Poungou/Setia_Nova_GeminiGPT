import { useEffect, useRef, useState } from 'react'
import { X, Send } from 'lucide-react'
import './ChatWidget.css'

const MAX_LOCAL_HISTORY = 20

// Widget de discussion générique, découplé de tout personnage ou Persona —
// il ne connaît que ce qu'on lui passe en props et une fonction
// `sendMessage(messages)` qui renvoie une promesse de réponse texte. Utilisé
// aujourd'hui uniquement par AETHER (voir src/pages/Aether/Aether.jsx et
// src/lib/aetherApi.js), variant="page" ; les variants "floating"/"inline"
// restent disponibles pour un futur usage similaire.
export default function ChatWidget({
  title,
  avatarSrc,
  avatarFocus,
  badge,
  greeting,
  sendMessage,
  variant = 'floating',
  onClose,
}) {
  const [messages, setMessages] = useState(() => (greeting ? [{ role: 'assistant', content: greeting }] : []))
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const logRef = useRef(null)

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  const send = async () => {
    const text = draft.trim()
    if (!text || sending) return
    setError('')
    const next = [...messages, { role: 'user', content: text }].slice(-MAX_LOCAL_HISTORY)
    setMessages(next)
    setDraft('')
    setSending(true)
    try {
      const reply = await sendMessage(next)
      setMessages((m) => [...m, { role: 'assistant', content: reply }].slice(-MAX_LOCAL_HISTORY))
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={`chat-widget chat-widget--${variant}`} role="dialog" aria-label={`Discussion avec ${title}`}>
      <header className="chat-widget__head">
        <div className="chat-widget__who">
          <span className="chat-widget__avatar" aria-hidden="true">
            {avatarSrc ? (
              <img src={avatarSrc} alt="" style={avatarFocus ? { objectPosition: avatarFocus } : undefined} />
            ) : (
              <span>{(title || '?').slice(0, 1).toUpperCase()}</span>
            )}
          </span>
          <div className="chat-widget__who-text">
            <strong>{title}</strong>
            {badge && <span className="chat-widget__badge">{badge}</span>}
          </div>
        </div>
        {onClose && (
          <button type="button" className="chat-widget__close" onClick={onClose} aria-label="Fermer la discussion">
            <X size={16} />
          </button>
        )}
      </header>

      <div className="chat-widget__log" ref={logRef}>
        {messages.length === 0 && <p className="chat-widget__empty">Écris un message pour commencer.</p>}
        {messages.map((m, i) => (
          <p key={i} className={`chat-widget__bubble chat-widget__bubble--${m.role}`}>
            {m.content}
          </p>
        ))}
        {sending && <p className="chat-widget__bubble chat-widget__bubble--assistant chat-widget__bubble--pending">…</p>}
      </div>

      {error && <p className="chat-widget__error">{error}</p>}

      <form
        className="chat-widget__form"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <textarea
          className="chat-widget__input"
          rows={1}
          placeholder="Écrire un message…"
          value={draft}
          maxLength={4000}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        <button type="submit" className="chat-widget__send" disabled={sending || !draft.trim()} aria-label="Envoyer">
          <Send size={15} />
        </button>
      </form>
    </div>
  )
}
