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
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Wrench + circuit dot — mechanic SaaS icon */}
      <rect width="28" height="28" rx="7" fill="#171717"/>
      {/* Wrench body */}
      <path d="M8 20L14.5 13.5" stroke="#4ade80" strokeWidth="2" strokeLinecap="round"/>
      {/* Wrench head circle */}
      <circle cx="17" cy="11" r="3.2" stroke="#4ade80" strokeWidth="2"/>
      {/* Signal dots */}
      <circle cx="8" cy="9" r="1.2" fill="#4ade80"/>
      <circle cx="11" cy="7" r="1.2" fill="#4ade80" opacity="0.6"/>
      <circle cx="14" cy="5.5" r="1.2" fill="#4ade80" opacity="0.3"/>
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
        <div className="px-4 py-4 border-b border-neutral-200 flex items-center gap-2.5">
          <Logo />
          <div>
            <div className="text-sm font-bold text-neutral-900 leading-tight">SDCR</div>
            <div className="text-xs text-neutral-400 leading-tight">Systems</div>
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
