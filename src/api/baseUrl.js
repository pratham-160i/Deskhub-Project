/**
 * Site root under a path (e.g. /Deskhub-Project) for GitHub Pages project sites.
 */
export function siteBase() {
  const pathname = window.location.pathname
  const marker = '/public/'
  const i = pathname.indexOf(marker)
  if (i > 0) return pathname.slice(0, i)
  if (/\.github\.io$/i.test(window.location.hostname)) {
    const parts = pathname.split('/').filter(Boolean)
    if (parts.length >= 1) return `/${parts[0]}`
  }
  return ''
}

/**
 * API / static asset URLs under the repo root (works with GitHub Pages subpaths).
 */
export function apiUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`
  const base = siteBase()
  return `${base}${normalized}`
}
