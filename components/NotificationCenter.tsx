'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, UserPlus, Calendar, HelpCircle, RefreshCw, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { createClient } from '@/lib/supabase/client'

type Notification = {
  id: string
  type: string
  title: string
  body: string | null
  url: string | null
  read: boolean
  created_at: string
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  new_lead:                <UserPlus className="h-4 w-4" />,
  lead_ready_to_schedule:  <Calendar className="h-4 w-4" />,
  lead_needs_answer:       <HelpCircle className="h-4 w-4" />,
  lead_updated:            <RefreshCw className="h-4 w-4" />,
}

function NotifIcon({ type }: { type: string }) {
  return (
    <span className="shrink-0 w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500">
      {TYPE_ICON[type] ?? <Bell className="h-4 w-4" />}
    </span>
  )
}

export default function NotificationCenter() {
  const [open, setOpen]                   = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading]             = useState(true)
  const [companyId, setCompanyId]         = useState<string | null>(null)
  const panelRef                          = useRef<HTMLDivElement>(null)
  const router                            = useRouter()
  const supabase                          = createClient()

  const unread = notifications.filter((n) => !n.read).length

  // ── Load + realtime ──────────────────────────────────────────────────────────
  const load = useCallback(async (cid: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('company_id', cid)
      .order('created_at', { ascending: false })
      .limit(40)
    setNotifications(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from('users')
        .select('active_company_id, company_id')
        .eq('id', user.id)
        .single()
      const cid = data?.active_company_id || data?.company_id
      if (!cid) return
      setCompanyId(cid)
      await load(cid)

      // Realtime: new rows for this company
      supabase
        .channel(`notif:${cid}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `company_id=eq.${cid}` },
          (payload) => setNotifications((prev) => [payload.new as Notification, ...prev]),
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'notifications', filter: `company_id=eq.${cid}` },
          (payload) => setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id)),
        )
        .subscribe()
    })
  }, [load, supabase])

  // ── Close on outside click ───────────────────────────────────────────────────
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // ── Actions ──────────────────────────────────────────────────────────────────
  async function tap(n: Notification) {
    setOpen(false)
    if (!n.read) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
      await supabase.from('notifications').update({ read: true }).eq('id', n.id)
    }
    if (n.url) router.push(n.url)
  }

  async function markAllRead() {
    const ids = notifications.filter((n) => !n.read).map((n) => n.id)
    if (!ids.length) return
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    await supabase.from('notifications').update({ read: true }).in('id', ids)
  }

  async function dismiss(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    await supabase.from('notifications').delete().eq('id', id)
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl hover:bg-neutral-200 transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5 text-neutral-600" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[1.1rem] h-[1.1rem] px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-neutral-100 z-50 overflow-hidden flex flex-col max-h-[80vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-neutral-900">Notifications</span>
              {unread > 0 && (
                <span className="text-xs bg-red-100 text-red-600 font-semibold px-1.5 py-0.5 rounded-full">
                  {unread} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-sm text-neutral-400">
                Loading…
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-neutral-400">
                <Bell className="h-8 w-8 opacity-30" />
                <span className="text-sm">No notifications yet</span>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`relative group flex items-start gap-3 px-4 py-3 border-b border-neutral-50 last:border-0 transition-colors hover:bg-neutral-50 ${
                    !n.read ? 'bg-blue-50/40' : ''
                  }`}
                >
                  <button
                    onClick={() => tap(n)}
                    className="flex items-start gap-3 flex-1 min-w-0 text-left"
                  >
                    <NotifIcon type={n.type} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm truncate ${!n.read ? 'font-semibold text-neutral-900' : 'font-medium text-neutral-700'}`}>
                        {n.title}
                      </div>
                      {n.body && (
                        <div className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{n.body}</div>
                      )}
                      <div className="text-[11px] text-neutral-400 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </div>
                    </div>
                    {!n.read && (
                      <span className="shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                    )}
                  </button>
                  <button
                    onClick={(e) => dismiss(e, n.id)}
                    className="shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700 mt-0.5"
                    aria-label="Descartar"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
