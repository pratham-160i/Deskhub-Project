const TOAST_MS = 3500
const MAX_TOASTS = 6
const LOADER_MIN_VISIBLE_MS = 280

const queue = []
let container = null

function ensureContainer() {
  if (container?.isConnected) return container
  container = null
  container = document.createElement('div')
  container.className = 'toast-stack'
  container.setAttribute('aria-live', 'polite')
  container.setAttribute('aria-relevant', 'additions')
  document.body.appendChild(container)
  return container
}

let toastSeq = 0

export function dismissToast(id, options = {}) {
  const immediate = options.immediate === true
  const i = queue.findIndex((x) => x.id === id)
  if (i === -1) return
  const item = queue[i]
  if (item.timer) clearTimeout(item.timer)
  item.timer = null
  queue.splice(i, 1)
  if (!item.el) return
  if (immediate) {
    item.el.remove()
    return
  }
  item.el.classList.remove('toast--in')
  const el = item.el
  const removeNode = () => {
    el.remove()
  }
  let done = false
  const finish = () => {
    if (done) return
    done = true
    el.removeEventListener('transitionend', onEnd)
    clearTimeout(fallback)
    removeNode()
  }
  const onEnd = (e) => {
    if (e.propertyName === 'opacity' || e.propertyName === 'transform') finish()
  }
  el.addEventListener('transitionend', onEnd)
  const fallback = setTimeout(finish, 400)
}

export function toast(message, type = 'info') {
  while (queue.length >= MAX_TOASTS) {
    dismissToast(queue[0].id, { immediate: true })
  }
  const id = ++toastSeq
  const stack = ensureContainer()
  const t = document.createElement('div')
  t.className = `toast toast--${type}`
  t.setAttribute('role', 'status')
  t.textContent = message
  stack.appendChild(t)
  const item = { id, el: t, timer: null }
  queue.push(item)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      t.classList.add('toast--in')
    })
  })
  item.timer = setTimeout(() => dismissToast(id), TOAST_MS)
  return id
}

let loaderCount = 0
let loaderEl = null
let loaderShownAt = 0
let hideLoaderTimer = null

export function showFullscreenLoader(message = 'Loading…') {
  if (hideLoaderTimer != null) {
    clearTimeout(hideLoaderTimer)
    hideLoaderTimer = null
  }
  if (loaderEl != null && !loaderEl.isConnected) {
    loaderEl = null
    loaderCount = 0
    loaderShownAt = 0
  }
  loaderCount++
  if (loaderCount === 1) {
    loaderShownAt = Date.now()
  }
  if (!loaderEl) {
    loaderEl = document.createElement('div')
    loaderEl.className = 'fullscreen-loader'
    loaderEl.innerHTML =
      '<div class="fullscreen-loader__box"><div class="spinner" aria-hidden="true"></div><p class="fullscreen-loader__text"></p></div>'
    document.body.appendChild(loaderEl)
  }
  const textEl = loaderEl.querySelector('.fullscreen-loader__text')
  if (textEl) textEl.textContent = message
  loaderEl.hidden = false
  loaderEl.setAttribute('aria-busy', 'true')
}

export function hideFullscreenLoader() {
  loaderCount = Math.max(0, loaderCount - 1)
  if (loaderCount > 0) return
  if (!loaderEl || !loaderEl.isConnected) {
    loaderEl = null
    return
  }
  const elapsed = Date.now() - loaderShownAt
  const wait = Math.max(0, LOADER_MIN_VISIBLE_MS - elapsed)
  if (hideLoaderTimer != null) clearTimeout(hideLoaderTimer)
  hideLoaderTimer = setTimeout(() => {
    hideLoaderTimer = null
    if (loaderCount !== 0) return
    loaderEl?.setAttribute('aria-busy', 'false')
    if (loaderEl) loaderEl.hidden = true
  }, wait)
}

