/**
 * /ai — AI access via the Model Context Protocol. Generate, copy, and revoke
 * per-user API tokens that let an AI tool read your fitness data over MCP.
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

export const dynamic = 'force-dynamic'

export const metadata = { title: 'AI — KyaReFitting aa' }

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
    </div>
  )
}
