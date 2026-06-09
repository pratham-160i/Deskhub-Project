const STORAGE_KEY = 'deskhub_theme'

function applyFromStorage() {
  const saved = localStorage.getItem(STORAGE_KEY)
  const root = document.documentElement
  if (saved === 'dark') {
    root.dataset.theme = 'dark'
  } else if (saved === 'light') {
    delete root.dataset.theme
  } else if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    root.dataset.theme = 'dark'
  } else {
    delete root.dataset.theme
  }
}

function syncToggleButtons() {
  const dark = document.documentElement.dataset.theme === 'dark'
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    btn.setAttribute('aria-pressed', dark ? 'true' : 'false')
    btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode')
    btn.textContent = dark ? 'Light' : 'Dark'
  })
}

/** Flip light/dark and persist (same as the header theme button). */
export function toggleTheme() {
  const root = document.documentElement
  if (root.dataset.theme === 'dark') {
    delete root.dataset.theme
    localStorage.setItem(STORAGE_KEY, 'light')
  } else {
    root.dataset.theme = 'dark'
    localStorage.setItem(STORAGE_KEY, 'dark')
  }
  syncToggleButtons()
}

export function initTheme() {
  applyFromStorage()
  syncToggleButtons()
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    btn.addEventListener('click', toggleTheme)
  })
}
