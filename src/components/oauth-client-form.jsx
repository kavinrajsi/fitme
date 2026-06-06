'use client'

/**
 * Registers an OAuth client (third-party app). On success the new client_id — and,
 * for confidential clients, the client_secret — are shown exactly once (the secret is
 * never recoverable afterwards, only its hash is stored).
 */
import { useActionState } from 'react'
import { useState } from 'react'
import { CopyIcon, CheckIcon, PlusIcon } from 'lucide-react'
import { createOAuthClient } from '@/app/actions/oauth-clients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Copy-to-clipboard button with a brief "Copied" confirmation.
function CopyButton({ value }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          /* clipboard blocked — user can still select the text */
        }
      }}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  )
}

export function OAuthClientForm() {
  const [state, formAction, pending] = useActionState(createOAuthClient, null)
  const created = state?.ok ? state : null

  return (
    <div className="space-y-4">
      {/* Freshly created credentials — shown once */}
      {created && (
        <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
          <p className="font-medium">App registered. Save these now:</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-background px-2 py-1 font-mono text-xs">
              {created.clientId}
            </code>
            <CopyButton value={created.clientId} />
          </div>
          {created.secret ? (
            <>
              <p className="text-xs text-muted-foreground">
                Client secret (won&apos;t be shown again):
              </p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded bg-background px-2 py-1 font-mono text-xs">
                  {created.secret}
                </code>
                <CopyButton value={created.secret} />
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Public client (PKCE) — no secret. Use S256 on the authorize request.
            </p>
          )}
        </div>
      )}

      {state && !state.ok && state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <form action={formAction} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="client_name">App name</Label>
          <Input id="client_name" name="name" placeholder="My fitness app" maxLength={80} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="redirect_uris">Redirect URIs (one per line)</Label>
          <textarea
            id="redirect_uris"
            name="redirect_uris"
            required
            rows={3}
            placeholder={'https://myapp.com/callback'}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="confidential" className="size-4" />
          Confidential client (issue a secret — for server-side apps)
        </label>
        <Button type="submit" className="w-full" disabled={pending}>
          <PlusIcon /> {pending ? 'Registering…' : 'Register app'}
        </Button>
      </form>
    </div>
  )
}
