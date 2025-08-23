'use client'

import { ReactNode, useState } from 'react'
import { useTenant } from '@/lib/hooks/useTenant'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  HomeIcon, 
  ChatBubbleLeftRightIcon, 
  TagIcon, 
  ChartBarIcon,
  Cog6ToothIcon,
  BellIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface DashboardLayoutProps {
  children: ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Conversations', href: '/conversations', icon: ChatBubbleLeftRightIcon },
  { name: 'Keywords', href: '/keywords', icon: TagIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'Alerts', href: '/alerts', icon: BellIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
]

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { tenant, profile, loading } = useTenant()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between px-6">
              <h1 className="text-xl font-semibold text-gray-900">CustomerSignal</h1>
              <button
                type="button"
                className="text-gray-500 hover:text-gray-600"
                onClick={() => setSidebarOpen(false)}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <nav className="mt-6 px-6">
              <ul role="list" className="space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`
                          group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-medium
                          ${isActive
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:text-blue-700 hover:bg-gray-50'
                          }
                        `}
                      >
                        <item.icon
                          className={`h-6 w-6 shrink-0 ${
                            isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-blue-700'
                          }`}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="flex items-center gap-x-4">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-700">
                    {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {profile?.full_name || profile?.email}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {tenant?.name}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4 shadow-sm">
          <div className="flex h-16 shrink-0 items-center">
            <h1 className="text-xl font-semibold text-gray-900">CustomerSignal</h1>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={`
                            group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-medium
                            ${isActive
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-700 hover:text-blue-700 hover:bg-gray-50'
                            }
                          `}
                        >
                          <item.icon
                            className={`h-6 w-6 shrink-0 ${
                              isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-blue-700'
                            }`}
                            aria-hidden="true"
                          />
                          {item.name}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </li>
              <li className="mt-auto">
                <div className="flex items-center gap-x-4 px-2 py-3 text-sm font-medium leading-6 text-gray-900">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-700">
                      {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {profile?.full_name || profile?.email}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {tenant?.name}
                    </p>
                  </div>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile header */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between bg-white px-4 py-3 shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900">CustomerSignal</h1>
          <button
            type="button"
            className="text-gray-500 hover:text-gray-600"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}