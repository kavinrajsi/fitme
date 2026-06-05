/**
 * Browser-side Web Push helpers shared by the auto-subscribe bootstrap and the
 * Profile toggle. Only call these in the browser.
 */
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function parseUserAgent(userAgent) {
  let os = 'Unknown OS'
  if (/iPhone|iPad|iPod/.test(userAgent)) os = 'iOS'
  else if (/Android/.test(userAgent)) os = 'Android'
  else if (/Mac OS X/.test(userAgent)) os = 'macOS'
  else if (/Windows/.test(userAgent)) os = 'Windows'
  else if (/Linux/.test(userAgent)) os = 'Linux'

  let browser = 'Browser'
  if (/Edg\//.test(userAgent)) browser = 'Edge'
  else if (/OPR\//.test(userAgent)) browser = 'Opera'
  else if (/Chrome\//.test(userAgent)) browser = 'Chrome'
  else if (/Firefox\//.test(userAgent)) browser = 'Firefox'
  else if (/Safari\//.test(userAgent)) browser = 'Safari'

  return `${browser} on ${os}`
}

// Best-effort device label + raw UA. Uses high-entropy UA-Client-Hints where available
// (OS version + Android model), falling back to a User-Agent string parse.
export async function getDeviceInfo() {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  try {
    const uaData = navigator.userAgentData
    if (uaData?.getHighEntropyValues) {
      const high = await uaData.getHighEntropyValues(['model', 'platform', 'platformVersion'])
      const brand = (uaData.brands || [])
        .map((entry) => entry.brand)
        .find((name) => name && !/Not.?A.?Brand/i.test(name))
      const parts = []
      if (brand) parts.push(brand)
      if (high.platform) {
        const major = high.platformVersion ? high.platformVersion.split('.')[0] : ''
        parts.push(`on ${high.platform}${major ? ` ${major}` : ''}`)
      }
      if (high.model) parts.push(`(${high.model})`)
      const device = parts.join(' ').trim()
      return { device: device || parseUserAgent(userAgent), userAgent }
    }
  } catch {
    /* fall through */
  }
  return { device: parseUserAgent(userAgent), userAgent }
}

// Register the SW, subscribe to push, and persist the subscription. Returns true on success.
export async function subscribeAndSave(vapidKey) {
  const registration = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  })
  const { device, userAgent } = await getDeviceInfo()
  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...subscription.toJSON(), device, userAgent }),
  })
  return response.ok
}
