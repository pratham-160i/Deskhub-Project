/**
 * Build absolute request paths so the app works under a subpath
 * (e.g. GitHub Pages: …/Deskhub-Project/public/login.html → API at …/Deskhub-Project/…).
 */
export function apiUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`
  const pathname = window.location.pathname
  const marker = '/public/'
  const i = pathname.indexOf(marker)
  const base = i > 0 ? pathname.slice(0, i) : ''
  return `${base}${normalized}`
}
