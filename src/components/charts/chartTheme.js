// Validated categorical palette (see dataviz skill) — 8 hues in a fixed, CVD-safe order.
// Only the first 3 slots are used for all-pairs forms (radar) where every series can sit
// next to every other; bar charts here are single-series so they use the app's own accent.
export const CATEGORICAL = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
}

export function categoricalColor(theme, index) {
  const set = CATEGORICAL[theme] || CATEGORICAL.dark
  return set[index % set.length]
}

export const RANGE_OPTIONS = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'year', label: 'Year' },
  { key: 'all', label: 'All time' },
]

export function formatCompact(n) {
  if (n === null || n === undefined) return '—'
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return `${n}`
}
