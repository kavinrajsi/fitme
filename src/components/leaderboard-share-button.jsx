'use client'

/** Shares a branded top-5 leaderboard image, sized per platform (Web Share on mobile, download on desktop). */
import { useState } from 'react'
import { Share2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Each target maps to an OG image format (Story and WhatsApp Status share the 9:16 'story').
const PLATFORMS = [
  { label: 'Instagram Story', format: 'story', file: 'instagram-story' },
  { label: 'Instagram Post', format: 'post', file: 'instagram-post' },
  { label: 'WhatsApp Status', format: 'story', file: 'whatsapp-status' },
  { label: 'WhatsApp Message', format: 'square', file: 'whatsapp-message' },
]

export function LeaderboardShareButton({ period }) {
  const [busy, setBusy] = useState(false)

  async function share(format, file) {
    setBusy(true)
    try {
      const response = await fetch(`/api/og/leaderboard?period=${period}&format=${format}`)
      if (!response.ok) throw new Error('image failed')
      const blob = await response.blob()
      const fileObj = new File([blob], `kyarefitting-${file}.png`, { type: 'image/png' })

      if (navigator.canShare?.({ files: [fileObj] })) {
        await navigator.share({
          files: [fileObj],
          title: 'KyaReFitting Leaderboard',
          text: 'Top movers on KyaReFitting 🏆',
        })
      } else {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = fileObj.name
        link.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      if (err?.name !== 'AbortError') console.error('[share]', err?.message ?? err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" disabled={busy}>
            <Share2Icon /> {busy ? 'Preparing…' : 'Share'}
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {PLATFORMS.map((platform) => (
          <DropdownMenuItem
            key={platform.label}
            disabled={busy}
            onClick={() => share(platform.format, platform.file)}
          >
            {platform.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
