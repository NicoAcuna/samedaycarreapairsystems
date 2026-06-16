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
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="e.g. Same Day Car Repair Sydney"
              className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Phone</label>
            <input
              type="tel" inputMode="tel"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="+61 400 000 000"
              className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Address</label>
            <input
              value={form.address}
              onChange={e => set('address', e.target.value)}
              placeholder="123 Main St, Sydney NSW"
              className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50"
            />
          </div>
          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">{error}</div>}
        </div>

        <div className="flex gap-3 px-5 pb-5 pt-3 border-t border-neutral-100">
          <button onClick={onClose} className="flex-1 text-sm py-3 border border-neutral-200 rounded-xl hover:bg-neutral-50 text-neutral-600 font-medium">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 text-sm py-3 bg-neutral-900 text-white rounded-xl hover:bg-neutral-700 disabled:opacity-50 font-medium">
            {saving ? 'Creating…' : 'Create base'}
          </button>
        </div>
      </div>
    </div>
  )
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
}

export default function BasesPage() {
  const router = useRouter()
  const [bases, setBases] = useState<Base[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('active_company_id, company_id')
        .eq('id', user.id)
        .single()

      const currentActive = userData?.active_company_id || userData?.company_id
      setActiveId(currentActive)

      // Load all bases via user_companies
      const { data: memberships } = await supabase
        .from('user_companies')
        .select('role, companies(id, name, phone, address)')
        .eq('user_id', user.id)

      const list: Base[] = (memberships || []).map((m: any) => {
        const c = Array.isArray(m.companies) ? m.companies[0] : m.companies
        return { ...c, role: m.role }
      }).filter(Boolean)

      // Fallback: if user_companies is empty
      if (list.length === 0 && currentActive) {
        const { data: company } = await supabase
          .from('companies')
          .select('id, name, phone, address')
          .eq('id', currentActive)
          .single()
        if (company) list.push({ ...company, role: 'owner' })
      }

      setBases(list)
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

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      {showNew && (
        <NewBaseModal
          onClose={() => setShowNew(false)}
          onCreated={b => { setBases(prev => [...prev, b]); setShowNew(false) }}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Bases</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {loading ? '…' : `${bases.length} base${bases.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="bg-neutral-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-neutral-700 transition-colors"
        >
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
        <div className="space-y-3">
          {bases.map(base => {
            const isActive = base.id === activeId
            return (
              <div
                key={base.id}
                className={`bg-white border rounded-xl overflow-hidden transition-all ${
                  isActive ? 'border-neutral-900' : 'border-neutral-200'
                }`}
              >
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {initials(base.name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-900 text-sm truncate">{base.name}</span>
                      {isActive && (
                        <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex-shrink-0">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5 space-x-2">
                      <span className="capitalize">{base.role}</span>
                      {base.phone && <span>· {base.phone}</span>}
                      {base.address && <span>· {base.address}</span>}
                    </div>
                  </div>

                  {/* Switch button */}
                  {!isActive && (
                    <button
                      onClick={() => handleSwitch(base)}
                      disabled={switching === base.id}
                      className="text-xs px-3 py-1.5 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600 font-medium disabled:opacity-50 flex-shrink-0"
                    >
                      {switching === base.id ? 'Switching…' : 'Switch to'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-neutral-400 mt-6 text-center">
        Each base is an independent workspace with its own data, team, and settings.
      </p>
    </div>
  )
}
