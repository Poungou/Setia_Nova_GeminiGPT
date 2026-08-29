// src/data/clans.js
// Structure prête pour /clans/:id (Phase 7). Un seul clan confirmé à ce jour.

export const clans = [
  {
    id: 'nakamura',
    name: 'Clan Nakamura',
    canon: 'confirmed',
    emblem: '',
    description: "L'un des axes principaux de la vitrine Woltar.",
    history: '',
    residence: 'Manoir de Sétia',
    locations: ['manoir-de-setia'],
    members: [
      'kazuko-nakamura',
      'hachiro-nakamura',
      'fudo-nakamura',
      'shizuka-nakamura',
      'myo-nakamura',
    ],
    events: [],
  },
]

export function getClanById(id) {
  return clans.find((c) => c.id === id)
}
