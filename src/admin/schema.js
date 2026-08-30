// src/admin/schema.js
//
// Description déclarative de chaque collection : c'est ce qui pilote les
// formulaires de l'admin. Les clés correspondent EXACTEMENT aux champs des
// fichiers src/data/*.json.
//
// Types de champ : text | textarea | prose | number | select | tags | image
//                  | gallery | refs | relations
//   refs      -> liste d'ids pointant vers une autre collection (`ref`)
//   relations -> spécifique aux personnages : [{ characterId, type, description }]

import { slug } from './slug.js'

const STATUS = [
  ['active', 'Actif'],
  ['to-develop', 'À développer'],
  ['deceased', 'Décédé'],
  ['archived', 'Archivé'],
]
const CANON = [
  ['confirmed', 'Confirmé'],
  ['draft', 'Ébauche'],
]

export const SCHEMA = {
  characters: {
    label: 'Personnages',
    singular: 'personnage',
    icon: 'Users',
    order: 1,
    title: (r) => [r.firstName, r.lastName].filter(Boolean).join(' ') || r.title || r.id,
    subtitle: (r) => r.title || '',
    makeId: (r) => slug(`${r.firstName || ''} ${r.lastName || ''}`) || slug(r.title) || '',
    defaults: {
      number: '', firstName: '', lastName: '', nickname: '', title: '', clan: '',
      status: 'to-develop', canon: 'draft', age: '', gender: '', species: '',
      origin: '', residence: '', occupation: '', traits: [], shortDescription: '',
      character: '', appearance: '', biography: '', portrait: '', gallery: [],
      relations: [], locations: [], tags: [],
    },
    fields: [
      { key: 'number', label: 'Numéro', type: 'text', group: 'Identité' },
      { key: 'firstName', label: 'Prénom', type: 'text', group: 'Identité' },
      { key: 'lastName', label: 'Nom', type: 'text', group: 'Identité' },
      { key: 'nickname', label: 'Surnom', type: 'text', group: 'Identité' },
      { key: 'title', label: 'Titre / accroche', type: 'text', group: 'Identité' },
      { key: 'clan', label: 'Clan', type: 'text', group: 'Identité' },
      { key: 'status', label: 'Statut', type: 'select', options: STATUS, group: 'Identité' },
      { key: 'canon', label: 'Fiabilité', type: 'select', options: CANON, group: 'Identité' },
      { key: 'age', label: 'Âge', type: 'text', group: 'Identité' },
      { key: 'gender', label: 'Genre', type: 'text', group: 'Identité' },
      { key: 'species', label: 'Espèce', type: 'text', group: 'Identité' },
      { key: 'origin', label: 'Origine', type: 'text', group: 'Identité' },
      { key: 'residence', label: 'Résidence', type: 'text', group: 'Identité' },
      { key: 'occupation', label: 'Occupation', type: 'text', group: 'Identité' },
      { key: 'traits', label: 'Traits visuels', type: 'tags', group: 'Identité' },
      { key: 'shortDescription', label: 'Description courte', type: 'textarea', group: 'Textes' },
      { key: 'character', label: 'Caractère', type: 'textarea', group: 'Textes' },
      { key: 'appearance', label: 'Apparence', type: 'textarea', group: 'Textes' },
      { key: 'biography', label: 'Histoire', type: 'prose', group: 'Textes' },
      { key: 'portrait', label: 'Portrait', type: 'image', group: 'Images' },
      { key: 'gallery', label: 'Galerie', type: 'gallery', group: 'Images' },
      { key: 'locations', label: 'Lieux associés', type: 'refs', ref: 'locations', group: 'Liens' },
      { key: 'relations', label: 'Relations', type: 'relations', group: 'Liens' },
      { key: 'tags', label: 'Mots-clés (recherche)', type: 'tags', group: 'Liens' },
    ],
  },

  locations: {
    label: 'Lieux',
    singular: 'lieu',
    icon: 'MapPin',
    order: 2,
    title: (r) => r.name || r.id,
    subtitle: (r) => r.type || '',
    makeId: (r) => slug(r.name),
    defaults: {
      name: '', type: '', canon: 'draft', location: '', owner: '', faction: '',
      status: '', shortDescription: '', description: '', history: '', image: '',
      characters: [], events: [], gallery: [],
    },
    fields: [
      { key: 'name', label: 'Nom', type: 'text', group: 'Identité' },
      { key: 'type', label: 'Type', type: 'text', group: 'Identité' },
      { key: 'canon', label: 'Fiabilité', type: 'select', options: CANON, group: 'Identité' },
      { key: 'location', label: 'Situé à / dans', type: 'text', group: 'Identité' },
      { key: 'owner', label: 'Propriétaire', type: 'text', group: 'Identité' },
      { key: 'faction', label: 'Faction', type: 'text', group: 'Identité' },
      { key: 'status', label: 'Statut', type: 'text', group: 'Identité' },
      { key: 'shortDescription', label: 'Description courte', type: 'textarea', group: 'Textes' },
      { key: 'description', label: 'Description', type: 'prose', group: 'Textes' },
      { key: 'history', label: 'Histoire', type: 'prose', group: 'Textes' },
      { key: 'image', label: 'Image principale', type: 'image', group: 'Images' },
      { key: 'gallery', label: 'Galerie', type: 'gallery', group: 'Images' },
      { key: 'characters', label: 'Personnages associés', type: 'refs', ref: 'characters', group: 'Liens' },
    ],
  },

  clans: {
    label: 'Clans',
    singular: 'clan',
    icon: 'Shield',
    order: 3,
    title: (r) => r.name || r.id,
    subtitle: (r) => r.residence || '',
    makeId: (r) => slug(r.name),
    defaults: {
      name: '', canon: 'draft', emblem: '', description: '', history: '',
      residence: '', locations: [], members: [], events: [],
    },
    fields: [
      { key: 'name', label: 'Nom', type: 'text', group: 'Identité' },
      { key: 'canon', label: 'Fiabilité', type: 'select', options: CANON, group: 'Identité' },
      { key: 'residence', label: 'Résidence', type: 'text', group: 'Identité' },
      { key: 'emblem', label: 'Emblème', type: 'image', group: 'Images' },
      { key: 'description', label: 'Description', type: 'prose', group: 'Textes' },
      { key: 'history', label: 'Histoire', type: 'prose', group: 'Textes' },
      { key: 'members', label: 'Membres', type: 'refs', ref: 'characters', group: 'Liens' },
      { key: 'locations', label: 'Lieux', type: 'refs', ref: 'locations', group: 'Liens' },
    ],
  },

  events: {
    label: 'Chronologie',
    singular: 'événement',
    icon: 'CalendarClock',
    order: 4,
    title: (r) => r.title || r.id,
    subtitle: (r) => r.dateRP || '',
    makeId: (r) => slug(r.title),
    defaults: {
      title: '', dateRP: '', order: 0, description: '', characters: [],
      locations: [], image: '', importance: '', tags: [],
    },
    fields: [
      { key: 'title', label: 'Titre', type: 'text', group: 'Identité' },
      { key: 'dateRP', label: 'Date RP', type: 'text', group: 'Identité' },
      { key: 'order', label: 'Ordre d’affichage', type: 'number', group: 'Identité' },
      { key: 'importance', label: 'Importance', type: 'select', options: [['majeur', 'Majeur'], ['mineur', 'Mineur'], ['', '—']], group: 'Identité' },
      { key: 'description', label: 'Description', type: 'prose', group: 'Textes' },
      { key: 'image', label: 'Image', type: 'image', group: 'Images' },
      { key: 'characters', label: 'Personnages', type: 'refs', ref: 'characters', group: 'Liens' },
      { key: 'locations', label: 'Lieux', type: 'refs', ref: 'locations', group: 'Liens' },
      { key: 'tags', label: 'Mots-clés', type: 'tags', group: 'Liens' },
    ],
  },

  archives: {
    label: 'Archives RP',
    singular: 'archive',
    icon: 'ScrollText',
    order: 5,
    title: (r) => r.title || r.id,
    subtitle: (r) => [r.arc, r.dateRP].filter(Boolean).join(' · '),
    makeId: (r) => slug(`${r.arc || ''} ${r.title || ''}`),
    defaults: {
      arc: '', title: '', dateRP: '', characters: [], locations: [], text: '',
    },
    fields: [
      { key: 'arc', label: 'Arc / saga', type: 'text', group: 'Identité' },
      { key: 'title', label: 'Titre', type: 'text', group: 'Identité' },
      { key: 'dateRP', label: 'Date RP', type: 'text', group: 'Identité' },
      {
        key: 'text', label: 'Texte RP', type: 'prose', group: 'Textes',
        hint: 'Texte original de la propriétaire — ne jamais réécrire sans demande explicite.',
      },
      { key: 'characters', label: 'Personnages', type: 'refs', ref: 'characters', group: 'Liens' },
      { key: 'locations', label: 'Lieux', type: 'refs', ref: 'locations', group: 'Liens' },
    ],
  },
}

export const COLLECTION_NAMES = Object.keys(SCHEMA).sort(
  (a, b) => SCHEMA[a].order - SCHEMA[b].order,
)
