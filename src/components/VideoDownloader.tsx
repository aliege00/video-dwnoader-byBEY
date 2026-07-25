import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface DownloadResult {
  url: string
  filename: string
  mimeType: string
}

// Cobalt API endpoint
const COBALT_API = 'https://co.wuk.sh/api/'

// Direct video URL patterns
const DIRECT_VIDEO_PATTERNS = /\.(mp4|webm|avi|mov|mkv|flv|wmv|3gp)(\?.*)?$/i

// Platform URL patterns that need Cobalt API
const PLATFORM_PATTERNS = [
  'youtube.com', 'youtu.be',
  'tiktok.com', 'vm.tiktok.com',
  'instagram.com', 'instagr.am',
  'twitter.com', 'x.com',
  'facebook.com', 'fb.watch',
  'vimeo.com',
  'dailymotion.com',
  'reddit.com',
  'pinterest.com',
]

function extractFilename(url: string, mimeType: string): string {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const segments = pathname.split('/')
    const lastSegment = segments[segments.length - 1]
    if (lastSegment && lastSegment.includes('.')) {
      return decodeURIComponent(lastSegment)
    }
  } catch {}
  
  // Generate filename from mime type
  const ext = mimeType.split('/')[1] || 'mp4'
  return `video-${Date.now()}.${ext}`
}

function detectSourceType(url: string): 'direct' | 'platform' | 'unknown' {
  if (!url || url.trim().length < 5) return 'unknown'
  if (DIRECT_VIDEO_PATTERNS.test(url)) return 'direct'
  if (PLATFORM_PATTERNS.some(p => url.toLowerCase().includes(p))) return 'platform'
  // Check if it looks like a URL at all
  if (url.startsWith('http://') || url.startsWith('https://')) return 'platform'
  return 'unknown'
}

