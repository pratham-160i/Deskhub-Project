export function debounce(fn, wait = 300) {
  let t = null
  function debounced(...args) {
    if (t) clearTimeout(t)
    t = setTimeout(() => {
      t = null
      fn.apply(this, args)
    }, wait)
  }
  debounced.cancel = () => {
    if (t) clearTimeout(t)
    t = null
  }
  return debounced
}
