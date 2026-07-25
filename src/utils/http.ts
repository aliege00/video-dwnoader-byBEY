/**
 * HTTP utility that works across all platforms:
 * - Android APK (Capacitor): Uses native HTTP (NO CORS restrictions!)
 * - Windows EXE (Electron): Uses Node.js fetch (NO CORS restrictions!)
 * - Web browser: Uses regular fetch with CORS proxy fallback
 */

// Try to detect if we're in Capacitor/Android WebView
let isCapacitor = false
try {
  if (typeof (window as any).Capacitor !== 'undefined' && 
      (window as any).Capacitor.isNativePlatform?.()) {
    isCapacitor = true
  }
} catch {}

// CORS proxies for browser fallback
const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
]

export interface NativeHttpResponse {
  status: number
  data: any
  headers: Record<string, string>
}

/**
 * Make a POST request with JSON body.
 * In Capacitor (APK): Uses native HTTP → NO CORS restrictions
 * In Electron/Web: Uses fetch → may need CORS proxies
 */
export async function nativePost(url: string, body: Record<string, any>): Promise<NativeHttpResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'VideoDownloader/1.0 (Android)',
  }

  // METHOD 1: Capacitor native HTTP (works on Android APK, no CORS)
  if (isCapacitor) {
    try {
      const { CapacitorHttp } = await import('@capacitor/core')
      const response = await CapacitorHttp.post({
        url,
        headers,
        data: body,
      })
      return {
        status: response.status,
        data: response.data,
        headers: response.headers as Record<string, string>,
      }
    } catch (err) {
      console.warn('Capacitor HTTP failed, falling back to fetch:', err)
    }
  }

  // METHOD 2: Direct fetch (works in Electron, may fail in browser due to CORS)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    const data = await response.json()
    return { status: response.status, data, headers: {} }
  } catch {
    // CORS error - try proxies
  }

  // METHOD 3: Via CORS proxy (works in browser)
  for (const proxy of CORS_PROXIES) {
    try {
      const proxyUrl = proxy(url)
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      return { status: response.status, data, headers: {} }
    } catch {}
  }

  throw new Error('No connection method available')
}

/**
 * Download a file as blob. In Capacitor it uses native HTTP (no CORS).
 */
export async function downloadBlob(url: string): Promise<Blob> {
  // METHOD 1: Capacitor native HTTP
  if (isCapacitor) {
    try {
      const { CapacitorHttp } = await import('@capacitor/core')
      const response = await CapacitorHttp.get({
        url,
        responseType: 'blob',
        headers: {
          'Accept': 'video/*,*/*',
          'User-Agent': 'VideoDownloader/1.0 (Android)',
        },
      })
      return response.data as Blob
    } catch {}
  }

  // METHOD 2: Direct fetch
  try {
    const response = await fetch(url, { headers: { Accept: 'video/*,*/*' } })
    if (response.ok) return await response.blob()
  } catch {}

  // METHOD 3: Via proxy
  for (const proxy of CORS_PROXIES) {
    try {
      const response = await fetch(proxy(url), {
        headers: { Accept: 'video/*,*/*' },
      })
      if (response.ok) return await response.blob()
    } catch {}
  }

  throw new Error('Could not download file')
}

export { isCapacitor }
