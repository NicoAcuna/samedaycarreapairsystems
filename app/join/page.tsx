'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Status = 'checking' | 'ready' | 'submitting' | 'invalid'

function JoinInner() {
  const params = useSearchParams()
  const token = params.get('token')

  const [status, setStatus] = useState<Status>('checking')
  const [invalidMsg, setInvalidMsg] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  // Validate the invite token up front (no session needed — the mechanic has no
  // account session yet). This is a normal page load, so in-app browsers and
  // email link scanners can't break it the way one-time OTP links did.
  useEffect(() => {
    if (!token) {
      setInvalidMsg('This invite link is missing its token.')
      setStatus('invalid')
      return
    }
    fetch(`/api/validate-invite?token=${encodeURIComponent(token)}`)
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok || !d.valid) {
          setInvalidMsg(
            d.reason === 'expired' ? 'This invite has expired. Ask your admin to re-send it.'
            : d.reason === 'used' ? 'This invite was already used. Try signing in instead.'
            : 'This invite link is invalid.'
          )
          setStatus('invalid')
          return
        }
        setName(d.name)
        setEmail(d.email)
        setStatus('ready')
      })
      .catch(() => {
        setInvalidMsg('Something went wrong. Please reopen the invite link.')
        setStatus('invalid')
      })
  }, [token])

  async function handleSubmit() {
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setStatus('submitting'); setError('')
    try {
      const res = await fetch('/api/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Could not finish setting up your account')
        setStatus('ready')
        return
      }

      // Sign in with the freshly-set password and land straight in the dashboard.
      const supabase = createClient()
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: data.email || email,
        password,
      })
      if (signInErr) {
        // Account is set up; just send them to login to sign in manually.
        window.location.href = '/login'
        return
      }
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

        {status === 'invalid' && (
          <div className="text-center">
            <p className="text-red-400 text-sm mb-4">{invalidMsg}</p>
            <a href="/login" className="text-neutral-300 text-sm hover:text-white">Go to login →</a>
          </div>
        )}

        {(status === 'ready' || status === 'submitting') && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <h1 className="text-white font-semibold text-lg mb-1">Welcome{name ? `, ${name.split(' ')[0]}` : ''}</h1>
            <p className="text-neutral-400 text-sm mb-5">Set a password to finish joining the team.</p>

            <label className="text-xs font-medium text-neutral-400 mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full text-base bg-neutral-800/60 border border-neutral-800 rounded-xl px-3 py-3 mb-3 text-neutral-400 cursor-not-allowed"
            />

            <label className="text-xs font-medium text-neutral-400 mb-1.5 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoFocus
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

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-950" />}>
      <JoinInner />
    </Suspense>
  )
}
