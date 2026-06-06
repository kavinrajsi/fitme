/**
 * /admin/notifications — log of Web Push broadcasts (admin only, noindex).
 */
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ADMIN_EMAIL } from '@/lib/constants'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Notifications — Admin',
  robots: { index: false, follow: false },
}

// Date+time in IST (Asia/Kolkata), or an em dash when null.
const fmtDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata',
      })
    : '—'

// Admin-only broadcast log: most recent 200 push notifications, newest first. Each row
// links to /admin/notifications/[id] for the per-recipient delivery breakdown.
export default async function AdminNotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user?.email !== ADMIN_EMAIL) notFound()

  const service = createServiceClient()
  const { data: logs } = await service
    .from('notification_log')
    .select('id, source, title, body, sent_count, failed_count, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  const rows = logs ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification log</CardTitle>
        <CardDescription>Web Push broadcasts (newest first)</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            No notifications sent yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                      <Link href={`/admin/notifications/${log.id}`} className="hover:underline">
                        {fmtDateTime(log.created_at)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.source ?? '—'}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[26rem]">
                      <Link href={`/admin/notifications/${log.id}`} className="block hover:underline">
                        <div className="font-medium">{log.title}</div>
                        <div className="text-muted-foreground truncate text-xs">{log.body}</div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{log.sent_count}</TableCell>
                    <TableCell className="text-right tabular-nums">{log.failed_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
