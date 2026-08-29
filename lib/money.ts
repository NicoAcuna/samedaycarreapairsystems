// Shared money helpers. These were copy-pasted across jobs, mechanics, and quote
// pages; keeping one source of truth so revenue figures can't drift apart.

export function parseMoney(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  if (typeof v !== 'string') return 0
  const n = Number(v.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

type JobLike = {
  type: string
  checklist_data?: Record<string, any> | null
}

// Billable value of a job, by type.
export function jobValue(job: JobLike): number {
  const d = job.checklist_data
  if (!d) return 0
  if (job.type === 'repair')       return (d.estimates || []).reduce((s: number, e: { estCost?: string }) => s + parseMoney(e.estCost), 0)
  if (job.type === 'service')      return parseMoney(d.serviceFee)
  if (job.type === 'pre_purchase') return parseMoney(d.inspectionFee)
  if (job.type === 'diagnosis')    return parseMoney(d.diagFee)
  return 0
}

export function formatAUD(n: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n)
}
