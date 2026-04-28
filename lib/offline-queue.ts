type QueuedAction = {
  id: string
  type: string
  payload: unknown
  createdAt: number
}

type ActionHandler = (payload: unknown) => Promise<void>

const STORAGE_KEY = 'sdcr_offline_queue'
const handlers = new Map<string, ActionHandler>()

export function registerHandler(type: string, handler: ActionHandler) {
  handlers.set(type, handler)
}

export function enqueue(type: string, payload: unknown) {
  const queue = getQueue()
  queue.push({ id: crypto.randomUUID(), type, payload, createdAt: Date.now() })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
}

export function getQueue(): QueuedAction[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export async function flush(): Promise<{ success: number; failed: number }> {
  const queue = getQueue()
  if (queue.length === 0) return { success: 0, failed: 0 }

  let success = 0
  let failed = 0
  const remaining: QueuedAction[] = []

  for (const action of queue) {
    const handler = handlers.get(action.type)
    if (!handler) {
      remaining.push(action)
      continue
    }
    try {
      await handler(action.payload)
      success++
    } catch {
      failed++
      remaining.push(action)
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining))
  return { success, failed }
}
