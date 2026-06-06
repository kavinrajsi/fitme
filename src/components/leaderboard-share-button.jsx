'use client'

/** Shares a branded top-5 leaderboard image (Web Share on mobile, download on desktop). */
import { useState } from 'react'
import { Share2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function LeaderboardShareButton({ period }) {
  const [busy, setBusy] = useState(false)

  async function share() {
    setBusy(true)
    try {
      const response = await fetch(`/api/og/leaderboard?period=${period}&format=story`)
      if (!response.ok) throw new Error('image failed')
      const blob = await response.blob()
      const file = new File([blob], 'kyarefitting-leaderboard.png', { type: 'image/png' })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'KyaReFitting Leaderboard',
          text: 'Top movers on KyaReFitting 🏆',
        })
      } else {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = file.name
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
    <Button variant="outline" size="sm" onClick={share} disabled={busy}>
      <Share2Icon /> {busy ? 'Preparing…' : 'Share'}
    </Button>
  )
}
