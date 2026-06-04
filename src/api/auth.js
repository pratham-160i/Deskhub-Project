const TOKEN_KEY = 'deskhub_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

const USER_KEY = 'deskhub_user'

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setCurrentUser(user) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
  else localStorage.removeItem(USER_KEY)
}

export function clearCurrentUser() {
  localStorage.removeItem(USER_KEY)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function logout() {
  clearToken()
  clearCurrentUser()
}

export async function login(email, password) {
  const res = await fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || 'Login failed')
  if (data.accessToken) setToken(data.accessToken)
  if (data.user) setCurrentUser(data.user)
  return data
}

export function requireAuth(redirectTo = 'login.html') {
  if (!getToken()) {
    window.location.href = redirectTo
    return false
  }
  return true
}
