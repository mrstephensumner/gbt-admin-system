import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { Users, Tags, ShieldCheck, FileUp, LayoutDashboard, Inbox, CalendarCheck, Building2, Receipt, Globe, LayoutGrid, Sparkles } from 'lucide-react'
import { NavItem, NavGroup } from '../components'
import { useCan, useOperator } from '../lib/operator'
import { NoAccessScreen } from './no-access'

export function Root() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { operator, notRegistered, loading } = useOperator()
  const canImport = useCan('import_roster')
  const canNetwork = useCan('network')
  // Network is an expandable section (Sites + Topics, and per-site admin as we build them).
  const networkActive = pathname.startsWith('/network') || pathname.startsWith('/topics')
  const [networkOpen, setNetworkOpen] = useState(true)
  // Auto-open the section when navigating into it, while still letting the operator collapse it
  // manually — the "adjust state during render" pattern, keyed on the section becoming active.
  const [wasNetworkActive, setWasNetworkActive] = useState(networkActive)
  if (networkActive !== wasNetworkActive) {
    setWasNetworkActive(networkActive)
    if (networkActive) setNetworkOpen(true)
  }

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
          <NavGroup
            icon={<Globe size={18} />}
            label="Network"
            open={networkOpen}
            onToggle={() => setNetworkOpen((o) => !o)}
          >
            {canNetwork && (
              <NavItem
                icon={<LayoutGrid size={16} />}
                label="Sites"
                active={pathname.startsWith('/network')}
                onClick={() => navigate('/network')}
              />
            )}
            <NavItem
              icon={<Tags size={16} />}
              label="Topics"
              active={pathname.startsWith('/topics')}
              onClick={() => navigate('/topics')}
            />
          </NavGroup>
          <NavItem
            icon={<Inbox size={18} />}
            label="Enquiries"
            badge="Soon"
            active={pathname.startsWith('/enquiries')}
            onClick={() => navigate('/enquiries')}
          />
          <NavItem
            icon={<CalendarCheck size={18} />}
            label="Bookings"
            badge="Soon"
            active={pathname.startsWith('/bookings')}
            onClick={() => navigate('/bookings')}
          />
          <NavItem
            icon={<Building2 size={18} />}
            label="Clients"
            badge="Soon"
            active={pathname.startsWith('/clients')}
            onClick={() => navigate('/clients')}
          />
          <NavItem
            icon={<Receipt size={18} />}
            label="Invoices"
            badge="Soon"
            active={pathname.startsWith('/invoices')}
            onClick={() => navigate('/invoices')}
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
          {operator?.role === 'owner' && (
            <NavItem
              icon={<Sparkles size={18} />}
              label="AI settings"
              active={pathname.startsWith('/settings/enrichment')}
              onClick={() => navigate('/settings/enrichment')}
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
