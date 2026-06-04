import { apiUrl } from './baseUrl.js'

function authHeaders() {
  const token = localStorage.getItem('deskhub_token')
  const h = { 'Content-Type': 'application/json' }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

export function buildQueryString(state) {
  const params = new URLSearchParams()
  const q = (state.q || '').trim()
  if (q) params.set('q', q)
  if (state.status) params.set('status', state.status)
  if (state.priority) params.set('priority', state.priority)
  if (state.assignedTo) params.set('assignedTo', String(state.assignedTo))

  const sort = state.sort || 'oldest'
  if (sort === 'oldest') {
    params.set('_sort', 'createdAt')
    params.set('_order', 'asc')
  } else if (sort === 'newest') {
    params.set('_sort', 'createdAt')
    params.set('_order', 'desc')
  } else if (sort === 'priority') {
    params.set('_sort', 'priority')
    params.set('_order', 'desc')
  } else if (sort === 'status') {
    params.set('_sort', 'status')
    params.set('_order', 'asc')
  }

  params.set('_page', String(state.page ?? 1))
  params.set('_limit', String(state.limit ?? 10))
  const s = params.toString()
  return `?${s}`
}

export async function listTickets(queryString = '') {
  const qs = queryString.startsWith('?') ? queryString : queryString ? `?${queryString}` : ''
  const url = apiUrl(`/tickets${qs}`)
  const res = await fetch(url, { headers: authHeaders() })
  const totalHeader = res.headers.get('X-Total-Count')
  const total = totalHeader != null ? parseInt(totalHeader, 10) : NaN
  const data = await res.json().catch(() => [])
  if (!res.ok) {
    const err = new Error((data && data.message) || 'Failed to load tickets')
    err.status = res.status
    throw err
  }
  return { tickets: Array.isArray(data) ? data : [], total: Number.isFinite(total) ? total : data.length }
}

export async function getTicket(id) {
  const res = await fetch(apiUrl(`/tickets/${encodeURIComponent(id)}`), { headers: authHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || 'Not found')
  return data
}

export async function createTicket(body) {
  const res = await fetch(apiUrl('/tickets'), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body)
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || 'Create failed')
  return data
}

export async function updateTicket(id, patch) {
  const res = await fetch(apiUrl(`/tickets/${encodeURIComponent(id)}`), {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(patch)
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || 'Update failed')
  return data
}

export async function deleteTicket(id) {
  const res = await fetch(apiUrl(`/tickets/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: authHeaders()
  })
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || 'Delete failed')
  }
}

export async function listComments(ticketId) {
  const qs = new URLSearchParams({ ticketId: String(ticketId) }).toString()
  const res = await fetch(apiUrl(`/comments?${qs}`), { headers: authHeaders() })
  const data = await res.json().catch(() => [])
  if (!res.ok) throw new Error('Failed to load comments')
  return Array.isArray(data) ? data : []
}

export async function addComment({ ticketId, body, authorId }) {
  const res = await fetch(apiUrl('/comments'), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ ticketId, body, authorId })
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || 'Comment failed')
  return data
}

export async function fetchTicketCount(filterQuery) {
  const qs = filterQuery.startsWith('?') ? filterQuery.slice(1) : filterQuery
  const params = new URLSearchParams(qs)
  params.set('_page', '1')
  params.set('_limit', '1')
  const res = await fetch(apiUrl(`/tickets?${params.toString()}`), { headers: authHeaders() })
  const totalHeader = res.headers.get('X-Total-Count')
  await res.json().catch(() => [])
  const total = totalHeader != null ? parseInt(totalHeader, 10) : 0
  return Number.isFinite(total) ? total : 0
}
