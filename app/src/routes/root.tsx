import { Outlet, useLocation, useNavigate } from 'react-router'
import { Users, Tags, ShieldCheck, FileUp, LayoutDashboard } from 'lucide-react'
import { NavItem } from '../components'
import { useCan, useOperator } from '../lib/operator'
import { NoAccessScreen } from './no-access'

export function Root() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { operator, notRegistered, loading } = useOperator()
  const canImport = useCan('import_roster')

  if (notRegistered) return <NoAccessScreen />
  if (loading) return null

  return (
    <div className="gb-shell">
      <aside className="gb-sidebar">
        <div className="gb-sidebar__logo">
          <img src="/GBS-LOGO-dark.png" alt="Great British Talent" />
        </div>
        <nav className="gb-sidebar__nav">
          <NavItem
            icon={<LayoutDashboard size={18} />}
            label="Dashboard"
            active={pathname === '/'}
            onClick={() => navigate('/')}
          />
          <NavItem
            icon={<Users size={18} />}
            label="Speakers"
            active={pathname.startsWith('/speakers') || pathname.startsWith('/talent')}
            onClick={() => navigate('/speakers')}
          />
          <NavItem
            icon={<Tags size={18} />}
            label="Topics"
            active={pathname.startsWith('/topics')}
            onClick={() => navigate('/topics')}
          />
          {canImport && (
            <NavItem
              icon={<FileUp size={18} />}
              label="Import"
              active={pathname.startsWith('/import')}
              onClick={() => navigate('/import')}
            />
          )}
          {operator?.role === 'owner' && (
            <NavItem
              icon={<ShieldCheck size={18} />}
              label="Team"
              active={pathname.startsWith('/team')}
              onClick={() => navigate('/team')}
            />
          )}
        </nav>
        <div className="gb-sidebar__footer">GBT Admin — internal</div>
      </aside>
      <div className="gb-main">
        <header className="gb-topbar">
          <div className="gb-topbar__title">Talent management</div>
          <div className="gb-topbar__spacer" />
          <div className="gb-topbar__operator" data-testid="operator-email">
            {operator ? `${operator.email}${operator.role === 'owner' ? ' · owner' : ''}` : ''}
          </div>
        </header>
        <main className="gb-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
