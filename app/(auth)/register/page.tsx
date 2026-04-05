'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, val: string) {
    setForm(prev => ({ ...prev, [field]: val }))
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Your name is required'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }

    setLoading(true); setError('')
    const supabase = createClient()

    const { error: signUpErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.name.trim() } },
    })

    if (signUpErr) { setError(signUpErr.message); setLoading(false); return }

    // Go to onboarding to set up the company
    router.push('/onboarding')
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
          <h1 className="text-white text-2xl font-semibold">Create your account</h1>
          <p className="text-neutral-400 text-sm mt-1">You'll set up your business on the next step</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-1.5">Your name</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Nicolas Acuna" required
              className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-neutral-600" />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1.5">Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="nico@samedaycarrepair.com.au" required
              className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-neutral-600" />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1.5">Password</label>
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)}
              placeholder="Min. 8 characters" required
              className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-neutral-600" />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1.5">Confirm password</label>
            <input type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)}
              placeholder="Repeat your password" required
              className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-neutral-600" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-white text-black font-medium rounded-lg text-sm hover:bg-neutral-200 transition-colors disabled:opacity-50">
            {loading ? 'Creating account…' : 'Create account →'}
          </button>
        </form>

        <p className="text-center text-neutral-500 text-sm mt-6">
          Already have an account?{' '}
          <a href="/login" className="text-neutral-300 hover:text-white">Sign in</a>
        </p>
      </div>
    </div>
  )
}
