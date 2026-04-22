'use client'

import { use, useEffect, useState } from 'react'

type QuoteItem = { description: string; cost: string }
type QuoteData = {
  items: QuoteItem[]
  labour: string
  notes: string
}
type QuoteJob = {
  id: string
  created_at: string
  quote_data: QuoteData
  clients?: { first_name: string; last_name: string; phone: string } | null
  vehicles?: { make: string; model: string; year: string; plate: string; rego_state: string | null } | null
  company?: { name: string; phone: string; address: string } | null
}

function parseMoney(v: string | number | null | undefined) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  if (typeof v !== 'string') return 0
  const n = Number(v.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 }).format(n)
}

export default function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [quote, setQuote] = useState<QuoteJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/quote/${token}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { setNotFound(true); setLoading(false); return }
        setQuote(data)
        setLoading(false)
      })
  }, [token])

  if (loading) return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <p className="text-sm text-neutral-400">Loading…</p>
    </div>
  )

  if (notFound || !quote) return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <p className="text-sm text-neutral-400">Quote not found.</p>
    </div>
  )

  const qd = quote.quote_data
  const items = qd?.items || []
  const labour = parseMoney(qd?.labour)
  const subtotal = items.reduce((s, i) => s + parseMoney(i.cost), 0)
  const total = subtotal + labour
  const clientName = quote.clients ? `${quote.clients.first_name} ${quote.clients.last_name}` : '—'
  const vehicleName = quote.vehicles ? `${quote.vehicles.make} ${quote.vehicles.model} ${quote.vehicles.year}` : '—'
  const plate = quote.vehicles?.plate
    ? `${quote.vehicles.plate}${quote.vehicles.rego_state ? ` (${quote.vehicles.rego_state})` : ''}`
    : '—'
  const date = new Date(quote.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="bg-neutral-900 rounded-t-2xl px-6 py-5 text-white">
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">Repair Quote</div>
          <div className="text-xl font-bold">{quote.company?.name || 'Same Day Car Repair'}</div>
          {quote.company?.phone && <div className="text-sm text-neutral-400 mt-0.5">{quote.company.phone}</div>}
        </div>

        {/* Vehicle & Client info */}
        <div className="bg-white border-x border-neutral-200 px-6 py-4 grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-neutral-400 mb-1">Client</div>
            <div className="text-sm font-medium text-neutral-900">{clientName}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-400 mb-1">Date</div>
            <div className="text-sm font-medium text-neutral-900">{date}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-400 mb-1">Vehicle</div>
            <div className="text-sm font-medium text-neutral-900">{vehicleName}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-400 mb-1">Plate / Rego</div>
            <div className="text-sm font-medium text-neutral-900">{plate}</div>
          </div>
        </div>

        {/* Line items */}
        <div className="bg-white border-x border-t border-neutral-200">
          <div className="grid grid-cols-[1fr_auto] px-6 py-2 bg-neutral-50 border-b border-neutral-100">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Description</span>
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider text-right">Cost</span>
          </div>
          {items.filter(i => i.description).map((item, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_auto] px-6 py-3 border-b border-neutral-50">
              <span className="text-sm text-neutral-800">{item.description}</span>
              <span className="text-sm text-neutral-900 font-medium text-right">{fmt(parseMoney(item.cost))}</span>
            </div>
          ))}
          {labour > 0 && (
            <div className="grid grid-cols-[1fr_auto] px-6 py-3 border-b border-neutral-50">
              <span className="text-sm text-neutral-800">Labour</span>
              <span className="text-sm text-neutral-900 font-medium text-right">{fmt(labour)}</span>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="bg-neutral-900 border-x border-neutral-200 px-6 py-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Total</span>
          <span className="text-lg font-bold text-white">{fmt(total)}</span>
        </div>

        {/* Notes */}
        {qd?.notes && (
          <div className="bg-white border border-t-0 border-neutral-200 px-6 py-4 rounded-b-2xl">
            <div className="text-xs text-neutral-400 mb-1">Notes</div>
            <p className="text-sm text-neutral-700 whitespace-pre-wrap">{qd.notes}</p>
          </div>
        )}
        {!qd?.notes && <div className="bg-white border border-t-0 border-neutral-200 rounded-b-2xl h-2" />}

        <p className="text-center text-xs text-neutral-400 mt-6">This quote is informative only and subject to change.</p>
      </div>
    </div>
  )
}
