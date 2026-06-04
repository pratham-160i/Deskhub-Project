import { requireAuth, getCurrentUser, logout } from '../api/auth.js'
import { fetchUsersOnce, userNameById, clearUsersCache } from '../api/users.js'
import {
  getTicket,
  updateTicket,
  deleteTicket,
  listComments,
  addComment
} from '../api/tickets.js'
import { formatDate, formatDateTime } from '../utils/formatDate.js'
import { toast, confirmDialog, showFullscreenLoader, hideFullscreenLoader } from './ui.js'

export function initTicketDetail() {
  if (!requireAuth()) return

  const params = new URLSearchParams(window.location.search)
  const id = params.get('id')
  if (!id) {
    toast('Missing ticket id', 'error')
    window.location.href = 'tickets.html'
    return
  }

  const els = {
    title: document.getElementById('ticket-title'),
    customer: document.getElementById('ticket-customer'),
    created: document.getElementById('ticket-created'),
    desc: document.getElementById('ticket-description'),
    status: document.getElementById('field-status'),
    priority: document.getElementById('field-priority'),
    assignee: document.getElementById('field-assignee'),
    deleteBtn: document.getElementById('btn-delete-ticket'),
    back: document.getElementById('btn-back'),
    commentsList: document.getElementById('comments-list'),
    commentsEmpty: document.getElementById('comments-empty'),
    commentForm: document.getElementById('comment-form'),
    commentBody: document.getElementById('comment-body'),
    logout: document.getElementById('btn-logout')
  }

  let users = []
  let ticket = null

  async function load() {
    showFullscreenLoader('Loading ticket…')
    try {
      const [t, comments, u] = await Promise.all([
        getTicket(id),
        listComments(id),
        fetchUsersOnce()
      ])
      users = u
      ticket = t
      renderTicket()
      fillAssigneeSelect()
      wirePatchHandlers()
      renderComments(comments)
    } catch (e) {
      toast(e.message || 'Failed to load', 'error')
      window.location.href = 'tickets.html'
    } finally {
      hideFullscreenLoader()
    }
  }

  function renderTicket() {
    if (!ticket) return
    els.title.textContent = ticket.title
    els.customer.textContent = ticket.customer
    els.created.textContent = formatDateTime(ticket.createdAt)
    els.desc.textContent = ticket.description || '—'
    els.status.value = ticket.status
    els.priority.value = ticket.priority
    els.assignee.value = ticket.assignedTo != null ? String(ticket.assignedTo) : ''
  }

  function fillAssigneeSelect() {
    els.assignee.innerHTML = '<option value="">Unassigned</option>'
    for (const u of users) {
      const o = document.createElement('option')
      o.value = String(u.id)
      o.textContent = u.name
      els.assignee.appendChild(o)
    }
    if (ticket?.assignedTo != null) els.assignee.value = String(ticket.assignedTo)
  }

  function wirePatchHandlers() {
    els.status.onchange = async () => {
      try {
        await updateTicket(id, { status: els.status.value })
        toast('Status updated', 'success')
        ticket = await getTicket(id)
        renderTicket()
      } catch (e) {
        toast(e.message || 'Update failed', 'error')
        els.status.value = ticket.status
      }
    }
    els.priority.onchange = async () => {
      try {
        await updateTicket(id, { priority: els.priority.value })
        toast('Priority updated', 'success')
        ticket = await getTicket(id)
        renderTicket()
      } catch (e) {
        toast(e.message || 'Update failed', 'error')
        els.priority.value = ticket.priority
      }
    }
    els.assignee.onchange = async () => {
      const v = els.assignee.value
      try {
        await updateTicket(id, { assignedTo: v === '' ? null : Number(v) })
        toast('Assignee updated', 'success')
        ticket = await getTicket(id)
        renderTicket()
      } catch (e) {
        toast(e.message || 'Update failed', 'error')
        els.assignee.value = ticket.assignedTo != null ? String(ticket.assignedTo) : ''
      }
    }
  }

  function renderComments(comments) {
    els.commentsList.replaceChildren()
    if (!comments.length) {
      els.commentsEmpty.hidden = false
      return
    }
    els.commentsEmpty.hidden = true
    const frag = document.createDocumentFragment()
    for (const c of comments) {
      const li = document.createElement('li')
      li.className = 'comment-item'
      const meta = document.createElement('div')
      meta.className = 'comment-meta'
      const author = userNameById(users, c.authorId)
      meta.textContent = `${author} · ${formatDateTime(c.createdAt)}`
      const body = document.createElement('div')
      body.className = 'comment-body'
      body.textContent = c.body
      li.appendChild(meta)
      li.appendChild(body)
      frag.appendChild(li)
    }
    els.commentsList.appendChild(frag)
  }

  els.commentForm.addEventListener('submit', async (ev) => {
    ev.preventDefault()
    const body = els.commentBody.value.trim()
    if (!body) return
    const me = getCurrentUser()
    showFullscreenLoader('Posting…')
    try {
      await addComment({
        ticketId: Number(id),
        body,
        authorId: me?.id ?? null
      })
      els.commentBody.value = ''
      const comments = await listComments(id)
      renderComments(comments)
      toast('Comment added', 'success')
    } catch (e) {
      toast(e.message || 'Could not add comment', 'error')
    } finally {
      hideFullscreenLoader()
    }
  })

  els.deleteBtn.addEventListener('click', async () => {
    const ok = await confirmDialog('Are you sure you want to delete this ticket?')
    if (!ok) return
    showFullscreenLoader('Deleting…')
    try {
      await deleteTicket(id)
      toast('Ticket deleted', 'success')
      window.location.href = 'tickets.html'
    } catch (e) {
      toast(e.message || 'Delete failed', 'error')
    } finally {
      hideFullscreenLoader()
    }
  })

  els.back.addEventListener('click', () => {
    window.location.href = 'tickets.html'
  })

  els.logout?.addEventListener('click', () => {
    logout()
    clearUsersCache()
    window.location.href = 'login.html'
  })

  load()
}
