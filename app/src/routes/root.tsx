import { Outlet, useLocation, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Users, Tags } from 'lucide-react'
import { NavItem } from '../components'
import { api } from '../lib/api'

export function Root() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.get<{ email: string }>('/me') })

  return (
    <div className="gb-shell">
      <aside className="gb-sidebar">
        <div className="gb-sidebar__logo">
          <img src="/GBS-LOGO-dark.png" alt="Great British Talent" />
        </div>
        <nav className="gb-sidebar__nav">
          <NavItem
            icon={<Users size={18} />}
            label="Speakers"
            active={pathname === '/' || pathname.startsWith('/talent')}
            onClick={() => navigate('/')}
          />
          <NavItem
            icon={<Tags size={18} />}
            label="Topics"
            active={pathname.startsWith('/topics')}
            onClick={() => navigate('/topics')}
          />
        </nav>
        <div className="gb-sidebar__footer">GBT Admin — internal</div>
      </aside>
      <div className="gb-main">
        <header className="gb-topbar">
          <div className="gb-topbar__title">Talent management</div>
          <div className="gb-topbar__spacer" />
          <div className="gb-topbar__operator" data-testid="operator-email">
            {me.data?.email ?? ''}
          </div>
        </header>
        <main className="gb-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
