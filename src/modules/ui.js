const TOAST_MS = 3000
const queue = []
let container = null

function ensureContainer() {
  if (container) return container
  container = document.createElement('div')
  container.className = 'toast-stack'
  container.setAttribute('aria-live', 'polite')
  document.body.appendChild(container)
  return container
}

let toastSeq = 0

export function dismissToast(id) {
  const i = queue.findIndex((x) => x.id === id)
  if (i === -1) return
  const item = queue[i]
  if (item.timer) clearTimeout(item.timer)
  item.el?.remove()
  queue.splice(i, 1)
}

export function toast(message, type = 'info') {
  const id = ++toastSeq
  const el = ensureContainer()
  const t = document.createElement('div')
  t.className = `toast toast--${type}`
  t.textContent = message
  el.appendChild(t)
  const item = { id, el: t, timer: null }
  queue.push(item)
  item.timer = setTimeout(() => dismissToast(id), TOAST_MS)
  return id
}

let loaderCount = 0
let loaderEl = null

export function showFullscreenLoader(message = 'Loading…') {
  loaderCount++
  if (!loaderEl) {
    loaderEl = document.createElement('div')
    loaderEl.className = 'fullscreen-loader'
    loaderEl.innerHTML =
      '<div class="fullscreen-loader__box"><div class="spinner" aria-hidden="true"></div><p class="fullscreen-loader__text"></p></div>'
    document.body.appendChild(loaderEl)
  }
  loaderEl.querySelector('.fullscreen-loader__text').textContent = message
  loaderEl.hidden = false
}

export function hideFullscreenLoader() {
  loaderCount = Math.max(0, loaderCount - 1)
  if (loaderCount === 0 && loaderEl) {
    loaderEl.hidden = true
  }
}

let modalBackdrop = null
let modalEscapeHandler = null

export function closeModal() {
  if (modalEscapeHandler) {
    document.removeEventListener('keydown', modalEscapeHandler)
    modalEscapeHandler = null
  }
  if (modalBackdrop) {
    modalBackdrop.remove()
    modalBackdrop = null
  }
}

export function openModal({ title, contentNode, onClose } = {}) {
  closeModal()
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
  const dismiss = () => {
    if (!modalBackdrop) return
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
    modalBackdrop.classList.add('modal-backdrop--open')
    const focusable = modalBackdrop.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    focusable?.focus()
  })
  return { close: dismiss }
}

export function confirmDialog(message) {
  closeModal()
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
