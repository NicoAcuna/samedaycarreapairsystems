'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'

type Job = {
  id: string
  type: string
  status: string
  scheduled_at: string | null
  created_at: string
  checklist_data?: {
    serviceFee?: string
    inspectionFee?: string
    diagFee?: string
    estimates?: { estCost?: string }[]
    labour?: string
    parts?: { qty?: number; price?: string }[]
  } | null
  clients?: { first_name: string; last_name: string } | null
  vehicles?: { make: string; model: string; year: string } | null
}

const TYPE_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  pre_purchase: { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500',   label: 'Pre-Purchase' },
  service:      { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500',  label: 'Service'      },
  diagnosis:    { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500', label: 'Diagnosis'    },
  repair:       { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500', label: 'Repair'       },
}

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  in_progress: { label: 'In progress', bg: 'bg-orange-50',   text: 'text-orange-700', dot: 'bg-orange-500'  },
  pending:     { label: 'In progress', bg: 'bg-orange-50',   text: 'text-orange-700', dot: 'bg-orange-500'  },
  completed:   { label: 'Completed',  bg: 'bg-green-50',    text: 'text-green-700',  dot: 'bg-green-500'   },
}

const TYPE_FILTERS = ['All', 'pre_purchase', 'service', 'diagnosis', 'repair']
const TYPE_FILTER_LABELS: Record<string, string> = {
  All: 'All', pre_purchase: 'Pre-Purchase', service: 'Service', diagnosis: 'Diagnosis', repair: 'Repair',
}

function isToday(dateStr: string | null) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

function isThisWeek(dateStr: string | null) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const startOfWeek = new Date(now)
  startOfWeek.setHours(0, 0, 0, 0)
  startOfWeek.setDate(now.getDate() + diffToMonday)

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 7)

  return d >= startOfWeek && d < endOfWeek
}

