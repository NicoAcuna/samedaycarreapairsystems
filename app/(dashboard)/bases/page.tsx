'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase/client'

type Base = {
  id: string
  name: string
  phone: string | null
  address: string | null
  role: string
}

type Mechanic = {
  id: string
  company_id: string
  name: string
  email: string
  phone: string | null
  status: string
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
}

function NewBaseModal({ onClose, onCreated }: { onClose: () => void; onCreated: (b: Base) => void }) {
  const [form, setForm] = useState({ name: '', phone: '', address: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, val: string) {
    setForm(prev => ({ ...prev, [field]: val }))
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true); setError('')
    const res = await fetch('/api/create-company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, phone: form.phone, address: form.address }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error || 'Failed to create base'); return }
    onCreated({ ...data.company, role: 'owner' })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div>
            <div className="font-semibold text-neutral-900">New base</div>
            <div className="text-xs text-neutral-400 mt-0.5">Create a new independent workspace</div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 text-2xl leading-none w-8 h-8 flex items-center justify-center">✕</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Name <span className="text-red-400">*</span></label>
            <input value={form.name} onChange={e => set('name', e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="e.g. Same Day Car Repair Sydney"
              className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50" />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Phone</label>
            <input type="tel" inputMode="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+61 400 000 000"
              className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50" />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Address</label>
            <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St, Sydney NSW"
              className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50" />
          </div>
          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">{error}</div>}
        </div>
        <div className="flex gap-3 px-5 pb-5 pt-3 border-t border-neutral-100">
          <button onClick={onClose} className="flex-1 text-sm py-3 border border-neutral-200 rounded-xl hover:bg-neutral-50 text-neutral-600 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 text-sm py-3 bg-neutral-900 text-white rounded-xl hover:bg-neutral-700 disabled:opacity-50 font-medium">
            {saving ? 'Creating…' : 'Create base'}
          </button>
        </div>
      </div>
    </div>
  )
}

function InviteMechanicModal({
  companyId,
  onClose,
  onSaved,
}: {
  companyId: string
  onClose: () => void
  onSaved: (m: Mechanic) => void
}) {
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, val: string) {
    setForm(prev => ({ ...prev, [field]: val }))
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Full name is required'); return }
    if (!form.email.trim()) { setError('Email is required'); return }
    setSaving(true); setError('')
    const res = await fetch('/api/invite-mechanic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone, company_id: companyId }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error || 'Failed to invite mechanic'); return }
    onSaved(data.mechanic)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div>
            <div className="font-semibold text-neutral-900">Add mechanic</div>
            <div className="text-xs text-neutral-400 mt-0.5">They&apos;ll receive an invitation email</div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 text-2xl leading-none w-8 h-8 flex items-center justify-center">✕</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Full name <span className="text-red-400">*</span></label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="John Smith"
              className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50" />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Email <span className="text-red-400">*</span></label>
            <input type="email" inputMode="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@example.com"
              className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50" />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Phone</label>
            <input type="tel" inputMode="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+61 400 000 000"
              className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50" />
          </div>
          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">{error}</div>}
        </div>
        <div className="flex gap-3 px-5 pb-5 pt-3 border-t border-neutral-100">
          <button onClick={onClose} className="flex-1 text-sm py-3 border border-neutral-200 rounded-xl hover:bg-neutral-50 text-neutral-600 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 text-sm py-3 bg-neutral-900 text-white rounded-xl hover:bg-neutral-700 disabled:opacity-50 font-medium">
            {saving ? 'Sending invite…' : 'Send invite'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BasesPage() {
  const router = useRouter()
  const [bases, setBases] = useState<Base[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)
  const [mechanicsByBase, setMechanicsByBase] = useState<Record<string, Mechanic[]>>({})
  const [inviteFor, setInviteFor] = useState<string | null>(null)
  const [currentUserName, setCurrentUserName] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('active_company_id, company_id')
        .eq('id', user.id)
        .single()

      setCurrentUserName(user.email || '')

      const currentActive = userData?.active_company_id || userData?.company_id
      setActiveId(currentActive)

      // Load all bases via user_companies
      const { data: memberships } = await supabase
        .from('user_companies')
        .select('role, companies(id, name, phone, address)')
        .eq('user_id', user.id)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const list: Base[] = (memberships || []).map((m: any) => {
        const c = Array.isArray(m.companies) ? m.companies[0] : m.companies
        return { ...c, role: m.role }
      }).filter(Boolean)

      if (list.length === 0 && currentActive) {
        const { data: company } = await supabase
          .from('companies').select('id, name, phone, address').eq('id', currentActive).single()
        if (company) list.push({ ...company, role: 'owner' })
      }

      setBases(list)

      // Fetch mechanics for all bases in one query
      if (list.length > 0) {
        const companyIds = list.map(b => b.id)
        const { data: mechanics } = await supabase
          .from('mechanics')
          .select('id, company_id, name, email, phone, status')
          .in('company_id', companyIds)
          .order('created_at', { ascending: true })

        const grouped: Record<string, Mechanic[]> = {}
        for (const m of mechanics || []) {
          if (!grouped[m.company_id]) grouped[m.company_id] = []
          grouped[m.company_id].push(m as Mechanic)
        }
        setMechanicsByBase(grouped)
      }

      setLoading(false)
    })
  }, [])

  async function handleSwitch(base: Base) {
    if (base.id === activeId) return
    setSwitching(base.id)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('users').update({ active_company_id: base.id }).eq('id', user.id)
    setActiveId(base.id)
    setSwitching(null)
    router.refresh()
  }

  function handleMechanicAdded(m: Mechanic) {
    setMechanicsByBase(prev => ({
      ...prev,
      [m.company_id]: [...(prev[m.company_id] || []), m],
    }))
    setInviteFor(null)
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      {showNew && (
        <NewBaseModal
          onClose={() => setShowNew(false)}
          onCreated={b => { setBases(prev => [...prev, b]); setShowNew(false) }}
        />
      )}
      {inviteFor && (
        <InviteMechanicModal
          companyId={inviteFor}
          onClose={() => setInviteFor(null)}
          onSaved={handleMechanicAdded}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Bases</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {loading ? '…' : `${bases.length} base${bases.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="bg-neutral-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-neutral-700 transition-colors">
          + New base
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-neutral-400 py-8 text-center">Loading…</div>
      ) : bases.length === 0 ? (
        <div className="text-sm text-neutral-400 py-8 text-center border border-dashed border-neutral-200 rounded-xl">
          No bases yet.
        </div>
      ) : (
        <div className="space-y-4">
          {bases.map(base => {
            const isActive = base.id === activeId
            const mechanics = mechanicsByBase[base.id] || []

            return (
              <div key={base.id}
                className={`bg-white border rounded-xl overflow-hidden ${isActive ? 'border-neutral-900' : 'border-neutral-200'}`}>

                {/* Base header */}
                <div className="flex items-center gap-4 px-5 py-4 border-b border-neutral-100">
                  <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {initials(base.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-900 text-sm truncate">{base.name}</span>
                      {isActive && (
                        <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex-shrink-0">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      {[base.phone, base.address].filter(Boolean).join(' · ') || 'No contact info'}
                    </div>
                  </div>
                  {!isActive && (
                    <button onClick={() => handleSwitch(base)} disabled={switching === base.id}
                      className="text-xs px-3 py-1.5 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600 font-medium disabled:opacity-50 flex-shrink-0">
                      {switching === base.id ? 'Switching…' : 'Switch to'}
                    </button>
                  )}
                </div>

                {/* Team */}
                <div className="px-5 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-neutral-500">
                      Team · {mechanics.length + 1} member{mechanics.length !== 0 ? 's' : ''}
                    </span>
                    <button onClick={() => setInviteFor(base.id)}
                      className="text-xs text-neutral-600 hover:text-neutral-900 font-medium">
                      + Add mechanic
                    </button>
                  </div>

                  <div className="space-y-2">
                    {/* Admin row (current user) */}
                    <div className="flex items-center gap-3 py-1.5">
                      <div className="w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                        {initials(currentUserName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-neutral-700 font-medium truncate block">
                          {currentUserName} <span className="text-neutral-400 font-normal">(you)</span>
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">
                        Admin
                      </span>
                    </div>

                    {/* Mechanics */}
                    {mechanics.map(m => (
                      <div key={m.id} className="flex items-center gap-3 py-1.5">
                        <div className="w-7 h-7 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          {initials(m.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-neutral-700 font-medium truncate block">{m.name}</span>
                          <span className="text-[10px] text-neutral-400 truncate block">{m.email}</span>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          m.status === 'active'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {m.status === 'active' ? 'Active' : 'Pending'}
                        </span>
                      </div>
                    ))}

                    {mechanics.length === 0 && (
                      <p className="text-xs text-neutral-400 py-1">No mechanics yet in this base.</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
