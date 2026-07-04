export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return `$${value.toFixed(2)}`
}

export function formatUsdSpend(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '$0.00'
  if (value < 0.01) return '< $0.01'
  return `$${value.toFixed(2)}`
}
