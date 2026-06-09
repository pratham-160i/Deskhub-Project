import { isTypingContext } from '../utils/keyboardContext.js'
import { toggleTheme } from './theme.js'
import { toast } from './ui.js'

const CHORD_MS = 900
let chordTimer = null
/** @type {'g' | null} */
let pendingChord = null

function resetChord() {
  if (chordTimer) clearTimeout(chordTimer)
  chordTimer = null
  pendingChord = null
}

function armGChord() {
  resetChord()
  pendingChord = 'g'
  chordTimer = setTimeout(resetChord, CHORD_MS)
}

/**
 * Global keyboard shortcuts (ignored while typing in inputs).
 * Dashboard: / → tickets list with search focused, t → tickets, ? help.
 * Tickets: / search, j/k arrows move row, Enter / o / h open row, n new, ? help.
 * Any page (except while typing): m toggles light/dark theme.
 * Any page (except login): g then d → dashboard, g then t → tickets.
 * Ticket detail: e opens Edit when visible.
 * @param {KeyboardEvent} ev
 */
export function handleShortcutKeydown(ev) {
  if (ev.defaultPrevented) return
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return

  const page = document.body?.dataset?.page
  const target = ev.target

  if (isTypingContext(target)) return

  if (pendingChord === 'g') {
    if (ev.key === 'd' || ev.key === 'D') {
      ev.preventDefault()
      resetChord()
      window.location.href = 'dashboard.html'
      return
    }
    if (ev.key === 't' || ev.key === 'T') {
      ev.preventDefault()
      resetChord()
      window.location.href = 'tickets.html'
      return
    }
    resetChord()
  }

  if (page === 'dashboard') {
    if (ev.key === '/') {
      ev.preventDefault()
      window.location.href = 'tickets.html#search'
      return
    }
    if ((ev.key === 't' || ev.key === 'T') && !ev.repeat) {
      ev.preventDefault()
      window.location.href = 'tickets.html'
      return
    }
    if (ev.key === '?' || (ev.shiftKey && ev.key === '/')) {
      ev.preventDefault()
      toast(
        'Dashboard shortcuts: / open Tickets with search focused · t go to Tickets · m theme · g then d Dashboard · g then t Tickets',
        'info'
      )
      return
    }
  }

  if (page === 'tickets-list') {
    if (ev.key === '/') {
      ev.preventDefault()
      document.getElementById('filter-search')?.focus()
      return
    }
    if (ev.key === '?' || (ev.shiftKey && ev.key === '/')) {
      ev.preventDefault()
      toast(
        'Tickets shortcuts: / focus search · j/k or arrows move row · Enter or o or h open selected row · n new ticket · m theme · g then d dashboard · g then t tickets · ? this tip',
        'info'
      )
      return
    }
    if ((ev.key === 'n' || ev.key === 'N') && !ev.repeat) {
      ev.preventDefault()
      document.getElementById('btn-new-ticket')?.click()
      return
    }
  }

  if (page === 'ticket-detail' && (ev.key === 'e' || ev.key === 'E') && !ev.repeat) {
    const btn = document.getElementById('btn-edit-ticket')
    if (btn && !btn.hidden) {
      ev.preventDefault()
      btn.click()
      return
    }
  }

  if ((ev.key === 'm' || ev.key === 'M') && !ev.repeat) {
    ev.preventDefault()
    toggleTheme()
    return
  }

  if (ev.key === 'g' || ev.key === 'G') {
    if (page === 'login') return
    ev.preventDefault()
    armGChord()
  }
}

export function initKeyboardShortcuts() {
  document.addEventListener('keydown', handleShortcutKeydown)
}
