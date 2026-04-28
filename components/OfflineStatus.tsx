'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { flush, getQueue } from '@/lib/offline-queue'

export default function OfflineStatus() {
  const isOnline = useOnlineStatus()
  const wasOffline = useRef(false)

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true
      return
    }

    if (!wasOffline.current) return
    wasOffline.current = false

    const pending = getQueue()
    if (pending.length === 0) return

    const n = pending.length
    const label = n === 1 ? 'cambio pendiente' : `${n} cambios pendientes`

    toast.promise(flush(), {
      loading: `Enviando ${label}...`,
      success: ({ success, failed }) =>
        failed > 0
          ? `${success} enviado${success !== 1 ? 's' : ''}, ${failed} con error`
          : `${success} cambio${success !== 1 ? 's' : ''} enviado${success !== 1 ? 's' : ''} correctamente`,
      error: 'Error al enviar cambios pendientes',
    })
  }, [isOnline])

  if (isOnline) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground safe-area-bottom">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>Sin conexión — los cambios se enviarán al reconectarte</span>
    </div>
  )
}
