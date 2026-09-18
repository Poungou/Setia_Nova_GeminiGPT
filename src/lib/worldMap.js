// src/lib/worldMap.js
//
// Positions relatives (en %, sur une grille 0-100 x 0-100) des villes sur la
// carte stylisée de Woltar affichée en haut de la page Lieux. Ce ne sont PAS
// des coordonnées géographiques réelles : un simple repère visuel/de
// navigation, basé sur l'agencement approximatif de la carte officielle du
// monde (dans l'ordre : Tegdíj à l'ouest, Ès et Tropico Island au centre,
// Sétia et Vésén au nord, Élet et Begy à l'est).

export const WORLD_MAP_POSITIONS = {
  tegdij: { x: 9, y: 46 },
  es: { x: 27, y: 74 },
  'tropico-island': { x: 41, y: 47 },
  setia: { x: 53, y: 30 },
  vesen: { x: 68, y: 22 },
  elet: { x: 68, y: 54 },
  begy: { x: 91, y: 66 },
}

// Ville « hub » du réseau visuel (les lignes de la carte partent de celle-ci).
export const WORLD_MAP_HUB = 'setia'
