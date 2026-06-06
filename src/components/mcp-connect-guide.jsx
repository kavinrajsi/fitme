'use client'

/**
 * Step-by-step guide for connecting Claude (Code CLI / Desktop) to the
 * KyaReFitting aa MCP server using a personal API token as a Bearer header.
 */
import { useState } from 'react'
import { CopyIcon, CheckIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-md bg-muted p-3 pr-12 font-mono text-xs leading-relaxed">
        {code}
      </pre>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="absolute right-2 top-2 size-7"
        aria-label="Copy"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          } catch {
            /* clipboard blocked — user can still select the text */
          }
        }}
      >
        {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
      </Button>
    </div>
  )
}

export function McpConnectGuide({ connectUrl }) {
  const url = connectUrl || 'https://your-domain/api/mcp/mcp'

  const cliCmd = `claude mcp add --transport http kyarefitting \\\n  ${url} \\\n  --header "Authorization: Bearer YOUR_TOKEN"`

  const desktopConfig = `{
  "mcpServers": {
    "kyarefitting": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "${url}",
        "--header",
        "Authorization: Bearer YOUR_TOKEN"
      ]
    }
  }
}`

  return (
    <div className="space-y-5 text-sm">
      <p className="text-muted-foreground">
        Generate a token above, then replace <code className="font-mono">YOUR_TOKEN</code> in
        the steps below. The token lets the AI read your fitness data — keep it private.
      </p>

      <section className="space-y-2">
        <h3 className="font-medium">Claude Code (CLI)</h3>
        <p className="text-muted-foreground">Run this once, then restart Claude Code:</p>
        <CodeBlock code={cliCmd} />
      </section>

      <section className="space-y-2">
        <h3 className="font-medium">Claude Desktop</h3>
        <p className="text-muted-foreground">
          Open <span className="font-medium">Settings → Developer → Edit Config</span>, add the
          server below, save, and restart Claude Desktop. (Uses{' '}
          <code className="font-mono">mcp-remote</code> to attach the Bearer header.)
        </p>
        <CodeBlock code={desktopConfig} />
      </section>

      <section className="space-y-1">
        <h3 className="font-medium">Try it</h3>
        <p className="text-muted-foreground">
          Once connected, ask Claude things like “What’s my step streak?”, “How am I doing on
          the leaderboard this week?”, or “Summarize my workouts.”
        </p>
      </section>

      <p className="text-xs text-muted-foreground">
        Note: claude.ai web custom connectors expect OAuth, so the Bearer-token method works best
        with Claude Code and Claude Desktop. Revoke a token anytime from the card above.
      </p>
    </div>
  )
}
