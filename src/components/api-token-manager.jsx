'use client'

/**
 * Manage per-user MCP API tokens on the Profile page: generate (shown once),
 * copy, and revoke. The raw token is returned by the server action only at
 * creation time — afterwards only the last 4 chars are known.
 */
import { useActionState, useState } from 'react'
import { CopyIcon, CheckIcon, KeyIcon } from 'lucide-react'
import { createApiToken, revokeApiToken } from '@/app/actions/api-tokens'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

// Format a timestamp as an IST date (the app is IST throughout).
function fmtDate(value) {
  if (!value) return null
  return new Date(value).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

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

// `tokens` are the user's existing tokens (last-4 only); `connectUrl` is the MCP endpoint.
export function ApiTokenManager({ tokens = [], connectUrl }) {
  const [state, formAction, pending] = useActionState(createApiToken, null)
  // The full raw token comes back only in the create action's result — show it once.
  const created = state?.ok ? state.token : null

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Generate a token and send it as a Bearer token to the REST API (<code>/api/v1</code>)
        or an AI tool over MCP. A <strong>read-only</strong> token is safe to hand to another
        developer building on your data; <strong>read &amp; write</strong> also lets them
        change your daily step goal. Treat it like a password.
      </p>

      {/* Existing tokens */}
      {tokens.length > 0 && (
        <ul className="divide-y divide-border rounded-md border border-border">
          {tokens.map((token) => (
            <li key={token.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {token.name || 'Token'}{' '}
                  <span className="font-mono text-muted-foreground">…{token.last_four}</span>{' '}
                  <Badge variant="outline" className="ml-1 align-middle">
                    {token.scopes?.includes('write') ? 'read & write' : 'read only'}
                  </Badge>
                </p>
                <p className="text-xs text-muted-foreground">
                  Added {fmtDate(token.created_at)}
                  {token.last_used_at ? ` · last used ${fmtDate(token.last_used_at)}` : ' · never used'}
                </p>
              </div>
              <form action={revokeApiToken}>
                <input type="hidden" name="id" value={token.id} />
                <Button type="submit" variant="outline" size="sm">
                  Revoke
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {/* Freshly created token — shown once */}
      {created && (
        <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
          <p className="text-sm font-medium">Your new token (copy it now — it won&apos;t be shown again):</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-background px-2 py-1 font-mono text-xs">
              {created}
            </code>
            <CopyButton value={created} />
          </div>
        </div>
      )}

      {state && !state.ok && state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      {/* Generate form */}
      <form action={formAction} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="token_name">Token name (optional)</Label>
          <Input id="token_name" name="name" placeholder="Claude Desktop" maxLength={60} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="token_scope">Access</Label>
          <select
            id="token_scope"
            name="scope"
            defaultValue="read"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="read">Read only (recommended)</option>
            <option value="write">Read &amp; write</option>
          </select>
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          <KeyIcon /> {pending ? 'Generating…' : 'Generate token'}
        </Button>
      </form>

      {connectUrl && (
        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Connect URL</p>
          <code className="block truncate rounded bg-muted px-2 py-1 font-mono">{connectUrl}</code>
          <p>See “Connect to Claude” below for setup steps.</p>
        </div>
      )}
    </div>
  )
}
