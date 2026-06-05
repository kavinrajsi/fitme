/**
 * /admin/notifications/[id] — a single broadcast and who received it (admin only).
 */
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeftIcon } from 'lucide-react'
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Notification — Admin',
  robots: { index: false, follow: false },
}

const fmtDateTime = (value) =>
  value ? new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'

export default async function AdminNotificationPage({ params }) {
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user?.email !== ADMIN_EMAIL) notFound()

  const service = createServiceClient()
  const [{ data: log }, { data: recipients }] = await Promise.all([
    service
      .from('notification_log')
      .select('id, source, title, body, url, sent_count, failed_count, created_at')
      .eq('id', id)
      .maybeSingle(),
    service
      .from('notification_recipients')
      .select('user_id, endpoint, status, created_at')
      .eq('notification_id', id)
      .order('status', { ascending: true }),
  ])

  if (!log) notFound()

  const list = recipients ?? []
  const userIds = [...new Set(list.map((r) => r.user_id).filter(Boolean))]
  const { data: profiles } = userIds.length
    ? await service.from('profiles').select('id, full_name, email').in('id', userIds)
    : { data: [] }
  const profileById = {}
  for (const profile of profiles ?? []) profileById[profile.id] = profile

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Link
        href="/admin/notifications"
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
      >
        <ChevronLeftIcon className="size-4" /> Back to notifications
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{log.title}</CardTitle>
          <CardDescription>
            <Badge variant="outline" className="mr-2">{log.source ?? '—'}</Badge>
            {fmtDateTime(log.created_at)} · {log.sent_count} sent · {log.failed_count} failed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{log.body}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recipients</CardTitle>
          <CardDescription>{list.length} device(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">No recipients.</p>
          ) : (
            <div className="max-h-[28rem] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((recipient, index) => {
                    const profile = profileById[recipient.user_id]
                    return (
                      <TableRow key={`${recipient.endpoint}-${index}`}>
                        <TableCell>
                          <div className="font-medium">{profile?.full_name ?? '—'}</div>
                          <div className="text-muted-foreground truncate text-xs">
                            {profile?.email ?? recipient.user_id ?? 'unknown'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={recipient.status === 'sent' ? 'outline' : 'secondary'}>
                            {recipient.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {fmtDateTime(recipient.created_at)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
