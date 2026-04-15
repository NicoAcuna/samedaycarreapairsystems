'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useRef } from 'react'

const navItems = [
  { label: 'Dashboard', href: '/' },
  { label: 'Jobs',      href: '/jobs' },
  { label: 'Leads',     href: '/leads' },
  { label: 'Clients',   href: '/clients' },
  { label: 'Vehicles',  href: '/vehicles' },
]

const icons: Record<string, string> = {
  '/':         '⊞',
  '/jobs':     '🔧',
  '/leads':    '📋',
  '/clients':  '👤',
  '/vehicles': '🚗',
}

function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#171717"/>
      <path d="M6 20h20v2a1 1 0 01-1 1H7a1 1 0 01-1-1v-2z" fill="#4ade80" opacity="0.3"/>
      <path d="M5 20l3-6h16l3 6H5z" fill="#4ade80" opacity="0.7"/>
      <path d="M10 14l2-4h8l2 4" fill="#4ade80"/>
      <circle cx="10" cy="21" r="2.5" fill="#171717" stroke="#4ade80" strokeWidth="1.5"/>
      <circle cx="22" cy="21" r="2.5" fill="#171717" stroke="#4ade80" strokeWidth="1.5"/>
      <circle cx="25" cy="8" r="5" fill="#171717"/>
      <path d="M23 6.5c0-1 .8-1.8 1.8-1.8.3 0 .5.1.7.2l-1 1v.8h.8l1-1c.1.2.2.4.2.7 0 1-.8 1.8-1.8 1.8-.2 0-.4 0-.6-.1l-1.5 1.5-.6-.6 1.5-1.5c-.1-.2-.1-.5-.1-.7-.1 0-.4 0-.4-.3z" fill="#4ade80"/>
    </svg>
  )
}

type Company = { id: string; name: string }

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [activeCompany, setActiveCompany] = useState<Company | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [showSwitcher, setShowSwitcher] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: userData } = await supabase
        .from('users')
        .select('active_company_id, company_id')
        .eq('id', user.id)
        .single()

      const activeId = userData?.active_company_id || userData?.company_id
      if (!activeId) return

      // Load all companies this user belongs to
      const { data: memberships } = await supabase
        .from('user_companies')
        .select('companies(id, name)')
        .eq('user_id', user.id)

      const list: Company[] = (memberships || [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((m: any) => Array.isArray(m.companies) ? m.companies[0] : m.companies)
        .filter(Boolean) as Company[]

      // Fallback: if user_companies is empty, load from company_id directly
      if (list.length === 0 && activeId) {
        const { data: company } = await supabase
          .from('companies')
          .select('id, name')
          .eq('id', activeId)
          .single()
        if (company) list.push(company)
      }

      setCompanies(list)
      setActiveCompany(list.find(c => c.id === activeId) || list[0] || null)
    })
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSwitcher(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  async function switchCompany(company: Company) {
    setShowSwitcher(false)
    setActiveCompany(company)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('users').update({ active_company_id: company.id }).eq('id', user.id)
    router.refresh()
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex w-44 flex-shrink-0 bg-white border-r border-neutral-200 flex-col">
        <div className="px-3 py-3 border-b border-neutral-200" ref={dropdownRef}>
          <button
            onClick={() => companies.length > 1 && setShowSwitcher(v => !v)}
            className={`w-full flex items-center gap-2 rounded-lg px-1 py-1 transition-colors ${companies.length > 1 ? 'hover:bg-neutral-50 cursor-pointer' : ''}`}
          >
            <Logo />
            <div className="flex-1 text-left min-w-0">
              <div className="text-xs font-semibold text-neutral-900 leading-tight truncate">
                {activeCompany?.name || 'Same Day Car Repair'}
              </div>
              <div className="text-xs text-neutral-400 leading-tight">SDCR Systems</div>
            </div>
            {companies.length > 1 && (
              <span className="text-neutral-400 text-xs flex-shrink-0">▾</span>
            )}
          </button>

          {showSwitcher && (
            <div className="absolute left-3 mt-1 w-44 bg-white border border-neutral-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
              {companies.map(c => (
                <button
                  key={c.id}
                  onClick={() => switchCompany(c)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-neutral-50 flex items-center gap-2"
                >
                  {c.id === activeCompany?.id && <span className="text-green-500 text-xs">✓</span>}
                  {c.id !== activeCompany?.id && <span className="w-3" />}
                  <span className={c.id === activeCompany?.id ? 'font-medium text-neutral-900' : 'text-neutral-600'}>
                    {c.name}
                  </span>
                </button>
              ))}
            </div>
          )}
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
            className="w-full text-left text-xs text-neutral-400 hover:text-red-500 transition-colors flex items-center gap-2 py-1 cursor-pointer"
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
          className="flex-1 flex flex-col items-center justify-center py-3 text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
        >
          <span className="text-xl mb-0.5">⎋</span>
          <span className="text-xs font-normal">Log out</span>
        </button>
      </nav>
    </>
  )
}
