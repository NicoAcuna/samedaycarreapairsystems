'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function JoinPage() {
  const [status, setStatus] = useState<'loading' | 'setting-up' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    async function setup() {
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
        .single()

      if (userData?.active_company_id || userData?.company_id) {
        window.location.href = '/'
        return
      }

      setStatus('setting-up')
      const res = await fetch('/api/setup-mechanic', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Setup failed')
        setStatus('error')
        return
      }

      window.location.href = '/'
    }

    setup()
  }, [])

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
            <span className="text-black text-sm font-bold">S</span>
          </div>
          <span className="text-white font-semibold text-lg">SDCR Systems</span>
        </div>

        {status === 'loading' && (
          <p className="text-neutral-400 text-sm">Verifying your session…</p>
        )}
        {status === 'setting-up' && (
          <p className="text-neutral-400 text-sm">Setting up your account…</p>
        )}
        {status === 'error' && (
          <div>
            <p className="text-red-400 text-sm mb-4">{error}</p>
            <a href="/login" className="text-neutral-300 text-sm hover:text-white">Go to login →</a>
          </div>
        )}
      </div>
    </div>
  )
}
