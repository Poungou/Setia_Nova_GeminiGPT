import { getRequestUser } from '../lib/authStore.js'
import { cultureStore } from '../lib/cultureStore.js'
import { cultureRequest } from '../lib/cultureService.js'

export function handleCulture(request, env, parts) {
  return cultureRequest(request, parts, { store: cultureStore(env.WOLTAR_DB), getUser: () => getRequestUser(env, request) })
}
