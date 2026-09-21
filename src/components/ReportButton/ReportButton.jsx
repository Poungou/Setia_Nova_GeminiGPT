import { useEffect, useId, useRef, useState } from 'react'
import { sendReport } from '../../lib/moderationApi.js'
import './ReportButton.css'

const REASONS = [
  ['shocking', 'Contenu choquant'],
  ['no_permission', 'Image sans autorisation'],
  ['other', 'Autre'],
]

// Bouton discret « Signaler » en bas d'une fiche publique de COMPTE (le canon n'en
// a pas : le serveur ne pose `reportable` que sur le contenu d'un compte, et
// refuserait de toute façon un signalement sur le canon). Le signalement est
// limité et vérifié côté serveur ; la fiche reste visible tant que l'équipe
// ne l'a pas relue.
export default function ReportButton({ contentType, record }) {
  const dialogRef = useRef(null)
  const openerRef = useRef(null)
  const titleId = useId()
  const errorId = useId()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  if (!record?.reportable || !record.id) return null

  const close = () => {
    setOpen(false)
    setError('')
    openerRef.current?.focus()
  }

  const submit = async (event) => {
    event.preventDefault()
    if (busy) return
    if (!reason) {
      setError('Choisis un motif avant d’envoyer.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await sendReport({ contentType, contentId: record.id, reason })
      setSent(true)
    } catch (e) {
      setError(e.status === 404 ? 'Cette fiche n’est plus disponible.' : String(e.message || 'Le signalement n’a pas pu être envoyé.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <aside className="report" aria-label="Signaler cette fiche">
      <div className="report__row">
        <p className="report__text">Un problème avec cette fiche ?</p>
        <button type="button" ref={openerRef} className="btn report__open" onClick={() => { setSent(false); setReason(''); setOpen(true) }}>Signaler</button>
      </div>
      {/* Résultat gardé sur la page après la fermeture de la fenêtre. */}
      <p className="report__done" role="status">{sent && !open ? 'Merci : ton signalement a été transmis à l’équipe.' : ''}</p>

      <dialog ref={dialogRef} className="report__dialog" aria-labelledby={titleId} onCancel={(e) => { e.preventDefault(); close() }} onClick={(e) => { if (e.target === dialogRef.current) close() }}>
        {sent ? (
          <div className="report__panel">
            <h2 id={titleId} className="report__title">Signalement envoyé</h2>
            <p className="report__text" role="status">Merci : ton signalement a été transmis à l’équipe. La fiche sera relue.</p>
            <div className="report__actions"><button type="button" className="btn btn-primary" onClick={close}>Fermer</button></div>
          </div>
        ) : (
          <form className="report__panel" onSubmit={submit} noValidate>
            <h2 id={titleId} className="report__title">Signaler cette fiche</h2>
            <fieldset className="report__reasons" aria-describedby={error ? errorId : undefined}>
              <legend className="visually-hidden">Motif du signalement</legend>
              {REASONS.map(([value, label]) => (
                <label key={value} className="report__reason">
                  <input type="radio" name="report-reason" value={value} checked={reason === value} onChange={() => { setReason(value); setError('') }} />
                  <span className="report__rad" aria-hidden="true" />
                  {label}
                </label>
              ))}
            </fieldset>
            {error && <p id={errorId} className="report__error" role="alert">{error}</p>}
            <div className="report__actions">
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Envoi…' : 'Envoyer'}</button>
              <button type="button" className="btn" onClick={close}>Annuler</button>
            </div>
          </form>
        )}
      </dialog>
    </aside>
  )
}
