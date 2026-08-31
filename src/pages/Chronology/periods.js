// src/pages/Chronology/periods.js
//
// Regroupement des événements en grandes périodes pour l'affichage de la
// frise (/chronologie) — UNIQUEMENT présentationnel : ne touche jamais aux
// données de src/data/events.json. Le classement s'appuie sur le champ
// `order` déjà présent dans les données (celui qui fixe l'ordre d'affichage
// existant) et sur le contenu déjà écrit par l'utilisatrice, sans ajouter
// ni inventer aucune information narrative.
//
// Point d'attention connu (déjà signalé, voir TODO.md) : il y a une
// contradiction dans les données sources autour de « Mort de Salut »
// (dateRP dit qu'il meurt à 80 ans, mais un événement antérieur le
// mentionne encore vivant après le pacte). Cet événement reste ici groupé
// avec les événements voisins de son arc narratif ("Après Salut") par
// simple proximité d'`order` — ce regroupement ne tranche pas la question,
// à confirmer avec l'utilisatrice.
//
// Pour ajuster une période plus tard (renommer, redécouper) : modifier les
// bornes `from`/`to` (comparées au champ `order`) ci-dessous. Aucune autre
// donnée à toucher.
export const PERIODS = [
  { key: 'royaumes', label: 'Ère des royaumes', from: -Infinity, to: 15 },
  { key: 'enfance', label: 'Enfance des jumeaux', from: 15, to: 35 },
  { key: 'apres-salut', label: 'Après Salut', from: 35, to: 95 },
  { key: 'exil', label: 'Exil et ruptures', from: 95, to: 125 },
  { key: 'retour', label: 'Retour au manoir', from: 125, to: 145 },
  { key: 'actuelle', label: 'Époque actuelle', from: 145, to: Infinity },
]

export function groupEventsByPeriod(events) {
  const sorted = [...events].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  return PERIODS.map((period) => ({
    ...period,
    events: sorted.filter((e) => (e.order ?? 0) >= period.from && (e.order ?? 0) < period.to),
  })).filter((period) => period.events.length > 0)
}
