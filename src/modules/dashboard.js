import { requireAuth, logout } from '../api/auth.js'
import { fetchTicketCount, listTickets } from '../api/tickets.js'
import { userNameById, fetchUsersOnce, clearUsersCache } from '../api/users.js'
import { formatDate } from '../utils/formatDate.js'
import { toast, showFullscreenLoader, hideFullscreenLoader } from './ui.js'

export function initDashboard() {
  if (!requireAuth()) return

  const els = {
    total: document.getElementById('stat-total'),
    open: document.getElementById('stat-open'),
    progress: document.getElementById('stat-inprogress'),
    resolved: document.getElementById('stat-resolved'),
    recent: document.getElementById('recent-tickets'),
    recentEmpty: document.getElementById('recent-empty'),
    logout: document.getElementById('btn-logout')
  }

  async function load() {
    showFullscreenLoader('Loading dashboard…')
    try {
      const [total, open, prog, res, recent, users] = await Promise.all([
        fetchTicketCount(''),
        fetchTicketCount('status=open'),
        fetchTicketCount('status=in-progress'),
        fetchTicketCount('status=resolved'),
        listTickets('?_page=1&_limit=5&_sort=createdAt&_order=desc'),
        fetchUsersOnce()
      ])
      els.total.textContent = String(total)
      els.open.textContent = String(open)
      els.progress.textContent = String(prog)
      els.resolved.textContent = String(res)

      const tickets = recent.tickets || []
      els.recent.replaceChildren()
      if (!tickets.length) {
        els.recentEmpty.hidden = false
      } else {
        els.recentEmpty.hidden = true
        const frag = document.createDocumentFragment()
        for (const t of tickets) {
          const a = document.createElement('a')
          a.className = 'recent-row'
          a.href = `ticket-detail.html?id=${encodeURIComponent(t.id)}`
          const title = document.createElement('span')
          title.className = 'recent-title'
          title.textContent = t.title
          const meta = document.createElement('span')
          meta.className = 'recent-meta'
          meta.textContent = `${userNameById(users, t.assignedTo)} · ${formatDate(t.createdAt)}`
          a.appendChild(title)
          a.appendChild(meta)
          frag.appendChild(a)
        }
        els.recent.appendChild(frag)
      }
    } catch (e) {
      toast(e.message || 'Dashboard failed to load', 'error')
    } finally {
      hideFullscreenLoader()
    }
  }

  els.logout?.addEventListener('click', () => {
    logout()
    clearUsersCache()
    window.location.href = 'login.html'
  })

  load()
}
