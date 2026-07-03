export function formatTime(date) {
  let hours = date.getHours()
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  if (hours === 0) hours = 12
  return `${hours}:${minutes} ${ampm}`
}

export function formatDateTime(value) {
  if (!value) return '—'
  // Firestore Timestamp has a .seconds field; plain ISO strings don't
  const date = value.seconds ? new Date(value.seconds * 1000) : new Date(value)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleString()
}
