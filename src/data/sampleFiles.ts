export interface SampleFile {
  id: string
  name: string
  type: string
  extension: string
  size: string
  sizeBytes: number
  category: 'document' | 'code' | 'data' | 'design'
  generateContent: () => Blob
}

function generateKV(): string {
  return `Name,Role,Department,Email,Status
Alice Johnson,Frontend Developer,Engineering,alice@example.com,Active
Bob Smith,Backend Developer,Engineering,bob@example.com,Active
Carol Davis,Designer,Product,carol@example.com,Active
David Wilson,PM,Product,david@example.com,On Leave
Eva Martinez,QA Engineer,Engineering,eva@example.com,Active
Frank Lee,DevOps,Infrastructure,frank@example.com,Active
Grace Chen,Data Analyst,Analytics,grace@example.com,Active
Henry Brown,Frontend Developer,Engineering,henry@example.com,Inactive
Iris Taylor,UX Researcher,Product,iris@example.com,Active
Jack White,Backend Developer,Engineering,jack@example.com,Active
Kate Miller,Scrum Master,Engineering,kate@example.com,Active
Leo Garcia,Designer,Product,leo@example.com,Active`
}

function generateReadme(): string {
  return `# MultiDownload Pro

A powerful multi-file download manager built with React, TypeScript, and Tailwind CSS.

## Features

- ✨ **Dark Mode Toggle** — Seamless light/dark theme switching
- 📥 **Multi-File Download** — Select and download multiple files at once
- 🎨 **Beautiful UI** — Polished interface with smooth animations
- 🔍 **File Category Filtering** — Filter files by type
- 📊 **Real-time Progress** — Track individual download progress

## Available File Types

| Category | Files |
|----------|-------|
| Documents | README, Notes, Changelog |
| Code | Sample components, utilities |
| Data | User data, metrics, configs |
| Design | SVGs, color palettes |

## Usage

1. Browse the available files in the library
2. Select files by clicking the checkbox next to each file
3. Click "Download Selected" to download all selected files
4. Click the theme toggle in the top-right corner to switch between light and dark mode

## Technical Stack

- **React 19** — Latest React with concurrent features
- **TypeScript** — Full type safety
- **Tailwind CSS** — Utility-first styling
- **Framer Motion** — Smooth animations and transitions
- **Vite** — Blazing fast build tool

---

*Built with ❤️ using React + TypeScript + Tailwind CSS*
`
}

function generateNotes(): string {
  return `=====================================
PROJECT NOTES & IDEAS
=====================================

Sprint 24 - Planning Notes
---------------------------
- Goal: Implement file download manager
- Priority: High
- Deadline: Next Friday

Feature Ideas to Explore:
1. Batch download with zip compression
2. Drag-and-drop file organization
3. Download history tracking
4. File preview modal
5. Thumbnail generation

API Endpoints Needed:
- GET /api/files - List all files
- POST /api/download - Batch download
- GET /api/files/:id - Single file details

Design Considerations:
- Dark mode should support AMOLED-friendly colors
- File cards should have hover animations
- Progress bars need smooth CSS transitions
- Toast notifications for success/error states

Performance Targets:
- Initial load under 1.5s
- File list render under 100ms
- Download start under 500ms
- Smooth 60fps animations

Meeting Notes (12/15):
- Vote passed to use React 19
- Design review scheduled for Thursday
- Need to finalize color palette
- Accessibility audit due next week

Random Ideas:
- Easter egg: Konami code reveals retro theme
- Sound effects for download complete
- Confetti animation on batch completion
`
}

function generateChangelog(): string {
  return `# Changelog

## [2.0.0] - 2026-03-15

### Added
- 🌙 Dark mode support with system preference detection
- 📦 Multi-file download with batch selection
- 🎨 New design system with dynamic theming
- ⚡ Performance improvements for large file lists

### Changed
- Complete UI overhaul with new component library
- Upgraded to React 19
- Migrated from CSS modules to Tailwind CSS
- Improved download progress tracking

### Fixed
- File name encoding for special characters
- Memory leak in download queue
- Theme flicker on initial page load

## [1.5.0] - 2026-02-01

### Added
- File category filters
- Search functionality
- Sort by name, size, or date

## [1.0.0] - 2025-12-01

### Added
- Initial release
- Basic file download
- Simple file listing
`
}

