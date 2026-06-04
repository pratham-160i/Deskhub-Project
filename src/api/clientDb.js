/**
 * In-browser DB for static hosting (GitHub Pages): mirrors server.mjs behaviour.
 * Persists to localStorage so CRUD survives reloads.
 */
import { apiUrl } from './baseUrl.js'

const LS_KEY = 'deskhub_client_db_v1'

const PRIORITY_RANK = { urgent: 4, high: 3, medium: 2, low: 1 }
const STATUS_RANK = { open: 0, 'in-progress': 1, resolved: 2, closed: 3 }
const ALLOWED_PRIORITY = ['low', 'medium', 'high', 'urgent']
const ALLOWED_STATUS = ['open', 'in-progress', 'resolved', 'closed']

let mem = null
let initPromise = null

function nextId(items) {
  return items.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) + 1
}

function filterTickets(tickets, query) {
  let list = [...tickets]
  const q = (query.q || '').trim().toLowerCase()
  if (q) {
    list = list.filter(
      (t) =>
        String(t.title || '')
          .toLowerCase()
          .includes(q) ||
        String(t.customer || '')
          .toLowerCase()
          .includes(q) ||
        String(t.description || '')
          .toLowerCase()
          .includes(q)
    )
  }
  if (query.status) list = list.filter((t) => t.status === query.status)
  if (query.priority) list = list.filter((t) => t.priority === query.priority)
  if (query.assignedTo) {
    const aid = Number(query.assignedTo)
    list = list.filter((t) => Number(t.assignedTo) === aid)
  }
  return list
}

function sortTickets(list, sortField, order) {
  const dir = order === 'asc' ? 1 : -1
  const copy = [...list]
  if (sortField === 'priority') {
    if (order === 'asc') {
      copy.sort((a, b) => (PRIORITY_RANK[a.priority] || 0) - (PRIORITY_RANK[b.priority] || 0))
    } else {
      copy.sort((a, b) => (PRIORITY_RANK[b.priority] || 0) - (PRIORITY_RANK[a.priority] || 0))
    }
    return copy
  }
  if (sortField === 'status') {
    if (order === 'desc') {
      copy.sort((a, b) => (STATUS_RANK[b.status] ?? 99) - (STATUS_RANK[a.status] ?? 99))
    } else {
      copy.sort((a, b) => (STATUS_RANK[a.status] ?? 99) - (STATUS_RANK[b.status] ?? 99))
    }
    return copy
  }
  if (sortField === 'createdAt') {
    copy.sort((a, b) => {
      const ta = new Date(a.createdAt).getTime()
      const tb = new Date(b.createdAt).getTime()
      return dir * (ta - tb)
    })
    return copy
  }
  copy.sort((a, b) => Number(a.id) - Number(b.id))
  return copy
}

function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(mem))
  } catch (e) {
    console.warn('deskhub: could not persist db', e)
  }
}

export async function ensureDb() {
  if (mem) return mem
  if (initPromise) return initPromise
  initPromise = (async () => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        mem = JSON.parse(raw)
        if (mem?.tickets && mem?.users) return mem
      }
    } catch {
      /* ignore */
    }
    const candidates = [apiUrl('/db.json'), new URL('db.json', window.location.href).href]
    let lastStatus = ''
    for (const url of candidates) {
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) {
        mem = await res.json()
        break
      }
      lastStatus = `${url.split('/').pop()} → ${res.status}`
    }
    if (!mem?.tickets || !mem?.users) {
      throw new Error(`Could not load db.json (${lastStatus || 'unknown'})`)
    }
    if (!mem.comments) mem.comments = []
    persist()
    return mem
  })()
  try {
    return await initPromise
  } finally {
    initPromise = null
  }
}

function fakeToken(user) {
  return btoa(JSON.stringify({ sub: user.id, email: user.email, exp: Date.now() + 86400000 * 7 }))
}

export async function login(email, password) {
  const db = await ensureDb()
  const user = db.users.find((u) => u.email === email && u.password === password)
  if (!user) throw new Error('Invalid credentials')
  const { password: _p, ...safe } = user
  return { accessToken: fakeToken(safe), user: safe }
}

export async function getUsers() {
  const db = await ensureDb()
  return db.users.map(({ password: _p, ...u }) => u)
}

