// Claude outputs/test-relations.mjs
//
// Test réel (pas de mock) des fonctions pures ajoutées à src/lib/relations.js
// pour le Composeur de clan (Bloc C — éditeur visuel de liens, voir
// src/components/ClanComposer/ClanComposer.jsx) :
//   - RELATION_LINK_TYPES : intégrité du vocabulaire proposé par l'éditeur
//     (catégories demandées par l'utilisatrice, ids uniques, réciproques
//     cohérents)
//   - upsertRelation / removeRelation : le calcul du prochain tableau
//     `relations` d'un personnage, utilisé pour écrire un lien des DEUX
//     côtés en une seule action sans jamais dupliquer une entrée ni muter
//     le tableau d'origine (importe directement le vrai module, aucune
//     réimplémentation ici).
//
// Lancer : node "Claude outputs/test-relations.mjs"
import { RELATION_LINK_TYPES, removeRelation, upsertRelation } from '../src/lib/relations.js'

let passed = 0
let failed = 0
function assert(condition, label) {
  if (condition) {
    passed++
    console.log(`  OK  ${label}`)
  } else {
    failed++
    console.error(`  FAIL ${label}`)
  }
}

console.log('--- RELATION_LINK_TYPES (vocabulaire du Bloc C) ---')
{
  const expectedLabels = [
    'Famille', 'Parent', 'Enfant', 'Frère/sœur', 'Couple', 'Amitié',
    'Rivalité', 'Mentor', 'Protégé', 'Ennemi', 'Autre',
  ]
  assert(
    RELATION_LINK_TYPES.map((c) => c.label).join('|') === expectedLabels.join('|'),
    'contient exactement les catégories demandées, dans cet ordre',
  )
  const ids = RELATION_LINK_TYPES.map((c) => c.id)
  assert(new Set(ids).size === ids.length, 'tous les ids sont uniques')
  assert(
    RELATION_LINK_TYPES.every((c) => typeof c.label === 'string' && typeof c.reciprocal === 'string'),
    'chaque catégorie a un label et un réciproque (chaîne, éventuellement vide)',
  )
  const autre = RELATION_LINK_TYPES.find((c) => c.id === 'autre')
  assert(autre.reciprocal === '' && autre.nature === '', '« Autre » laisse le réciproque et la nature vides (texte libre)')

  const parent = RELATION_LINK_TYPES.find((c) => c.id === 'parent')
  const enfant = RELATION_LINK_TYPES.find((c) => c.id === 'enfant')
  assert(parent.reciprocal === 'Enfant' && enfant.reciprocal === 'Parent', 'Parent / Enfant sont bien réciproques l’un de l’autre')

  const couple = RELATION_LINK_TYPES.find((c) => c.id === 'couple')
  assert(couple.reciprocal === 'Couple', 'une catégorie symétrique (Couple) propose le même libellé des deux côtés')
}

console.log('--- upsertRelation ---')
{
  const empty = []
  const afterCreate = upsertRelation(empty, 'hachiro-nakamura', 'Frère jumeau')
  assert(empty.length === 0, 'ne mute pas le tableau d’entrée')
  assert(afterCreate.length === 1 && afterCreate[0].characterId === 'hachiro-nakamura', 'ajoute une nouvelle relation')
  assert(afterCreate[0].type === 'Frère jumeau', 'le type écrit est bien celui fourni')
  assert(afterCreate[0].description === '' && afterCreate[0].nature === '' && afterCreate[0].intensity === '', 'une création part sans extras hérités')

  const existing = [
    { characterId: 'hachiro-nakamura', type: 'Ancien lien', description: 'Notes RP existantes', nature: 'Confiance', intensity: 'fort' },
    { characterId: 'fudo-nakamura', type: 'Neveu', description: '', nature: '', intensity: '' },
  ]
  const edited = upsertRelation(existing, 'hachiro-nakamura', 'Frère jumeau')
  assert(existing[0].type === 'Ancien lien', 'ne mute pas les entrées existantes du tableau d’entrée')
  assert(edited.length === 2, 'une édition ne duplique pas l’entrée (toujours une seule relation vers ce personnage)')
  const editedEntry = edited.find((r) => r.characterId === 'hachiro-nakamura')
  assert(editedEntry.type === 'Frère jumeau', 'le type est mis à jour')
  assert(
    editedEntry.description === 'Notes RP existantes' && editedEntry.nature === 'Confiance' && editedEntry.intensity === 'fort',
    'par défaut (keepExtras), la description/nature/intensité déjà renseignées sont conservées',
  )
  assert(edited.find((r) => r.characterId === 'fudo-nakamura').type === 'Neveu', 'les autres relations du personnage restent inchangées')

  const editedNoExtras = upsertRelation(existing, 'hachiro-nakamura', 'Frère jumeau', { keepExtras: false })
  const noExtrasEntry = editedNoExtras.find((r) => r.characterId === 'hachiro-nakamura')
  assert(
    noExtrasEntry.description === '' && noExtrasEntry.nature === '' && noExtrasEntry.intensity === '',
    'keepExtras: false repart sans les anciens extras (comportement utilisé à la création d’un nouveau lien)',
  )

  assert(upsertRelation(null, 'x', 'Ami').length === 1, 'tolère un tableau `relations` absent (null) sans planter')
}

console.log('--- removeRelation ---')
{
  const relations = [
    { characterId: 'hachiro-nakamura', type: 'Frère jumeau' },
    { characterId: 'fudo-nakamura', type: 'Neveu' },
  ]
  const next = removeRelation(relations, 'hachiro-nakamura')
  assert(relations.length === 2, 'ne mute pas le tableau d’entrée')
  assert(next.length === 1 && next[0].characterId === 'fudo-nakamura', 'retire uniquement le lien demandé')
  assert(removeRelation(relations, 'personnage-absent').length === 2, 'ne rien retirer si le lien n’existe pas (no-op sûr)')
  assert(removeRelation(undefined, 'x').length === 0, 'tolère un tableau `relations` absent (undefined) sans planter')
}

console.log(`\n${passed} test(s) OK, ${failed} échec(s).`)
if (failed > 0) process.exit(1)
