import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const root = await mkdtemp(path.join(os.tmpdir(), 'nova-setia-auth-'))
try {
  const { createUser, loginUser } = await import('../plugins/lib/authStore.js')
  const actor = { id: 'admin', role: 'admin', disabled: false }
  const user = await createUser(root, {
    name: 'Tallouna', email: '', password: 'TallounaTemp123',
    passwordConfirmation: 'TallounaTemp123', role: 'user', status: 'RPiste', active: true,
    permissions: { create_character: true, create_clan: true, create_location: true },
  }, actor)
  const stored = await readFile(path.join(root, 'plugins', 'data', 'users.json'), 'utf8')
  if (user.name !== 'Tallouna' || user.status !== 'RPiste' || stored.includes('TallounaTemp123') || !stored.includes('scrypt:')) {
    throw new Error('Création locale ou stockage du mot de passe invalide')
  }
  const loggedIn = await loginUser(root, { identifier: 'Tallouna', password: 'TallounaTemp123' })
  if (loggedIn.id !== user.id || loggedIn.permissions.create_location !== true) throw new Error('Connexion locale invalide')
  console.log('LOCAL ADMIN USER: OK')
} finally {
  await rm(root, { recursive: true, force: true })
}
