import { useTheme } from './hooks/useTheme'
import ThemeToggle from './components/ThemeToggle'
import VideoDownloader from './components/VideoDownloader'
import { motion } from 'framer-motion'

export default function App() {
  const { isDark, toggle } = useTheme()

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] transition-colors duration-300">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-[hsl(var(--primary))]/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-purple-500/5 blur-3xl" />
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-[hsl(var(--border))]/50">
        <div className="glass-strong">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-purple-500 flex items-center justify-center shadow-lg shadow-[hsl(var(--primary))]/25">
                  <span className="text-white text-lg font-bold">▶</span>
                </div>
                <div className="hidden sm:block">
                  <h2 className="font-bold text-[hsl(var(--foreground))] leading-tight">
                    Video Downloader
                  </h2>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] leading-tight">
                    YouTube · TikTok · Instagram · Twitter
                  </p>
                </div>
              </motion.div>

              {/* Right section */}
              <div className="flex items-center gap-4">
                {/* Theme toggle */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3"
                >
                  <span className="text-xs text-[hsl(var(--muted-foreground))] hidden sm:inline">
                    {isDark ? 'Dark' : 'Light'}
                  </span>
                  <ThemeToggle isDark={isDark} onToggle={toggle} />
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="py-6 sm:py-8">
        <VideoDownloader />
      </main>

      {/* Footer */}
      <footer className="border-t border-[hsl(var(--border))]/50 py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[hsl(var(--muted-foreground))]">
            <p>Video Downloader Pro — Powered by Cobalt API</p>
            <p className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Online
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

