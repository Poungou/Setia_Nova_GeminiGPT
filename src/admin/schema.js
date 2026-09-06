// src/admin/schema.js
//
// Description déclarative de chaque collection : c'est ce qui pilote les
// formulaires de l'admin. Les clés correspondent EXACTEMENT aux champs des
// fichiers src/data/*.json.
//
// Types de champ : text | textarea | prose | markdown | number | date | select
//                  | boolean | tags | image | gallery | refs | relations
//   refs      -> liste d'ids pointant vers une autre collection (`ref`)
//   relations -> spécifique aux personnages :
//                [{ characterId, type, description, nature, intensity }]
//                `nature`/`intensity` sont facultatifs (voir src/lib/relations.js
//                pour le vocabulaire) : ils affinent uniquement le rendu du
//                sociogramme public (couleur/épaisseur du lien, Phase 22) et
//                n'ont aucune valeur par défaut inventée tant que l'admin ne
//                les renseigne pas — voir RelationGraph.jsx

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
const CANON_SCOPE = [
  ['personal', 'Canon Nakamura / personnel'],
  ['community', 'Lore communautaire'],
  ['interpretation', 'Interprétation RP'],
  ['rumor', 'Rumeur / incertain'],
]
const VISIBILITY = [
  ['published', 'Publié'],
  ['draft', 'Brouillon (caché du site)'],
]
const POST_CAT_OPTIONS = POST_CATEGORIES.map((c) => [c.value, c.label])
const AETHER_ENABLED = [
  ['false', 'Désactivé (invisible sur le site, testable dans /admin)'],
  ['true', 'Activé (page /aether accessible sur le site public)'],
]

