import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isTypingContext } from './utils/keyboardContext.js'
import { handleShortcutKeydown } from './modules/keyboardShortcuts.js'
import * as themeModule from './modules/theme.js'
import {
  closeModal,
  confirmDialog,
  dismissToast,
  hideFullscreenLoader,
  openModal,
  showFullscreenLoader,
  toast
} from './modules/ui.js'

function fakeTimersForUi() {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
}

function stubRaf() {
  vi.stubGlobal('requestAnimationFrame', (fn) => {
    fn()
    return 0
  })
}

function loaderIsHidden() {
  const el = document.querySelector('.fullscreen-loader')
  if (!el) return true
  return Boolean(el.hidden)
}

describe('keyboardContext.isTypingContext', () => {
  it('returns false for null and non-Element nodes', () => {
    expect(isTypingContext(null)).toBe(false)
    expect(isTypingContext(undefined)).toBe(false)
    expect(isTypingContext(document)).toBe(false)
    expect(isTypingContext(document.createTextNode('x'))).toBe(false)
  })

  it('returns true for textarea and select', () => {
    const ta = document.createElement('textarea')
    const sel = document.createElement('select')
    expect(isTypingContext(ta)).toBe(true)
    expect(isTypingContext(sel)).toBe(true)
  })

  it('treats text-like inputs as typing context', () => {
    const text = document.createElement('input')
    text.type = 'text'
    const email = document.createElement('input')
    email.type = 'email'
    const bare = document.createElement('input')
    expect(isTypingContext(text)).toBe(true)
    expect(isTypingContext(email)).toBe(true)
    expect(isTypingContext(bare)).toBe(true)
  })

  it('returns false for button-like inputs', () => {
    for (const type of ['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'hidden']) {
      const el = document.createElement('input')
      el.type = type
      expect(isTypingContext(el), type).toBe(false)
    }
  })

  it('detects contenteditable elements', () => {
    const div = document.createElement('div')
    div.setAttribute('contenteditable', 'true')
    expect(isTypingContext(div)).toBe(true)
    const inner = document.createElement('span')
    inner.textContent = 'x'
    div.appendChild(inner)
    expect(isTypingContext(inner)).toBe(true)
  })
})

describe('ui.js toasts', () => {
  beforeEach(() => {
    document.body.replaceChildren()
    fakeTimersForUi()
    stubRaf()
  })
  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    document.body.replaceChildren()
  })

  it('creates a stacked toast with enter animation class after rAF', () => {
    const id = toast('hello', 'info')
    expect(id).toBeGreaterThan(0)
    const stack = document.querySelector('.toast-stack')
    expect(stack).toBeTruthy()
    expect(stack.querySelectorAll('.toast')).toHaveLength(1)
    expect(stack.querySelector('.toast')?.classList.contains('toast--in')).toBe(true)
  })

  it('dismissToast removes a toast and clears timer', () => {
    toast('a')
    const id = toast('b')
    dismissToast(id)
    vi.advanceTimersByTime(500)
    const stack = document.querySelector('.toast-stack')
    const count = stack ? stack.querySelectorAll('.toast').length : 0
    expect(count).toBeLessThanOrEqual(1)
  })

  it('dismissToast for unknown id is a no-op', () => {
    dismissToast(999999)
  })

  it('dismissToast immediate option removes DOM synchronously', () => {
    const id = toast('z')
    dismissToast(id, { immediate: true })
    expect(document.querySelectorAll('.toast')).toHaveLength(0)
  })

  it('caps stacked toasts and still allows new toast', () => {
    for (let i = 0; i < 8; i++) toast(`m${i}`)
    const n = document.querySelectorAll('.toast').length
    expect(n).toBeLessThanOrEqual(6)
    expect(n).toBeGreaterThan(0)
  })

  it('auto-dismisses after timeout', () => {
    toast('bye')
    vi.advanceTimersByTime(4000)
    expect(document.querySelector('.toast-stack')?.querySelectorAll('.toast').length ?? 0).toBe(0)
  })
})

describe('ui.js fullscreen loader', () => {
  beforeEach(() => {
    document.body.replaceChildren()
    fakeTimersForUi()
    vi.setSystemTime(0)
  })
  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    document.body.replaceChildren()
  })

  it('respects nested show/hide counts', () => {
    showFullscreenLoader('a')
    showFullscreenLoader('b')
    hideFullscreenLoader()
    expect(loaderIsHidden()).toBe(false)
    hideFullscreenLoader()
    vi.advanceTimersByTime(300)
    expect(loaderIsHidden()).toBe(true)
  })

  it('delays hiding until minimum visible time', () => {
    showFullscreenLoader('slow')
    vi.setSystemTime(100)
    hideFullscreenLoader()
    vi.advanceTimersByTime(179)
    expect(loaderIsHidden()).toBe(false)
    vi.advanceTimersByTime(200)
    expect(loaderIsHidden()).toBe(true)
  })

  it('clears pending hide when show is called again', () => {
    showFullscreenLoader('x')
    vi.setSystemTime(5000)
    hideFullscreenLoader()
    vi.advanceTimersByTime(50)
    showFullscreenLoader('y')
    vi.advanceTimersByTime(500)
    expect(loaderIsHidden()).toBe(false)
    hideFullscreenLoader()
    vi.advanceTimersByTime(300)
    expect(loaderIsHidden()).toBe(true)
  })
})

