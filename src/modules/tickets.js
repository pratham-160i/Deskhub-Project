import { requireAuth, logout } from '../api/auth.js'
import { fetchUsersOnce, userNameById, clearUsersCache } from '../api/users.js'
import { buildQueryString, listTickets, createTicket } from '../api/tickets.js'
import { formatDate } from '../utils/formatDate.js'
import { debounce } from '../utils/debounce.js'
import { openModal, closeModal, toast, showFullscreenLoader, hideFullscreenLoader } from './ui.js'
import { validateField, validateForm, required, minLength, maxLength, oneOf } from './form.js'

const defaultState = () => ({
  q: '',
  status: '',
  priority: '',
  assignedTo: '',
  sort: '',
  page: 1,
  limit: 10
})

function readStateFromUrl() {
  const p = new URLSearchParams(window.location.search)
  const s = defaultState()
  if (p.has('q')) s.q = p.get('q') || ''
  if (p.has('status')) s.status = p.get('status') || ''
  if (p.has('priority')) s.priority = p.get('priority') || ''
  if (p.has('assignedTo')) s.assignedTo = p.get('assignedTo') || ''
  if (p.has('sort')) s.sort = p.get('sort') || ''
  if (p.has('page')) s.page = Math.max(1, parseInt(p.get('page'), 10) || 1)
  return s
}

function writeStateToUrl(state) {
  const p = new URLSearchParams()
  if (state.q.trim()) p.set('q', state.q.trim())
  if (state.status) p.set('status', state.status)
  if (state.priority) p.set('priority', state.priority)
  if (state.assignedTo) p.set('assignedTo', String(state.assignedTo))
  if (state.sort) p.set('sort', state.sort)
  if (state.page > 1) p.set('page', String(state.page))
  const qs = p.toString()
  const url = `${window.location.pathname}${qs ? `?${qs}` : ''}`
  window.history.replaceState(state, '', url)
}