export async function listTickets(queryString) {
  const db = await ensureDb()
  const qs = queryString.startsWith('?') ? queryString.slice(1) : queryString
  const params = new URLSearchParams(qs)
  const query = Object.fromEntries(params.entries())

  let list = filterTickets(db.tickets, query)
  const sortField = query._sort || 'createdAt'
  const order = (query._order || 'desc').toLowerCase()
  list = sortTickets(list, sortField, order)

  const total = list.length
  const hasPage = query._page != null && query._page !== ''
  const hasLimit = query._limit != null && query._limit !== ''
  const usePagination = hasPage || hasLimit
  const page = Math.max(1, parseInt(query._page, 10) || 1)
  const limit = usePagination
    ? Math.min(100, Math.max(1, parseInt(query._limit, 10) || 10))
    : total
  const start = usePagination ? (page - 1) * limit : 0
  const slice = usePagination ? list.slice(start, start + limit) : list

  return { tickets: slice, total }
}

export async function getTicket(id) {
  const db = await ensureDb()
  const t = db.tickets.find((x) => Number(x.id) === Number(id))
  if (!t) throw new Error('Not found')
  return t
}

export async function createTicket(body) {
  const db = await ensureDb()
  const title = String(body.title || '').trim()
  const customer = String(body.customer || '').trim()
  const priority = body.priority || 'medium'
  const status = body.status || 'open'
  if (title.length < 3) throw new Error('Title must be at least 3 characters')
  if (customer.length < 2) throw new Error('Customer must be at least 2 characters')
  if (!ALLOWED_PRIORITY.includes(priority)) throw new Error('Invalid priority')
  if (!ALLOWED_STATUS.includes(status)) throw new Error('Invalid status')
  const id = nextId(db.tickets)
  const ticket = {
    id,
    title,
    customer,
    priority,
    status,
    assignedTo: (() => {
      if (body.assignedTo == null || body.assignedTo === '') return null
      const n = Number(body.assignedTo)
      return Number.isFinite(n) ? n : null
    })(),
    description: String(body.description || '').trim(),
    createdAt: new Date().toISOString()
  }
  db.tickets.push(ticket)
  persist()
  return ticket
}

export async function updateTicket(id, patch) {
  const db = await ensureDb()
  const nid = Number(id)
  const idx = db.tickets.findIndex((x) => Number(x.id) === nid)
  if (idx === -1) throw new Error('Not found')
  const cur = db.tickets[idx]
  if ('priority' in patch && !ALLOWED_PRIORITY.includes(patch.priority)) {
    throw new Error('Invalid priority')
  }
  if ('status' in patch && !ALLOWED_STATUS.includes(patch.status)) {
    throw new Error('Invalid status')
  }
  const next = {
    ...cur,
    ...('title' in patch ? { title: String(patch.title).trim() } : {}),
    ...('customer' in patch ? { customer: String(patch.customer).trim() } : {}),
    ...('priority' in patch ? { priority: patch.priority } : {}),
    ...('status' in patch ? { status: patch.status } : {}),
    ...('assignedTo' in patch
      ? { assignedTo: patch.assignedTo == null ? null : Number(patch.assignedTo) }
      : {}),
    ...('description' in patch ? { description: String(patch.description).trim() } : {})
  }
  if (next.title.length < 3) throw new Error('Title must be at least 3 characters')
  if (next.customer.length < 2) throw new Error('Customer must be at least 2 characters')
  db.tickets[idx] = next
  persist()
  return next
}

export async function deleteTicket(id) {
  const db = await ensureDb()
  const nid = Number(id)
  const before = db.tickets.length
  db.tickets = db.tickets.filter((x) => Number(x.id) !== nid)
  db.comments = db.comments.filter((c) => Number(c.ticketId) !== nid)
  persist()
  if (db.tickets.length === before) throw new Error('Not found')
}

export async function listComments(ticketId) {
  const db = await ensureDb()
  const tid = Number(ticketId)
  let list = db.comments.filter((c) => Number(c.ticketId) === tid)
  list = [...list].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
  return list
}

export async function addComment({ ticketId, body, authorId }) {
  const db = await ensureDb()
  const tid = Number(ticketId)
  const ticket = db.tickets.find((t) => Number(t.id) === tid)
  if (!ticket) throw new Error('Invalid ticket')
  const text = String(body || '').trim()
  if (!text) throw new Error('Comment body is required')
  const id = nextId(db.comments)
  const comment = {
    id,
    ticketId: tid,
    body: text,
    authorId: authorId != null ? Number(authorId) : null,
    createdAt: new Date().toISOString()
  }
  db.comments.push(comment)
  persist()
  return comment
}

/** Optional: reset demo data to shipped db.json (after next page load fetch). */
export function clearPersistedDb() {
  localStorage.removeItem(LS_KEY)
  mem = null
}
