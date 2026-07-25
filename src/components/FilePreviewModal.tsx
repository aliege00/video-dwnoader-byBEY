import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SampleFile } from '../data/sampleFiles'

interface FilePreviewModalProps {
  file: SampleFile | null
  onClose: () => void
  onDownload: (file: SampleFile) => void
}

const categoryIcons: Record<string, string> = {
  document: '📄',
  code: '💻',
  data: '📊',
  design: '🎨',
}

function getLanguageClass(ext: string): string {
  switch (ext) {
    case '.md': return 'markdown'
    case '.tsx':
    case '.ts': return 'typescript'
    case '.css': return 'css'
    case '.json': return 'json'
    case '.yaml': return 'yaml'
    case '.csv': return 'csv'
    case '.svg': return 'xml'
    default: return 'plaintext'
  }
}

function getContentType(ext: string): 'text' | 'svg' | 'json' {
  if (ext === '.svg') return 'svg'
  if (ext === '.json') return 'json'
  return 'text'
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function highlightCode(text: string, ext: string): string {
  const escaped = escapeHtml(text)
  const lang = getLanguageClass(ext)

  if (lang === 'json') {
    // Simple JSON highlighting
    return escaped
      .replace(/"([^"]+)":/g, '<span class="text-blue-400 dark:text-blue-300">"$1"</span>:')
      .replace(/: (\d+\.?\d*)/g, ': <span class="text-emerald-400">$1</span>')
      .replace(/: (true|false|null)/g, ': <span class="text-purple-400">$1</span>')
      .replace(/: "([^"]+)"/g, ': <span class="text-amber-300 dark:text-amber-200">"$1"</span>')
  }

  if (lang === 'yaml') {
    return escaped
      .replace(/^(\s*)(#.*)$/gm, '$1<span class="text-gray-400 italic">$2</span>')
      .replace(/^(\s*)([\w.-]+):/gm, '$1<span class="text-blue-400 dark:text-blue-300">$2</span>:')
  }

  if (lang === 'typescript') {
    return escaped
      .replace(/(\/\/.*)/g, '<span class="text-gray-400 italic">$1</span>')
      .replace(/\b(import|export|from|function|const|let|var|return|if|else|for|of|in|async|await|interface|type|extends|implements|new|try|catch|finally|throw|default|case|break|continue)\b/g, '<span class="text-purple-400">$1</span>')
      .replace(/\b(string|number|boolean|void|never|any|unknown|null|undefined|Promise)\b/g, '<span class="text-blue-300">$1</span>')
      .replace(/('[^']*')/g, '<span class="text-amber-300">$1</span>')
      .replace(/`[^`]*`/g, '<span class="text-amber-300">$&</span>')
  }

  if (lang === 'css') {
    return escaped
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-gray-400 italic">$1</span>')
      .replace(/([\w-]+)\s*:/g, '<span class="text-blue-400">$1</span>:')
      .replace(/\.([\w-]+)/g, '<span class="text-amber-300">.$1</span>')
      .replace(/#([\w-]+)/g, '<span class="text-emerald-400">#$1</span>')
  }

  if (lang === 'markdown') {
    return escaped
      .replace(/^(#{1,6}\s.+)$/gm, '<span class="text-purple-400 font-bold">$1</span>')
      .replace(/\*\*(.+?)\*\*/g, '<span class="font-bold text-amber-300">$1</span>')
      .replace(/\*(.+?)\*/g, '<span class="italic text-amber-300">$1</span>')
      .replace(/`([^`]+)`/g, '<span class="text-emerald-300 bg-white/5 px-1 rounded">$1</span>')
      .replace(/^-{3,}$/gm, '<span class="text-gray-500">$&</span>')
      .replace(/^(\|.+\|)$/gm, '<span class="text-gray-300">$1</span>')
  }

  if (lang === 'csv') {
    return escaped
      .replace(/^(.+)$/gm, (match) => {
        const cells = match.split(',')
        const colored = cells.map((c, i) => {
          const colors = ['text-blue-300', 'text-emerald-300', 'text-amber-300', 'text-purple-300', 'text-rose-300']
          return `<span class="${colors[i % colors.length]}">${c}</span>`
        })
        return colored.join('<span class="text-gray-500">,</span>')
      })
  }

  return escaped
}

export default function FilePreviewModal({ file, onClose, onDownload }: FilePreviewModalProps) {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [copySuccess, setCopySuccess] = useState(false)

  useEffect(() => {
    if (!file) return

    setLoading(true)
    setContent('')

    const timer = setTimeout(() => {
      try {
        const blob = file.generateContent()
        const reader = new FileReader()
        reader.onload = () => {
          const text = reader.result as string
          setContent(text)
          setLoading(false)
        }
        reader.readAsText(blob)
      } catch {
        setContent('Unable to load file content.')
        setLoading(false)
      }
    }, 200) // Small delay for smooth modal animation

    return () => clearTimeout(timer)
  }, [file])

  const handleCopy = useCallback(async () => {
    if (!content) return
    try {
      await navigator.clipboard.writeText(content)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch {
      // Fallback
      const textarea = document.createElement('textarea')
      textarea.value = content
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }
  }, [content])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  if (!file) return null

  const contentType = getContentType(file.extension)
  const isSvgContent = contentType === 'svg'

  return (
    <AnimatePresence>
      {file && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-white/10 bg-[hsl(var(--card))] shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[hsl(var(--secondary))] flex items-center justify-center text-xl flex-shrink-0">
                  {categoryIcons[file.category]}
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-[hsl(var(--foreground))] truncate">
                    {file.name}
                  </h2>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {file.type} · {file.size}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Copy button */}
                <button
                  onClick={handleCopy}
                  disabled={loading || !content}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary))]/70 disabled:opacity-40 transition-all flex items-center gap-1.5"
                >
                  {copySuccess ? (
                    <>✓ Copied</>
                  ) : (
                    <>📋 Copy</>
                  )}
                </button>

                {/* Download button */}
                <button
                  onClick={() => onDownload(file)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:brightness-110 transition-all flex items-center gap-1.5"
                >
                  ⬇ Download
                </button>

                {/* Close button */}
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))] transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-auto p-0 relative">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-[hsl(var(--primary))] border-t-transparent animate-spin" />
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">Loading content...</span>
                </div>
              ) : isSvgContent ? (
                <div className="flex items-center justify-center p-6 bg-[hsl(var(--background))] min-h-[300px]">
                  <div
                    className="max-w-full max-h-[60vh]"
                    dangerouslySetInnerHTML={{ __html: highlightCode(content, file.extension) }}
                  />
                </div>
              ) : (
                <div className="relative">
                  {/* Line numbers */}
                  <div className="flex">
                    <div className="select-none text-right pr-4 pl-4 pt-4 text-xs leading-6 text-[hsl(var(--muted-foreground))]/40 font-mono sticky left-0 bg-[hsl(var(--card))]">
                      {content.split('\n').map((_, i) => (
                        <div key={i} className="w-8">{i + 1}</div>
                      ))}
                    </div>
                    <pre className="flex-1 p-4 pl-0 overflow-x-auto text-sm leading-6 font-mono text-[hsl(var(--foreground))]">
                      <code
                        dangerouslySetInnerHTML={{
                          __html: highlightCode(content, file.extension),
                        }}
                      />
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Footer metadata bar */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--background))]/50">
              <div className="flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))]" />
                  {file.extension}
                </span>
                <span>·</span>
                <span>{file.size}</span>
                <span>·</span>
                <span>{file.type}</span>
              </div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">
                {content.split('\n').length} lines
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
