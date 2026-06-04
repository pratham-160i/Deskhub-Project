import { apiUrl } from './baseUrl.js'
import { useStaticDataMode } from './staticMode.js'
import * as clientDb from './clientDb.js'

let cachedUsers = null
let inflight = null

export function clearUsersCache() {
  cachedUsers = null
  inflight = null
}

export function getCachedUsers() {
  return cachedUsers
}

export async function fetchUsersOnce() {
  if (cachedUsers) return cachedUsers
  if (inflight) return inflight
  if (useStaticDataMode()) {
    inflight = clientDb
      .getUsers()
      .then((users) => {
        cachedUsers = users
        return users
      })
      .finally(() => {
        inflight = null
      })
    return inflight
  }
  inflight = fetch(apiUrl('/users'))
    .then((r) => {
      if (!r.ok) throw new Error('Failed to load users')
      return r.json()
    })
    .then((users) => {
      cachedUsers = users
      return users
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

export function userNameById(users, id) {
  if (id == null || id === '') return '—'
  const u = users?.find((x) => Number(x.id) === Number(id))
  return u?.name || `#${id}`
}
