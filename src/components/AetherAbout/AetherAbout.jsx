import { useEffect, useRef, useState } from 'react'
import { Info, X } from 'lucide-react'
import './AetherAbout.css'

// Ancienne version : grand panneau <details> ouvert inline, qui prenait
// presque autant de place visuelle que le chat lui-même. Remplacé par un
// petit bouton qui ouvre un popover compact — le chat reste l'élément
// principal de la page (voir src/pages/Aether/Aether.jsx). La mention de
// transparence courte reste, elle, toujours visible.
export default function AetherAbout() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => e.key === 'Escape' && setOpen(false)
    const onPointerDown = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  return (
    <div className="aether-about" ref={panelRef}>
      <p className="aether-about__line">Aether · Propulsé par GPT-5.6 Luna · réponses générées par IA</p>
      <button
        type="button"
        className="aether-about__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="aether-about-panel"
      >
        <Info size={13} aria-hidden="true" />
        À propos d’Aether
      </button>

      {open && (
        <div id="aether-about-panel" className="aether-about__panel" role="dialog" aria-label="À propos d’Aether">
          <button type="button" className="aether-about__close" onClick={() => setOpen(false)} aria-label="Fermer">
            <X size={14} />
          </button>
          <p>Aether est une intelligence artificielle utilisant GPT-5.6 Luna. Il répond uniquement par texte et peut se tromper : vérifie les informations auprès des joueurs concernés.</p>
          <p>Pour te répondre, il reçoit tes messages récents et des résumés publics des personnages, clans et lieux du site, ainsi que le personnage consulté lorsque ce contexte est transmis. Les fiches RP et autres contenus publics ou autorisés peuvent nourrir ce contexte ; actuellement, les profils joueurs, les chronologies et les données privées de compte n’y sont pas ajoutés.</p>
          <p>La discussion reste en mémoire dans cette page et disparaît lorsque tu la quittes ou la recharges. Le site ne conserve pas de transcript sur son serveur et ne propose aucun historique à l’administration.</p>
          <p>Les messages transitent par le serveur du site et OpenAI pour produire une réponse. Ce n’est pas un chiffrement de bout en bout. Le stockage des réponses OpenAI est désactivé ; une conservation de sécurité propre au fournisseur peut subsister.</p>
        </div>
      )}
    </div>
  )
}

