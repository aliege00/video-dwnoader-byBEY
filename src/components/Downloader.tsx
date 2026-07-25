import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { sampleFiles, type SampleFile } from '../data/sampleFiles'
import FilePreviewModal from './FilePreviewModal'

const categoryIcons: Record<string, string> = {
  document: '📄',
  code: '💻',
  data: '📊',
  design: '🎨',
}

const categoryLabels: Record<string, string> = {
  document: 'Documents',
  code: 'Code',
  data: 'Data',
  design: 'Design',
}

export default function Downloader() {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [activeCategory, setActiveCategory] = useState<string | 'all'>('all')
  const [downloading, setDownloading] = useState<Set<string>>(new Set())
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [previewFile, setPreviewFile] = useState<SampleFile | null>(null)

  const categories = useMemo(() => {
    const cats = new Set(sampleFiles.map(f => f.category))
    return ['all', ...Array.from(cats)] as const
  }, [])

  const filteredFiles = useMemo(() => {
    return sampleFiles.filter(file => {
      const matchesCategory = activeCategory === 'all' || file.category === activeCategory
      const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.type.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [activeCategory, searchQuery])

  const allSelected = useMemo(
    () => filteredFiles.length > 0 && filteredFiles.every(f => selected.has(f.id)),
    [filteredFiles, selected]
  )

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelected(prev => {
        const next = new Set(prev)
        filteredFiles.forEach(f => next.delete(f.id))
        return next
      })
    } else {
      setSelected(prev => {
        const next = new Set(prev)
        filteredFiles.forEach(f => next.add(f.id))
        return next
      })
    }
  }, [allSelected, filteredFiles])

  const downloadFile = useCallback(async (file: SampleFile) => {
    setDownloading(prev => new Set(prev).add(file.id))
    setError(null)

    try {
      const blob = file.generateContent()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      
      // Simulate a small delay for realistic feel
      await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200))
      
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setCompleted(prev => new Set(prev).add(file.id))
    } catch (err) {
      setError(`Failed to download ${file.name}`)
      console.error('Download error:', err)
    } finally {
      setDownloading(prev => {
        const next = new Set(prev)
        next.delete(file.id)
        return next
      })
    }
  }, [])

  const downloadSelected = useCallback(async () => {
    const filesToDownload = sampleFiles.filter(f => selected.has(f.id))
    setError(null)

    for (let i = 0; i < filesToDownload.length; i++) {
      await downloadFile(filesToDownload[i])
    }
  }, [selected, downloadFile])

  const getCategoryCount = useCallback((category: string) => {
    if (category === 'all') return sampleFiles.length
    return sampleFiles.filter(f => f.category === category).length
  }, [])

  const getProgress = useCallback((fileId: string) => {
    if (completed.has(fileId)) return 100
    if (downloading.has(fileId)) return Math.floor(Math.random() * 80) + 10
    return 0
  }, [completed, downloading])

  const totalSelectedSize = useMemo(() => {
    return sampleFiles
      .filter(f => selected.has(f.id))
      .reduce((acc, f) => acc + f.sizeBytes, 0)
  }, [selected])

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            File <span className="text-gradient">Library</span>
          </h1>
          <p className="mt-3 text-lg text-[hsl(var(--muted-foreground))] max-w-2xl">
            Browse and download sample project files. Select multiple files to batch download them all at once.
          </p>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-6 flex flex-wrap items-center gap-4 text-sm text-[hsl(var(--muted-foreground))]"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(var(--secondary))]">
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--primary))]" />
            {sampleFiles.length} files total
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(var(--secondary))]">
            📦 {selected.size} selected
          </span>
          {selected.size > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(var(--secondary))]">
              📏 {formatBytes(totalSelectedSize)}
            </span>
          )}
        </motion.div>
      </div>

      {/* Controls bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="glass rounded-2xl p-4 mb-6 space-y-4"
      >
        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                activeCategory === cat
                  ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-lg shadow-[hsl(var(--primary))]/25'
                  : 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary))]/70'
              }`}
            >
              {cat === 'all' ? '🏠 All' : `${categoryIcons[cat]} ${categoryLabels[cat]}`}
              <span className="ml-1.5 opacity-60">({getCategoryCount(cat)})</span>
            </button>
          ))}
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
              allSelected
                ? 'bg-[hsl(var(--primary))] border-[hsl(var(--primary))]'
                : 'border-[hsl(var(--border))] group-hover:border-[hsl(var(--primary))]'
            }`}>
              {allSelected && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="sr-only"
            />
            <span className="text-sm font-medium text-[hsl(var(--foreground))]">
              Select all
            </span>
          </label>

          {selected.size > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={downloadSelected}
              disabled={downloading.size > 0}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[hsl(var(--primary))]/25 active:scale-95 flex items-center gap-2"
            >
              {downloading.size > 0 ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Downloading...
                </>
              ) : (
                <>
                  📥 Download {selected.size} {selected.size === 1 ? 'file' : 'files'}
                </>
              )}
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-2"
          >
            <span>⚠️</span>
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto hover:opacity-70">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File grid */}
      <motion.div
        layout
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        <AnimatePresence mode="popLayout">
          {filteredFiles.map((file, index) => {
            const isSelected = selected.has(file.id)
            const isDownloading = downloading.has(file.id)
            const isCompleted = completed.has(file.id)
            const progress = getProgress(file.id)

            return (
              <motion.div
                key={file.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
                className={`group relative rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5 shadow-lg shadow-[hsl(var(--primary))]/10'
                    : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--primary))]/40 hover:shadow-lg hover:shadow-[hsl(var(--primary))]/5'
                } ${isCompleted ? 'ring-2 ring-green-500/30' : ''}`}
                onClick={() => !isDownloading && setPreviewFile(file)}
              >
                {/* Checkbox overlay */}
                <div
                  onClick={e => { e.stopPropagation(); toggleSelect(file.id) }}
                  className={`absolute top-3 left-3 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 z-10 ${
                    isSelected
                      ? 'bg-[hsl(var(--primary))] border-[hsl(var(--primary))]'
                      : 'border-[hsl(var(--border))] opacity-0 group-hover:opacity-100 cursor-pointer'
                  }`}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                {/* Download indicator */}
                {isCompleted && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center z-10">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                <div className="p-5">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 transition-all ${
                    isSelected
                      ? 'bg-[hsl(var(--primary))]/20 scale-110'
                      : 'bg-[hsl(var(--secondary))] group-hover:scale-110'
                  }`}>
                    {categoryIcons[file.category]}
                  </div>

                  {/* File info */}
                  <h3 className="font-semibold text-[hsl(var(--foreground))] truncate mb-1">
                    {file.name}
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] truncate">
                    {file.type}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]">
                      {file.size}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]">
                      {file.extension}
                    </span>
                  </div>

                  {/* Progress bar for downloading */}
                  <AnimatePresence>
                    {isDownloading && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3"
                      >
                        <div className="h-1.5 rounded-full bg-[hsl(var(--secondary))] overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--primary))] to-purple-400 progress-active"
                            initial={{ width: '0%' }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                        <span className="text-xs text-[hsl(var(--muted-foreground))] mt-1 block text-right">
                          {progress}%
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Download button */}
                <div className="px-5 pb-4">
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      downloadFile(file)
                    }}
                    disabled={isDownloading}
                    className={`w-full py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                      isCompleted
                        ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                        : isDownloading
                        ? 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/20'
                        : 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))] border border-transparent'
                    }`}
                  >
                    {isCompleted ? '✓ Downloaded' : isDownloading ? '⏳ Downloading...' : '⬇ Download'}
                  </button>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </motion.div>

      {/* Empty state */}
      {filteredFiles.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-2">No files found</h3>
          <p className="text-[hsl(var(--muted-foreground))]">
            Try adjusting your search or filter to find what you're looking for.
          </p>
        </motion.div>
      )}

      {/* File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={(file) => {
          setPreviewFile(null)
          downloadFile(file)
        }}
      />

      {/* Footer summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-center text-sm text-[hsl(var(--muted-foreground))] pb-8"
      >
        {completed.size > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 text-green-500">
            ✓ {completed.size} {completed.size === 1 ? 'file' : 'files'} downloaded successfully
          </span>
        )}
      </motion.div>
    </div>
  )
}