describe('ui.js modal', () => {
  beforeEach(() => {
    document.body.replaceChildren()
    stubRaf()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    closeModal({ immediate: true })
  })

  it('openModal inserts dialog and closeModal({ immediate: true }) removes it', () => {
    const node = document.createElement('p')
    node.textContent = 'body'
    openModal({ title: 'T', contentNode: node })
    expect(document.querySelectorAll('.modal-backdrop')).toHaveLength(1)
    closeModal({ immediate: true })
    expect(document.querySelectorAll('.modal-backdrop')).toHaveLength(0)
  })

  it('openModal replaces an existing modal without throwing', () => {
    openModal({ title: '1', contentNode: document.createElement('span') })
    openModal({ title: '2', contentNode: document.createElement('span') })
    expect(document.querySelectorAll('.modal-backdrop')).toHaveLength(1)
    closeModal({ immediate: true })
  })

  it('closeModal when nothing open is safe', () => {
    closeModal({ immediate: true })
    closeModal()
  })
})

describe('ui.js confirmDialog', () => {
  beforeEach(() => {
    document.body.replaceChildren()
    stubRaf()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    closeModal({ immediate: true })
  })

  it('resolves true when Yes is clicked', async () => {
    const p = confirmDialog('Sure?')
    await vi.waitUntil(() => document.querySelector('[data-act="yes"]') != null)
    document.querySelector('[data-act="yes"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await expect(p).resolves.toBe(true)
  })

  it('resolves false on Cancel', async () => {
    const p = confirmDialog('Nope?')
    await vi.waitUntil(() => document.querySelector('[data-act="no"]') != null)
    document.querySelector('[data-act="no"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await expect(p).resolves.toBe(false)
  })
})

describe('keyboardShortcuts.handleShortcutKeydown', () => {
  beforeEach(() => {
    document.body.replaceChildren()
    document.body.innerHTML =
      '<input id="filter-search" /><button id="btn-new-ticket" type="button"></button>'
    document.body.dataset.page = 'tickets-list'
  })

  it('focuses search on / when not typing', () => {
    const search = document.getElementById('filter-search')
    const spy = vi.spyOn(search, 'focus')
    handleShortcutKeydown(
      new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true })
    )
    expect(spy).toHaveBeenCalled()
  })

  it('does not steal / when focus is in search', () => {
    const search = document.getElementById('filter-search')
    const spy = vi.spyOn(search, 'focus')
    const ev = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true })
    Object.defineProperty(ev, 'target', { value: search, enumerable: true })
    handleShortcutKeydown(ev)
    expect(spy).not.toHaveBeenCalled()
  })

  it('clicks new ticket on n', () => {
    const btn = document.getElementById('btn-new-ticket')
    const spy = vi.spyOn(btn, 'click')
    handleShortcutKeydown(new KeyboardEvent('keydown', { key: 'n', bubbles: true }))
    expect(spy).toHaveBeenCalled()
  })

  it('starts g chord with preventDefault', () => {
    const ev = new KeyboardEvent('keydown', { key: 'g', bubbles: true, cancelable: true })
    const spy = vi.spyOn(ev, 'preventDefault')
    handleShortcutKeydown(ev)
    expect(spy).toHaveBeenCalled()
  })

  it('triggers edit on e when edit button is visible', () => {
    document.body.dataset.page = 'ticket-detail'
    document.body.innerHTML = '<button type="button" id="btn-edit-ticket">Edit</button>'
    const btn = document.getElementById('btn-edit-ticket')
    const spy = vi.spyOn(btn, 'click')
    handleShortcutKeydown(new KeyboardEvent('keydown', { key: 'e', bubbles: true }))
    expect(spy).toHaveBeenCalled()
  })

  it('does not click edit when button is hidden', () => {
    document.body.dataset.page = 'ticket-detail'
    document.body.innerHTML = '<button type="button" id="btn-edit-ticket" hidden>Edit</button>'
    const btn = document.getElementById('btn-edit-ticket')
    const spy = vi.spyOn(btn, 'click')
    handleShortcutKeydown(new KeyboardEvent('keydown', { key: 'e', bubbles: true }))
    expect(spy).not.toHaveBeenCalled()
  })

  it('m toggles theme', () => {
    document.body.dataset.page = 'dashboard'
    const spy = vi.spyOn(themeModule, 'toggleTheme')
    const ev = new KeyboardEvent('keydown', { key: 'm', bubbles: true, cancelable: true })
    const pd = vi.spyOn(ev, 'preventDefault')
    handleShortcutKeydown(ev)
    expect(pd).toHaveBeenCalled()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('dashboard / is handled (preventDefault)', () => {
    document.body.replaceChildren()
    document.body.dataset.page = 'dashboard'
    const ev = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true })
    const spy = vi.spyOn(ev, 'preventDefault')
    handleShortcutKeydown(ev)
    expect(spy).toHaveBeenCalled()
  })

  it('dashboard t is handled (preventDefault)', () => {
    document.body.replaceChildren()
    document.body.dataset.page = 'dashboard'
    const ev = new KeyboardEvent('keydown', { key: 't', bubbles: true, cancelable: true })
    const spy = vi.spyOn(ev, 'preventDefault')
    handleShortcutKeydown(ev)
    expect(spy).toHaveBeenCalled()
  })
})
