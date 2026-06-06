/**
 * Shared CRON_SECRET guard for Vercel Cron routes. Vercel sends
 * `Authorization: Bearer <CRON_SECRET>` automatically when that env var is set.
 */
import { NextResponse } from 'next/server'

// Returns a NextResponse to short-circuit (500 if the secret is unset, 401 on mismatch),
// or null when the request is authorized. Fails closed — never runs unauthenticated.
export function authorizeCron(request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return new NextResponse('CRON_SECRET not configured', { status: 500 })
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  return null
}
