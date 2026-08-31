// src/admin/schema.js
//
// Description déclarative de chaque collection : c'est ce qui pilote les
// formulaires de l'admin. Les clés correspondent EXACTEMENT aux champs des
// fichiers src/data/*.json.
//
// Types de champ : text | textarea | prose | markdown | number | date | select
//                  | tags | image | gallery | refs | relations
//   refs      -> liste d'ids pointant vers une autre collection (`ref`)
//   relations -> spécifique aux personnages : [{ characterId, type, description }]

import { slug } from './slug.js'
import { POST_CATEGORIES } from '../data/posts.js'

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
const VISIBILITY = [
  ['published', 'Publié'],
  ['draft', 'Brouillon (caché du site)'],
]
const POST_CAT_OPTIONS = POST_CATEGORIES.map((c) => [c.value, c.label])
const PERSONA_ENABLED = [
  ['false', 'Désactivée (invisible sur le site, testable dans /admin)'],
  ['true', 'Activée (bouton « Parler avec… » visible sur la fiche)'],
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
      number: '', firstName: '', lastName: '', nickname: '', title: '', clan: '', clanId: '',
      status: 'to-develop', canon: 'draft', age: '', gender: '', species: '',
      origin: '', residence: '', occupation: '', traits: [], shortDescription: '',
      character: '', appearance: '', biography: '', quote: '', portrait: '', gallery: [],
      color: '', frameColor: '', relations: [], locations: [], tags: [], author: '', visibility: 'published',
      ownerUserId: 'system',
    },
    fields: [
      { key: 'visibility', label: 'Publication', type: 'select', options: VISIBILITY, group: 'Publication' },
      {
        key: 'ownerUserId', label: 'Proprietaire', type: 'text', group: 'Publication',
        hint: 'system = contenu historique/admin protege. Les comptes joueurs sont assignes cote serveur.',
      },
      {
        key: 'author', label: 'Auteur / joueur', type: 'text', group: 'Publication',
        hint: 'Laisse vide si c’est une fiche canon. Servira quand d’autres joueurs pourront proposer leurs persos.',
      },
      { key: 'number', label: 'Numéro', type: 'text', group: 'Identité' },
      { key: 'firstName', label: 'Prénom', type: 'text', group: 'Identité' },
      { key: 'lastName', label: 'Nom', type: 'text', group: 'Identité' },
      { key: 'nickname', label: 'Surnom', type: 'text', group: 'Identité' },
      { key: 'title', label: 'Titre / accroche', type: 'text', group: 'Identité' },
      { key: 'clan', label: 'Clan (texte affiché)', type: 'text', group: 'Identité' },
      {
        key: 'clanId', label: 'Clan (id de fiche)', type: 'text', group: 'Identité',
        hint: 'Id d’un clan de src/data/clans.json (ex. "nakamura"), pour lier proprement vers /clans/:id. Laisser vide si le clan n’a pas encore sa propre fiche — le nom en texte ci-dessus reste alors affiché sans lien.',
      },
      { key: 'status', label: 'Statut', type: 'select', options: STATUS, group: 'Identité' },
      { key: 'canon', label: 'Fiabilité', type: 'select', options: CANON, group: 'Identité' },
      { key: 'age', label: 'Âge', type: 'text', group: 'Identité' },
      { key: 'gender', label: 'Genre', type: 'text', group: 'Identité' },
      { key: 'species', label: 'Espèce', type: 'text', group: 'Identité' },
      { key: 'origin', label: 'Origine', type: 'text', group: 'Identité' },
      { key: 'residence', label: 'Résidence', type: 'text', group: 'Identité' },
      { key: 'occupation', label: 'Occupation', type: 'text', group: 'Identité' },
      { key: 'traits', label: 'Traits visuels', type: 'tags', group: 'Identité' },
      {
        key: 'color', label: 'Couleur du personnage', type: 'text', group: 'Identité',
        hint: 'Code hexadécimal (#RRGGBB), ex. #4dd8d0. Utilisée pour le cœur pixel-art de la vignette, et pour choisir automatiquement le cadre ci-dessous si "Cadre" est laissé sur Auto. Laisser vide si pas encore définie.',
      },
      {
        key: 'frameColor', label: 'Cadre (vignette)', type: 'select', group: 'Identité',
        options: [['', 'Auto (déduit de la couleur)'], ['bleu', 'Bleu'], ['gris', 'Gris'], ['rouge', 'Rouge'], ['violet', 'Violet']],
        hint: 'Illustration de cadre à utiliser sur la vignette personnage. Laisse sur Auto pour la déduire de la couleur ci-dessus, ou force un choix précis parmi les 4 illustrations disponibles.',
      },
      { key: 'shortDescription', label: 'Description courte', type: 'textarea', group: 'Textes' },
      {
        key: 'quote', label: 'Citation', type: 'textarea', group: 'Textes',
        hint: 'Petite citation affichée dans le hero de la fiche. Laisser vide si aucune n’est confirmée — jamais inventée.',
      },
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

  posts: {
    label: 'Journal',
    singular: 'billet',
    icon: 'PenLine',
    order: 0,
    title: (r) => r.title || r.id,
    subtitle: (r) => [r.category, r.date].filter(Boolean).join(' · '),
    makeId: (r) => slug(`${r.date || ''} ${r.title || ''}`) || slug(r.title),
    defaults: {
      title: '', category: 'fan-art', date: new Date().toISOString().slice(0, 10),
      excerpt: '', cover: '', body: '', gallery: [], characters: [], locations: [],
      tags: [], author: '', visibility: 'published',
    },
    fields: [
      { key: 'visibility', label: 'Publication', type: 'select', options: VISIBILITY, group: 'Publication' },
      { key: 'author', label: 'Auteur', type: 'text', group: 'Publication' },
      { key: 'title', label: 'Titre', type: 'text', group: 'Contenu' },
      { key: 'category', label: 'Catégorie', type: 'select', options: POST_CAT_OPTIONS, group: 'Contenu' },
      { key: 'date', label: 'Date', type: 'date', group: 'Contenu' },
      {
        key: 'excerpt', label: 'Accroche', type: 'textarea', group: 'Contenu',
        hint: 'Résumé court affiché sur la carte. Si vide, un extrait du texte est utilisé.',
      },
      { key: 'cover', label: 'Image de couverture', type: 'image', group: 'Contenu' },
      {
        key: 'body', label: 'Texte', type: 'markdown', group: 'Contenu',
        hint: 'Markdown : **gras**, *italique*, ## titre, - liste, [lien](url), ![image](url).',
      },
      { key: 'gallery', label: 'Galerie', type: 'gallery', group: 'Images' },
      { key: 'characters', label: 'Personnages liés', type: 'refs', ref: 'characters', group: 'Liens' },
      { key: 'locations', label: 'Lieux liés', type: 'refs', ref: 'locations', group: 'Liens' },
      { key: 'tags', label: 'Mots-clés', type: 'tags', group: 'Liens' },
    ],
  },

  // Compagnons IA ("Woltariens IA") — interprétation comportementale d'un
  // personnage existant, jamais un doublon de sa fiche canonique. `id` ==
  // `characterId` : une seule Persona par personnage pour l'instant (voir
  // src/data/personas.js). Le prompt réel envoyé à l'IA est construit côté
  // serveur par plugins/lib/personaPrompt.js, à partir de ces champs +
  // de la fiche personnage associée.
  personas: {
    label: 'Compagnons IA',
    singular: 'persona IA',
    icon: 'MessageCircle',
    order: 6,
    title: (r) => r.name || r.characterId || r.id,
    subtitle: (r) => (r.enabled === 'true' ? 'Activée' : 'Désactivée'),
    makeId: (r) => r.characterId || '',
    defaults: {
      characterId: '', name: '', enabled: 'false', avatar: '', greeting: '',
      personality: '', motivations: '', fears: '', likes: '', dislikes: '',
      speechStyle: '', creativity: 0.7, background: '', loreKnowledge: '',
      relationships: [], secrets: '', boundaries: '', behaviorWithUser: '',
      customInstructions: '', updatedAt: '',
      ownerUserId: 'system',
    },
    fields: [
      {
        key: 'characterId', label: 'Personnage associé', type: 'characterSelect', group: 'Identité',
        hint: 'La Persona lit automatiquement le nom, l’âge, le clan, l’historique… depuis cette fiche. Un personnage ne peut avoir qu’une seule Persona.',
      },
      {
        key: 'ownerUserId', label: 'Proprietaire', type: 'text', group: 'Identité',
        hint: 'system = Persona historique/admin protegee. Les comptes joueurs sont assignes cote serveur.',
      },
      {
        key: 'name', label: 'Nom affiché', type: 'text', group: 'Identité',
        hint: 'Laisse vide pour utiliser le prénom + nom de la fiche personnage.',
      },
      { key: 'enabled', label: 'IA activée', type: 'select', options: PERSONA_ENABLED, group: 'Identité' },
      { key: 'avatar', label: 'Avatar / placeholder', type: 'image', group: 'Identité' },
      { key: 'greeting', label: 'Message d’accueil', type: 'textarea', group: 'Identité' },
      {
        key: 'personality', label: 'Personnalité (traits, qualités, défauts, tempérament)', type: 'textarea',
        group: 'Personnalité',
      },
      { key: 'motivations', label: 'Motivations', type: 'textarea', group: 'Personnalité' },
      { key: 'fears', label: 'Peurs', type: 'textarea', group: 'Personnalité' },
      { key: 'likes', label: 'Apprécie', type: 'textarea', group: 'Personnalité' },
      { key: 'dislikes', label: 'N’apprécie pas', type: 'textarea', group: 'Personnalité' },
      {
        key: 'speechStyle', label: 'Manière de parler (ton, vocabulaire, expressions)', type: 'textarea',
        group: 'Manière de parler',
      },
      {
        key: 'creativity', label: 'Créativité', type: 'number', group: 'Manière de parler',
        hint: 'Entre 0 (sobre, prévisible) et 1 (très libre). 0,7 par défaut.',
      },
      { key: 'background', label: 'Histoire connue de la Persona', type: 'textarea', group: 'Lore' },
      { key: 'loreKnowledge', label: 'Connaissances du monde', type: 'textarea', group: 'Lore' },
      {
        key: 'relationships', label: 'Relations (interprétation RP)', type: 'relations', group: 'Relations',
        hint: 'Distinct des relations canoniques de la fiche personnage : sert uniquement à guider le ton de l’IA.',
      },
      {
        key: 'secrets', label: 'Secrets (jamais révélés facilement)', type: 'textarea', group: 'Secrets',
      },
      {
        key: 'boundaries', label: 'Limites RP (ce que l’IA ne doit jamais inventer ou modifier)', type: 'textarea',
        group: 'Limites RP',
      },
      { key: 'behaviorWithUser', label: 'Comportement attendu avec le joueur', type: 'textarea', group: 'Instructions' },
      { key: 'customInstructions', label: 'Instructions personnalisées', type: 'textarea', group: 'Instructions' },
    ],
  },
}

export const COLLECTION_NAMES = Object.keys(SCHEMA).sort(
  (a, b) => SCHEMA[a].order - SCHEMA[b].order,
)
