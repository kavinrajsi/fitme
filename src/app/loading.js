/**
 * Global loading fallback (public pages + initial app shell): a centered spinner.
 */
export default function Loading() {
  return (
    <div className="bg-background flex min-h-svh items-center justify-center">
      <div
        className="border-muted border-t-foreground size-7 animate-spin rounded-full border-2"
        role="status"
        aria-label="Loading"
      />
    </div>
  )
}
