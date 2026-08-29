// src/data/characters.js
//
// Source de vérité unique pour tous les personnages de Woltar.
// Ne JAMAIS coder un personnage en dur dans un composant : tout passe par ce fichier.
//
// Champs :
//   canon        "confirmed" (info vérifiée par la propriétaire) | "draft" (à développer)
//   status       "active" | "to-develop" | "deceased" | "archived"  (utilisé par les filtres)
//   traits[]     caractéristiques visuelles/physiques connues (peut rester vide)
//   relations[]  { characterId, type, description } — uniquement des liens confirmés
//   locations[]  ids de lieux associés (voir data/locations.js)
//   tags[]       utilisés par la recherche et les filtres
//
// Une valeur inconnue reste vide ("") plutôt qu'inventée : l'UI affiche alors "—".

export const characters = [
  {
    id: 'kazuko-nakamura',
    number: '01',
    firstName: 'Kazuko',
    lastName: 'Nakamura',
    nickname: '',
    title: 'Matriarche du clan Nakamura',
    clan: 'Nakamura',
    status: 'active',
    canon: 'confirmed',
    age: '',
    gender: '',
    species: '',
    origin: '',
    residence: 'Manoir de Sétia',
    occupation: 'Matriarche du clan Nakamura',
    traits: ['Pelage vert', 'Yeux cyan'],
    shortDescription: 'Matriarche du clan Nakamura.',
    character: '',
    appearance: 'Pelage vert, yeux cyan.',
    biography: '',
    relations: [
      {
        characterId: 'hachiro-nakamura',
        type: 'Frère jumeau',
        description: '',
      },
    ],
    locations: ['manoir-de-setia'],
    tags: ['Nakamura', 'Sétia', 'Famille', 'Principal'],
    gallery: [],
  },
  {
    id: 'hachiro-nakamura',
    number: '02',
    firstName: 'Hachiro',
    lastName: 'Nakamura',
    nickname: '',
    title: 'Le jumeau aux deux regards',
    clan: 'Nakamura',
    status: 'active',
    canon: 'confirmed',
    age: '',
    gender: '',
    species: '',
    origin: '',
    residence: 'Manoir de Sétia',
    occupation: '',
    traits: ['Hétérochromie'],
    shortDescription: 'Le jumeau aux deux regards.',
    character: '',
    appearance: 'Hétérochromie.',
    biography: '',
    relations: [
      {
        characterId: 'kazuko-nakamura',
        type: 'Sœur jumelle',
        description: '',
      },
    ],
    locations: ['manoir-de-setia'],
    tags: ['Nakamura', 'Sétia', 'Famille'],
    gallery: [],
  },
  {
    id: 'fudo-nakamura',
    number: '03',
    firstName: 'Fudo',
    lastName: 'Nakamura',
    nickname: '',
    title: 'Patron du Joyeux Lutin',
    clan: 'Nakamura',
    status: 'active',
    canon: 'confirmed',
    age: '~25 ans',
    gender: '',
    species: '',
    origin: '',
    residence: '',
    occupation: 'Patron du pub « Le Joyeux Lutin »',
    traits: ['Esthétique rouge feu'],
    shortDescription: 'Patron du Joyeux Lutin.',
    character: '',
    appearance: 'Esthétique rouge feu.',
    biography: '',
    relations: [
      {
        characterId: 'myo-nakamura',
        type: 'Fils',
        description: '',
      },
    ],
    locations: ['manoir-de-setia', 'joyeux-lutin'],
    tags: ['Nakamura', 'Joyeux Lutin', 'Famille'],
    gallery: [],
  },
  {
    id: 'calion',
    number: '04',
    firstName: 'Calion',
    lastName: '',
    nickname: '',
    title: "L'énigme violette",
    clan: '',
    status: 'to-develop',
    canon: 'draft',
    age: '',
    gender: '',
    species: '',
    origin: '',
    residence: '',
    occupation: '',
    traits: ['Identité visuelle violette'],
    shortDescription: "L'énigme violette. Entourage du clan Nakamura.",
    character: '',
    appearance: 'Identité visuelle violette.',
    biography: '',
    relations: [],
    locations: [],
    tags: ['Entourage Nakamura'],
    gallery: [],
  },
  {
    id: 'shizuka-nakamura',
    number: '05',
    firstName: 'Shizuka',
    lastName: 'Nakamura',
    nickname: '',
    title: "L'héritière d'une nouvelle génération",
    clan: 'Nakamura',
    status: 'to-develop',
    canon: 'draft',
    age: '',
    gender: '',
    species: '',
    origin: '',
    residence: 'Manoir de Sétia',
    occupation: '',
    traits: [],
    shortDescription: "L'héritière d'une nouvelle génération.",
    character: '',
    appearance: '',
    biography: '',
    relations: [],
    locations: ['manoir-de-setia'],
    tags: ['Nakamura', 'Sétia'],
    gallery: [],
  },
  {
    id: 'isil',
    number: '06',
    firstName: 'Isil',
    lastName: '',
    nickname: '',
    title: "L'éclat de dix-sept ans",
    clan: '',
    status: 'to-develop',
    canon: 'draft',
    age: '17 ans',
    gender: '',
    species: '',
    origin: '',
    residence: '',
    occupation: '',
    traits: [],
    shortDescription: "L'éclat de dix-sept ans. Entourage du clan Nakamura.",
    character: '',
    appearance: '',
    biography: '',
    relations: [],
    locations: [],
    tags: ['Entourage Nakamura'],
    gallery: [],
  },
  {
    id: 'myo-nakamura',
    number: '07',
    firstName: 'Myo',
    lastName: 'Nakamura',
    nickname: '',
    title: 'Le fils du Joyeux Lutin',
    clan: 'Nakamura',
    status: 'to-develop',
    canon: 'confirmed',
    age: '',
    gender: '',
    species: '',
    origin: '',
    residence: '',
    occupation: '',
    traits: [],
    shortDescription: 'Le fils du Joyeux Lutin.',
    character: '',
    appearance: '',
    biography: '',
    relations: [
      {
        characterId: 'fudo-nakamura',
        type: 'Père',
        description: '',
      },
    ],
    locations: ['joyeux-lutin'],
    tags: ['Nakamura', 'Joyeux Lutin', 'Famille'],
    gallery: [],
  },
]

export function getCharacterById(id) {
  return characters.find((c) => c.id === id)
}

export function getCharactersByStatus(status) {
  if (!status || status === 'all') return characters
  return characters.filter((c) => c.status === status)
}

// Construit les liens croisés (personnages qui référencent celui-ci en retour)
export function getRelationTargets(character) {
  return character.relations
    .map((rel) => ({ ...rel, character: getCharacterById(rel.characterId) }))
    .filter((rel) => Boolean(rel.character))
}
