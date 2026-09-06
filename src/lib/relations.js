// src/lib/relations.js
//
// Vocabulaire partagé pour qualifier une relation entre deux personnages.
// Utilisé à la fois par l'admin (src/admin/Fields.jsx, éditeur de
// `character.relations`) et par le rendu public du sociogramme
// (src/components/RelationGraph/RelationGraph.jsx), pour que les deux
// emploient exactement les mêmes libellés.
//
// `nature` et `intensity` sont deux champs FACULTATIFS ajoutés à chaque
// relation ({ characterId, type, description, nature, intensity }) — aucune
// donnée existante n'a été modifiée pour leur donner une valeur : tant
// qu'ils ne sont pas renseignés depuis l'admin, le sociogramme se contente
// de classer le lien à partir du texte déjà présent dans `type` (ex.
// "Frère jumeau" → Famille) plutôt que d'inventer une nature émotionnelle
// qui n'a jamais été donnée par l'utilisatrice.

export const RELATION_NATURES = [
  'Famille',
  'Confiance',
  'Protection',
  'Admiration',
  'Rivalité',
  'Tension',
  'Distance',
  'Trahison',
]

export const RELATION_INTENSITIES = ['faible', 'moyen', 'fort']

// Regroupe les relations de tous les membres en arêtes non orientées,
// en conservant les deux sens séparément pour afficher les deux libellés.
export function collectEdges(members) {
  const ids = new Set(members.map((m) => m.id))
  const map = new Map()
  members.forEach((m) => {
    ;(m.relations || []).forEach((rel) => {
      if (!rel.characterId || rel.characterId === m.id || !ids.has(rel.characterId)) return
      const key = [m.id, rel.characterId].sort().join('::')
      const entry = map.get(key) || { key, a: [m.id, rel.characterId].sort()[0], b: [m.id, rel.characterId].sort()[1], fromA: null, fromB: null }
      if (m.id === entry.a) entry.fromA = rel
      else entry.fromB = rel
      map.set(key, entry)
    })
  })
  return [...map.values()]
}

// Catégories proposées par l'éditeur visuel de liens du clan (Bloc C, voir
// src/components/ClanComposer/ClanComposer.jsx) — un confort de
// saisie, PAS un second système de données : choisir une catégorie ne fait
// que pré-remplir `type` (et `nature`) des DEUX côtés de la relation dans
// `character.relations[]`, exactement le même champ que l'éditeur historique
// (RelationsInput dans src/admin/Fields.jsx). Le texte reste entièrement
// modifiable ensuite — une catégorie ne verrouille jamais un libellé, elle
// propose juste un point de départ cohérent (et son réciproque, pour éviter
// d'avoir à écrire la relation deux fois avec deux libellés différents).
// "Autre" laisse les deux libellés vides, à écrire librement.
export const RELATION_LINK_TYPES = [
  { id: 'famille', label: 'Famille', reciprocal: 'Famille', nature: 'Famille' },
  { id: 'parent', label: 'Parent', reciprocal: 'Enfant', nature: 'Famille' },
  { id: 'enfant', label: 'Enfant', reciprocal: 'Parent', nature: 'Famille' },
  { id: 'fratrie', label: 'Frère/sœur', reciprocal: 'Frère/sœur', nature: 'Famille' },
  { id: 'couple', label: 'Couple', reciprocal: 'Couple', nature: 'Confiance' },
  { id: 'amitie', label: 'Amitié', reciprocal: 'Amitié', nature: 'Confiance' },
  { id: 'rivalite', label: 'Rivalité', reciprocal: 'Rivalité', nature: 'Rivalité' },
  { id: 'mentor', label: 'Mentor', reciprocal: 'Protégé', nature: 'Protection' },
  { id: 'protege', label: 'Protégé', reciprocal: 'Mentor', nature: 'Protection' },
  { id: 'ennemi', label: 'Ennemi', reciprocal: 'Ennemi', nature: 'Tension' },
  { id: 'autre', label: 'Autre', reciprocal: '', nature: '' },
]

// Calcule le prochain tableau `relations` d'UN personnage après ajout ou
// modification du lien vers `otherId` — fonction pure (aucun appel réseau,
// ne mute pas `relations`), utilisée par ClanComposer pour écrire le même
// lien des deux côtés en une seule action (voir ClanRelationsBlock). En
// édition (`keepExtras: true`, par défaut), la description/nature/intensité
// déjà renseignées côté admin sont conservées ; seul `type` change. En
// création, ces champs repartent vides plutôt que d'hériter d'une relation
// précédente sans rapport.
export function upsertRelation(relations, otherId, type, { keepExtras = true } = {}) {
  const list = Array.isArray(relations) ? relations : []
  const previous = list.find((r) => r.characterId === otherId)
  const next = {
    characterId: otherId,
    type,
    description: keepExtras ? previous?.description || '' : '',
    nature: keepExtras && previous?.nature ? previous.nature : '',
    intensity: keepExtras && previous?.intensity ? previous.intensity : '',
  }
  return [...list.filter((r) => r.characterId !== otherId), next]
}

// Retire le lien vers `otherId` du tableau `relations` d'un personnage —
// pendant utilisé pour supprimer un lien des deux côtés à la fois.
export function removeRelation(relations, otherId) {
  const list = Array.isArray(relations) ? relations : []
  return list.filter((r) => r.characterId !== otherId)
}
