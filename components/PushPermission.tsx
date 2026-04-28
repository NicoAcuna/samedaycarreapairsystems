'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { toast } from 'sonner'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

async function subscribe() {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
  })
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub.toJSON()),
  })
  return sub
}

async function unsubscribe(sub: PushSubscription) {
  await fetch('/api/push/subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  })
  await sub.unsubscribe()
}

export default function PushPermission() {
  const [status, setStatus] = useState<'loading' | 'unsupported' | 'denied' | 'granted' | 'default'>('loading')

  useEffect(() => {
    if (!('PushManager' in window) || !('serviceWorker' in navigator)) {
      setStatus('unsupported')
      return
    }
    setStatus(Notification.permission as typeof status)
  }, [])

  async function handleEnable() {
    const permission = await Notification.requestPermission()
    setStatus(permission as typeof status)
    if (permission !== 'granted') return
    try {
      await subscribe()
      toast.success('Notificaciones activadas')
    } catch {
      toast.error('No se pudo activar notificaciones')
    }
  }

  async function handleDisable() {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) await unsubscribe(sub)
    setStatus('default')
    toast.info('Notificaciones desactivadas')
  }

  if (status === 'loading' || status === 'unsupported') return null

  if (status === 'granted') {
    return (
      <button
        onClick={handleDisable}
        title="Desactivar notificaciones"
        className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 transition-colors"
      >
        <Bell className="h-4 w-4" />
      </button>
    )
  }

  if (status === 'denied') {
    return (
      <button
        disabled
        title="Notificaciones bloqueadas en el navegador"
        className="flex items-center gap-1.5 text-xs text-neutral-400 cursor-not-allowed"
      >
        <BellOff className="h-4 w-4" />
      </button>
    )
  }

  // 'default' — not yet asked
  return (
    <button
      onClick={handleEnable}
      title="Activar notificaciones push"
      className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 transition-colors"
    >
      <BellOff className="h-4 w-4" />
    </button>
  )
}
