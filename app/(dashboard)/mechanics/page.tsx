'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase/client'

type Mechanic = {
  id: string
  name: string
  email: string
  phone: string | null
  status: string
  created_at: string
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
}

function NewMechanicModal({ onClose, onSaved }: { onClose: () => void; onSaved: (m: Mechanic) => void }) {
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
      body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone }),
    })

    const data = await res.json()
    setSaving(false)

    if (!res.ok) { setError(data.error || 'Failed to invite mechanic'); return }
    onSaved(data.mechanic)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 flex-shrink-0">
          <div>
            <div className="font-semibold text-neutral-900">Invite mechanic</div>
            <div className="text-xs text-neutral-400 mt-0.5">They&apos;ll receive an invitation email</div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 text-2xl leading-none w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
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

        <div className="flex gap-3 px-5 pb-5 pt-3 border-t border-neutral-100 flex-shrink-0">
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

export default function MechanicsPage() {
  const router = useRouter()
  const [mechanics, setMechanics] = useState<Mechanic[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Mechanic | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError('')
    const res = await fetch('/api/delete-mechanic', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mechanic_id: deleteTarget.id }),
    })
    const data = await res.json()
    setDeleting(false)
    if (!res.ok) { setDeleteError(data.error || 'Failed to delete'); return }
    setMechanics(prev => prev.filter(m => m.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('role, active_company_id, company_id')
        .eq('id', user.id)
        .single()

      setIsSuperAdmin(userData?.role !== 'mechanic')

      const companyId = userData?.active_company_id || userData?.company_id
      if (!companyId) { setLoading(false); return }

      const { data } = await supabase
        .from('mechanics')
        .select('id, name, email, phone, status, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      setMechanics((data as Mechanic[]) || [])
      setLoading(false)
    })
  }, [])

  const filtered = mechanics.filter(m =>
    [m.name, m.email, m.phone].some(f => f?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="p-4 md:p-6">
      {showNew && isSuperAdmin && (
        <NewMechanicModal
          onClose={() => setShowNew(false)}
          onSaved={m => { setMechanics(prev => [m, ...prev]); setShowNew(false) }}
        />
      )}

      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Mechanics</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {loading ? '…' : `${mechanics.length} mechanic${mechanics.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {isSuperAdmin && (
          <button onClick={() => setShowNew(true)}
            className="bg-neutral-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-neutral-700 transition-colors">
            + Add mechanic
          </button>
        )}
      </div>

      <div className="relative mb-4">
        <input type="search" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email or phone…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-neutral-200 rounded-xl bg-neutral-50 focus:outline-none focus:border-neutral-400" />
        <span className="absolute left-3 top-2.5 text-neutral-400 text-sm">🔍</span>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white border border-neutral-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Name</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Email</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Phone</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Status</th>
              {isSuperAdmin && <th className="px-4 py-3 w-12"></th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={isSuperAdmin ? 5 : 4} className="px-4 py-10 text-center text-sm text-neutral-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={isSuperAdmin ? 5 : 4} className="px-4 py-10 text-center text-sm text-neutral-400">
                {search ? 'No mechanics match your search' : 'No mechanics yet — add your first one'}
              </td></tr>
            ) : filtered.map(m => (
              <tr key={m.id} onClick={() => router.push(`/mechanics/${m.id}`)}
                className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 cursor-pointer">
                <td className="px-4 py-3 font-medium text-neutral-900">{m.name}</td>
                <td className="px-4 py-3 text-neutral-500">{m.email}</td>
                <td className="px-4 py-3 text-neutral-500">{m.phone || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                    m.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {m.status === 'active' ? 'Active' : 'Pending invite'}
                  </span>
                </td>
                {isSuperAdmin && (
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteError(''); setDeleteTarget(m) }}
                      title="Delete mechanic"
                      className="text-neutral-300 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50">
                      🗑️
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden bg-white border border-neutral-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="px-4 py-10 text-center text-sm text-neutral-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-neutral-400">
            {search ? 'No mechanics match your search' : 'No mechanics yet — add your first one'}
          </div>
        ) : filtered.map(m => (
          <div key={m.id} onClick={() => router.push(`/mechanics/${m.id}`)}
            className="flex items-center gap-3 px-4 py-3.5 border-b border-neutral-100 last:border-0 cursor-pointer active:bg-neutral-50">
            <div className="w-9 h-9 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
              {initials(m.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-neutral-900 text-sm">{m.name}</div>
              <div className="text-xs text-neutral-500 truncate mt-0.5">
                {[m.phone, m.email].filter(Boolean).join(' · ')}
              </div>
              <div className="mt-1.5">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  m.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {m.status === 'active' ? 'Active' : 'Pending invite'}
                </span>
              </div>
            </div>
            {isSuperAdmin && (
              <button
                onClick={e => { e.stopPropagation(); setDeleteError(''); setDeleteTarget(m) }}
                title="Delete mechanic"
                className="text-neutral-300 hover:text-red-600 p-1.5 flex-shrink-0">
                🗑️
              </button>
            )}
            <span className="text-neutral-300 text-sm flex-shrink-0">›</span>
          </div>
        ))}
      </div>

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-20 px-4" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-lg">⚠️</div>
            <h2 className="text-base font-semibold text-neutral-900 mb-2">Delete {deleteTarget.name}?</h2>
            <p className="text-sm text-neutral-500 mb-4">
              Their profile and login account will be removed, freeing up the email to be invited again. This cannot be undone.
            </p>
            {deleteError && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4 text-left">
                {deleteError}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                className="flex-1 py-2 text-sm border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600 disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
