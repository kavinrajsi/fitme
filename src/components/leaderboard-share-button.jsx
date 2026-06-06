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

// 'image' targets render+share the actual PNG (via the OS share sheet / download).
// The 'link' target opens WhatsApp directly with a message linking the public image —
// the web can't push an image file straight into WhatsApp, only the share sheet can.
const PLATFORMS = [
  { label: 'Instagram Story', kind: 'image', format: 'story', file: 'instagram-story', icon: Camera },
  { label: 'Instagram Post', kind: 'image', format: 'post', file: 'instagram-post', icon: Camera },
  { label: 'WhatsApp Status', kind: 'image', format: 'story', file: 'whatsapp-status', icon: MessageCircle },
  { label: 'WhatsApp Message', kind: 'image', format: 'square', file: 'whatsapp-message', icon: MessageCircle },
  { label: 'WhatsApp (link)', kind: 'link', format: 'square', icon: MessageCircle },
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

  // Opens WhatsApp directly (chat picker) with a message linking the public OG image.
  function shareWhatsAppLink(format) {
    const imageUrl = `${window.location.origin}/api/og/leaderboard?period=${period}&format=${format}`
    const text = `Top movers on KyaReFitting 🏆\n${imageUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }

  const onSelect = (platform) =>
    platform.kind === 'link'
      ? shareWhatsAppLink(platform.format)
      : share(platform.format, platform.file)

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
                      onSelect(platform)
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
              onClick={() => onSelect(platform)}
            >
              <Icon /> {platform.label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
