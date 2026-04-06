export function formatRelativeTime(ts: number) {
  const diff = Date.now() - ts
  const s = Math.floor(diff / 1000)
  if (s < 45) return '刚刚'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h} 小时前`
  const d = Math.floor(h / 24)
  return `${d} 天前`
}

export function formatUsd(n: number) {
  const sign = n > 0 ? '+' : ''
  return `${sign}$${Math.abs(n).toFixed(2)}`
}

