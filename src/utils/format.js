export function money(value) {
  return `Q${Number(value || 0).toFixed(2)}`
}

export function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function couponCode() {
  return `MALL-${Date.now().toString(36).toUpperCase()}`
}
