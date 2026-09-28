'use client'

import { useState, useEffect } from 'react'
import { createClient } from './supabase/client'

// Resolves the current user + their active company id — the "getUser → users →
// coalesce(active_company_id, company_id)" dance that was copy-pasted across
// ~18 pages. Use this instead of re-implementing it.
export function useActiveCompany() {
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { if (active) setLoading(false); return }
      if (active) setUserId(user.id)
      const { data } = await supabase
        .from('users').select('active_company_id, company_id').eq('id', user.id).single()
      if (!active) return
      setCompanyId(data?.active_company_id || data?.company_id || null)
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  return { companyId, userId, loading }
}
