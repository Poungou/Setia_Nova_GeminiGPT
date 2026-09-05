import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'

const root = await mkdtemp(path.join(os.tmpdir(), 'nova-setia-auth-'))
try {
  const { createUser, loginUser } = await import('../plugins/lib/authStore.js')
  const actor = { id: 'admin', role: 'admin', disabled: false }
  const user = await createUser(root, {
    name: 'Tallouna', email: 'tallouna@test.local', password: 'TallounaTemp123',
    passwordConfirmation: 'TallounaTemp123', role: 'user', status: 'RPiste', active: true,
    permissions: { create_character: true, create_clan: true, create_location: true },
  }, actor)
  const stored = await readFile(path.join(root, 'plugins', 'data', 'users.json'), 'utf8')
  if (user.name !== 'Tallouna' || user.status !== 'RPiste' || stored.includes('TallounaTemp123') || !stored.includes('scrypt:')) {
    throw new Error('Création locale ou stockage du mot de passe invalide')
  }
  const loggedIn = await loginUser(root, { identifier: 'Tallouna', password: 'TallounaTemp123' })
  if (loggedIn.id !== user.id || loggedIn.permissions.create_location !== true) throw new Error('Connexion locale invalide')
  const { savePlayerProfile, listPublicPlayerProfiles } = await import('../plugins/lib/playerProfiles.js')
  const characters = [
    { id: 'owned', firstName: 'Owned', ownerUserId: user.id },
    { id: 'other', firstName: 'Other', ownerUserId: 'other-user' },
    { id: 'hidden', firstName: 'Hidden', ownerUserId: 'other-user', visibility: 'draft' },
  ]
  await mkdir(path.join(root, 'src', 'data'), { recursive: true })
  const characterFile = path.join(root, 'src', 'data', 'characters.json')
  await writeFile(characterFile, JSON.stringify(characters))
  const adminOptions = { allowAllCharacters: true }
  const profile = await savePlayerProfile(root, user.id, { player_intro: 'RP', profile_public: true, linked_character_ids: ['other', 'other', 'hidden'] }, adminOptions)
  assert.deepEqual(profile.linked_character_ids, ['other', 'hidden'])
  assert.deepEqual((await listPublicPlayerProfiles(root))[0].characters.map((c) => c.id), ['owned', 'other'])
  assert(!JSON.stringify(await listPublicPlayerProfiles(root)).includes('hidden'))
  await savePlayerProfile(root, user.id, { rhythm: 'Weekly' })
  assert.deepEqual((await listPublicPlayerProfiles(root))[0].characters.map((c) => c.id), ['owned', 'other'])
  await assert.rejects(savePlayerProfile(root, user.id, { linked_character_ids: ['unknown'] }, adminOptions), { status: 400 })
  await assert.rejects(savePlayerProfile(root, 'missing-user', {}, adminOptions), { status: 404 })
  await savePlayerProfile(root, user.id, { linked_character_ids: [] }, adminOptions)
  assert.deepEqual((await listPublicPlayerProfiles(root))[0].characters.map((c) => c.id), ['owned'])
  await assert.rejects(savePlayerProfile(root, user.id, { linked_character_ids: ['other'] }), { status: 403 })
  assert.deepEqual(JSON.parse(await readFile(characterFile, 'utf8')), characters)
  for (const email of ['', 'invalid', 'a@b']) {
    await assert.rejects(createUser(root, { name: 'MissingEmail', email, password: 'ValidPass123', passwordConfirmation: 'ValidPass123' }, actor), { status: 400 })
  }
  console.log('LOCAL PROFILE LINKS: validations OK')
  console.log('LOCAL ADMIN USER: OK')
} finally {
  await rm(root, { recursive: true, force: true })
}
