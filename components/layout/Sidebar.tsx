'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { label: 'Dashboard', href: '/' },
  { label: 'Jobs',      href: '/jobs' },
  { label: 'Clients',   href: '/clients' },
  { label: 'Vehicles',  href: '/vehicles' },
]

const icons: Record<string, string> = {
  '/':         '⊞',
  '/jobs':     '🔧',
  '/clients':  '👤',
  '/vehicles': '🚗',
}

function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#171717"/>
      {/* Car silhouette */}
      <path d="M6 20h20v2a1 1 0 01-1 1H7a1 1 0 01-1-1v-2z" fill="#4ade80" opacity="0.3"/>
      <path d="M5 20l3-6h16l3 6H5z" fill="#4ade80" opacity="0.7"/>
      <path d="M10 14l2-4h8l2 4" fill="#4ade80"/>
      {/* Wheels */}
      <circle cx="10" cy="21" r="2.5" fill="#171717" stroke="#4ade80" strokeWidth="1.5"/>
      <circle cx="22" cy="21" r="2.5" fill="#171717" stroke="#4ade80" strokeWidth="1.5"/>
      {/* Wrench badge top-right */}
      <circle cx="25" cy="8" r="5" fill="#171717"/>
      <path d="M23 6.5c0-1 .8-1.8 1.8-1.8.3 0 .5.1.7.2l-1 1v.8h.8l1-1c.1.2.2.4.2.7 0 1-.8 1.8-1.8 1.8-.2 0-.4 0-.6-.1l-1.5 1.5-.6-.6 1.5-1.5c-.1-.2-.1-.5-.1-.7-.1 0-.4 0-.4-.3z" fill="#4ade80" strokeWidth="0.3"/>
    </svg>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex w-44 flex-shrink-0 bg-white border-r border-neutral-200 flex-col">
        <div className="px-4 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-2.5 mb-1">
            <Logo />
            <div>
              <div className="text-xs font-bold text-neutral-900 leading-tight tracking-wide">SDCR Systems</div>
              <div className="text-xs text-neutral-400 leading-tight">by Same Day Car Repair</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 text-sm border-l-2 transition-colors ${
                  isActive
                    ? 'border-green-500 bg-neutral-100 text-neutral-900 font-medium'
                    : 'border-transparent text-neutral-500 hover:bg-neutral-50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="px-4 py-4 border-t border-neutral-100">
          <button
            onClick={handleLogout}
            className="w-full text-left text-xs text-neutral-400 hover:text-red-500 transition-colors flex items-center gap-2 py-1"
          >
            <span>→</span> Log out
          </button>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-200 flex" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-3 transition-colors ${
                isActive ? 'text-neutral-900' : 'text-neutral-400'
              }`}
            >
              <span className="text-xl mb-0.5">{icons[item.href]}</span>
              <span className={`text-xs ${isActive ? 'font-semibold text-neutral-900' : 'font-normal'}`}>
                {item.label}
              </span>
              {isActive && <span className="w-4 h-0.5 bg-neutral-900 rounded-full mt-1" />}
            </Link>
          )
        })}
        <button
          onClick={handleLogout}
          className="flex-1 flex flex-col items-center justify-center py-3 text-neutral-400 hover:text-red-500 transition-colors"
        >
          <span className="text-xl mb-0.5">⎋</span>
          <span className="text-xs font-normal">Log out</span>
        </button>
      </nav>
    </>
  )
}
