import { useEffect, useRef, useState } from 'react'
import { X, Send } from 'lucide-react'
import { sendPersonaMessage } from '../../lib/personaApi.js'
import { imgSrc, imgFocus } from '../../lib/image.js'
import './ChatWidget.css'

const MAX_LOCAL_HISTORY = 20

// Widget de discussion générique pour un « Woltarien IA ». Ne connaît rien
// de spécifique à un personnage précis : il reçoit une fiche Persona (+ la
// fiche personnage canonique associée, pour l'affichage) et parle au plugin
// woltar-ai. Réutilisé tel quel :
//   - sur une fiche personnage publique (variant="floating", bouton
//     « Parler avec… »)
//   - dans /admin, pour le bouton « Tester la Persona » (variant="inline",
//     testMode) avant de la publier
export default function ChatWidget({ persona, character, testMode = false, variant = 'floating', onClose }) {
  const displayName =
    persona.name || [character?.firstName, character?.lastName].filter(Boolean).join(' ') || character?.id || '…'

  const [messages, setMessages] = useState(() =>
    persona.greeting ? [{ role: 'assistant', content: persona.greeting }] : [],
  )
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
      const reply = await sendPersonaMessage(persona.id, next, { testMode })
      setMessages((m) => [...m, { role: 'assistant', content: reply }].slice(-MAX_LOCAL_HISTORY))
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setSending(false)
    }
  }

  const avatarSrc = imgSrc(persona.avatar)

  return (
    <div className={`chat-widget chat-widget--${variant}`} role="dialog" aria-label={`Discussion avec ${displayName}`}>
      <header className="chat-widget__head">
        <div className="chat-widget__who">
          <span className="chat-widget__avatar" aria-hidden="true">
            {avatarSrc ? (
              <img src={avatarSrc} alt="" style={{ objectPosition: imgFocus(persona.avatar) }} />
            ) : (
              <span>{displayName.slice(0, 1).toUpperCase()}</span>
            )}
          </span>
          <div className="chat-widget__who-text">
            <strong>{displayName}</strong>
            <span className="chat-widget__badge">
              Personnage interprété par IA{testMode ? ' · test admin' : ''}
            </span>
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