function generateComponentCode(): string {
  return `// FileDownloader.tsx
// A reusable React component for downloading files

import { useState, useCallback } from 'react'

interface FileItem {
  id: string
  name: string
  size: number
  url: string
}

interface FileDownloaderProps {
  files: FileItem[]
  onDownloadStart?: (fileId: string) => void
  onDownloadComplete?: (fileId: string) => void
}

export function FileDownloader({ files, onDownloadStart, onDownloadComplete }: FileDownloaderProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [downloading, setDownloading] = useState<Set<string>>(new Set())

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (selectedIds.size === files.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(files.map(f => f.id)))
    }
  }, [files, selectedIds])

  const downloadFile = useCallback(async (file: FileItem) => {
    onDownloadStart?.(file.id)
    setDownloading(prev => new Set(prev).add(file.id))
    
    try {
      const response = await fetch(file.url)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.click()
      URL.revokeObjectURL(url)
      onDownloadComplete?.(file.id)
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setDownloading(prev => {
        const next = new Set(prev)
        next.delete(file.id)
        return next
      })
    }
  }, [onDownloadStart, onDownloadComplete])

  const downloadSelected = useCallback(() => {
    const selectedFiles = files.filter(f => selectedIds.has(f.id))
    selectedFiles.forEach((file, index) => {
      setTimeout(() => downloadFile(file), index * 500)
    })
  }, [files, selectedIds, downloadFile])

  return {
    selectedIds,
    downloading,
    toggleSelection,
    toggleAll,
    downloadSelected,
    downloadFile,
  }
}

export default FileDownloader
`
}

function generateThemeConfig(): string {
  return `/*
 * Theme Configuration
 * Design tokens and color system
 */

:root {
  /* Primary palette */
  --primary-50: #f5f3ff;
  --primary-100: #ede9fe;
  --primary-200: #ddd6fe;
  --primary-300: #c4b5fd;
  --primary-400: #a78bfa;
  --primary-500: #8b5cf6;
  --primary-600: #7c3aed;
  --primary-700: #6d28d9;
  --primary-800: #5b21b6;
  --primary-900: #4c1d95;

  /* Neutral palette */
  --neutral-50: #fafafa;
  --neutral-100: #f5f5f5;
  --neutral-200: #e5e5e5;
  --neutral-300: #d4d4d4;
  --neutral-400: #a3a3a3;
  --neutral-500: #737373;
  --neutral-600: #525252;
  --neutral-700: #404040;
  --neutral-800: #262626;
  --neutral-900: #171717;

  /* Semantic colors */
  --success: #22c55e;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;

  /* Spacing */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
}

/* Dark theme overrides */
.dark {
  --primary-500: #a78bfa;
  --primary-600: #8b5cf6;
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.4);
}
`
}

