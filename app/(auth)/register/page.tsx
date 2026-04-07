'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<'account' | 'workspace'>('account')
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', workspace: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, val: string) {
    setForm(prev => ({ ...prev, [field]: val }))
  }

  function handleNextStep(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Your name is required'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    setStep('workspace')
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!form.workspace.trim()) { setError('Workspace name is required'); return }

    setLoading(true); setError('')
    try {
      const supabase = createClient()

      // 1. Sign up
      const { error: signUpErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.name.trim() } },
      })
      if (signUpErr) { setError(signUpErr.message); return }

      // 2. Sign in immediately to establish session
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })
      if (signInErr) { setError(signInErr.message); return }

      const user = signInData?.user
      if (!user) { setError('Could not establish session. Please log in manually.'); return }

      // 2. Create company
      const { data: company, error: companyErr } = await supabase
        .from('companies')
        .insert([{ name: form.workspace.trim() }])
        .select()
        .single()
      if (companyErr) { setError(companyErr.message); return }

      // 3. Link user → company, set role as super_admin (workspace creator)
      await supabase.from('users').upsert({
        id: user.id,
        email: user.email,
        company_id: company.id,
        active_company_id: company.id,
        role: 'super_admin',
      }, { onConflict: 'id' })

      // 4. Add to user_companies (best-effort)
      await supabase.from('user_companies').insert([{ user_id: user.id, company_id: company.id }])

      router.refresh()
      router.push('/')
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-black text-sm font-bold">S</span>
            </div>
            <span className="text-white font-semibold text-lg">SDCR Systems</span>
          </div>
          {step === 'account' ? (
            <>
              <h1 className="text-white text-2xl font-semibold">Create your account</h1>
              <p className="text-neutral-400 text-sm mt-1">Step 1 of 2</p>
            </>
          ) : (
            <>
              <h1 className="text-white text-2xl font-semibold">Name your workspace</h1>
              <p className="text-neutral-400 text-sm mt-1">Step 2 of 2 · Usually your business name</p>
            </>
          )}
        </div>

        {step === 'account' ? (
          <form onSubmit={handleNextStep} className="space-y-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-1.5">Your name</label>
              <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="Nicolas Acuna" required autoFocus
                className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-neutral-600" />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="nico@example.com" required
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
            <button type="submit"
              className="w-full py-2.5 bg-white text-black font-medium rounded-lg text-sm hover:bg-neutral-200 transition-colors">
              Next →
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-1.5">Workspace name <span className="text-red-400">*</span></label>
              <input type="text" value={form.workspace} onChange={e => set('workspace', e.target.value)}
                placeholder="Same Day Car Repair" required autoFocus
                className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-neutral-600" />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-white text-black font-medium rounded-lg text-sm hover:bg-neutral-200 transition-colors disabled:opacity-50">
              {loading ? 'Creating workspace…' : 'Create workspace →'}
            </button>
            <button type="button" onClick={() => { setStep('account'); setError('') }}
              className="w-full py-2 text-sm text-neutral-500 hover:text-neutral-300 transition-colors">
              ← Back
            </button>
          </form>
        )}

        {step === 'account' && (
          <p className="text-center text-neutral-500 text-sm mt-6">
            Already have an account?{' '}
            <a href="/login" className="text-neutral-300 hover:text-white">Sign in</a>
          </p>
        )}
      </div>
    </div>
  )
}
