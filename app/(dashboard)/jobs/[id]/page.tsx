'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/client'

type QuoteItem = { description: string; cost: string }
type QuoteData = { items: QuoteItem[]; labour: string; notes: string }

type Job = {
  id: string
  type: string
  status: string
  scheduled_at: string | null
  odometer_km: number | null
  created_at: string
  quote_token?: string | null
  quote_data?: QuoteData | null
  checklist_data?: {
    serviceFee?: string
    inspectionFee?: string
    diagFee?: string
    estimates?: { estCost?: string }[]
    labour?: string
    parts?: { qty?: number; price?: string }[]
  } | null
  client_id?: string | null
  vehicle_id?: string | null
  clients?: { id: string; first_name: string; last_name: string; phone: string; email: string } | null
  vehicles?: { id: string; make: string; model: string; year: string; plate: string; odometer_km: number | null } | null
}

const TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pre_purchase: { bg: 'bg-blue-50',   text: 'text-blue-700',   label: 'Pre-Purchase' },
  service:      { bg: 'bg-green-50',  text: 'text-green-700',  label: 'Service'      },
  diagnosis:    { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Diagnosis'    },
  repair:       { bg: 'bg-orange-50', text: 'text-orange-700', label: 'Repair'       },
}

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  in_progress: { label: 'In progress', bg: 'bg-orange-50',   text: 'text-orange-700', dot: 'bg-orange-500'  },
  pending:     { label: 'In progress', bg: 'bg-orange-50',   text: 'text-orange-700', dot: 'bg-orange-500'  },
  completed:   { label: 'Completed',  bg: 'bg-green-50',    text: 'text-green-700',  dot: 'bg-green-500'   },
}

