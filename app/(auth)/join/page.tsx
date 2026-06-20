'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Status = 'checking' | 'ready' | 'submitting' | 'error'

export default function JoinPage() {
  const [status, setStatus] = useState<Status>('checking')
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  // Verify the invite session up front. If there's no session the link was
  // invalid/expired; if the account is already set up, skip straight in.
  useEffect(() => {
    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      const { data: userData } = await supabase
        .from('users')
        .select('active_company_id, company_id')
        .eq('id', user.id)
        .maybeSingle()
      if (userData?.active_company_id || userData?.company_id) {
        window.location.href = '/'
        return
      }
      setStatus('ready')
    }
    check().catch(() => { setError('Something went wrong. Please reopen the invite link.'); setStatus('error') })
  }, [])

  async function handleSubmit() {
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setStatus('submitting'); setError('')
    try {
      const supabase = createClient()
      const { error: pwErr } = await supabase.auth.updateUser({ password })
      if (pwErr) { setError(pwErr.message); setStatus('ready'); return }

      const res = await fetch('/api/setup-mechanic', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'Could not finish setting up your account'); setStatus('ready'); return }

      window.location.href = '/'
    } catch {
      setError('Network error. Please try again.')
      setStatus('ready')
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
            <span className="text-black text-sm font-bold">S</span>
          </div>
          <span className="text-white font-semibold text-lg">SDCR Systems</span>
        </div>

        {status === 'checking' && (
          <p className="text-neutral-400 text-sm text-center">Verifying your invite…</p>
        )}

        {status === 'error' && (
          <div className="text-center">
            <p className="text-red-400 text-sm mb-4">{error}</p>
            <a href="/login" className="text-neutral-300 text-sm hover:text-white">Go to login →</a>
          </div>
        )}

        {(status === 'ready' || status === 'submitting') && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <h1 className="text-white font-semibold text-lg mb-1">Create your password</h1>
            <p className="text-neutral-400 text-sm mb-5">Set a password to finish joining the team.</p>

            <label className="text-xs font-medium text-neutral-400 mb-1.5 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full text-base bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-3 mb-3 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
            />

            <label className="text-xs font-medium text-neutral-400 mb-1.5 block">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && status === 'ready') handleSubmit() }}
              placeholder="Re-enter password"
              className="w-full text-base bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
            />

            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 mt-3">{error}</div>
            )}

            <button
              onClick={handleSubmit}
              disabled={status === 'submitting'}
              className="w-full mt-5 text-sm py-3 bg-green-500 text-black rounded-xl hover:bg-green-400 disabled:opacity-50 font-semibold"
            >
              {status === 'submitting' ? 'Setting up…' : 'Create account'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
