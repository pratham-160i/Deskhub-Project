const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric'
})

const dateTimeFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})

const relFmt = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

function parse(input) {
  if (input == null || input === '') return null
  const d = input instanceof Date ? input : new Date(input)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDate(isoOrDate) {
  const d = parse(isoOrDate)
  if (!d) return '—'
  return dateFmt.format(d)
}

export function formatDateTime(isoOrDate) {
  const d = parse(isoOrDate)
  if (!d) return '—'
  return dateTimeFmt.format(d)
}

export function formatRelative(isoOrDate) {
  const d = parse(isoOrDate)
  if (!d) return '—'
  const diffMs = d.getTime() - Date.now()
  const sec = Math.round(diffMs / 1000)
  const abs = Math.abs(sec)
  if (abs < 60) return relFmt.format(sec, 'second')
  const min = Math.round(sec / 60)
  if (Math.abs(min) < 60) return relFmt.format(min, 'minute')
  const hr = Math.round(sec / 3600)
  if (Math.abs(hr) < 24) return relFmt.format(hr, 'hour')
  const day = Math.round(sec / 86400)
  if (Math.abs(day) < 7) return relFmt.format(day, 'day')
  const week = Math.round(sec / 604800)
  if (Math.abs(week) < 5) return relFmt.format(week, 'week')
  const month = Math.round(sec / 2629800)
  if (Math.abs(month) < 12) return relFmt.format(month, 'month')
  return relFmt.format(Math.round(sec / 31557600), 'year')
}