export const SCHEMA = {
  home: {
    label: 'Accueil',
    singular: 'accueil',
    icon: 'House',
    order: -1,
    singleton: true,
    title: () => 'Accueil',
    subtitle: (r) => r.title || '',
    makeId: () => 'home',
    defaults: {
      id: 'home', eyebrow: '', title: '', subtitle: '', intro: '',
      primaryCtaLabel: '', primaryCtaUrl: '/personnages',
      secondaryCtaLabel: '', secondaryCtaUrl: '/univers',
      aetherCtaLabel: '', aetherCtaUrl: '/aether',
      lightBackgroundVideo: '/media/fond_clair_anime.mp4',
      lightBackgroundFallback: '/media/fond_clair_statique.webp',
    },
    fields: [
      { key: 'eyebrow', label: 'Petit libellé au-dessus du titre', type: 'text', group: 'Textes' },
      { key: 'title', label: 'Titre principal', type: 'textarea', group: 'Textes' },
      { key: 'subtitle', label: 'Sous-titre', type: 'textarea', group: 'Textes' },
      { key: 'intro', label: 'Texte d’intro', type: 'textarea', group: 'Textes' },
      { key: 'primaryCtaLabel', label: 'Bouton principal', type: 'text', group: 'Boutons' },
      { key: 'primaryCtaUrl', label: 'Lien du bouton principal', type: 'text', group: 'Boutons' },
      { key: 'secondaryCtaLabel', label: 'Bouton secondaire', type: 'text', group: 'Boutons' },
      { key: 'secondaryCtaUrl', label: 'Lien du bouton secondaire', type: 'text', group: 'Boutons' },
      { key: 'aetherCtaLabel', label: 'Bouton Aether', type: 'text', group: 'Boutons' },
      { key: 'aetherCtaUrl', label: 'Lien du bouton Aether', type: 'text', group: 'Boutons' },
      {
        key: 'lightBackgroundVideo', label: 'Fond clair animé', type: 'text', group: 'Médias',
        hint: 'Préparé pour plus tard : le fond clair actuel est servi par le composant d’ambiance.',
      },
      {
        key: 'lightBackgroundFallback', label: 'Fond clair statique', type: 'text', group: 'Médias',
        hint: 'Image utilisée quand la vidéo est coupée, indisponible, ou évitée par préférence de mouvement.',
      },
    ],
  },

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
      color: '', frameColor: '', portraitFramed: true, relations: [], locations: [], tags: [], author: '', visibility: 'published',
      ownerUserId: 'system', is_featured: false, image_source: '', gallery_sources: {}, isPnj: false,
    },
    fields: [
      { key: 'visibility', label: 'Publication', type: 'select', options: VISIBILITY, group: 'Publication' },
      {
        key: 'is_featured',
        label: 'Mettre en avant',
        type: 'boolean',
        group: 'Publication',
        accountHidden: true,
      },
      {
        key: 'ownerUserId', label: 'Proprietaire', type: 'text', group: 'Publication',
        hint: 'system = contenu historique/admin protege. Les comptes joueurs sont assignes cote serveur.',
      },
      {
        key: 'author', label: 'Auteur / joueur', type: 'text', group: 'Publication',
        hint: 'Laisse vide si c’est une fiche canon. Servira quand d’autres joueurs pourront proposer leurs persos.',
      },
      {
        key: 'isPnj', label: 'PNJ', type: 'boolean', group: 'Publication',
        accountHidden: true,
        hint: 'Personnage non-joueur : indépendant du propriétaire (ownerUserId). Prépare une distinction simple joueur/PNJ dans la galerie — désactivé par défaut, à cocher au cas par cas. Réservé à l’admin.',
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
        key: 'portraitFramed', label: 'Portrait avec cadre', type: 'boolean', group: 'Identité',
        hint: 'Activé par défaut (comportement actuel inchangé). Désactive pour afficher la vignette sans l’illustration de cadre ci-dessous.',
      },
      {
        key: 'frameColor', label: 'Cadre (vignette)', type: 'select', group: 'Identité',
        options: [['', 'Auto (déduit de la couleur)'], ['bleu', 'Bleu'], ['gris', 'Gris'], ['rouge', 'Rouge'], ['violet', 'Violet']],
        hint: 'Illustration de cadre à utiliser sur la vignette personnage (si "Portrait avec cadre" est activé). Laisse sur Auto pour la déduire de la couleur ci-dessus, ou force un choix précis parmi les 4 illustrations disponibles.',
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
      {
        key: 'image_source',
        label: 'Source / crédit de l’image',
        type: 'text',
        group: 'Images',
        hint: 'Facultatif. Exemple : Poungou / Woltar.net.',
      },
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
      name: '', type: '', canon: 'draft', canonScope: 'personal', parentId: '',
      location: '', wing: '', zone: '', floor: '', owner: '', faction: '',
      status: '', shortDescription: '', description: '', lore: '', history: '',
      image: '', characters: [], events: [], gallery: [],
    },
    fields: [
      { key: 'name', label: 'Nom', type: 'text', group: 'Identité' },
      { key: 'type', label: 'Type', type: 'text', group: 'Identité' },
      { key: 'canon', label: 'Fiabilité', type: 'select', options: CANON, group: 'Identité' },
      {
        key: 'canonScope', label: 'Portée canon', type: 'select', options: CANON_SCOPE, group: 'Identité',
        hint: 'Prépare la distinction future entre lore communautaire, canon personnel, interprétation RP et rumeur. Non affiché publiquement pour l’instant.',
      },
      {
        key: 'parentId', label: 'Lieu parent', type: 'text', group: 'Identité',
        hint: 'Id d’un autre lieu, ex. "manoir-de-setia" pour une pièce du manoir. Laisser vide pour un lieu principal.',
      },
      { key: 'location', label: 'Situé à / dans', type: 'text', group: 'Identité' },
      { key: 'wing', label: 'Aile', type: 'text', group: 'Identité' },
      { key: 'zone', label: 'Zone', type: 'text', group: 'Identité' },
      { key: 'floor', label: 'Étage', type: 'text', group: 'Identité' },
      { key: 'owner', label: 'Propriétaire', type: 'text', group: 'Identité' },
      { key: 'faction', label: 'Faction', type: 'text', group: 'Identité' },
      { key: 'status', label: 'Statut', type: 'text', group: 'Identité' },
      { key: 'shortDescription', label: 'Description courte', type: 'textarea', group: 'Textes' },
      { key: 'description', label: 'Description', type: 'prose', group: 'Textes' },
      {
        key: 'lore', label: 'Lore libre', type: 'prose', group: 'Textes',
        hint: 'Grand champ libre : ambiance, secrets, habitudes, rumeurs, notes RP. Aucun format imposé.',
      },
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
      residence: '', locations: [], members: [], events: [], centerCharacterId: '',
      ownerUserId: 'system', visibility: 'published',
    },
    fields: [
      { key: 'visibility', label: 'Publication', type: 'select', options: VISIBILITY, group: 'Publication' },
      {
        key: 'ownerUserId', label: 'Propriétaire', type: 'text', group: 'Publication',
        hint: 'system = clan historique/admin protégé. Les comptes joueurs sont assignés côté serveur.',
      },
      { key: 'name', label: 'Nom', type: 'text', group: 'Identité' },
      { key: 'canon', label: 'Fiabilité', type: 'select', options: CANON, group: 'Identité' },
      { key: 'residence', label: 'Résidence', type: 'text', group: 'Identité' },
      { key: 'emblem', label: 'Emblème', type: 'image', group: 'Images' },
      { key: 'description', label: 'Description', type: 'prose', group: 'Textes' },
      { key: 'history', label: 'Histoire', type: 'prose', group: 'Textes' },
      {
        key: 'members', label: 'Membres', type: 'refs', ref: 'characters', group: 'Liens',
        accountHidden: true,
        hint: 'Depuis /compte, les membres s’ajoutent via la section « Membres du clan » de la fiche, pas ici.',
      },
      { key: 'locations', label: 'Lieux', type: 'refs', ref: 'locations', group: 'Liens' },
      {
        key: 'centerCharacterId',
        label: 'Personnage central du sociogramme',
        type: 'characterSelect',
        group: 'Liens',
        hint: 'Affiché au centre du schéma « Liens du clan ». Si vide, le personnage ayant le plus de liens renseignés est choisi automatiquement.',
      },
    ],
  },

  // Une chronologie (timeline) est un CONTENEUR d'événements — voir
  // src/lib/timelineEvents.js. Ici, l'admin ne gère que les métadonnées
  // (titre, description, spoiler, personnages liés) d'une chronologie ;
  // les événements eux-mêmes ne sont PAS un champ générique de ce
  // formulaire : pour la chronologie canon Nakamura, ils continuent de
  // vivre dans la collection « Chronologie » (events) ci-dessous, éditée
  // comme avant. Les chronologies créées depuis /compte embarquent leur
  // tableau `events` directement (voir TimelineEventsEditor côté compte) —
  // ce champ n'apparaît donc pas non plus ici pour rester cohérent.
  timelines: {
    label: 'Chronologies',
    singular: 'chronologie',
    icon: 'History',
    order: 3.5,
    title: (r) => r.title || r.id,
    subtitle: (r) => r.description || '',
    makeId: (r) => slug(r.title),
    defaults: {
      title: '', description: '', spoiler: false, characters: [],
      ownerUserId: 'system', visibility: 'published',
    },
    fields: [
      { key: 'visibility', label: 'Publication', type: 'select', options: VISIBILITY, group: 'Publication' },
      {
        key: 'ownerUserId', label: 'Propriétaire', type: 'text', group: 'Publication',
        hint: 'system = chronologie historique/admin protégée (ex. le clan Nakamura). Les comptes joueurs sont assignés côté serveur.',
      },
      { key: 'title', label: 'Titre', type: 'text', group: 'Identité' },
      { key: 'description', label: 'Description courte', type: 'textarea', group: 'Identité' },
      {
        key: 'spoiler', label: 'Contient des spoilers', type: 'boolean', group: 'Identité',
        hint: 'Affiche un avertissement avec bouton « Afficher quand même » avant les événements de cette chronologie.',
      },
      { key: 'characters', label: 'Personnages liés', type: 'refs', ref: 'characters', group: 'Liens' },
    ],
  },

  events: {
    label: 'Chronologie (événements Nakamura)',
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

  // AETHER — assistant/guide IA central unique du site (remplace l'ancien
  // système de Personas RP liées à un personnage, supprimé). Collection à
  // une seule fiche (id toujours "aether") : Aether ne fait jamais de RP à
  // la place de la joueuse, il l'aide à s'orienter dans Woltar (voir
  // plugins/lib/aetherPrompt.js pour la construction exacte du prompt).
  //
  // Séparation volontaire des deux champs de texte libre :
  //   - character_context : identité/personnalité d'Aether (ton, humour,
  //     petites références, sa relation avec Woltar).
  //   - system_prompt : instructions supplémentaires de l'administratrice
  //     (contraintes, rappels, cas particuliers).
  // Les connaissances de Woltar (personnages, clans, lieux) ne se recopient
  // JAMAIS ici : elles sont assemblées automatiquement à chaque requête à
  // partir des données du site — voir plugins/lib/aetherPrompt.js.
  aether: {
    label: 'Aether',
    singular: 'Aether',
    icon: 'MessageCircle',
    order: 6,
    title: () => 'Aether',
    subtitle: (r) => (r.enabled === 'true' ? 'Activé' : 'Désactivé'),
    makeId: () => 'aether',
    defaults: {
      id: 'aether', name: 'Aether', enabled: 'false', avatar: '',
      greeting: 'Suis ton cœur. Pour le reste, demande-moi.',
      system_prompt: '', character_context: '',
    },
    fields: [
      { key: 'enabled', label: 'Aether activé', type: 'select', options: AETHER_ENABLED, group: 'Identité' },
      { key: 'name', label: 'Nom affiché', type: 'text', group: 'Identité' },
      { key: 'avatar', label: 'Avatar', type: 'image', group: 'Identité' },
      { key: 'greeting', label: 'Message d’accueil (page /aether)', type: 'textarea', group: 'Identité' },
      {
        key: 'character_context', label: 'Personnalité et ton', type: 'textarea', group: 'Personnalité',
        hint: 'Identité d’Aether : sa façon de parler, sa relation avec Woltar, son humour, ses petites références. Ne décrit jamais un fait canonique — uniquement du ton et du caractère.',
      },
      {
        key: 'system_prompt', label: 'Instructions supplémentaires', type: 'textarea', group: 'Instructions',
        hint: 'Contraintes ou rappels additionnels pour Aether. Les connaissances de Woltar (personnages, clans, lieux) sont ajoutées automatiquement — inutile de les recopier ici.',
      },
    ],
  },
}

export const COLLECTION_NAMES = Object.keys(SCHEMA).sort(
  (a, b) => SCHEMA[a].order - SCHEMA[b].order,
)
