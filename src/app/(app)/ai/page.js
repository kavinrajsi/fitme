/**
 * /ai — AI access via the Model Context Protocol. Generate, copy, and revoke
 * per-user API tokens that let an AI tool read your fitness data over MCP, plus a
 * "Connect to Claude" guide.
 *
 * force-dynamic, own-row RLS. Lists only active (non-revoked) tokens — by design
 * only their last four digits are stored, so the full token is shown just once at mint.
 */
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { ApiTokenManager } from '@/components/api-token-manager'
import { McpConnectGuide } from '@/components/mcp-connect-guide'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'AI — KyaReFitting aa' }

// Loads the user's live tokens and derives the absolute MCP endpoint URL to hand to
// the token manager + connect guide.
export default async function AiPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: tokens } = await supabase
    .from('api_tokens')
    .select('id, name, last_four, created_at, last_used_at')
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })

  // Build the MCP URL from the request host so it's correct in any environment;
  // localhost/127.* gets http, everything else https.
  const host = (await headers()).get('host')
  const proto = host?.startsWith('localhost') || host?.startsWith('127.') ? 'http' : 'https'
  const mcpUrl = host ? `${proto}://${host}/api/mcp/mcp` : '/api/mcp/mcp'

  return (
    <div className="mx-auto w-full max-w-md space-y-6 px-4 py-8">
      <div>
        <h1 className="font-semibold">AI access</h1>
        <p className="text-sm text-muted-foreground">
          Connect an AI tool to read your fitness data via MCP
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API tokens (MCP)</CardTitle>
          <CardDescription>
            Generate a token, then add it to your AI tool as a Bearer token
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApiTokenManager tokens={tokens ?? []} connectUrl={mcpUrl} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connect to Claude</CardTitle>
          <CardDescription>Add this MCP server to Claude Code or Claude Desktop</CardDescription>
        </CardHeader>
        <CardContent>
          <McpConnectGuide connectUrl={mcpUrl} />
        </CardContent>
      </Card>
    </div>
  )
}
