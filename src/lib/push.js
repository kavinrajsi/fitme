/**
 * Web Push sender. Reads all stored subscriptions and pushes a payload to each,
 * pruning subscriptions Google/Apple report as gone (404/410).
 */
import webpush from 'web-push'
import { createServiceClient } from '@/lib/supabase/service'

let configured = false
function configure() {
  if (configured) return true
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false
  webpush.setVapidDetails(
    VAPID_SUBJECT || 'mailto:admin@kyarefitting.app',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  )
  configured = true
  return true
}

export async function sendPushToAll(payload, { source = 'manual' } = {}) {
  if (!configure()) {
    console.error('[push] VAPID keys not configured')
    return { sent: 0 }
  }
  const service = createServiceClient()

  // Log the broadcast up front (so triggered alerts show even with 0 subscribers).
  const { data: logRow } = await service
    .from('notification_log')
    .insert({ source, title: payload.title, body: payload.body, url: payload.url })
    .select('id')
    .single()
  const notificationId = logRow?.id ?? null

  const { data: subscriptions } = await service
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')

  const body = JSON.stringify(payload)
  const recipients = []
  let sent = 0
  let failed = 0
  await Promise.all(
    (subscriptions ?? []).map(async (subscription) => {
      let status = 'sent'
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
          body
        )
        sent++
      } catch (err) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          status = 'expired'
          await service.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
        } else {
          status = 'failed'
          console.error('[push] send failed:', err?.statusCode ?? err?.message ?? err)
        }
        failed++
      }
      recipients.push({
        notification_id: notificationId,
        user_id: subscription.user_id,
        endpoint: subscription.endpoint,
        status,
      })
    })
  )

  if (notificationId) {
    if (recipients.length) await service.from('notification_recipients').insert(recipients)
    await service
      .from('notification_log')
      .update({ sent_count: sent, failed_count: failed })
      .eq('id', notificationId)
  }

  return { sent, notificationId }
}
