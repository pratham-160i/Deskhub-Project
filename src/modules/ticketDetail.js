import { requireAuth, getCurrentUser, logout } from '../api/auth.js'
import { fetchUsersOnce, userNameById, clearUsersCache } from '../api/users.js'
import {
  getTicket,
  updateTicket,
  deleteTicket,
  listComments,
  addComment
} from '../api/tickets.js'
import { formatDateTime } from '../utils/formatDate.js'
import { toast, confirmDialog, showFullscreenLoader, hideFullscreenLoader } from './ui.js'

const PLACEHOLDER_ATTR = 'data-deskhub-placeholder'

function addPlaceholderSelect(select, label) {
  if (select.querySelector(`option[${PLACEHOLDER_ATTR}]`)) return
  const opt = document.createElement('option')
  opt.value = ''
  opt.textContent = label
  opt.setAttribute(PLACEHOLDER_ATTR, '1')
  opt.hidden = false
  select.insertBefore(opt, select.firstChild)
}

function removePlaceholderSelect(select) {
  select.querySelectorAll(`option[${PLACEHOLDER_ATTR}]`).forEach((n) => n.remove())
}

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
    editBtn: document.getElementById('btn-edit-ticket'),
    saveBtn: document.getElementById('btn-save-ticket'),
    cancelBtn: document.getElementById('btn-cancel-edit'),
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

  function setViewMode() {
    els.status.disabled = true
    els.priority.disabled = true
    els.assignee.disabled = true
    els.editBtn.hidden = false
    els.saveBtn.hidden = true
    els.cancelBtn.hidden = true
    removePlaceholderSelect(els.status)
    removePlaceholderSelect(els.priority)
  }

  function setEditMode() {
    addPlaceholderSelect(els.status, 'Select status')
    addPlaceholderSelect(els.priority, 'Select priority')
    els.assignee.innerHTML = '<option value="">Select assignee</option>'
    for (const u of users) {
      const o = document.createElement('option')
      o.value = String(u.id)
      o.textContent = u.name
      els.assignee.appendChild(o)
    }
    els.status.value = ''
    els.priority.value = ''
    els.assignee.value = ''
    els.status.disabled = false
    els.priority.disabled = false
    els.assignee.disabled = false
    els.editBtn.hidden = true
    els.saveBtn.hidden = false
    els.cancelBtn.hidden = false
  }

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
      fillAssigneeSelect()
      renderTicket()
      setViewMode()
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

  els.editBtn.addEventListener('click', () => {
    setEditMode()
  })

  els.cancelBtn.addEventListener('click', () => {
    setViewMode()
    fillAssigneeSelect()
    renderTicket()
  })

  els.saveBtn.addEventListener('click', async () => {
    const status = els.status.value
    const priority = els.priority.value
    const assignRaw = els.assignee.value
    if (!status) {
      toast('Please select a status', 'error')
      return
    }
    if (!priority) {
      toast('Please select a priority', 'error')
      return
    }
    if (!assignRaw) {
      toast('Please select an assignee', 'error')
      return
    }
    showFullscreenLoader('Saving…')
    try {
      await updateTicket(id, {
        status,
        priority,
        assignedTo: Number(assignRaw)
      })
      ticket = await getTicket(id)
      setViewMode()
      fillAssigneeSelect()
      renderTicket()
      toast('Ticket updated', 'success')
    } catch (e) {
      toast(e.message || 'Update failed', 'error')
    } finally {
      hideFullscreenLoader()
    }
  })

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