function isOverdue(job: Job) {
  if (job.status === 'completed') return false
  if (job.scheduled_at && new Date(job.scheduled_at) < new Date()) return true
  if (job.status === 'pending') {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    return new Date(job.created_at) < threeDaysAgo
  }
  return false
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

type Filter = 'all' | 'today' | 'in_progress' | 'overdue'

export default function DashboardPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<Filter>('all')
  const [typeFilter, setTypeFilter] = useState('All')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('jobs')
      .select('id, type, status, scheduled_at, created_at, checklist_data, clients(first_name, last_name), vehicles(make, model, year)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setJobs((data as unknown as Job[]) || [])
        setLoading(false)
      })
  }, [])

  // Computed metrics
  const todayJobs     = jobs.filter(j => isToday(j.scheduled_at ?? j.created_at))
  const weekJobs      = jobs.filter(j => isThisWeek(j.scheduled_at ?? j.created_at))
  const inProgressJobs = jobs.filter(j => j.status === 'in_progress' || j.status === 'pending')
  const overdueJobs   = jobs.filter(j => isOverdue(j))
  const todayValue = todayJobs.reduce((sum, job) => sum + getJobValue(job), 0)
  const inProgressValue = inProgressJobs.reduce((sum, job) => sum + getJobValue(job), 0)
  const weekValue = weekJobs.reduce((sum, job) => sum + getJobValue(job), 0)
  const overdueValue = overdueJobs.reduce((sum, job) => sum + getJobValue(job), 0)

  const metrics = [
    { key: 'today',       label: "Today's Jobs",   value: loading ? '…' : formatMoney(todayValue),      sub: loading ? '' : `${todayJobs.length} jobs today`,               dark: true,  red: false },
    { key: 'in_progress', label: 'In Progress',    value: loading ? '…' : formatMoney(inProgressValue), sub: loading ? '' : `${inProgressJobs.length} active jobs`,          dark: false, red: false },
    { key: 'all',         label: 'Weekly Jobs',    value: loading ? '…' : formatMoney(weekValue),       sub: loading ? '' : `${weekJobs.length} jobs this week`,            dark: false, red: false },
    { key: 'overdue',     label: 'Overdue',        value: loading ? '…' : formatMoney(overdueValue),    sub: loading ? '' : `${overdueJobs.length} overdue jobs`,           dark: false, red: true  },
  ]

  const filteredJobs = jobs.filter(job => {
    const matchType = typeFilter === 'All' || job.type === typeFilter
    const matchFilter =
      activeFilter === 'all'         ? true :
      activeFilter === 'today'       ? isToday(job.scheduled_at ?? job.created_at) :
      activeFilter === 'in_progress' ? (job.status === 'in_progress' || job.status === 'pending') :
      activeFilter === 'overdue'     ? isOverdue(job) : true
    return matchType && matchFilter
  })

  const todayStr = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">Dashboard</h1>
        <p className="text-sm text-neutral-500 mt-1">{todayStr}</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
        {metrics.map((m) => (
          <button
            key={m.key}
            onClick={() => setActiveFilter(activeFilter === m.key as Filter ? 'all' : m.key as Filter)}
            className={`rounded-xl p-4 text-left transition-all border ${
              m.dark && activeFilter !== m.key
                ? 'bg-neutral-900 border-neutral-900'
                : activeFilter === m.key
                  ? 'bg-neutral-900 border-neutral-900 ring-2 ring-offset-1 ring-neutral-400'
                  : 'bg-white border-neutral-200 hover:border-neutral-400'
            }`}
          >
            <div className={`text-xs mb-2 ${m.dark || activeFilter === m.key ? 'text-neutral-400' : 'text-neutral-500'}`}>
              {m.label}
            </div>
            <div className={`text-3xl font-semibold ${
              m.dark || activeFilter === m.key ? 'text-white' :
              m.red && Number(m.value) > 0 ? 'text-red-500' : 'text-neutral-900'
            }`}>
              {m.value}
            </div>
            <div className={`text-xs mt-1 ${m.dark || activeFilter === m.key ? 'text-neutral-500' : 'text-neutral-400'}`}>
              {m.sub}
            </div>
          </button>
        ))}
      </div>

      {/* Jobs list */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-100 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-neutral-900">
                {activeFilter === 'in_progress' ? 'In progress' :
                 activeFilter === 'today'       ? "Today's jobs" :
                 activeFilter === 'overdue'     ? 'Overdue jobs' : 'All jobs'}
              </div>
              {activeFilter !== 'all' && (
                <button onClick={() => setActiveFilter('all')} className="text-xs text-neutral-400 hover:text-neutral-600 underline">
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {TYPE_FILTERS.map((tab) => (
              <button
                key={tab}
                onClick={() => setTypeFilter(tab)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors flex-shrink-0 ${
                  typeFilter === tab
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'border-neutral-200 text-neutral-500 hover:bg-neutral-50'
                }`}
              >
                {TYPE_FILTER_LABELS[tab]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="px-4 py-10 text-center text-sm text-neutral-400">Loading…</div>
        ) : filteredJobs.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-neutral-400">
            {activeFilter !== 'all' ? 'No jobs match this filter' : 'No jobs yet — create your first one'}
          </div>
        ) : filteredJobs.map((job) => {
          const t = TYPE_STYLES[job.type] || { bg: 'bg-neutral-100', text: 'text-neutral-600', dot: 'bg-neutral-400', label: job.type }
          const s = STATUS_STYLES[job.status] || STATUS_STYLES.pending
          const overdue = isOverdue(job)
          const clientName = job.clients ? `${job.clients.first_name} ${job.clients.last_name}` : null
          const vehicleName = job.vehicles ? `${job.vehicles.make} ${job.vehicles.model} ${job.vehicles.year}` : null
          const desc = [clientName, vehicleName].filter(Boolean).join(' · ') || '—'
          const dateLabel = job.scheduled_at
            ? new Date(job.scheduled_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
            : new Date(job.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
          return (
            <div
              key={job.id}
              onClick={() => router.push(`/jobs/${job.id}`)}
              className={`px-4 py-3 border-b border-neutral-50 hover:bg-neutral-50 cursor-pointer last:border-b-0 ${overdue ? 'bg-red-50/40' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${overdue ? 'bg-red-500' : t.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-medium text-neutral-900">{t.label}</span>
                    {overdue && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600">Overdue</span>}
                  </div>
                  <div className="text-xs text-neutral-500">{desc}</div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${s.bg} ${s.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>
                    {s.label}
                  </span>
                  <span className="text-xs text-neutral-400">{dateLabel}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
