import './AetherAbout.css'

export default function AetherAbout() {
  return <footer className="aether-about">
    <p>Aether · Propulsé par GPT-5.6 Luna · réponses générées par IA</p>
    <details><summary>À propos d’Aether</summary>
      <p>Aether est une intelligence artificielle utilisant GPT-5.6 Luna. Il répond uniquement par texte et peut se tromper : vérifie les informations auprès des joueurs concernés.</p>
      <p>Pour te répondre, il reçoit tes messages récents et des résumés publics des personnages, clans et lieux du site, ainsi que le personnage consulté lorsque ce contexte est transmis. Les fiches RP et autres contenus publics ou autorisés peuvent nourrir ce contexte ; actuellement, les profils joueurs, les chronologies et les données privées de compte n’y sont pas ajoutés.</p>
      <p>La discussion reste en mémoire dans cette page et disparaît lorsque tu la quittes ou la recharges. Le site ne conserve pas de transcript sur son serveur et ne propose aucun historique à l’administration.</p>
      <p>Les messages transitent par le serveur du site et OpenAI pour produire une réponse. Ce n’est pas un chiffrement de bout en bout. Le stockage des réponses OpenAI est désactivé ; une conservation de sécurité propre au fournisseur peut subsister.</p>
    </details>
  </footer>
}
