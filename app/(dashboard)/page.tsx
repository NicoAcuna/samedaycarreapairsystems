'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const JOBS = [
  {
    id: '1',
    name: 'Pre-Purchase Inspection',
    type: 'Pre-Purchase',
    desc: 'Jesus Nunez · Toyota RAV4 2015',
    time: '9:00 am',
    status: 'in_progress',
    dotColor: 'bg-blue-500',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    btn: 'View',
    overdue: false,
  },
  {
    id: '2',
    name: 'Minor Service',
    type: 'Service',
    desc: 'Octa Juarez · Honda CRV 2008',
    time: '11:30 am',
    status: 'pending',
    dotColor: 'bg-green-500',
    badgeBg: 'bg-green-50',
    badgeText: 'text-green-700',
    btn: 'Start',
    overdue: false,
  },
  {
    id: '3',
    name: 'Diagnosis',
    type: 'Diagnosis',
    desc: 'Luis Pérez · Ford Ranger 2020',
    time: '26 Mar 2026',
    status: 'pending',
    dotColor: 'bg-purple-500',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    btn: 'Start',
    overdue: true,
  },
  {
    id: '4',
    name: 'Brake & Rotor Repair',
    type: 'Repair',
    desc: 'Carlos Méndez · Toyota Camry 2019',
    time: '4:00 pm',
    status: 'completed',
    dotColor: 'bg-orange-500',
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-700',
    btn: 'View',
    overdue: false,
  },
]

const STATUS_LABEL: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  in_progress: { label: 'In progress', bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  pending:     { label: 'Pending',     bg: 'bg-neutral-100', text: 'text-neutral-500', dot: 'bg-neutral-400' },
  completed:   { label: 'Completed',  bg: 'bg-green-50',   text: 'text-green-700',  dot: 'bg-green-500' },
}

type Filter = 'all' | 'today' | 'in_progress' | 'quotes' | 'overdue'

export default function DashboardPage() {
  const [activeFilter, setActiveFilter] = useState<Filter>('all')
  const [typeFilter, setTypeFilter] = useState('All')
  const router = useRouter()

  const metrics = [
    { key: 'today',       label: 'Jobs Today',     value: 4, sub: '3 pending · 1 done',  dark: true,  red: false },
    { key: 'in_progress', label: 'In Progress',    value: 2, sub: 'Active right now',     dark: false, red: false },
    { key: 'quotes',      label: 'Quotes Pending', value: 3, sub: 'Awaiting reply',       dark: false, red: false },
    { key: 'overdue',     label: 'Overdue Jobs',   value: 1, sub: 'Past scheduled date',  dark: false, red: true  },
  ]

  const filteredJobs = JOBS.filter(job => {
    const matchType = typeFilter === 'All' || job.type === typeFilter
    const matchFilter =
      activeFilter === 'all'         ? true :
      activeFilter === 'today'       ? true :
      activeFilter === 'in_progress' ? job.status === 'in_progress' :
      activeFilter === 'quotes'      ? false :
      activeFilter === 'overdue'     ? job.overdue : true
    return matchType && matchFilter
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">Dashboard</h1>
        <p className="text-sm text-neutral-500 mt-1">Sunday, 29 Mar 2026</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {metrics.map((m) => (
          <button
            key={m.key}
            onClick={() => setActiveFilter(activeFilter === m.key as Filter ? 'all' : m.key as Filter)}
            className={`rounded-xl p-4 text-left transition-all border ${
              m.dark
                ? 'bg-neutral-900 border-neutral-900'
                : activeFilter === m.key
                  ? 'bg-neutral-900 border-neutral-900 ring-2 ring-offset-1 ring-neutral-900'
                  : 'bg-white border-neutral-200 hover:border-neutral-400'
            }`}
          >
            <div className={`text-xs mb-2 ${m.dark || activeFilter === m.key ? 'text-neutral-400' : 'text-neutral-500'}`}>
              {m.label}
            </div>
            <div className={`text-3xl font-semibold ${
              m.dark || activeFilter === m.key ? 'text-white' :
              m.red ? 'text-red-500' : 'text-neutral-900'
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
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-neutral-900">
              {activeFilter === 'in_progress' ? 'In progress' :
               activeFilter === 'quotes'      ? 'Quotes pending' :
               activeFilter === 'overdue'     ? 'Overdue jobs' : "Today's jobs"}
            </div>
            {activeFilter !== 'all' && (
              <button
                onClick={() => setActiveFilter('all')}
                className="text-xs text-neutral-400 hover:text-neutral-600 underline"
              >
                Clear filter
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {['All', 'Pre-Purchase', 'Service', 'Diagnosis', 'Repair'].map((tab) => (
              <button
                key={tab}
                onClick={() => setTypeFilter(tab)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  typeFilter === tab
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'border-neutral-200 text-neutral-500 hover:bg-neutral-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-neutral-400">
            No jobs match this filter
          </div>
        ) : filteredJobs.map((job) => {
          const s = STATUS_LABEL[job.status]
          return (
            <div
              key={job.id}
              onClick={() => router.push(`/jobs/${job.id}`)}
              className={`flex items-center gap-3 px-4 py-3 border-b border-neutral-50 hover:bg-neutral-50 cursor-pointer last:border-b-0 ${job.overdue ? 'bg-red-50/40' : ''}`}
            >
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${job.overdue ? 'bg-red-500' : job.dotColor}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-neutral-900">{job.name}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${job.badgeBg} ${job.badgeText}`}>{job.type}</span>
                  {job.overdue && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600">Overdue</span>}
                </div>
                <div className="text-xs text-neutral-500">{job.desc}</div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-neutral-400">{job.time}</span>
                <span className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 ${s.bg} ${s.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>
                  {s.label}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); router.push(`/jobs/${job.id}`) }}
                  className="text-xs px-3 py-1 border border-neutral-200 rounded-lg hover:bg-neutral-100 text-neutral-600"
                >
                  {job.btn}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
