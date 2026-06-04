export function required(value) {
  const ok = value != null && String(value).trim() !== ''
  return ok ? null : 'Required'
}

export function minLength(n) {
  return (value) => {
    const s = String(value ?? '')
    if (s.length >= n) return null
    return `Must be at least ${n} characters`
  }
}

export function maxLength(n) {
  return (value) => {
    const s = String(value ?? '')
    if (s.length <= n) return null
    return `Must be at most ${n} characters`
  }
}

export function email(value) {
  const s = String(value ?? '').trim()
  if (!s) return null
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(s) ? null : 'Invalid email'
}

export function oneOf(allowed) {
  return (value) => {
    if (allowed.includes(value)) return null
    return 'Invalid choice'
  }
}

export function validateField(value, rules) {
  for (const rule of rules) {
    const err = rule(value)
    if (err) return err
  }
  return null
}

export function validateForm(fields) {
  const errors = {}
  let ok = true
  for (const [key, { value, rules }] of Object.entries(fields)) {
    const err = validateField(value, rules)
    if (err) {
      errors[key] = err
      ok = false
    }
  }
  return { ok, errors }
}
