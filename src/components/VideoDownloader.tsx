import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const COBALT_API = 'https://co.wuk.sh/api/'
const CORS_PROXY = 'https://corsproxy.io/?url='

const DIRECT_VIDEO_RE = /\.(mp4|webm|avi|mov|mkv|flv|wmv|3gp)(\?.*)?$/i
const PLATFORMS = [
  'youtube.com', 'youtu.be', 'tiktok.com', 'vm.tiktok.com',
  'instagram.com', 'instagr.am', 'twitter.com', 'x.com',
  'facebook.com', 'fb.watch', 'vimeo.com', 'dailymotion.com',
  'reddit.com', 'pinterest.com',
]

interface QueueItem {
  id: string
  url: string
  platform: string
  status: 'waiting' | 'processing' | 'done' | 'error'
  progress: number
  filename?: string
  error?: string
}

let idCounter = 0
function nextId() { return `q-${++idCounter}` }

function getPlatform(url: string): { icon: string; name: string } {
  const u = url.toLowerCase()
  if (u.includes('youtube') || u.includes('youtu.be')) return { icon: '▶️', name: 'YouTube' }
  if (u.includes('tiktok')) return { icon: '🎵', name: 'TikTok' }
  if (u.includes('instagram')) return { icon: '📸', name: 'Instagram' }
  if (u.includes('twitter') || u.includes('x.com')) return { icon: '🐦', name: 'Twitter' }
  if (u.includes('facebook') || u.includes('fb.watch')) return { icon: '📘', name: 'Facebook' }
  if (u.includes('vimeo')) return { icon: '🎥', name: 'Vimeo' }
  if (u.includes('dailymotion')) return { icon: '📺', name: 'Dailymotion' }
  if (u.includes('reddit')) return { icon: '🤖', name: 'Reddit' }
  if (DIRECT_VIDEO_RE.test(url)) return { icon: '📹', name: 'Direct Video' }
  return { icon: '🌐', name: 'Web Link' }
}

function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s,;]+/gi
  const matches = text.match(urlRegex)
  if (!matches) return []
  return [...new Set(matches.map(u => u.replace(/[,\s;]+$/, '').trim()))]
}

function isDirectVideo(url: string): boolean {
  return DIRECT_VIDEO_RE.test(url)
}