export default function VideoDownloader() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [, setDownloadResult] = useState<DownloadResult | null>(null)
  const [sourceType, setSourceType] = useState<'direct' | 'platform' | 'unknown'>('unknown')
  const [history, setHistory] = useState<Array<{ url: string; status: 'done' | 'error'; filename?: string }>>([])
  const abortRef = useRef<AbortController | null>(null)

  const handleUrlChange = useCallback((value: string) => {
    setUrl(value)
    setError(null)
    setDownloadResult(null)
    setSourceType(detectSourceType(value))
  }, [])

  const downloadViaCobalt = useCallback(async (videoUrl: string): Promise<DownloadResult> => {
    const response = await fetch(COBALT_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        url: videoUrl,
        videoQuality: 'max',
        audioFormat: 'mp3',
        filenameStyle: 'pretty',
        isAudioOnly: false,
        disableMetadata: true,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Cobalt API error: ${response.status} - ${text}`)
    }

    const data = await response.json()
    
    if (data.status === 'error') {
      throw new Error(data.text || 'Cobalt API returned an error')
    }

    // Cobalt returns the download URL in data.url
    if (!data.url) {
      throw new Error('No download URL received from Cobalt')
    }

    return {
      url: data.url,
      filename: data.filename || extractFilename(data.url, 'video/mp4'),
      mimeType: 'video/mp4',
    }
  }, [])

  const downloadDirectVideo = useCallback(async (videoUrl: string): Promise<DownloadResult> => {
    // Use CORS proxy for direct video files
    const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(videoUrl)}`
    
    const response = await fetch(proxyUrl, {
      signal: abortRef.current?.signal,
      headers: {
        'Accept': 'video/*,*/*',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.status}`)
    }

    const contentLength = response.headers.get('content-length')
    const contentType = response.headers.get('content-type') || 'video/mp4'
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0

    // Stream the response with progress
    const reader = response.body!.getReader()
    const chunks: Uint8Array[] = []
    let receivedBytes = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      receivedBytes += value.length
      if (totalBytes > 0) {
        setProgress(Math.round((receivedBytes / totalBytes) * 100))
      } else {
        // Simulate progress if no content-length
        setProgress(Math.min(Math.round((receivedBytes / (totalBytes || 1024 * 1024)) * 100), 95))
      }
    }

    setProgress(100)

    // Create blob and download URL
    const blob = new Blob(chunks, { type: contentType })
    const url = URL.createObjectURL(blob)

    return {
      url,
      filename: extractFilename(videoUrl, contentType),
      mimeType: contentType,
    }
  }, [])

  const handleDownload = useCallback(async () => {
    if (!url.trim()) {
      setError('Please enter a video URL')
      return
    }

    setLoading(true)
    setError(null)
    setDownloadResult(null)
    setProgress(0)
    abortRef.current = new AbortController()

    try {
      const detectedType = detectSourceType(url.trim())
      let result: DownloadResult

      if (detectedType === 'direct') {
        result = await downloadDirectVideo(url.trim())
      } else {
        result = await downloadViaCobalt(url.trim())
      }

      setDownloadResult(result)
      setHistory(prev => [{ url: url.trim(), status: 'done', filename: result.filename }, ...prev.slice(0, 9)])

      // Trigger the download
      const a = document.createElement('a')
      a.href = result.url
      a.download = result.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      // Revoke blob URL after a delay
      if (result.url.startsWith('blob:')) {
        setTimeout(() => URL.revokeObjectURL(result.url), 60000)
      }
    } catch (err: any) {
      const message = err.message || 'Download failed. Check the URL and try again.'
      setError(message)
      setHistory(prev => [{ url: url.trim(), status: 'error' }, ...prev.slice(0, 9)])
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }, [url, downloadDirectVideo, downloadViaCobalt])

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        setUrl(text)
        setError(null)
        setDownloadResult(null)
        setSourceType(detectSourceType(text))
      }
    } catch {
      // Clipboard access denied, user can paste manually
    }
  }, [])

  // Platform icon helper
  const getPlatformIcon = (videoUrl: string): string => {
    if (!videoUrl) return '🌐'
    const url = videoUrl.toLowerCase()
    if (url.includes('youtube') || url.includes('youtu.be')) return '▶️'
    if (url.includes('tiktok')) return '🎵'
    if (url.includes('instagram')) return '📸'
    if (url.includes('twitter') || url.includes('x.com')) return '🐦'
    if (url.includes('facebook') || url.includes('fb.watch')) return '📘'
    if (url.includes('vimeo')) return '🎥'
    if (url.includes('dailymotion')) return '📺'
    if (url.includes('reddit')) return '🤖'
    if (url.match(/\.(mp4|webm|avi|mov|mkv)/i)) return '📹'
    return '🌐'
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
      {/* Hero section */}
      <div className="mb-8 text-center sm:text-left">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            Video <span className="text-gradient">Downloader</span>
          </h1>
          <p className="mt-3 text-lg text-[hsl(var(--muted-foreground))] max-w-2xl mx-auto sm:mx-0">
            Download videos from YouTube, TikTok, Instagram, Twitter, Facebook, and more. 
            Just paste the link and download!
          </p>
        </motion.div>
      </div>

      {/* URL Input Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="glass rounded-2xl p-6 sm:p-8 mb-6"
      >
        <div className="space-y-4">
          <label className="block text-sm font-medium text-[hsl(var(--foreground))]">
            Video Linkini Yapıştır
          </label>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">
                {sourceType !== 'unknown' ? getPlatformIcon(url) : '🔗'}
              </div>
              <input
                type="url"
                value={url}
                onChange={e => handleUrlChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !loading && handleDownload()}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/60 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent transition-all text-base"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handlePaste}
                className="px-4 py-3.5 rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary))]/70 transition-all font-medium text-sm flex items-center gap-2"
                title="Clipboard'dan yapıştır"
              >
                📋
              </button>
              <motion.button
                onClick={handleDownload}
                disabled={loading || !url.trim()}
                whileTap={{ scale: 0.95 }}
                className={`px-6 py-3.5 rounded-xl font-semibold text-base transition-all flex items-center justify-center gap-2 min-w-[140px] ${
                  loading
                    ? 'bg-[hsl(var(--primary))]/70 text-[hsl(var(--primary-foreground))] cursor-wait'
                    : 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:brightness-110 shadow-lg shadow-[hsl(var(--primary))]/25 active:scale-95'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    İndiriliyor...
                  </>
                ) : (
                  <>
                    ⬇ İndir
                  </>
                )}
              </motion.button>
            </div>
          </div>

          {/* Source type indicator */}
          {sourceType !== 'unknown' && url && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]"
            >
              <span className="px-2 py-0.5 rounded-full bg-[hsl(var(--secondary))] text-xs">
                {getPlatformIcon(url)} {sourceType === 'direct' ? 'Direct Video URL' : 'Platform Linki'}
              </span>
              {sourceType === 'direct' && (
                <span className="text-xs opacity-70">(CORS proxy ile indirilecek)</span>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Progress bar */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass rounded-2xl p-5 mb-6"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                {progress > 0 ? 'İndiriliyor...' : 'Video bilgileri alınıyor...'}
              </span>
              {progress > 0 && (
                <span className="text-sm text-[hsl(var(--muted-foreground))]">
                  {progress}%
                </span>
              )}
            </div>
            <div className="h-2 rounded-full bg-[hsl(var(--secondary))] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--primary))] to-purple-400"
                initial={{ width: '0%' }}
                animate={{ width: progress > 0 ? `${progress}%` : '30%' }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
              {progress > 0 
                ? 'Video indiriliyor, lütfen bekleyin...' 
                : 'Sunucudan yanıt bekleniyor...'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 px-5 py-4 rounded-2xl bg-red-500/10 border border-red-500/20"
          >
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-500">Download Failed</p>
                <p className="text-xs text-red-400/80 mt-1">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Supported platforms */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="glass rounded-2xl p-5 mb-6"
      >
        <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-3">
          Desteklenen Platformlar
        </h3>
        <div className="flex flex-wrap gap-2">
          {[
            { icon: '▶️', name: 'YouTube', desc: 'Video & Shorts' },
            { icon: '🎵', name: 'TikTok', desc: 'Video & Music' },
            { icon: '📸', name: 'Instagram', desc: 'Reels & Posts' },
            { icon: '🐦', name: 'Twitter/X', desc: 'Videolar' },
            { icon: '📘', name: 'Facebook', desc: 'Videolar' },
            { icon: '🎥', name: 'Vimeo', desc: 'Videolar' },
            { icon: '📺', name: 'Dailymotion', desc: 'Videolar' },
            { icon: '🤖', name: 'Reddit', desc: 'Videolar' },
            { icon: '📹', name: 'Direct MP4', desc: 'URL ile' },
          ].map((platform) => (
            <div
              key={platform.name}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(var(--secondary))] text-xs"
            >
              <span>{platform.icon}</span>
              <span className="font-medium text-[hsl(var(--foreground))]">{platform.name}</span>
              <span className="text-[hsl(var(--muted-foreground))]/60">· {platform.desc}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Download history */}
      {history.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass rounded-2xl p-5 mb-6"
        >
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-3">
            Download History
          </h3>
          <div className="space-y-2">
            {history.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[hsl(var(--background))]"
              >
                <span className={item.status === 'done' ? 'text-green-500' : 'text-red-500'}>
                  {item.status === 'done' ? '✅' : '❌'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[hsl(var(--foreground))] truncate">
                    {getPlatformIcon(item.url)} {item.url.replace(/^https?:\/\//, '').slice(0, 50)}
                  </p>
                  {item.filename && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                      {item.filename}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Usage instructions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-sm text-[hsl(var(--muted-foreground))] pb-8 space-y-2"
      >
        <p>
          <strong>Nasıl Kullanılır:</strong> Video linkini kopyalayın, 
          yukarıdaki kutuya yapıştırın ve "İndir" butonuna tıklayın.
        </p>
        <p className="text-xs opacity-70">
          Direct MP4/WebM URL'leri doğrudan indirilir. Platform linkleri Cobalt API üzerinden işlenir.
        </p>
      </motion.div>
    </div>
  )
}
