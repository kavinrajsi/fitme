/**
 * Auth layout — centered card wrapper used by /signin (and the redirect-only
 * /signup, /forgot-password, /reset-password pages).
 * Keeps auth pages visually consistent without touching the dashboard layout.
 */
export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-[420px] bg-card rounded-xl shadow-md border border-border p-10">
        {children}
      </div>
    </div>
  )
}
