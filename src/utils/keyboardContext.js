/**
 * True when the user is likely typing in a field (shortcuts should not fire).
 * @param {EventTarget | null} node
 */
export function isTypingContext(node) {
  if (!(node instanceof Element)) return false
  const tag = node.tagName
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag === 'INPUT') {
    const t = (node.getAttribute('type') || 'text').toLowerCase()
    if (['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'hidden'].includes(t)) {
      return false
    }
    return true
  }
  if (node.isContentEditable) return true
  return Boolean(node.closest('[contenteditable="true"]'))
}
