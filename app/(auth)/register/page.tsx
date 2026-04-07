'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<'account' | 'workspace'>('account')
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', workspace: '', phone: '', address: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, val: string) {
    setForm(prev => ({ ...prev, [field]: val }))
  }

  async function handleAccountStep(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Your name is required'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }

    setLoading(true)
    try {
      const supabase = createClient()

      // Try signing in first — if account already exists, go straight to dashboard
      const { data: signInData } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })

      if (signInData?.user) {
        // Existing user — check if they have a workspace
        const { data: userData } = await supabase
          .from('users')
          .select('active_company_id, company_id')
          .eq('id', signInData.user.id)
          .single()

        if (userData?.active_company_id || userData?.company_id) {
          window.location.href = '/'
          return
        }
        // Has auth account but no workspace → go to workspace step
        setStep('workspace')
        return
      }

      // New user — sign up
      const { error: signUpErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.name.trim() } },
      })
      if (signUpErr) { setError(signUpErr.message); return }

      // Sign in to establish session
      const { data: sessionData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })
      if (signInErr || !sessionData?.user) { setError(signInErr?.message || 'Could not establish session'); return }

      // Create user row via service role API (bypasses RLS, no company yet)
      await fetch('/api/setup-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: sessionData.user.id,
          email: sessionData.user.email,
        }),
      })

      setStep('workspace')
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  async function handleWorkspaceStep(e: React.FormEvent) {
    e.preventDefault()
    if (!form.workspace.trim()) { setError('Workspace name is required'); return }

    setLoading(true); setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Session expired. Please start again.'); return }

      const res = await fetch('/api/setup-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          workspaceName: form.workspace.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Failed to create workspace'); return }

      // Hard redirect so middleware re-evaluates session with new company
      window.location.href = '/'
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
              <h1 className="text-white text-2xl font-semibold">Get started</h1>
              <p className="text-neutral-400 text-sm mt-1">Create an account or sign in</p>
            </>
          ) : (
            <>
              <h1 className="text-white text-2xl font-semibold">Set up your workspace</h1>
              <p className="text-neutral-400 text-sm mt-1">Name it after your business</p>
            </>
          )}
        </div>

        {step === 'account' ? (
          <form onSubmit={handleAccountStep} className="space-y-4">
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
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-white text-black font-medium rounded-lg text-sm hover:bg-neutral-200 transition-colors disabled:opacity-50">
              {loading ? 'Checking…' : 'Continue →'}
            </button>
            <p className="text-center text-neutral-500 text-sm">
              Already have an account?{' '}
              <a href="/login" className="text-neutral-300 hover:text-white">Sign in</a>
            </p>
          </form>
        ) : (
          <form onSubmit={handleWorkspaceStep} className="space-y-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-1.5">Workspace name <span className="text-red-400">*</span></label>
              <input type="text" value={form.workspace} onChange={e => set('workspace', e.target.value)}
                placeholder="Same Day Car Repair" required autoFocus
                className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-neutral-600" />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1.5">Phone</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="0439 269 598"
                className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-neutral-600" />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1.5">Location</label>
              <input type="text" value={form.address} onChange={e => set('address', e.target.value)}
                placeholder="Sydney, NSW"
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
      </div>
    </div>
  )
}
