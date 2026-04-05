'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase/client'

export default function OnboardingPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, val: string) {
    setForm(prev => ({ ...prev, [field]: val }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Business name is required'); return }

    setSaving(true); setError('')
    const supabase = createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Create company
    const { data: company, error: companyErr } = await supabase
      .from('companies')
      .insert([{
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
      }])
      .select()
      .single()

    if (companyErr) { setError(companyErr.message); setSaving(false); return }

    // Link user to company
    const { error: userErr } = await supabase
      .from('users')
      .update({ company_id: company.id })
      .eq('id', user.id)

    if (userErr) { setError(userErr.message); setSaving(false); return }

    router.push('/')
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <span className="text-black text-sm font-bold">S</span>
            </div>
            <span className="text-white font-semibold text-lg">MechBase</span>
          </div>
          <h1 className="text-white text-2xl font-semibold">Set up your business</h1>
          <p className="text-neutral-400 text-sm mt-1">This is your workspace. You can invite team members later.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-1.5">Business name <span className="text-red-400">*</span></label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Same Day Car Repair" required autoFocus
              className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-neutral-600" />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1.5">Business phone</label>
            <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
              placeholder="0439 269 598"
              className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-neutral-600" />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1.5">Business email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="info@samedaycarrepair.com.au"
              className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-neutral-600" />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1.5">Location</label>
            <input type="text" value={form.address} onChange={e => set('address', e.target.value)}
              placeholder="Sydney, NSW"
              className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-neutral-600" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={saving}
            className="w-full py-2.5 bg-white text-black font-medium rounded-lg text-sm hover:bg-neutral-200 transition-colors disabled:opacity-50">
            {saving ? 'Setting up…' : 'Launch my workspace →'}
          </button>
        </form>
      </div>
    </div>
  )
}
