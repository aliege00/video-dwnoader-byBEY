import { motion } from 'framer-motion'

interface ThemeToggleProps {
  isDark: boolean
  onToggle: () => void
}

export default function ThemeToggle({ isDark, onToggle }: ThemeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="relative w-14 h-7 rounded-full flex items-center px-1 transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2 focus:ring-offset-[hsl(var(--background))]"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
          : 'linear-gradient(135deg, #87CEEB 0%, #E0F7FA 100%)',
      }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <motion.div
        className="absolute w-5 h-5 rounded-full flex items-center justify-center"
        animate={{
          x: isDark ? 28 : 0,
          rotate: isDark ? 360 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
        }}
        style={{
          background: isDark
            ? 'linear-gradient(135deg, #f5f5f5, #e0e0e0)'
            : 'linear-gradient(135deg, #FFD700, #FFA500)',
          boxShadow: isDark
            ? '0 2px 8px rgba(255,255,255,0.1)'
            : '0 2px 8px rgba(255,165,0,0.4)',
        }}
      >
        <motion.span
          className="text-xs leading-none"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          {isDark ? '🌙' : '☀️'}
        </motion.span>
      </motion.div>
    </button>
  )
}
