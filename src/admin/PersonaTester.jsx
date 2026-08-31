// src/admin/PersonaTester.jsx
//
// Bloc « Tester la Persona » affiché sous le formulaire d'édition, pour les
// fiches déjà enregistrées de la collection `personas`. Réutilise le même
// <ChatWidget> que le site public, en mode testMode (contourne le champ
// « IA activée » côté serveur — voir plugins/woltar-ai.js).

import ChatWidget from '../components/ChatWidget/ChatWidget.jsx'
import { useAdmin } from './useAdmin.js'

export default function PersonaTester({ personaId }) {
  const { data } = useAdmin()
  const persona = (data?.personas || []).find((p) => p.id === personaId)
  const character = persona ? (data?.characters || []).find((c) => c.id === persona.characterId) : null

  return (
    <section className="adm-fieldset">
      <h2 className="eyebrow">Tester la Persona</h2>
      {!persona ? (
        <p className="adm-muted">Enregistre la fiche pour pouvoir la tester.</p>
      ) : !character ? (
        <p className="adm-muted">
          Associe un personnage (champ « Personnage associé »), enregistre, puis reviens ici pour tester.
        </p>
      ) : (
        <>
          <p className="adm-hint">
            Ce test appelle l’IA en conditions réelles avec la configuration enregistrée ci-dessus, même si « IA
            activée » est sur Désactivée — la conversation n’est visible qu’ici, jamais sur le site public.
          </p>
          <ChatWidget persona={persona} character={character} testMode variant="inline" />
        </>
      )}
    </section>
  )
}
