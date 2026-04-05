'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { label: 'Dashboard', href: '/' },
  { label: 'Jobs',      href: '/jobs' },
  { label: 'Clients',   href: '/clients' },
  { label: 'Vehicles',  href: '/vehicles' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex w-44 flex-shrink-0 bg-white border-r border-neutral-200 flex-col">
        <div className="px-4 py-4 border-b border-neutral-200">
          <div className="text-sm font-medium text-neutral-900">MechBase</div>
          <div className="text-xs text-neutral-500 mt-0.5">Same Day Car Repair</div>
        </div>
        <nav className="flex-1 py-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 text-sm border-l-2 transition-colors ${
                  isActive
                    ? 'border-blue-500 bg-neutral-100 text-neutral-900 font-medium'
                    : 'border-transparent text-neutral-500 hover:bg-neutral-50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-200 flex" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          const icons: Record<string, string> = {
            '/':         '⊞',
            '/jobs':     '🔧',
            '/clients':  '👤',
            '/vehicles': '🚗',
          }
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
      </nav>
    </>
  )
}
