'use client'

/**
 * Shares a branded top-5 leaderboard image, sized per platform.
 * Desktop: a dropdown of platforms. Mobile: a bottom sheet with large tap targets.
 * Web Share on mobile, download on desktop.
 */
import { useState } from 'react'
import { Share2Icon, Camera, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'

// Each target maps to an OG image format (Story and WhatsApp Status share the 9:16 'story').
const PLATFORMS = [
  { label: 'Instagram Story', format: 'story', file: 'instagram-story', icon: Camera },
  { label: 'Instagram Post', format: 'post', file: 'instagram-post', icon: Camera },
  { label: 'WhatsApp Status', format: 'story', file: 'whatsapp-status', icon: MessageCircle },
  { label: 'WhatsApp Message', format: 'square', file: 'whatsapp-message', icon: MessageCircle },
]

export function LeaderboardShareButton({ period }) {
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const isMobile = useIsMobile()

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

  const triggerLabel = busy ? 'Preparing…' : 'Share'

  // Mobile: a bottom sheet with full-width platform buttons.
  if (isMobile) {
    return (
      <>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => setOpen(true)}>
          <Share2Icon /> {triggerLabel}
        </Button>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Share leaderboard</DrawerTitle>
              <DrawerDescription>Pick where to share the top 5.</DrawerDescription>
            </DrawerHeader>
            <div className="flex flex-col gap-2 p-4 pt-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {PLATFORMS.map((platform) => {
                const Icon = platform.icon
                return (
                  <Button
                    key={platform.label}
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setOpen(false)
                      share(platform.format, platform.file)
                    }}
                  >
                    <Icon /> {platform.label}
                  </Button>
                )
              })}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    )
  }

  // Desktop: a dropdown anchored to the button.
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" disabled={busy}>
            <Share2Icon /> {triggerLabel}
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {PLATFORMS.map((platform) => {
          const Icon = platform.icon
          return (
            <DropdownMenuItem
              key={platform.label}
              disabled={busy}
              onClick={() => share(platform.format, platform.file)}
            >
              <Icon /> {platform.label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