function generatePaletteSVG(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e"/>
      <stop offset="100%" style="stop-color:#16213e"/>
    </linearGradient>
  </defs>
  <rect width="400" height="300" fill="url(#bg)" rx="12"/>
  
  <!-- Color swatches -->
  <rect x="20" y="20" width="80" height="80" rx="8" fill="#8b5cf6"/>
  <rect x="110" y="20" width="80" height="80" rx="8" fill="#7c3aed"/>
  <rect x="200" y="20" width="80" height="80" rx="8" fill="#6d28d9"/>
  <rect x="290" y="20" width="80" height="80" rx="8" fill="#5b21b6"/>
  
  <rect x="20" y="110" width="80" height="80" rx="8" fill="#22c55e"/>
  <rect x="110" y="110" width="80" height="80" rx="8" fill="#f59e0b"/>
  <rect x="200" y="110" width="80" height="80" rx="8" fill="#ef4444"/>
  <rect x="290" y="110" width="80" height="80" rx="8" fill="#3b82f6"/>
  
  <rect x="20" y="200" width="80" height="80" rx="8" fill="#a3a3a3"/>
  <rect x="110" y="200" width="80" height="80" rx="8" fill="#737373"/>
  <rect x="200" y="200" width="80" height="80" rx="8" fill="#525252"/>
  <rect x="290" y="200" width="80" height="80" rx="8" fill="#404040"/>
  
  <text x="200" y="285" text-anchor="middle" fill="white" font-family="sans-serif" font-size="12" opacity="0.7">Design System Color Palette</text>
</svg>`
}

function generateMetricsJSON(): string {
  return JSON.stringify({
    app: "MultiDownload Pro",
    version: "2.0.0",
    metrics: {
      activeUsers: {
        daily: 1247,
        weekly: 8723,
        monthly: 34128,
      },
      downloads: {
        total: 156892,
        today: 342,
        averagePerDay: 287,
        peakDay: "2026-03-10",
        peakCount: 523,
      },
      performance: {
        averageLoadTime: 842,
        p95LoadTime: 1432,
        uptime: 99.97,
        responseTime: 124,
      },
      storage: {
        used: "45.2 GB",
        total: "100 GB",
        percentage: 45.2,
      },
    },
    features: [
      {
        name: "Batch Download",
        usage: 78,
        satisfaction: 4.5,
      },
      {
        name: "Dark Mode",
        usage: 62,
        satisfaction: 4.8,
      },
      {
        name: "File Preview",
        usage: 45,
        satisfaction: 4.2,
      },
    ],
  }, null, 2)
}

function generateConfigYAML(): string {
  return `# Application Configuration
# Environment: production
# Version: 2.0.0

app:
  name: "MultiDownload Pro"
  debug: false
  maxFileSize: 104857600  # 100 MB
  allowedExtensions:
    - .txt
    - .json
    - .csv
    - .svg
    - .tsx
    - .css
    - .md
    
download:
  maxConcurrent: 5
  chunkSize: 8388608  # 8 MB
  retryAttempts: 3
  timeout: 30000  # 30 seconds
  tempDirectory: "/tmp/downloads"

theme:
  default: "system"
  options:
    - light
    - dark
    - system
  animations: true
  reducedMotion: false

security:
  cors:
    enabled: true
    origins:
      - "https://app.example.com"
    methods:
      - GET
      - POST
  rateLimit:
    requests: 100
    window: 60  # seconds

logging:
  level: "info"
  format: "json"
  outputs:
    - console
    - file

database:
  host: "localhost"
  port: 5432
  name: "multidownloader"
  poolSize: 20
`
}

function generateArchitectureSVG(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a"/>
      <stop offset="100%" style="stop-color:#1e293b"/>
    </linearGradient>
    <linearGradient id="box1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8b5cf6"/>
      <stop offset="100%" style="stop-color:#6d28d9"/>
    </linearGradient>
    <linearGradient id="box2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6"/>
      <stop offset="100%" style="stop-color:#2563eb"/>
    </linearGradient>
    <linearGradient id="box3" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#22c55e"/>
      <stop offset="100%" style="stop-color:#16a34a"/>
    </linearGradient>
    <linearGradient id="box4" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f59e0b"/>
      <stop offset="100%" style="stop-color:#d97706"/>
    </linearGradient>
  </defs>
  
  <rect width="600" height="400" fill="url(#bg)" rx="16"/>
  
  <!-- Title -->
  <text x="300" y="35" text-anchor="middle" fill="white" font-family="sans-serif" font-size="16" font-weight="bold">System Architecture</text>
  
  <!-- Client Layer -->
  <rect x="50" y="55" width="200" height="60" rx="8" fill="url(#box1)" opacity="0.9"/>
  <text x="150" y="82" text-anchor="middle" fill="white" font-family="sans-serif" font-size="12" font-weight="bold">React Frontend</text>
  <text x="150" y="100" text-anchor="middle" fill="white" font-family="sans-serif" font-size="10" opacity="0.8">TypeScript + Tailwind CSS</text>
  
  <!-- Arrow -->
  <line x1="250" y1="85" x2="310" y2="85" stroke="#8b5cf6" stroke-width="2" stroke-dasharray="5,3"/>
  <polygon points="310,80 320,85 310,90" fill="#8b5cf6"/>
  
  <!-- API Layer -->
  <rect x="320" y="55" width="200" height="60" rx="8" fill="url(#box2)" opacity="0.9"/>
  <text x="420" y="82" text-anchor="middle" fill="white" font-family="sans-serif" font-size="12" font-weight="bold">API Gateway</text>
  <text x="420" y="100" text-anchor="middle" fill="white" font-family="sans-serif" font-size="10" opacity="0.8">Express + Rate Limiting</text>
  
  <!-- Arrows down -->
  <line x1="150" y1="115" x2="150" y2="175" stroke="#8b5cf6" stroke-width="2"/>
  <polygon points="145,175 150,185 155,175" fill="#8b5cf6"/>
  
  <line x1="420" y1="115" x2="420" y2="175" stroke="#3b82f6" stroke-width="2"/>
  <polygon points="415,175 420,185 425,175" fill="#3b82f6"/>
  
  <!-- Service Layer -->
  <rect x="50" y="190" width="200" height="60" rx="8" fill="url(#box3)" opacity="0.9"/>
  <text x="150" y="217" text-anchor="middle" fill="white" font-family="sans-serif" font-size="12" font-weight="bold">Download Service</text>
  <text x="150" y="235" text-anchor="middle" fill="white" font-family="sans-serif" font-size="10" opacity="0.8">Chunked Downloads + ZIP</text>
  
  <rect x="320" y="190" width="200" height="60" rx="8" fill="url(#box4)" opacity="0.9"/>
  <text x="420" y="217" text-anchor="middle" fill="white" font-family="sans-serif" font-size="12" font-weight="bold">Storage Service</text>
  <text x="420" y="235" text-anchor="middle" fill="white" font-family="sans-serif" font-size="10" opacity="0.8">S3 + CDN Caching</text>
  
  <!-- Arrows down -->
  <line x1="150" y1="250" x2="150" y2="300" stroke="#22c55e" stroke-width="2"/>
  <polygon points="145,300 150,310 155,300" fill="#22c55e"/>
  
  <line x1="420" y1="250" x2="420" y2="300" stroke="#f59e0b" stroke-width="2"/>
  <polygon points="415,300 420,310 425,300" fill="#f59e0b"/>
  
  <!-- Database Layer -->
  <rect x="50" y="315" width="200" height="60" rx="8" fill="#334155" stroke="#475569" stroke-width="1.5"/>
  <text x="150" y="342" text-anchor="middle" fill="white" font-family="sans-serif" font-size="12" font-weight="bold">PostgreSQL</text>
  <text x="150" y="360" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="10">File Metadata + User Data</text>
  
  <rect x="320" y="315" width="200" height="60" rx="8" fill="#334155" stroke="#475569" stroke-width="1.5"/>
  <text x="420" y="342" text-anchor="middle" fill="white" font-family="sans-serif" font-size="12" font-weight="bold">Redis Cache</text>
  <text x="420" y="360" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="10">Session + Download Queue</text>
  
  <!-- Footer -->
  <text x="300" y="390" text-anchor="middle" fill="#64748b" font-family="sans-serif" font-size="10">MultiDownload Pro Architecture Diagram</text>
</svg>`
}

