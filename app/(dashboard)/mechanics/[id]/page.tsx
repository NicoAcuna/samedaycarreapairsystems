'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/client'

type Permission = { view: boolean; edit: boolean; create: boolean }
type Permissions = Record<string, Permission>

type Role = {
  id: string
  name: string
  label: string
  default_permissions: Permissions
  is_system: boolean
}

type Mechanic = {
  id: string
  name: string
  email: string
  phone: string | null
  status: string
  user_id: string | null
  created_at: string
  role_id: string | null
  permissions: Permissions | null
}

const TABS = [
  { key: 'leads',           label: 'Leads' },
  { key: 'jobs',            label: 'Jobs' },
  { key: 'clients',         label: 'Clients' },
  { key: 'vehicles',        label: 'Vehicles' },
  { key: 'mechanics',       label: 'Mechanics' },
  { key: 'groups',          label: 'WA Groups' },
  { key: 'facebook_groups', label: 'FB Groups' },
  { key: 'settings',        label: 'Settings' },
]

const EMPTY_PERMISSIONS: Permissions = Object.fromEntries(
  TABS.map(t => [t.key, { view: false, edit: false, create: false }])
)

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
}

type JobRow = { status: string; type: string; checklist_data: Record<string, unknown> | null }

function parseMoney(v: unknown) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  if (typeof v !== 'string') return 0
  const n = Number(v.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function jobValue(job: JobRow) {
  const d = job.checklist_data as {
    serviceFee?: string; inspectionFee?: string; diagFee?: string; estimates?: { estCost?: string }[]
  } | null
  if (!d) return 0
  if (job.type === 'repair')       return (d.estimates || []).reduce((s, e) => s + parseMoney(e.estCost), 0)
  if (job.type === 'service')      return parseMoney(d.serviceFee)
  if (job.type === 'pre_purchase') return parseMoney(d.inspectionFee)
  if (job.type === 'diagnosis')    return parseMoney(d.diagFee)
  return 0
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n)
}

