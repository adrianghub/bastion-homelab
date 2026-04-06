import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ScrollText, DatabaseBackup, CalendarClock, Zap, LogOut, Server } from 'lucide-react'
import { clearToken } from '../api/client'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/logs', icon: ScrollText, label: 'Logs' },
  { to: '/backup', icon: DatabaseBackup, label: 'Backup' },
  { to: '/automation', icon: CalendarClock, label: 'Automation' },
  { to: '/actions', icon: Zap, label: 'Actions' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()

  function handleLogout() {
    clearToken()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bastion-bg)' }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col w-56 shrink-0 border-r"
        style={{ background: 'var(--color-bastion-surface)', borderColor: 'var(--color-bastion-border)' }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2 px-4 py-4 border-b"
          style={{ borderColor: 'var(--color-bastion-border)' }}
        >
          <Server size={18} style={{ color: 'var(--color-bastion-accent)' }} />
          <span className="font-semibold text-sm tracking-wide" style={{ color: 'var(--color-bastion-text)' }}>
            bastion
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--color-bastion-border)', color: 'var(--color-bastion-muted)' }}>
            Pi 5
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'font-medium'
                    : 'hover:opacity-80'
                }`
              }
              style={({ isActive }) => ({
                background: isActive ? 'rgba(88,166,255,0.1)' : 'transparent',
                color: isActive ? 'var(--color-bastion-accent)' : 'var(--color-bastion-muted)',
              })}
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-2 pb-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm transition-colors hover:opacity-80"
            style={{ color: 'var(--color-bastion-muted)' }}
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