function isPlatformUrl(url: string): boolean {
  return PLATFORMS.some(p => url.toLowerCase().includes(p))
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

export default function VideoDownloader() {
  const [inputText, setInputText] = useState('')
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [isDownloading, setIsDownloading] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const abortRef = useRef<boolean>(false)

  const addLog = useCallback((msg: string) => {
    setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 49)])
  }, [])

  const updateQueue = useCallback((id: string, update: Partial<QueueItem>) => {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, ...update } : item))
  }, [])

  const handleInputChange = useCallback((value: string) => {
    setInputText(value)
  }, [])

  const parseUrls = useCallback(() => {
    const urls = extractUrls(inputText)
    if (urls.length === 0) {
      addLog('⚠️ Geçerli bir URL bulunamadı')
      return
    }
    
    const newItems: QueueItem[] = urls.map(url => ({
      id: nextId(),
      url,
      platform: getPlatform(url).name,
      status: 'waiting' as const,
      progress: 0,
    }))
    
    setQueue(prev => {
      const existingUrls = new Set(prev.map(i => i.url))
      const unique = newItems.filter(i => !existingUrls.has(i.url))
      return [...prev, ...unique]
    })
    
    addLog(`📥 ${urls.length} URL eklendi (${newItems.length} yeni)`)
    setInputText('')
  }, [inputText, addLog])

  // Download a single video via Cobalt API
  const downloadViaCobalt = useCallback(async (item: QueueItem, index: number): Promise<boolean> => {
    addLog(`🌐 ${item.platform}: API'ye bağlanılıyor... (${index + 1}/${queue.length})`)
    updateQueue(item.id, { status: 'processing', progress: 10 })

    try {
      const response = await fetch(COBALT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          url: item.url,
          videoQuality: 'max',
          audioFormat: 'mp3',
          filenameStyle: 'pretty',
          isAudioOnly: false,
          disableMetadata: true,
        }),
      })

      if (!response.ok) {
        await response.text().catch(() => '')
        throw new Error(`API hatası (${response.status})`)
      }

      const data = await response.json()
      updateQueue(item.id, { progress: 60 })
      
      if (data.status === 'error' || data.status === 'rate-limit') {
        throw new Error(data.text || 'API limit aşıldı, biraz bekleyip tekrar dene')
      }

      if (!data.url) {
        throw new Error('İndirme linki alınamadı')
      }

      addLog(`📥 ${item.platform}: Video alındı, indiriliyor...`)
      updateQueue(item.id, { progress: 80 })
      
      // Fetch the actual video file from the Cobalt-provided URL
      const videoResponse = await fetch(data.url, { mode: 'cors' })
      if (!videoResponse.ok) throw new Error('Video dosyası alınamadı')

      const blob = await videoResponse.blob()
      const filename = data.filename || `video-${Date.now()}.mp4`
      
      // Trigger download
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000)
      
      updateQueue(item.id, { status: 'done', progress: 100, filename })
      addLog(`✅ ${filename} indirildi!`)
      return true
    } catch (err: any) {
      const msg = err.message || 'Bilinmeyen hata'
      addLog(`❌ ${item.platform}: ${msg}`)
      updateQueue(item.id, { status: 'error', error: msg })
      return false
    }
  }, [queue.length, updateQueue, addLog])

  // Download a direct video URL
  const downloadDirect = useCallback(async (item: QueueItem, index: number): Promise<boolean> => {
    addLog(`📹 Direct video alınıyor... (${index + 1}/${queue.length})`)
    updateQueue(item.id, { status: 'processing', progress: 10 })

    // Try direct fetch first, then fallback to CORS proxy
    const strategies = [
      { name: 'direct', url: item.url },
      { name: 'corsproxy', url: `${CORS_PROXY}${encodeURIComponent(item.url)}` },
    ]

    for (const strategy of strategies) {
      if (abortRef.current) break
      try {
        addLog(`📡 ${strategy.name} yöntemi deneniyor...`)
        updateQueue(item.id, { progress: strategy.name === 'direct' ? 20 : 40 })
        
        const resp = await fetch(strategy.url, {
          headers: { Accept: 'video/*,*/*' },
        })
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

        const cl = resp.headers.get('content-length')
        const ct = resp.headers.get('content-type') || 'video/mp4'
        const total = cl ? parseInt(cl) : 0
        const reader = resp.body!.getReader()
        const chunks: Uint8Array[] = []
        let received = 0

        while (true) {
          if (abortRef.current) { reader.cancel(); return false }
          const { done, value } = await reader.read()
          if (done) break
          chunks.push(value)
          received += value.length
          const pct = total > 0 ? Math.round((received / total) * 100) : Math.min(Math.round(received / 1_048_576 * 30), 90)
          updateQueue(item.id, { progress: Math.max(pct, 40) })
        }

        updateQueue(item.id, { progress: 95 })
        const blob = new Blob(chunks, { type: ct })
        const blobUrl = URL.createObjectURL(blob)

        // Extract filename from URL
        let filename = `video-${Date.now()}.mp4`
        try {
          const p = new URL(item.url).pathname
          const seg = p.split('/').pop()
          if (seg && seg.includes('.')) filename = decodeURIComponent(seg)
        } catch {}

        const a = document.createElement('a')
        a.href = blobUrl
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000)

        updateQueue(item.id, { status: 'done', progress: 100, filename })
        addLog(`✅ ${filename} indirildi!`)
        return true
      } catch (err: any) {
        addLog(`⚠️ ${strategy.name} başarısız: ${err.message}`)
      }
    }

    addLog(`❌ Direct video indirilemedi (tüm yöntemler başarısız)`)
    updateQueue(item.id, { status: 'error', error: 'Video indirilemedi, linki kontrol et' })
    return false
  }, [updateQueue, addLog])

  // Download all items in queue
  const downloadAll = useCallback(async () => {
    const pending = queue.filter(i => i.status === 'waiting' || i.status === 'error')
    if (pending.length === 0) {
      addLog('⚠️ İndirilecek video yok')
      return
    }

    setIsDownloading(true)
    abortRef.current = false
    addLog(`🚀 ${pending.length} video indiriliyor...`)

    for (let i = 0; i < pending.length; i++) {
      if (abortRef.current) {
        addLog('⏹ İndirme iptal edildi')
        break
      }
      
      const item = pending[i]
      try {
        if (isDirectVideo(item.url)) {
          await downloadDirect(item, i)
        } else if (isPlatformUrl(item.url)) {
          await downloadViaCobalt(item, i)
        } else {
          // Unknown - try Cobalt first, then direct
          addLog(`🌍 ${item.platform}: Platform tespit edilemedi, Cobalt API deneniyor...`)
          const ok = await downloadViaCobalt(item, i)
          if (!ok) {
            addLog(`📹 Direct yöntem deneniyor...`)
            await downloadDirect(item, i)
          }
        }
      } catch (err: any) {
        addLog(`❌ ${item.url.slice(0, 50)}: ${err.message}`)
        updateQueue(item.id, { status: 'error', error: err.message })
      }

      // Small delay between downloads
      if (i < pending.length - 1) await sleep(1500)
    }

    setIsDownloading(false)
    addLog('🏁 İndirme tamamlandı!')
  }, [queue, downloadDirect, downloadViaCobalt, addLog, updateQueue])

  const removeItem = useCallback((id: string) => {
    setQueue(prev => prev.filter(i => i.id !== id))
  }, [])

  const clearDone = useCallback(() => {
    setQueue(prev => prev.filter(i => i.status === 'waiting' || i.status === 'error'))
  }, [])

  const clearAll = useCallback(() => {
    setQueue([])
    setLog([])
  }, [])

  const retryItem = useCallback(async (item: QueueItem) => {
    updateQueue(item.id, { status: 'waiting', progress: 0, error: undefined })
    setIsDownloading(true)
    abortRef.current = false
    
    try {
      if (isDirectVideo(item.url)) {
        await downloadDirect(item, 0)
      } else {
        await downloadViaCobalt(item, 0)
      }
    } catch (err: any) {
      updateQueue(item.id, { status: 'error', error: err.message })
    }
    
    setIsDownloading(false)
  }, [downloadDirect, downloadViaCobalt, updateQueue])

  const stats = {
    total: queue.length,
    waiting: queue.filter(i => i.status === 'waiting').length,
    processing: queue.filter(i => i.status === 'processing').length,
    done: queue.filter(i => i.status === 'done').length,
    error: queue.filter(i => i.status === 'error').length,
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 pb-8">
      {/* Hero */}
      <div className="mb-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Video <span className="text-gradient">Downloader</span>
          </h1>
          <p className="mt-2 text-base text-[hsl(var(--muted-foreground))] max-w-xl">
            YouTube, TikTok, Instagram, Twitter videolarını indir. Birden fazla linki aynı anda yapıştır, hepsi tek tek insin.
          </p>
        </motion.div>
      </div>

      {/* Input area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass rounded-2xl p-5 sm:p-6 mb-5"
      >
        <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
          Video Linklerini Yapıştır
        </label>
        <div className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
          Birden fazla linki alt alta veya virgülle ayırarak yapıştırabilirsin
        </div>
        <textarea
          value={inputText}
          onChange={e => handleInputChange(e.target.value)}
          placeholder={`https://www.youtube.com/watch?v=...\nhttps://www.tiktok.com/@...\nhttps://www.instagram.com/reel/...`}
          rows={4}
          className="w-full px-4 py-3 rounded-xl bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/60 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent transition-all text-base resize-y min-h-[100px]"
        />
        <div className="flex flex-wrap gap-2 mt-3">
          <motion.button
            onClick={parseUrls}
            whileTap={{ scale: 0.95 }}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:brightness-110 shadow-lg shadow-[hsl(var(--primary))]/25 transition-all flex items-center gap-2"
          >
            📋 Linkleri Ekle
          </motion.button>
          
          {queue.length > 0 && (
            <>
              <motion.button
                onClick={downloadAll}
                disabled={isDownloading || (stats.waiting === 0 && stats.error === 0)}
                whileTap={{ scale: 0.95 }}
                className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
                  isDownloading
                    ? 'bg-amber-500/20 text-amber-500 cursor-wait'
                    : 'bg-green-500/80 text-white hover:bg-green-500 shadow-lg shadow-green-500/20'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {isDownloading ? (
                  <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> İndiriliyor...</>
                ) : (
                  <>{isDownloading ? '⏳' : '⬇'} Tümünü İndir ({stats.waiting + stats.error})</>
                )}
              </motion.button>

              {stats.done > 0 && (
                <button onClick={clearDone} className="px-4 py-2.5 rounded-xl text-sm bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary))]/70 transition-all">
                  🗑️ Tamamlananları Temizle
                </button>
              )}
              <button onClick={clearAll} className="px-4 py-2.5 rounded-xl text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">
                🗑️ Tümünü Temizle
              </button>
            </>
          )}
        </div>
      </motion.div>

      {/* Stats bar */}
      {queue.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-2 mb-4">
          <span className="px-3 py-1 rounded-full bg-[hsl(var(--secondary))] text-xs">📦 {stats.total} toplam</span>
          {stats.waiting > 0 && <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs">⏳ {stats.waiting} bekliyor</span>}
          {stats.processing > 0 && <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs">⚡ {stats.processing} işleniyor</span>}
          {stats.done > 0 && <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs">✅ {stats.done} tamam</span>}
          {stats.error > 0 && <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-xs">❌ {stats.error} hata</span>}
        </motion.div>
      )}

      {/* Download queue */}
      <AnimatePresence>
        {queue.map((item, index) => {
          const platform = getPlatform(item.url)
          const isProcessing = item.status === 'processing'

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: 'auto' }}
              exit={{ opacity: 0, x: 20, height: 0 }}
              transition={{ duration: 0.25 }}
              className={`glass rounded-xl p-4 mb-2.5 border-l-4 ${
                item.status === 'done' ? 'border-l-green-500' :
                item.status === 'error' ? 'border-l-red-500' :
                isProcessing ? 'border-l-amber-500' : 'border-l-[hsl(var(--border))]'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Status icon */}
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${
                  item.status === 'done' ? 'bg-green-500/10' :
                  item.status === 'error' ? 'bg-red-500/10' :
                  isProcessing ? 'bg-amber-500/10' : 'bg-[hsl(var(--secondary))]'
                }`}>
                  {item.status === 'done' ? '✅' :
                   item.status === 'error' ? '❌' :
                   isProcessing ? (
                    <svg className="animate-spin w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
                      <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                   ) : platform.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-[hsl(var(--secondary))] font-medium">
                      {platform.name}
                    </span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      #{index + 1}
                    </span>
                    {item.filename && (
                      <span className="text-xs text-green-500 truncate">{item.filename}</span>
                    )}
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                    {item.url.replace(/^https?:\/\//, '').slice(0, 70)}
                  </p>

                  {/* Progress bar */}
                  {isProcessing && (
                    <div className="mt-2">
                      <div className="h-1.5 rounded-full bg-[hsl(var(--secondary))] overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--primary))] to-purple-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${item.progress}%` }}
                          transition={{ duration: 0.4 }}
                        />
                      </div>
                      <span className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 block text-right">
                        {item.progress}%
                      </span>
                    </div>
                  )}

                  {/* Error */}
                  {item.status === 'error' && item.error && (
                    <p className="text-xs text-red-400 mt-1">{item.error}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1 flex-shrink-0">
                  {item.status === 'error' && (
                    <button
                      onClick={() => retryItem(item)}
                      disabled={isDownloading}
                      className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 flex items-center justify-center text-xs transition-all disabled:opacity-40"
                      title="Tekrar dene"
                    >↻</button>
                  )}
                  {(item.status === 'waiting' || item.status === 'done' || item.status === 'error') && (
                    <button
                      onClick={() => removeItem(item.id)}
                      className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center text-xs transition-all"
                      title="Kaldır"
                    >✕</button>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>

      {/* Log */}
      {log.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass rounded-xl p-4 mt-4"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-[hsl(var(--foreground))]">İşlem Geçmişi</h3>
            <button onClick={() => setLog([])} className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
              Temizle
            </button>
          </div>
          <div className="max-h-[200px] overflow-y-auto space-y-0.5">
            {log.map((msg, i) => (
              <p key={i} className="text-xs text-[hsl(var(--muted-foreground))] font-mono">{msg}</p>
            ))}
          </div>
        </motion.div>
      )}

      {/* Platform badges */}
      {queue.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-3">Desteklenen Platformlar</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { icon: '▶️', name: 'YouTube' }, { icon: '🎵', name: 'TikTok' },
              { icon: '📸', name: 'Instagram' }, { icon: '🐦', name: 'Twitter/X' },
              { icon: '📘', name: 'Facebook' }, { icon: '🎥', name: 'Vimeo' },
              { icon: '📺', name: 'Dailymotion' }, { icon: '🤖', name: 'Reddit' },
              { icon: '📹', name: 'Direct MP4/WebM' },
            ].map(p => (
              <div key={p.name} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(var(--secondary))] text-xs">
                <span>{p.icon}</span>
                <span className="font-medium">{p.name}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
            <p className="text-xs text-amber-400/90">
              💡 <strong>İpucu:</strong> YouTube, TikTok gibi platformlardan video indirmek için linki kopyala, yukarıya yapıştır ve "Linkleri Ekle" butonuna bas. Birden fazla link ekleyip "Tümünü İndir" ile hepsini tek seferde indirebilirsin!
            </p>
          </div>
        </motion.div>
      )}
    </div>
  )
}