let modalBackdrop = null
let modalEscapeHandler = null

function removeModalListeners() {
  if (modalEscapeHandler) {
    document.removeEventListener('keydown', modalEscapeHandler)
    modalEscapeHandler = null
  }
}

function detachModalBackdrop(backdrop) {
  let done = false
  const finish = () => {
    if (done) return
    done = true
    backdrop.removeEventListener('transitionend', onEnd)
    clearTimeout(fallback)
    backdrop.remove()
  }
  const onEnd = (e) => {
    if (e.target === backdrop && e.propertyName === 'opacity') finish()
  }
  backdrop.addEventListener('transitionend', onEnd)
  const fallback = setTimeout(finish, 400)
  backdrop.classList.remove('modal-backdrop--open')
}

export function closeModal(options = {}) {
  const immediate = options.immediate === true
  removeModalListeners()
  const bd = modalBackdrop
  modalBackdrop = null
  if (!bd) return
  if (immediate) {
    bd.remove()
    return
  }
  detachModalBackdrop(bd)
}

export function openModal({ title, contentNode, onClose } = {}) {
  closeModal({ immediate: true })
  modalBackdrop = document.createElement('div')
  modalBackdrop.className = 'modal-backdrop'
  modalBackdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <header class="modal__header"><h2 class="modal__title"></h2>
      <button type="button" class="modal__close" aria-label="Close">×</button></header>
      <div class="modal__body"></div>
    </div>`
  modalBackdrop.querySelector('.modal__title').textContent = title || ''
  const body = modalBackdrop.querySelector('.modal__body')
  body.replaceChildren(contentNode)
  let closing = false
  const dismiss = () => {
    if (closing || !modalBackdrop) return
    closing = true
    onClose?.()
    closeModal()
  }
  modalBackdrop.querySelector('.modal__close').addEventListener('click', dismiss)
  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) dismiss()
  })
  modalEscapeHandler = (e) => {
    if (e.key === 'Escape') dismiss()
  }
  document.addEventListener('keydown', modalEscapeHandler)
  document.body.appendChild(modalBackdrop)
  requestAnimationFrame(() => {
    modalBackdrop?.classList.add('modal-backdrop--open')
    const focusable = modalBackdrop?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    focusable?.focus()
  })
  return { close: dismiss }
}

export function confirmDialog(message) {
  closeModal({ immediate: true })
  return new Promise((resolve) => {
    const backdrop = document.createElement('div')
    backdrop.className = 'modal-backdrop'
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <header class="modal__header"><h2 class="modal__title">Confirm</h2>
        <button type="button" class="modal__close" aria-label="Close">×</button></header>
        <div class="modal__body">
          <p class="confirm-msg"></p>
          <div class="confirm-actions">
            <button type="button" class="btn btn--ghost" data-act="no">Cancel</button>
            <button type="button" class="btn btn--danger" data-act="yes">Yes</button>
          </div>
        </div>
      </div>`
    backdrop.querySelector('.confirm-msg').textContent = message
    let done = false
    function finish(val) {
      if (done) return
      done = true
      backdrop.classList.remove('modal-backdrop--open')
      setTimeout(() => {
        backdrop.remove()
        document.removeEventListener('keydown', onKey)
        resolve(val)
      }, 200)
    }
    function onKey(e) {
      if (e.key === 'Escape') finish(false)
    }
    document.addEventListener('keydown', onKey)
    backdrop.querySelector('.modal__close').addEventListener('click', () => finish(false))
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) finish(false)
    })
    backdrop.querySelector('[data-act="no"]').addEventListener('click', () => finish(false))
    backdrop.querySelector('[data-act="yes"]').addEventListener('click', () => finish(true))
    document.body.appendChild(backdrop)
    requestAnimationFrame(() => {
      backdrop.classList.add('modal-backdrop--open')
      backdrop.querySelector('[data-act="no"]')?.focus()
    })
  })
}
