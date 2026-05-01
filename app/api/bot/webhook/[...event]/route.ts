import { NextRequest } from 'next/server'

import { handleWebhookPost } from '../route'

type RouteParams = {
  event?: string[]
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  const { event = [] } = await params
  const routeEvent = event.join('/')
  return handleWebhookPost(req, routeEvent)
}
