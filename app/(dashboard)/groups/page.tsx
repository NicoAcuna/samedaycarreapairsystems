'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase/client'

type Group = {
  id: string
  instance: string | null
  group_jid: string
  group_name: string | null
  active: boolean
  last_seen: string
}

function lastSeen(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'recién'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      const { data: userData } = await supabase
        .from('users').select('active_company_id, company_id').eq('id', user.id).single()
      const cid = userData?.active_company_id || userData?.company_id
      if (!cid) { setLoading(false); return }
      const { data } = await supabase
        .from('whatsapp_groups')
        .select('id, instance, group_jid, group_name, active, last_seen')
        .eq('company_id', cid)
        .order('last_seen', { ascending: false })
      setGroups((data as Group[]) || [])
      setLoading(false)
    })
  }, [])

  async function toggle(g: Group) {
    const supabase = createClient()
    setGroups(prev => prev.map(x => x.id === g.id ? { ...x, active: !x.active } : x))
    await supabase.from('whatsapp_groups').update({ active: !g.active }).eq('id', g.id)
  }

  const filtered = groups.filter(g =>
    !search.trim() ||
    (g.group_name || '').toLowerCase().includes(search.trim().toLowerCase())
  )

  // Group by instance (each WhatsApp number)
  const byInstance = new Map<string, Group[]>()
  for (const g of filtered) {
    const key = g.instance || 'Sin identificar'
    if (!byInstance.has(key)) byInstance.set(key, [])
    byInstance.get(key)!.push(g)
  }

  const watched = groups.filter(g => g.active).length

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">Grupos de WhatsApp</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Elegí en qué grupos buscar leads. Todos se vigilan por defecto — apagá los que hacen ruido.
          Los grupos aparecen acá a medida que llegan mensajes.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-400 text-center py-8">Cargando…</p>
      ) : groups.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-neutral-200 rounded-2xl">
          <p className="text-sm text-neutral-500">Todavía no se detectaron grupos.</p>
          <p className="text-xs text-neutral-400 mt-1">Van a aparecer acá apenas llegue un mensaje a cualquiera de tus grupos.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 mb-4">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar grupo…"
              className="flex-1 text-sm border border-neutral-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-neutral-400 bg-white"
            />
            <span className="text-xs text-neutral-400 whitespace-nowrap">{watched}/{groups.length} vigilados</span>
          </div>

          {[...byInstance.entries()].map(([instance, list]) => (
            <div key={instance} className="mb-6">
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="text-base">📱</span>
                <span className="text-sm font-medium text-neutral-700">{instance}</span>
                <span className="text-xs text-neutral-400">· {list.length} grupo{list.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-2">
                {list.map(g => (
                  <div
                    key={g.id}
                    className={`flex items-center gap-3 bg-white border border-neutral-200 rounded-xl px-4 py-3 ${g.active ? '' : 'opacity-50'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-neutral-900 truncate">{g.group_name || 'Grupo sin nombre'}</div>
                      <div className="text-xs text-neutral-400">visto {lastSeen(g.last_seen)}</div>
                    </div>
                    <button
                      onClick={() => toggle(g)}
                      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${g.active ? 'bg-green-500' : 'bg-neutral-300'}`}
                      title={g.active ? 'Vigilando — tocar para apagar' : 'Apagado — tocar para vigilar'}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${g.active ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