export const sampleFiles: SampleFile[] = [
  {
    id: 'readme',
    name: 'README.md',
    type: 'Markdown Document',
    extension: '.md',
    size: '2.3 KB',
    sizeBytes: 2300,
    category: 'document',
    generateContent: () => new Blob([generateReadme()], { type: 'text/markdown' }),
  },
  {
    id: 'notes',
    name: 'Project-Notes.txt',
    type: 'Text Document',
    extension: '.txt',
    size: '1.8 KB',
    sizeBytes: 1800,
    category: 'document',
    generateContent: () => new Blob([generateNotes()], { type: 'text/plain' }),
  },
  {
    id: 'changelog',
    name: 'CHANGELOG.md',
    type: 'Markdown Document',
    extension: '.md',
    size: '1.1 KB',
    sizeBytes: 1100,
    category: 'document',
    generateContent: () => new Blob([generateChangelog()], { type: 'text/markdown' }),
  },
  {
    id: 'component',
    name: 'FileDownloader.tsx',
    type: 'TypeScript Component',
    extension: '.tsx',
    size: '2.6 KB',
    sizeBytes: 2600,
    category: 'code',
    generateContent: () => new Blob([generateComponentCode()], { type: 'text/typescript' }),
  },
  {
    id: 'theme-css',
    name: 'theme-config.css',
    type: 'Stylesheet',
    extension: '.css',
    size: '1.3 KB',
    sizeBytes: 1300,
    category: 'code',
    generateContent: () => new Blob([generateThemeConfig()], { type: 'text/css' }),
  },
  {
    id: 'config',
    name: 'config.yaml',
    type: 'YAML Config',
    extension: '.yaml',
    size: '1.0 KB',
    sizeBytes: 1000,
    category: 'code',
    generateContent: () => new Blob([generateConfigYAML()], { type: 'text/yaml' }),
  },
  {
    id: 'metrics',
    name: 'metrics.json',
    type: 'JSON Data',
    extension: '.json',
    size: '1.5 KB',
    sizeBytes: 1500,
    category: 'data',
    generateContent: () => new Blob([generateMetricsJSON()], { type: 'application/json' }),
  },
  {
    id: 'team-csv',
    name: 'team-roster.csv',
    type: 'CSV Spreadsheet',
    extension: '.csv',
    size: '0.8 KB',
    sizeBytes: 800,
    category: 'data',
    generateContent: () => new Blob([generateKV()], { type: 'text/csv' }),
  },
  {
    id: 'palette',
    name: 'color-palette.svg',
    type: 'SVG Vector',
    extension: '.svg',
    size: '1.2 KB',
    sizeBytes: 1200,
    category: 'design',
    generateContent: () => new Blob([generatePaletteSVG()], { type: 'image/svg+xml' }),
  },
  {
    id: 'architecture',
    name: 'architecture.svg',
    type: 'SVG Diagram',
    extension: '.svg',
    size: '3.5 KB',
    sizeBytes: 3500,
    category: 'design',
    generateContent: () => new Blob([generateArchitectureSVG()], { type: 'image/svg+xml' }),
  },
]