function parseMoney(value: string | number | null | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value !== 'string') return 0
  const normalized = value.replace(/[^0-9.-]/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function getJobValue(job: Job) {
  const data = job.checklist_data
  if (!data) return 0

  if (job.type === 'repair') {
    return (data.estimates || []).reduce((sum, estimate) => sum + parseMoney(estimate.estCost), 0)
  }

  if (job.type === 'service') return parseMoney(data.serviceFee)
  if (job.type === 'pre_purchase') return parseMoney(data.inspectionFee)
  if (job.type === 'diagnosis') return parseMoney(data.diagFee)

  return 0
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)

  const [job, setJob] = useState<Job | null>(null)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [showDelete, setShowDelete] = useState(false)
  const [showStatusConfirm, setShowStatusConfirm] = useState(false)
  const [togglingStatus, setTogglingStatus] = useState(false)
  const [showQuote, setShowQuote] = useState(false)
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([{ description: '', cost: '' }])
  const [quoteLabour, setQuoteLabour] = useState('')
  const [quoteNotes, setQuoteNotes] = useState('')
  const [savingQuote, setSavingQuote] = useState(false)
  const [quoteCopied, setQuoteCopied] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('jobs')
      .select('*, clients(id, first_name, last_name, phone, email), vehicles(id, make, model, year, plate, odometer_km)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          setJob(data as unknown as Job)
          setStatus((data as Job).status)
        }
        setLoading(false)
      })
  }, [id])

  async function handleToggleStatus() {
    const newStatus = status === 'completed' ? 'pending' : 'completed'
    setTogglingStatus(true)
    const supabase = createClient()
    await supabase.from('jobs').update({ status: newStatus }).eq('id', id)
    setStatus(newStatus)
    setTogglingStatus(false)
    setShowStatusConfirm(false)
  }

  async function handleDelete() {
    const supabase = createClient()
    await supabase.from('jobs').delete().eq('id', id)
    router.push('/jobs')
  }

  function openQuoteModal() {
    if (job?.quote_data) {
      setQuoteItems(job.quote_data.items?.length ? job.quote_data.items : [{ description: '', cost: '' }])
      setQuoteLabour(job.quote_data.labour || '')
      setQuoteNotes(job.quote_data.notes || '')
    } else {
      setQuoteItems([{ description: '', cost: '' }])
      setQuoteLabour('')
      setQuoteNotes('')
    }
    setShowQuote(true)
  }

  async function handleSaveQuote() {
    setSavingQuote(true)
    const supabase = createClient()
    const quoteData: QuoteData = { items: quoteItems, labour: quoteLabour, notes: quoteNotes }
    let token = job?.quote_token
    if (!token) {
      token = crypto.randomUUID().replace(/-/g, '').slice(0, 24)
    }
    const { data } = await supabase.from('jobs')
      .update({ quote_token: token, quote_data: quoteData })
      .eq('id', id)
      .select('quote_token, quote_data')
      .single()
    setSavingQuote(false)
    if (data) {
      setJob(prev => prev ? { ...prev, quote_token: data.quote_token, quote_data: data.quote_data } : prev)
    }
    setShowQuote(false)
  }

  function copyQuoteLink() {
    if (!job?.quote_token) return
    navigator.clipboard.writeText(`${window.location.origin}/quote/${job.quote_token}`)
    setQuoteCopied(true)
    setTimeout(() => setQuoteCopied(false), 2000)
  }

  if (loading) return <div className="p-6 text-sm text-neutral-400">Loading…</div>
  if (!job) return <div className="p-6 text-sm text-neutral-400">Job not found.</div>

  const t = TYPE_STYLES[job.type] || { bg: 'bg-neutral-100', text: 'text-neutral-600', label: job.type }
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending
  const clientName = job.clients ? `${job.clients.first_name} ${job.clients.last_name}` : '—'
  const vehicleLabel = job.vehicles ? `${job.vehicles.make} ${job.vehicles.model} ${job.vehicles.year}` : '—'
  const plate = job.vehicles?.plate || '—'
  const amountLabel = formatMoney(getJobValue(job))
  const odometerLabel = job.odometer_km
    ? `${job.odometer_km.toLocaleString()} km`
    : job.vehicles?.odometer_km
      ? `${job.vehicles.odometer_km.toLocaleString()} km`
      : '—'
  const dateLabel = job.scheduled_at
    ? new Date(job.scheduled_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    : new Date(job.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })

  const ctaLabel =
    status === 'completed' ? null : 'Continue →'

  const isCompleted = status === 'completed'

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <button onClick={() => router.back()} className="text-sm text-neutral-500 hover:text-neutral-700 mb-6 flex items-center gap-1">
        ← Back to jobs
      </button>

      {/* Header card */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-4">
        <div className="mb-4 pb-4 border-b border-neutral-100">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${t.bg} ${t.text}`}>{t.label}</span>
              <span className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 ${s.bg} ${s.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot} inline-block`}></span>
                {s.label}
              </span>
            </div>
            {ctaLabel && (
              <button
                onClick={() => router.push(`/jobs/${id}/flow`)}
                className="bg-neutral-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-neutral-700 transition-colors flex-shrink-0"
              >
                {ctaLabel}
              </button>
            )}
          </div>
          <h1 className="text-lg font-semibold text-neutral-900">{t.label}</h1>
          <p className="text-sm text-neutral-500 mt-1">{clientName} · {vehicleLabel} · {dateLabel}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {job.clients?.id ? (
            <button onClick={() => router.push(`/clients/${job.clients!.id}`)} className="text-left hover:opacity-70 transition-opacity">
              <div className="text-xs text-neutral-400 mb-1">Client</div>
              <div className="text-sm font-medium text-neutral-900 underline underline-offset-2">{clientName}</div>
            </button>
          ) : (
            <div>
              <div className="text-xs text-neutral-400 mb-1">Client</div>
              <div className="text-sm font-medium text-neutral-900">{clientName}</div>
            </div>
          )}
          {job.vehicles?.id ? (
            <button onClick={() => router.push(`/vehicles/${job.vehicles!.id}`)} className="text-left hover:opacity-70 transition-opacity">
              <div className="text-xs text-neutral-400 mb-1">Vehicle</div>
              <div className="text-sm font-medium text-neutral-900 underline underline-offset-2">{vehicleLabel}</div>
            </button>
          ) : (
            <div>
              <div className="text-xs text-neutral-400 mb-1">Vehicle</div>
              <div className="text-sm font-medium text-neutral-900">{vehicleLabel}</div>
            </div>
          )}
          {[
            { label: 'Plate',    value: plate },
            { label: 'Date',     value: dateLabel },
            { label: 'Amount',   value: amountLabel },
            { label: 'Odometer', value: odometerLabel },
          ].map((row) => (
            <div key={row.label}>
              <div className="text-xs text-neutral-400 mb-1">{row.label}</div>
              <div className="text-sm font-medium text-neutral-900">{row.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Status banner */}
      {status === 'pending' && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 mb-4">
          <div className="text-sm text-neutral-500 mb-3">This job hasn&apos;t been started yet.</div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={() => setShowStatusConfirm(true)} className="flex-1 bg-green-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-green-700 transition-colors">Mark as completed ✓</button>
            <button onClick={() => router.push(`/jobs/${id}/flow`)} className="flex-1 bg-neutral-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-neutral-700 transition-colors">Continue job →</button>
          </div>
        </div>
      )}

      {status === 'in_progress' && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
          <div className="text-sm text-orange-700 mb-3">This job is in progress. Resume where you left off.</div>
          <button onClick={() => setShowStatusConfirm(true)} className="w-full bg-green-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-green-700 transition-colors">Mark as completed ✓</button>
        </div>
      )}

      {status === 'completed' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-green-700 font-medium">Job completed</div>
            <div className="text-xs text-green-600 mt-0.5">Report generated and sent to client.</div>
          </div>
          <button onClick={() => setShowStatusConfirm(true)} className="text-sm px-4 py-2 border border-neutral-200 bg-white rounded-lg hover:bg-neutral-50 text-neutral-600 flex-shrink-0">Mark as pending</button>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        {status === 'completed' && (
          <button
            onClick={() => router.push(`/jobs/${id}/report`)}
            className="text-sm px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700"
          >
            View report
          </button>
        )}
        {job?.type === 'repair' && (
          <button
            onClick={openQuoteModal}
            className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {job.quote_token ? 'Edit quote' : 'Create quote'}
          </button>
        )}
        {job?.quote_token && (
          <button
            onClick={copyQuoteLink}
            className="text-sm px-4 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600"
          >
            {quoteCopied ? 'Copied!' : 'Copy quote link'}
          </button>
        )}
        <button
          onClick={() => setShowDelete(true)}
          className="text-sm px-4 py-2 border border-red-200 rounded-lg hover:bg-red-50 text-red-600"
        >
          Delete job
        </button>
      </div>

      {/* Status toggle confirmation */}
      {showStatusConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-20">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className={`w-10 h-10 ${isCompleted ? 'bg-neutral-100' : 'bg-green-100'} rounded-full flex items-center justify-center mx-auto mb-4 text-lg`}>
              {isCompleted ? '↩' : '✓'}
            </div>
            <h2 className="text-base font-semibold text-neutral-900 mb-2">
              {isCompleted ? 'Mark as pending?' : 'Mark as completed?'}
            </h2>
            <p className="text-sm text-neutral-500 mb-5">
              {isCompleted
                ? 'This will move the job back to pending.'
                : 'This will mark the job as completed.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowStatusConfirm(false)} className="flex-1 py-2 text-sm border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600">Cancel</button>
              <button onClick={handleToggleStatus} disabled={togglingStatus}
                className={`flex-1 py-2 text-sm text-white rounded-lg disabled:opacity-50 ${isCompleted ? 'bg-neutral-700 hover:bg-neutral-800' : 'bg-green-600 hover:bg-green-700'}`}>
                {togglingStatus ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quote modal */}
      {showQuote && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowQuote(false)}>
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 flex-shrink-0">
              <div>
                <div className="font-semibold text-neutral-900">Repair Quote</div>
                <div className="text-xs text-neutral-400 mt-0.5">Add parts and labour to generate a quote link</div>
              </div>
              <button onClick={() => setShowQuote(false)} className="text-neutral-400 hover:text-neutral-700 text-2xl leading-none w-8 h-8 flex items-center justify-center">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-neutral-500">Items / Parts</label>
                  <button onClick={() => setQuoteItems(p => [...p, { description: '', cost: '' }])}
                    className="text-xs px-2.5 py-1 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700">+ Add row</button>
                </div>
                <div className="space-y-2">
                  {quoteItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        value={item.description}
                        onChange={e => setQuoteItems(p => p.map((r, i) => i === idx ? { ...r, description: e.target.value } : r))}
                        placeholder="Description (e.g. Brake pads)"
                        className="flex-1 text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400" />
                      <input
                        type="number"
                        value={item.cost}
                        onChange={e => setQuoteItems(p => p.map((r, i) => i === idx ? { ...r, cost: e.target.value } : r))}
                        placeholder="$0"
                        className="w-24 text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400" />
                      {quoteItems.length > 1 && (
                        <button onClick={() => setQuoteItems(p => p.filter((_, i) => i !== idx))}
                          className="text-neutral-300 hover:text-red-400 text-lg px-1">×</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              {/* Labour */}
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Labour ($)</label>
                <input type="number" value={quoteLabour} onChange={e => setQuoteLabour(e.target.value)}
                  placeholder="e.g. 150"
                  className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400" />
              </div>
              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Notes <span className="text-neutral-300">(optional)</span></label>
                <textarea value={quoteNotes} onChange={e => setQuoteNotes(e.target.value)}
                  placeholder="e.g. Quote valid for 7 days" rows={2}
                  className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400 resize-none" />
              </div>
              {/* Total preview */}
              {(() => {
                const itemsTotal = quoteItems.reduce((s, i) => s + (Number(i.cost) || 0), 0)
                const labourTotal = Number(quoteLabour) || 0
                const total = itemsTotal + labourTotal
                if (total === 0) return null
                return (
                  <div className="bg-neutral-900 rounded-xl px-4 py-3 flex items-center justify-between">
                    <span className="text-sm text-neutral-400">Total</span>
                    <span className="text-lg font-bold text-white">
                      {new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 }).format(total)}
                    </span>
                  </div>
                )
              })()}
            </div>
            <div className="px-5 py-4 border-t border-neutral-100 flex-shrink-0">
              <button onClick={handleSaveQuote} disabled={savingQuote}
                className="w-full bg-neutral-900 text-white text-sm font-medium py-3 rounded-xl hover:bg-neutral-700 disabled:opacity-50">
                {savingQuote ? 'Saving…' : 'Save & generate link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-20">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-lg">⚠️</div>
            <h2 className="text-base font-semibold text-neutral-900 mb-2">Delete this job?</h2>
            <p className="text-sm text-neutral-500 mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)} className="flex-1 py-2 text-sm border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600">Yes, delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
