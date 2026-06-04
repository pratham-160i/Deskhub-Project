import express from 'express'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, 'db.json')

const PRIORITY_RANK = { urgent: 4, high: 3, medium: 2, low: 1 }
const STATUS_RANK = { open: 0, 'in-progress': 1, resolved: 2, closed: 3 }
const ALLOWED_PRIORITY = ['low', 'medium', 'high', 'urgent']
const ALLOWED_STATUS = ['open', 'in-progress', 'resolved', 'closed']

function loadDb() {
  const raw = fs.readFileSync(DB_PATH, 'utf8')
  return JSON.parse(raw)
}

function saveDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8')
}

function nextId(items) {
  const max = items.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0)
  return max + 1
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
  if (query.status) {
    list = list.filter((t) => t.status === query.status)
  }
  if (query.priority) {
    list = list.filter((t) => t.priority === query.priority)
  }
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
      copy.sort(
        (a, b) => (PRIORITY_RANK[a.priority] || 0) - (PRIORITY_RANK[b.priority] || 0)
      )
    } else {
      copy.sort(
        (a, b) => (PRIORITY_RANK[b.priority] || 0) - (PRIORITY_RANK[a.priority] || 0)
      )
    }
    return copy
  }
  if (sortField === 'status') {
    if (order === 'desc') {
      copy.sort(
        (a, b) => (STATUS_RANK[b.status] ?? 99) - (STATUS_RANK[a.status] ?? 99)
      )
    } else {
      copy.sort(
        (a, b) => (STATUS_RANK[a.status] ?? 99) - (STATUS_RANK[b.status] ?? 99)
      )
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

const app = express()
const PORT = 3001

app.use(cors({ exposedHeaders: ['X-Total-Count'] }))
app.use(express.json())

app.post('/login', (req, res) => {
  const { email, password } = req.body || {}
  const db = loadDb()
  const user = db.users.find((u) => u.email === email && u.password === password)
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }
  const token = Buffer.from(
    JSON.stringify({ sub: user.id, email: user.email, exp: Date.now() + 86400000 * 7 })
  ).toString('base64')
  const { password: _p, ...safe } = user
  res.json({ accessToken: token, user: safe })
})

app.get('/users', (_req, res) => {
  const db = loadDb()
  const users = db.users.map(({ password: _p, ...u }) => u)
  res.json(users)
})

app.get('/tickets', (req, res) => {
  const db = loadDb()
  let list = filterTickets(db.tickets, req.query)

  const sortField = req.query._sort || 'createdAt'
  const order = (req.query._order || 'desc').toLowerCase()
  list = sortTickets(list, sortField, order)

  const total = list.length
  const hasPage = req.query._page != null && req.query._page !== ''
  const hasLimit = req.query._limit != null && req.query._limit !== ''
  const usePagination = hasPage || hasLimit
  const page = Math.max(1, parseInt(req.query._page, 10) || 1)
  const limit = usePagination
    ? Math.min(100, Math.max(1, parseInt(req.query._limit, 10) || 10))
    : total
  const start = usePagination ? (page - 1) * limit : 0
  const slice = usePagination ? list.slice(start, start + limit) : list

  res.setHeader('X-Total-Count', String(total))
  res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count')
  res.json(slice)
})

app.get('/tickets/:id', (req, res) => {
  const db = loadDb()
  const id = Number(req.params.id)
  const t = db.tickets.find((x) => Number(x.id) === id)
  if (!t) return res.status(404).json({ message: 'Not found' })
  res.json(t)
})

app.post('/tickets', (req, res) => {
  const db = loadDb()
  const body = req.body || {}
  const title = String(body.title || '').trim()
  const customer = String(body.customer || '').trim()
  const priority = body.priority || 'medium'
  const status = body.status || 'open'
  if (title.length < 3) {
    return res.status(400).json({ message: 'Title must be at least 3 characters' })
  }
  if (customer.length < 2) {
    return res.status(400).json({ message: 'Customer must be at least 2 characters' })
  }
  if (!ALLOWED_PRIORITY.includes(priority)) {
    return res.status(400).json({ message: 'Invalid priority' })
  }
  if (!ALLOWED_STATUS.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' })
  }
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
  saveDb(db)
  res.status(201).json(ticket)
})

app.patch('/tickets/:id', (req, res) => {
  const db = loadDb()
  const id = Number(req.params.id)
  const idx = db.tickets.findIndex((x) => Number(x.id) === id)
  if (idx === -1) return res.status(404).json({ message: 'Not found' })
  const cur = db.tickets[idx]
  const patch = req.body || {}
  if ('priority' in patch && !ALLOWED_PRIORITY.includes(patch.priority)) {
    return res.status(400).json({ message: 'Invalid priority' })
  }
  if ('status' in patch && !ALLOWED_STATUS.includes(patch.status)) {
    return res.status(400).json({ message: 'Invalid status' })
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
  if (next.title.length < 3) {
    return res.status(400).json({ message: 'Title must be at least 3 characters' })
  }
  if (next.customer.length < 2) {
    return res.status(400).json({ message: 'Customer must be at least 2 characters' })
  }
  db.tickets[idx] = next
  saveDb(db)
  res.json(next)
})

app.delete('/tickets/:id', (req, res) => {
  const db = loadDb()
  const id = Number(req.params.id)
  const before = db.tickets.length
  db.tickets = db.tickets.filter((x) => Number(x.id) !== id)
  db.comments = db.comments.filter((c) => Number(c.ticketId) !== id)
  saveDb(db)
  if (db.tickets.length === before) return res.status(404).json({ message: 'Not found' })
  res.status(204).end()
})

app.get('/comments', (req, res) => {
  const db = loadDb()
  const ticketId = req.query.ticketId != null ? Number(req.query.ticketId) : null
  let list = db.comments
  if (ticketId != null && !Number.isNaN(ticketId)) {
    list = list.filter((c) => Number(c.ticketId) === ticketId)
  }
  list = [...list].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
  res.json(list)
})

app.post('/comments', (req, res) => {
  const db = loadDb()
  const bodyRaw = req.body || {}
  const ticketId = Number(bodyRaw.ticketId)
  const ticket = db.tickets.find((t) => Number(t.id) === ticketId)
  if (!ticket) return res.status(400).json({ message: 'Invalid ticket' })
  const body = String(bodyRaw.body || '').trim()
  if (!body) return res.status(400).json({ message: 'Comment body is required' })
  const id = nextId(db.comments)
  const comment = {
    id,
    ticketId,
    body,
    authorId: bodyRaw.authorId != null ? Number(bodyRaw.authorId) : null,
    createdAt: new Date().toISOString()
  }
  db.comments.push(comment)
  saveDb(db)
  res.status(201).json(comment)
})

app
  .listen(PORT, () => {
    console.log(`API http://localhost:${PORT}`)
  })
  .on('error', (err) => {
    console.error(err.message)
    process.exit(1)
  })
