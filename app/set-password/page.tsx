'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SetPasswordPage() {
  const [status, setStatus] = useState<'checking' | 'ready' | 'saving' | 'error'>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        window.location.href = '/login'
        return
      }
      setStatus('ready')
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }

    setStatus('saving')
    const supabase = createClient()

    const { error: updateErr } = await supabase.auth.updateUser({ password })
    if (updateErr) {
      setError(updateErr.message)
      setStatus('ready')
      return
    }

    const res = await fetch('/api/setup-mechanic', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Setup failed')
      setStatus('ready')
      return
    }

    window.location.href = '/'
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
          <h1 className="text-white text-2xl font-semibold">Set your password</h1>
          <p className="text-neutral-400 text-sm mt-1">Choose a password to finish joining your team</p>
        </div>

        {status === 'checking' ? (
          <p className="text-neutral-400 text-sm text-center">Verifying your invitation…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                autoFocus
                className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-neutral-600"
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1.5">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                required
                className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-neutral-600"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={status === 'saving'}
              className="w-full py-2.5 bg-white text-black font-medium rounded-lg text-sm hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              {status === 'saving' ? 'Saving…' : 'Save and continue →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