function WorkSummary({ mechanicId }: { mechanicId: string }) {
  const [stats, setStats] = useState<{ total: number; completed: number; revenue: number } | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('jobs')
      .select('status, type, checklist_data')
      .eq('assigned_mechanic_id', mechanicId)
      .then(({ data }) => {
        const jobs = (data as JobRow[]) || []
        setStats({
          total: jobs.length,
          completed: jobs.filter(j => j.status === 'completed').length,
          revenue: jobs.reduce((s, j) => s + jobValue(j), 0),
        })
      })
  }, [mechanicId])

  const cards = [
    { label: 'Jobs assigned', value: stats ? String(stats.total) : '…' },
    { label: 'Completed', value: stats ? String(stats.completed) : '…' },
    { label: 'Revenue billed', value: stats ? fmtMoney(stats.revenue) : '…' },
  ]

  return (
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden mb-5">
      <div className="px-5 py-4 border-b border-neutral-100">
        <div className="font-semibold text-neutral-900 text-sm">Work summary</div>
        <div className="text-xs text-neutral-400 mt-0.5">Jobs assigned to this mechanic and what they billed</div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-neutral-100">
        {cards.map(c => (
          <div key={c.label} className="p-4">
            <div className="text-xs text-neutral-400 mb-0.5">{c.label}</div>
            <div className="text-lg font-semibold text-neutral-900">{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EditModal({ mechanic, onClose, onSaved }: { mechanic: Mechanic; onClose: () => void; onSaved: (m: Mechanic) => void }) {
  const [form, setForm] = useState({ name: mechanic.name, phone: mechanic.phone || '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, val: string) {
    setForm(prev => ({ ...prev, [field]: val }))
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true); setError('')
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('mechanics')
      .update({ name: form.name.trim(), phone: form.phone.trim() || null })
      .eq('id', mechanic.id)
      .select()
      .single()
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(data as Mechanic)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div>
            <div className="font-semibold text-neutral-900">Edit mechanic</div>
            <div className="text-xs text-neutral-400 mt-0.5">Update profile details</div>
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
            <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Email</label>
            <input value={mechanic.email} readOnly
              className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 bg-neutral-100 text-neutral-400 focus:outline-none" />
            <p className="text-xs text-neutral-400 mt-1">Email cannot be changed — it&apos;s linked to their login account.</p>
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
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AccessSection({ mechanic, onSaved }: { mechanic: Mechanic; onSaved: (m: Mechanic) => void }) {
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(mechanic.role_id)
  const [permissions, setPermissions] = useState<Permissions>(mechanic.permissions || EMPTY_PERMISSIONS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('roles')
      .select('id, name, label, default_permissions, is_system')
      .order('is_system', { ascending: false })
      .order('name')
      .then(({ data }) => setRoles((data as Role[]) || []))
  }, [])

  function handleRoleChange(roleId: string) {
    setSelectedRoleId(roleId)
    const role = roles.find(r => r.id === roleId)
    if (role?.default_permissions) {
      setPermissions(role.default_permissions)
    }
  }

  function togglePerm(tabKey: string, action: 'view' | 'edit' | 'create') {
    setPermissions(prev => ({
      ...prev,
      [tabKey]: { ...prev[tabKey], [action]: !prev[tabKey]?.[action] },
    }))
  }

  async function handleSave() {
    setSaving(true); setError(''); setSaved(false)
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('mechanics')
      .update({ role_id: selectedRoleId, permissions })
      .eq('id', mechanic.id)
      .select()
      .single()
    setSaving(false)
    if (err) { setError(err.message); return }
    setSaved(true)
    onSaved(data as Mechanic)
    setTimeout(() => setSaved(false), 2000)
  }

  const selectedRole = roles.find(r => r.id === selectedRoleId)
  const isFullAccess = selectedRole?.name === 'admin' || selectedRole?.name === 'super_admin'

  return (
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden mb-5">
      <div className="px-5 py-4 border-b border-neutral-100">
        <div className="font-semibold text-neutral-900 text-sm">Access & Permissions</div>
        <div className="text-xs text-neutral-400 mt-0.5">Control what this mechanic can see and do</div>
      </div>

      {/* Role selector */}
      <div className="px-5 py-4 border-b border-neutral-100">
        <label className="text-xs font-medium text-neutral-500 mb-2 block">Role</label>
        {roles.length === 0 ? (
          <div className="text-xs text-neutral-400">Loading roles…</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {roles.map(role => (
              <button
                key={role.id}
                onClick={() => handleRoleChange(role.id)}
                className={`px-4 py-2 text-sm rounded-lg border font-medium transition-colors ${
                  selectedRoleId === role.id
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {role.label}
                {!role.is_system && <span className="ml-1.5 text-xs opacity-60">custom</span>}
              </button>
            ))}
          </div>
        )}
        {isFullAccess && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-3">
            This role has full access to all sections. The permission matrix below is pre-filled but can still be customized.
          </p>
        )}
      </div>

      {/* Permissions matrix */}
      <div className="px-5 py-4">
        <label className="text-xs font-medium text-neutral-500 mb-3 block">Permissions</label>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left text-xs text-neutral-400 font-medium pb-3">Section</th>
                <th className="text-center text-xs text-neutral-400 font-medium pb-3 w-16">View</th>
                <th className="text-center text-xs text-neutral-400 font-medium pb-3 w-16">Edit</th>
                <th className="text-center text-xs text-neutral-400 font-medium pb-3 w-16">Create</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {TABS.map(tab => (
                <tr key={tab.key}>
                  <td className="py-2.5 text-xs font-medium text-neutral-700">{tab.label}</td>
                  {(['view', 'edit', 'create'] as const).map(action => (
                    <td key={action} className="py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={permissions[tab.key]?.[action] ?? false}
                        onChange={() => togglePerm(tab.key, action)}
                        className="w-4 h-4 rounded border-neutral-300 accent-neutral-900 cursor-pointer"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-3">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-neutral-100">
          {saved && <span className="text-xs text-green-600 font-medium">Saved ✓</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-sm px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50 font-medium"
          >
            {saving ? 'Saving…' : 'Save access'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MechanicDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)

  const [mechanic, setMechanic] = useState<Mechanic | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('mechanics').select('*').eq('id', id).single(),
      supabase.auth.getUser(),
    ]).then(async ([{ data: m }, { data: { user } }]) => {
      setMechanic(m as Mechanic)
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()
        setIsSuperAdmin(userData?.role !== 'mechanic')
      }
      setLoading(false)
    })
  }, [id])

  async function handleDelete() {
    if (!mechanic) return
    setDeleting(true); setDeleteError('')
    const res = await fetch('/api/delete-mechanic', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mechanic_id: mechanic.id, user_id: mechanic.user_id }),
    })
    const data = await res.json()
    if (!res.ok) {
      setDeleteError(data.error || 'Failed to delete')
      setDeleting(false)
      return
    }
    router.push('/mechanics')
  }

  if (loading) return <div className="p-6 text-sm text-neutral-400">Loading…</div>
  if (!mechanic) return <div className="p-6 text-sm text-neutral-400">Mechanic not found.</div>

  const joinedLabel = new Date(mechanic.created_at).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      {showEdit && (
        <EditModal
          mechanic={mechanic}
          onClose={() => setShowEdit(false)}
          onSaved={m => { setMechanic(m); setShowEdit(false) }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push('/mechanics')} className="text-sm text-neutral-500 hover:text-neutral-700">
          ← Back to mechanics
        </button>
        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <button onClick={() => setShowEdit(true)}
              className="text-sm px-4 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600">
              Edit
            </button>
            <button onClick={() => { setDeleteError(''); setShowDelete(true) }}
              className="text-sm px-4 py-2 border border-red-200 rounded-lg hover:bg-red-50 text-red-600">
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Profile card */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden mb-5">
        <div className="bg-neutral-900 px-6 py-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-neutral-700 text-white flex items-center justify-center text-xl font-bold flex-shrink-0">
            {initials(mechanic.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xl font-bold text-white">{mechanic.name}</div>
            <div className="text-sm text-neutral-400 mt-0.5">{mechanic.email}</div>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${
            mechanic.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'
          }`}>
            {mechanic.status === 'active' ? 'Active' : 'Pending invite'}
          </span>
        </div>
        <div className="grid grid-cols-3 divide-x divide-neutral-100 border-t border-neutral-100">
          {[
            { label: 'Phone', value: mechanic.phone || '—' },
            { label: 'Status', value: mechanic.status === 'active' ? 'Active' : 'Pending invite' },
            { label: 'Added', value: joinedLabel },
          ].map(d => (
            <div key={d.label} className="p-4">
              <div className="text-xs text-neutral-400 mb-0.5">{d.label}</div>
              <div className="text-sm font-medium text-neutral-900">{d.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Work summary + Access — only visible to super admins */}
      {isSuperAdmin && <WorkSummary mechanicId={mechanic.id} />}
      {isSuperAdmin && (
        <AccessSection
          mechanic={mechanic}
          onSaved={m => setMechanic(m)}
        />
      )}

      {/* Delete confirmation */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-20 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-lg">⚠️</div>
            <h2 className="text-base font-semibold text-neutral-900 mb-2">Delete this mechanic?</h2>
            <p className="text-sm text-neutral-500 mb-4">
              {mechanic.user_id
                ? 'Their profile and login access will be removed. This cannot be undone.'
                : 'This will remove the pending invitation. This cannot be undone.'}
            </p>
            {deleteError && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4 text-left">
                {deleteError}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)}
                className="flex-1 py-2 text-sm border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600">
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
