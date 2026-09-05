// Ownership stays authoritative; profile links add associations only.
export function isCharacterLinked(character, userId, linkedIds = []) {
  return character.ownerUserId === userId || linkedIds.includes(character.id)
}

export function validateCharacterLinks(value, characters, userId, previousIds = [], { allowAllCharacters = false, allowSystemCharacters = false } = {}) {
  if (!Array.isArray(value) || value.some((id) => typeof id !== 'string' || !id.trim())) {
    throw Object.assign(new Error('Les identifiants de personnages doivent former une liste de chaînes non vides.'), { status: 400 })
  }
  const ids = [...new Set(value)]
  const available = new Map(characters.map((character) => [character.id, character]))
  for (const id of ids) {
    const character = available.get(id)
    if (!character) throw Object.assign(new Error(`Personnage introuvable : ${id}`), { status: 400 })
    if (!allowAllCharacters && character.ownerUserId !== userId && !previousIds.includes(id) && !(allowSystemCharacters && character.ownerUserId === 'system')) {
      throw Object.assign(new Error('Ce personnage ne peut pas être rattaché à ce compte.'), { status: 403 })
    }
  }
  return ids
}
