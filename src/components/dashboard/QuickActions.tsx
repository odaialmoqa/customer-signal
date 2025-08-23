'use client'

import Link from 'next/link'
import { 
  PlusIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  BellIcon,
  DocumentArrowDownIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'

interface QuickActionProps {
  title: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

function QuickAction({ title, description, href, icon: Icon, color }: QuickActionProps) {
  return (
    <Link
      href={href}
      className="group relative bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200 hover:border-gray-300"
    >
      <div>
        <span className={`rounded-lg inline-flex p-3 ${color} group-hover:scale-110 transition-transform duration-200`}>
          <Icon className="h-6 w-6 text-white" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-4">
        <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          {description}
        </p>
      </div>
      <span
        className="pointer-events-none absolute top-6 right-6 text-gray-300 group-hover:text-gray-400 transition-colors"
        aria-hidden="true"
      >
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
        </svg>
      </span>
    </Link>
  )
}

interface QuickActionsProps {
  className?: string
}

export default function QuickActions({ className = '' }: QuickActionsProps) {
  const actions = [
    {
      title: 'Add Keywords',
      description: 'Start monitoring new keywords and phrases across platforms',
      href: '/keywords',
      icon: PlusIcon,
      color: 'bg-blue-500'
    },
    {
      title: 'Search Conversations',
      description: 'Find specific mentions and conversations in your database',
      href: '/conversations',
      icon: MagnifyingGlassIcon,
      color: 'bg-green-500'
    },
    {
      title: 'View Analytics',
      description: 'Analyze trends and patterns in your conversation data',
      href: '/analytics',
      icon: ChartBarIcon,
      color: 'bg-purple-500'
    },
    {
      title: 'Manage Alerts',
      description: 'Configure notifications for important conversations',
      href: '/alerts',
      icon: BellIcon,
      color: 'bg-yellow-500'
    },
    {
      title: 'Export Report',
      description: 'Generate and download comprehensive reports',
      href: '/reports',
      icon: DocumentArrowDownIcon,
      color: 'bg-indigo-500'
    },
    {
      title: 'Settings',
      description: 'Configure your account and integration preferences',
      href: '/settings',
      icon: Cog6ToothIcon,
      color: 'bg-gray-500'
    }
  ]

  return (
    <div className={className}>
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
        <p className="mt-1 text-sm text-gray-500">
          Get started with these common tasks
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => (
          <QuickAction
            key={action.title}
            title={action.title}
            description={action.description}
            href={action.href}
            icon={action.icon}
            color={action.color}
          />
        ))}
      </div>
    </div>
  )
}