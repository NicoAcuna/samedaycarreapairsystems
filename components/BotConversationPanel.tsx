'use client'

import { useEffect, useState } from 'react'
import { Bot, Car, MapPin, Wrench, Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Vehicle = { year: string; make: string; model: string }

type BotConversation = {
  id: string
  lead_id: string
  status: string
  language: string | null
  vehicle: Vehicle | null
  suburb: string | null
  job_type: string | null
  job_description: string | null
  suggested_price: number | null
}

const JOB_TYPE_LABEL: Record<string, string> = {
  diagnosis:  'Diagnosis (on-site)',
  direct_job: 'Direct service',
  client_dx:  'Diagnosis (client suggested part)',
}

const STATUS_STYLE: Record<string, string> = {
  qualifying:               'bg-blue-100 text-blue-700',
  awaiting_quote_approval:  'bg-amber-100 text-amber-700',
  quoted:                   'bg-purple-100 text-purple-700',
  quote_sent:               'bg-purple-100 text-purple-700',
  awaiting_booking_approval:'bg-orange-100 text-orange-700',
  scheduled:                'bg-green-100 text-green-700',
  closed:                   'bg-neutral-100 text-neutral-500',
}

const STATUS_LABEL: Record<string, string> = {
  qualifying:               'Qualifying',
  awaiting_quote_approval:  'Ready to quote',
  quoted:                   'Quote approved',
  quote_sent:               'Quote sent',
  awaiting_booking_approval:'Ready to book',
  scheduled:                'Scheduled',
  closed:                   'Closed',
}

export default function BotConversationPanel({ leadId }: { leadId: string }) {
  const [conv, setConv]     = useState<BotConversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [price, setPrice]   = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    createClient()
      .from('bot_conversations')
      .select('id,lead_id,status,language,vehicle,suburb,job_type,job_description,suggested_price')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { setConv(data); setLoading(false) })
  }, [leadId])

  if (loading || !conv) return null

  async function handleApprove() {
    const num = parseFloat(price)
    if (!price || isNaN(num) || num <= 0) { setError('Enter a valid price'); return }
    setSaving(true); setError('')
    const res = await fetch('/api/bot/approve-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: conv!.id, price: num }),
    })
    if (res.ok) {
      setConv(prev => prev ? { ...prev, status: 'quoted', suggested_price: num } : prev)
    } else {
      setError('Failed to send quote')
    }
    setSaving(false)
  }

  async function handleReject() {
    setSaving(true)
    await createClient().from('bot_conversations').update({ status: 'closed' }).eq('id', conv!.id)
    setConv(prev => prev ? { ...prev, status: 'closed' } : prev)
    setSaving(false)
  }

  const statusStyle = STATUS_STYLE[conv.status] || 'bg-neutral-100 text-neutral-500'
  const statusLabel = STATUS_LABEL[conv.status] || conv.status

  return (
    <div className="bg-white border border-neutral-200 rounded-xl mb-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-100 bg-neutral-50">
        <Bot className="h-4 w-4 text-neutral-500" />
        <span className="text-xs font-semibold text-neutral-700">Bot conversation</span>
        <span className={`ml-auto text-[11px] px-2 py-0.5 rounded-full font-medium ${statusStyle}`}>
          {statusLabel}
        </span>
      </div>

      {/* Gathered info */}
      <div className="divide-y divide-neutral-50">
        {conv.vehicle && (
          <div className="flex items-center gap-2 px-4 py-2.5">
            <Car className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
            <span className="text-xs text-neutral-500">Vehicle</span>
            <span className="ml-auto text-xs font-medium text-neutral-900">
              {conv.vehicle.year} {conv.vehicle.make} {conv.vehicle.model}
            </span>
          </div>
        )}
        {conv.suburb && (
          <div className="flex items-center gap-2 px-4 py-2.5">
            <MapPin className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
            <span className="text-xs text-neutral-500">Suburb</span>
            <span className="ml-auto text-xs font-medium text-neutral-900">{conv.suburb}</span>
          </div>
        )}
        {conv.job_type && (
          <div className="flex items-center gap-2 px-4 py-2.5">
            <Wrench className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
            <span className="text-xs text-neutral-500">Type</span>
            <span className="ml-auto text-xs font-medium text-neutral-900">
              {JOB_TYPE_LABEL[conv.job_type] || conv.job_type}
            </span>
          </div>
        )}
        {conv.job_description && (
          <div className="px-4 py-2.5">
            <div className="text-xs text-neutral-500 mb-1">Problem</div>
            <div className="text-xs text-neutral-700 leading-relaxed">{conv.job_description}</div>
          </div>
        )}
        {conv.suggested_price != null && conv.status !== 'awaiting_quote_approval' && (
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs text-neutral-500">Quote</span>
            <span className="text-xs font-semibold text-neutral-900">${conv.suggested_price} AUD</span>
          </div>
        )}
      </div>

      {/* Approval UI */}
      {conv.status === 'awaiting_quote_approval' && (
        <div className="px-4 py-3 border-t border-amber-100 bg-amber-50">
          <div className="text-xs font-medium text-amber-800 mb-2">
            Set your price — the bot will send the quote to the client automatically
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">$</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="w-full pl-7 pr-3 py-2.5 border border-neutral-200 rounded-xl text-sm bg-white focus:outline-none focus:border-neutral-400"
              />
            </div>
            <button
              onClick={handleApprove}
              disabled={saving}
              className="px-4 py-2.5 bg-neutral-900 text-white text-xs font-medium rounded-xl hover:bg-neutral-700 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
            >
              <Check className="h-3.5 w-3.5" />
              Send quote
            </button>
            <button
              onClick={handleReject}
              disabled={saving}
              title="Reject / close"
              className="px-3 py-2.5 border border-neutral-200 text-neutral-500 rounded-xl hover:bg-neutral-50 disabled:opacity-50 shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {error && <div className="text-xs text-red-600 mt-1.5">{error}</div>}
        </div>
      )}
    </div>
  )
}
