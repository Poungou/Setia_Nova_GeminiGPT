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
