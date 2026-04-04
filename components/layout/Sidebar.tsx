'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { label: 'Dashboard', href: '/' },
  { label: 'Jobs', href: '/jobs' },
  { label: 'Clients', href: '/clients' },
  { label: 'Vehicles', href: '/vehicles' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-44 flex-shrink-0 bg-white border-r border-neutral-200 flex flex-col">
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
  )
}