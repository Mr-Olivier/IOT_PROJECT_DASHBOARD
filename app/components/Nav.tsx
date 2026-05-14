'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Droplets, LayoutDashboard, Activity, Radio, BookOpen, Brain } from 'lucide-react'

const links = [
  { href: '/dashboard', label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/ml',        label: 'AI / ML',      icon: Brain },
  { href: '/docs',      label: 'Documentation', icon: BookOpen },
]

export default function Nav() {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-b border-gray-100 px-4 md:px-6 sticky top-0 z-50 shadow-sm">
      <div className="max-w-screen-xl mx-auto flex items-center gap-1 h-14">
        {/* Brand */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 mr-8 shrink-0 group"
        >
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-1.5 shadow-sm group-hover:shadow-emerald-200 group-hover:scale-105 transition-all duration-200">
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-bold text-gray-900 text-base tracking-tight">
              AquaSense
            </span>
            <span className="text-[10px] font-semibold tracking-widest uppercase"
              style={{ color: '#10b981' }}>
              IoT Platform
            </span>
          </div>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-0.5 flex-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-4 h-14 text-sm font-medium border-b-2 transition-all duration-150 ${
                  active
                    ? 'border-emerald-500 text-emerald-600 bg-gradient-to-b from-white to-emerald-50/60'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50/80'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            )
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Live indicator */}
          <div className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-full px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <Activity className="w-3 h-3 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700">Live</span>
          </div>

          {/* Divider + group info */}
          <div className="hidden md:flex items-center gap-2 text-xs text-gray-400 border-l border-gray-100 pl-3">
            <Radio size={12} className="text-emerald-400" />
            <span className="font-medium text-gray-600">Group 1</span>
            <span className="w-1 h-1 rounded-full bg-gray-300 inline-block" />
            <span>Ubicom IoT</span>
          </div>
        </div>
      </div>
    </nav>
  )
}