function exportCsv(tickets, users) {
  const headers = ['ID', 'Title', 'Customer', 'Priority', 'Status', 'Assignee', 'Created']
  const rows = tickets.map((t) => [
    t.id,
    `"${String(t.title).replace(/"/g, '""')}"`,
    `"${String(t.customer).replace(/"/g, '""')}"`,
    t.priority,
    t.status,
    `"${userNameById(users, t.assignedTo).replace(/"/g, '""')}"`,
    t.createdAt
  ])
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'tickets.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

export function initTicketsList() {
  if (!requireAuth()) return

  const els = {
    loading: document.getElementById('tickets-loading'),
    error: document.getElementById('tickets-error'),
    empty: document.getElementById('tickets-empty'),
    tableWrap: document.getElementById('tickets-table-wrap'),
    tbody: document.querySelector('#tickets-table tbody'),
    retry: document.getElementById('tickets-retry'),
    search: document.getElementById('filter-search'),
    status: document.getElementById('filter-status'),
    priority: document.getElementById('filter-priority'),
    assignee: document.getElementById('filter-assignee'),
    sort: document.getElementById('filter-sort'),
    pagination: document.getElementById('tickets-pagination'),
    pageInfo: document.getElementById('tickets-page-info'),
    prev: document.getElementById('page-prev'),
    next: document.getElementById('page-next'),
    pages: document.getElementById('page-numbers'),
    newBtn: document.getElementById('btn-new-ticket'),
    exportBtn: document.getElementById('btn-export-csv'),
    resetBtn: document.getElementById('btn-filter-reset'),
    logout: document.getElementById('btn-logout')
  }

  let users = []
  let lastTotal = 0
  const state = readStateFromUrl()

  els.pagination.hidden = true

  async function boot() {
    try {
      users = await fetchUsersOnce()
      fillAssigneeDropdown()
      syncFiltersFromState()
      await refresh()
    } catch (e) {
      showError(e.message || 'Could not load users')
    }
  }

  function fillAssigneeDropdown() {
    els.assignee.innerHTML = '<option value="">All assignees</option>'
    for (const u of users) {
      const o = document.createElement('option')
      o.value = String(u.id)
      o.textContent = u.name
      els.assignee.appendChild(o)
    }
  }

  function syncFiltersFromState() {
    els.search.value = state.q
    els.status.value = state.status
    els.priority.value = state.priority
    els.assignee.value = state.assignedTo
    els.sort.value = state.sort
  }

  function showLoading() {
    els.loading.hidden = false
    els.error.hidden = true
    els.empty.hidden = true
    els.tableWrap.hidden = true
    els.pagination.hidden = true
  }

  function showError(msg) {
    els.loading.hidden = true
    els.error.hidden = false
    els.empty.hidden = true
    els.tableWrap.hidden = true
    els.pagination.hidden = true
    const p = els.error.querySelector('.tickets-error__text')
    if (p) p.textContent = msg
  }

  function showEmpty() {
    els.loading.hidden = true
    els.error.hidden = true
    els.empty.hidden = false
    els.tableWrap.hidden = true
    els.pagination.hidden = false
  }

  function showTable() {
    els.loading.hidden = true
    els.error.hidden = true
    els.empty.hidden = true
    els.tableWrap.hidden = false
    els.pagination.hidden = false
  }

  async function refresh() {
    showLoading()
    writeStateToUrl(state)
    try {
      const qs = buildQueryString(state)
      const { tickets, total } = await listTickets(qs)
      lastTotal = total
      const totalPages = Math.max(1, Math.ceil(total / state.limit))
      if (state.page > totalPages) {
        state.page = totalPages
        return refresh()
      }
      renderTable(tickets)
      renderPagination(total, totalPages)
      if (tickets.length === 0) showEmpty()
      else showTable()
    } catch (e) {
      showError(e.message || 'Network error — is the API running?')
    }
  }

  const debouncedRefresh = debounce(refresh, 300)

  function renderTable(tickets) {
    const rows = tickets.map((t) => {
      const tr = document.createElement('tr')
      tr.className = 'tickets-row'
      tr.dataset.id = String(t.id)
      const cells = [
        String(t.id),
        t.title,
        t.customer,
        t.priority,
        t.status,
        userNameById(users, t.assignedTo),
        formatDate(t.createdAt)
      ]
      for (const text of cells) {
        const td = document.createElement('td')
        td.textContent = text
        tr.appendChild(td)
      }
      tr.addEventListener('click', () => {
        window.location.href = `ticket-detail.html?id=${encodeURIComponent(t.id)}`
      })
      return tr
    })
    els.tbody.replaceChildren(...rows)
  }

  function renderPagination(total, totalPages) {
    els.pageInfo.textContent = `Page ${state.page} of ${totalPages} (${total} tickets)`
    els.prev.disabled = state.page <= 1
    els.next.disabled = state.page >= totalPages
    els.pages.replaceChildren()
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'page-num' + (i === state.page ? ' page-num--active' : '')
      btn.textContent = String(i)
      btn.addEventListener('click', () => {
        if (state.page !== i) {
          state.page = i
          refresh()
        }
      })
      els.pages.appendChild(btn)
    }
  }

  els.retry.addEventListener('click', () => refresh())

  els.search.addEventListener('input', () => {
    state.q = els.search.value
    state.page = 1
    debouncedRefresh()
  })

  for (const [el, key] of [
    [els.status, 'status'],
    [els.priority, 'priority'],
    [els.assignee, 'assignedTo'],
    [els.sort, 'sort']
  ]) {
    el.addEventListener('change', () => {
      state[key] = el.value
      state.page = 1
      refresh()
    })
  }

  els.resetBtn?.addEventListener('click', () => {
    Object.assign(state, defaultState())
    syncFiltersFromState()
    refresh()
  })

  els.prev.addEventListener('click', () => {
    if (state.page > 1) {
      state.page--
      refresh()
    }
  })
  els.next.addEventListener('click', () => {
    const totalPages = Math.max(1, Math.ceil(lastTotal / state.limit))
    if (state.page < totalPages) {
      state.page++
      refresh()
    }
  })

  window.addEventListener('popstate', () => {
    Object.assign(state, readStateFromUrl())
    syncFiltersFromState()
    refresh()
  })

  els.newBtn?.addEventListener('click', () => openCreateModal())

  els.exportBtn?.addEventListener('click', async () => {
    try {
      showFullscreenLoader('Exporting…')
      const snapshot = { ...state, page: 1, limit: 1000 }
      const qs = buildQueryString(snapshot)
      const { tickets } = await listTickets(qs)
      exportCsv(tickets, users)
      toast('CSV downloaded', 'success')
    } catch (e) {
      toast(e.message || 'Export failed', 'error')
    } finally {
      hideFullscreenLoader()
    }
  })

  els.logout?.addEventListener('click', () => {
    logout()
    clearUsersCache()
    window.location.href = 'login.html'
  })

  function openCreateModal() {
    const form = document.createElement('form')
    form.className = 'stack'
    form.innerHTML = `
      <label class="field"><span>Title</span><input name="title" type="text" required maxlength="120" /></label>
      <p class="field-error" data-err="title" hidden></p>
      <label class="field"><span>Customer</span><input name="customer" type="text" required maxlength="80" /></label>
      <p class="field-error" data-err="customer" hidden></p>
      <label class="field"><span>Priority</span>
        <select name="priority">
          <option value="low">low</option>
          <option value="medium" selected>medium</option>
          <option value="high">high</option>
          <option value="urgent">urgent</option>
        </select></label>
      <p class="field-error" data-err="priority" hidden></p>
      <label class="field"><span>Status</span>
        <select name="status">
          <option value="open" selected>open</option>
          <option value="in-progress">in-progress</option>
          <option value="resolved">resolved</option>
          <option value="closed">closed</option>
        </select></label>
      <label class="field"><span>Assignee</span><select name="assignedTo"></select></label>
      <label class="field"><span>Description</span><textarea name="description" rows="3" maxlength="2000"></textarea></label>
      <p class="field-error" data-err="description" hidden></p>
      <div class="modal-actions">
        <button type="button" class="btn btn--ghost" data-cancel>Cancel</button>
        <button type="submit" class="btn btn--primary" data-submit>Create</button>
      </div>`
    const sel = form.querySelector('[name="assignedTo"]')
    for (const u of users) {
      const o = document.createElement('option')
      o.value = String(u.id)
      o.textContent = u.name
      sel.appendChild(o)
    }
    const rules = {
      title: [required, minLength(3), maxLength(120)],
      customer: [required, minLength(2), maxLength(80)],
      priority: [required, oneOf(['low', 'medium', 'high', 'urgent'])],
      description: [maxLength(2000)]
    }
    function fieldEl(name) {
      return form.querySelector(`[name="${name}"]`)
    }
    function errEl(name) {
      return form.querySelector(`[data-err="${name}"]`)
    }
    function showErr(name, msg) {
      const e = errEl(name)
      if (!e) return
      if (msg) {
        e.textContent = msg
        e.hidden = false
      } else {
        e.textContent = ''
        e.hidden = true
      }
    }
    function runField(name) {
      const el = fieldEl(name)
      const v = el?.type === 'select-one' || el?.tagName === 'SELECT' ? el.value : el?.value
      const msg = validateField(v, rules[name] || [])
      showErr(name, msg)
      return !msg
    }
    function validateAll() {
      const { ok, errors } = validateForm({
        title: { value: fieldEl('title').value, rules: rules.title },
        customer: { value: fieldEl('customer').value, rules: rules.customer },
        priority: { value: fieldEl('priority').value, rules: rules.priority },
        description: { value: fieldEl('description').value, rules: rules.description }
      })
      for (const k of Object.keys(rules)) {
        showErr(k, errors[k] || '')
      }
      return ok
    }
    function formIsValid() {
      const { ok } = validateForm({
        title: { value: fieldEl('title').value, rules: rules.title },
        customer: { value: fieldEl('customer').value, rules: rules.customer },
        priority: { value: fieldEl('priority').value, rules: rules.priority },
        description: { value: fieldEl('description').value, rules: rules.description }
      })
      return ok
    }
    for (const name of Object.keys(rules)) {
      fieldEl(name)?.addEventListener('blur', () => runField(name))
    }
    const submitBtn = form.querySelector('[data-submit]')
    function updateSubmitState() {
      submitBtn.disabled = !formIsValid()
    }
    form.addEventListener('input', () => {
      updateSubmitState()
    })
    openModal({
      title: 'New ticket',
      contentNode: form
    })
    form.querySelector('[data-cancel]').addEventListener('click', () => {
      closeModal()
    })
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault()
      if (!validateAll()) {
        toast('Fix the highlighted fields', 'error')
        return
      }
      submitBtn.disabled = true
      showFullscreenLoader('Creating…')
      try {
        const assignRaw = fieldEl('assignedTo').value
        const assignedTo =
          assignRaw === '' || !Number.isFinite(Number(assignRaw)) ? null : Number(assignRaw)
        await createTicket({
          title: fieldEl('title').value.trim(),
          customer: fieldEl('customer').value.trim(),
          priority: fieldEl('priority').value,
          status: fieldEl('status').value,
          assignedTo,
          description: fieldEl('description').value.trim()
        })
        closeModal()
        toast('Ticket created', 'success')
        state.page = 1
        await refresh()
      } catch (e) {
        toast(e.message || 'Create failed', 'error')
      } finally {
        hideFullscreenLoader()
        submitBtn.disabled = false
      }
    })
    updateSubmitState()
  }

  boot()
}
