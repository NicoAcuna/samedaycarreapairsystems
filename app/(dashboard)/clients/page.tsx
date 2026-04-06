'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase/client'

type Client = {
  id: string
  first_name: string
  last_name: string
  phone: string
  email: string
  address: string
  notes: string
  created_at: string
}

function fullName(c: Client) {
  return [c.first_name, c.last_name].filter(Boolean).join(' ')
}

function initials(c: Client) {
  return [c.first_name?.[0], c.last_name?.[0]].filter(Boolean).join('').toUpperCase() || '?'
}

function NewClientModal({ onClose, onSaved }: { onClose: () => void; onSaved: (c: Client) => void }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', email: '', address: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, val: string) {
    setForm(prev => ({ ...prev, [field]: val }))
  }

  async function handleSave() {
    if (!form.first_name.trim()) { setError('First name is required'); return }
    setSaving(true); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error: err } = await supabase
      .from('clients')
      .insert([{
        user_id: user?.id,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        notes: form.notes.trim(),
      }])
      .select()
      .single()
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(data as Client)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 flex-shrink-0">
          <div>
            <div className="font-semibold text-neutral-900">New client</div>
            <div className="text-xs text-neutral-400 mt-0.5">Add a client to your database</div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 text-2xl leading-none w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">First name <span className="text-red-400">*</span></label>
              <input value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Jesus"
                className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Last name</label>
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Nunez"
                className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Phone</label>
            <input type="tel" inputMode="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+61 400 000 000"
              className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50" />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Email</label>
            <input type="email" inputMode="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="client@email.com"
              className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50" />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Address</label>
            <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="e.g. Bondi, NSW"
              className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50" />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any notes about this client..." rows={2}
              className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50 resize-none" />
          </div>
          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">{error}</div>}
        </div>

        <div className="flex gap-3 px-5 pb-5 pt-3 border-t border-neutral-100 flex-shrink-0">
          <button onClick={onClose} className="flex-1 text-sm py-3 border border-neutral-200 rounded-xl hover:bg-neutral-50 text-neutral-600 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 text-sm py-3 bg-neutral-900 text-white rounded-xl hover:bg-neutral-700 disabled:opacity-50 font-medium">
            {saving ? 'Saving…' : 'Save client'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('clients').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setClients((data as Client[]) || []); setLoading(false) })
  }, [])

  const filtered = clients.filter(c =>
    [c.first_name, c.last_name, c.phone, c.email].some(f => f?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="p-4 md:p-6">
      {showNew && <NewClientModal onClose={() => setShowNew(false)} onSaved={c => { setClients(prev => [c, ...prev]); setShowNew(false) }} />}

      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Clients</h1>
          <p className="text-sm text-neutral-500 mt-1">{loading ? '…' : `${clients.length} client${clients.length !== 1 ? 's' : ''}`}</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="bg-neutral-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-neutral-700 transition-colors">
          + New client
        </button>
      </div>

      <div className="relative mb-4">
        <input type="search" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone or email…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-neutral-200 rounded-xl bg-neutral-50 focus:outline-none focus:border-neutral-400" />
        <span className="absolute left-3 top-2.5 text-neutral-400 text-sm">🔍</span>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Name</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Phone</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Email</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Added</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-neutral-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-neutral-400">
                {search ? 'No clients match your search' : 'No clients yet — add your first one'}
              </td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} onClick={() => router.push(`/clients/${c.id}`)}
                className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 cursor-pointer">
                <td className="px-4 py-3 font-medium text-neutral-900">{fullName(c)}</td>
                <td className="px-4 py-3 text-neutral-500">{c.phone || '—'}</td>
                <td className="px-4 py-3 text-neutral-500">{c.email || '—'}</td>
                <td className="px-4 py-3 text-neutral-400 text-xs">{new Date(c.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                <td className="px-4 py-3">
                  <button onClick={e => { e.stopPropagation(); router.push(`/clients/${c.id}`) }}
                    className="text-xs px-3 py-1 border border-neutral-200 rounded-lg hover:bg-neutral-50">View</button>
                </td>
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
            {search ? 'No clients match your search' : 'No clients yet — add your first one'}
          </div>
        ) : filtered.map(c => (
          <div key={c.id} onClick={() => router.push(`/clients/${c.id}`)}
            className="flex items-center gap-3 px-4 py-3.5 border-b border-neutral-100 last:border-0 cursor-pointer active:bg-neutral-50">
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
              {initials(c)}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-neutral-900 text-sm">{fullName(c)}</div>
              <div className="text-xs text-neutral-500 truncate mt-0.5">
                {[c.phone, c.email].filter(Boolean).join(' · ') || '—'}
              </div>
            </div>
            <span className="text-neutral-300 text-sm flex-shrink-0">›</span>
          </div>
        ))}
      </div>
    </div>
  )
}
