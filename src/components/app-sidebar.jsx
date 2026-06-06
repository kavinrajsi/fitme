'use client'

/**
 * App sidebar — KyaReFitting aa nav (Dashboard / Steps / Leaderboard / Profile), the
 * signed-in user, and sign out. Built on the shadcn (base-nova) sidebar primitives,
 * which use the `render` prop for polymorphism.
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/logo'
import {
  LayoutDashboard,
  Footprints,
  Dumbbell,
  Trophy,
  User,
  Sparkles,
  Shield,
  LogOut,
} from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/data', label: 'Steps', icon: Footprints },
  { href: '/workouts', label: 'Workouts', icon: Dumbbell },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/ai', label: 'AI', icon: Sparkles },
  { href: '/profile', label: 'Profile', icon: User },
]

export function AppSidebar({ user, isAdmin = false, ...props }) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()
  const closeMobile = () => setOpenMobile(false)
  const navItems = isAdmin ? [...NAV, { href: '/admin', label: 'Admin', icon: Shield }] : NAV
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5 text-base font-semibold tracking-tight">
          <Logo className="size-5" />
          KyaReFitting aa
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={pathname === item.href}
                      tooltip={item.label}
                      render={<Link href={item.href} onClick={closeMobile} />}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2 px-1 py-1">
          <Avatar className="size-8">
            {user?.avatar && <AvatarImage src={user.avatar} alt="" />}
            <AvatarFallback>{user?.initial ?? '?'}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-medium">{user?.name ?? 'Account'}</div>
            {user?.email && (
              <div className="text-muted-foreground truncate text-xs">{user.email}</div>
            )}
          </div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <form action={signOut} className="w-full">
              <SidebarMenuButton type="submit" tooltip="Sign out">
                <LogOut />
                <span>Sign out</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
