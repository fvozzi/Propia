import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import logo from '../assests/logoTransparente.png';
import { useAuth } from '../lib/auth';
import { APP_BUILD, APP_VERSION } from '../lib/build-info';
import { useI18n } from '../lib/i18n';

type NavItem = {
  to: string;
  label: string;
};

type NavGroup = {
  id: string;
  label: string;
  links: NavItem[];
};

export function Layout() {
  const { user, logout, switchTeam, isImpersonating, exitImpersonation } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const primaryLinks: NavItem[] = [
    { to: '/', label: t('nav.dashboard') },
    { to: '/calendar', label: t('nav.calendar') },
  ];

  const groupedLinks: NavGroup[] = [
    {
      id: 'commercial',
      label: t('navGroups.commercial'),
      links: [
        { to: '/contacts', label: t('nav.contacts') },
        { to: '/opportunities', label: t('nav.commercialOpportunities') },
        { to: '/activities', label: t('nav.activities') },
        { to: '/visits', label: t('nav.visits') },
      ],
    },
    {
      id: 'capture',
      label: t('navGroups.capture'),
      links: [
        { to: '/properties', label: t('nav.properties') },
        { to: '/map', label: t('nav.map') },
        { to: '/appraisals', label: t('nav.appraisals') },
        { to: '/requirements', label: t('nav.requirements') },
      ],
    },
    {
      id: 'operations',
      label: t('navGroups.operations'),
      links: [
        { to: '/documents', label: t('nav.documents') },
        { to: '/finances', label: t('nav.finances') },
      ],
    },
    {
      id: 'system',
      label: t('navGroups.system'),
      links: [
        { to: '/use-cases', label: t('nav.useCases') },
        { to: '/settings', label: t('nav.settings') },
        ...(user?.appRole === 'ADMIN'
          ? [{ to: '/users', label: t('nav.users') }]
          : []),
        ...(user?.appRole === 'ADMIN' && user.backofficeAccess
          ? [{ to: '/backoffice', label: 'Backoffice' }]
          : []),
      ],
    },
  ].filter((group) => group.links.length > 0);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    buildInitialOpenGroups(groupedLinks, location.pathname),
  );

  useEffect(() => {
    setMobileMenuOpen(false);
    setOpenGroups((current) =>
      ensureActiveGroupOpen(current, groupedLinks, location.pathname),
    );
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem('propia.sidebar.groups', JSON.stringify(openGroups));
  }, [openGroups]);

  async function handleTeamChange(teamId: number) {
    if (teamId === user?.activeTeamId) {
      return;
    }

    await switchTeam(teamId);
    window.location.reload();
  }

  function toggleGroup(groupId: string) {
    setOpenGroups((current) => {
      const nextOpen = !current[groupId];

      if (window.matchMedia('(max-width: 960px)').matches && nextOpen) {
        return Object.fromEntries(
          Object.keys(current).map((key) => [key, key === groupId]),
        );
      }

      return {
        ...current,
        [groupId]: nextOpen,
      };
    });
  }

  return (
    <div className={mobileMenuOpen ? 'shell mobile-menu-open' : 'shell'}>
      <button
        type="button"
        className="mobile-nav-toggle"
        aria-expanded={mobileMenuOpen}
        aria-controls="app-sidebar"
        onClick={() => setMobileMenuOpen(true)}
      >
        Menu
      </button>
      {mobileMenuOpen ? (
        <button
          type="button"
          className="mobile-nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileMenuOpen(false)}
        />
      ) : null}
      <aside
        id="app-sidebar"
        className={mobileMenuOpen ? 'sidebar sidebar-open' : 'sidebar'}
      >
        <div className="sidebar-mobile-header">
          <strong>Menu</strong>
          <button
            type="button"
            className="ghost-button sidebar-close"
            onClick={() => setMobileMenuOpen(false)}
          >
            Cerrar
          </button>
        </div>
        <div className="sidebar-brand">
          <img src={logo} alt="Propia" className="brand-logo" />
        </div>
        <nav className="nav">
          <div className="nav-primary-links">
            {primaryLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          {groupedLinks.map((group) => {
            const isOpen = openGroups[group.id];
            const hasActiveChild = group.links.some((link) =>
              isRouteActive(location.pathname, link.to),
            );

            return (
              <section
                key={group.id}
                className={hasActiveChild ? 'nav-group nav-group-active' : 'nav-group'}
              >
                <button
                  type="button"
                  className="nav-group-toggle"
                  aria-expanded={isOpen}
                  onClick={() => toggleGroup(group.id)}
                >
                  <span className="nav-group-label">{group.label}</span>
                  <span className="nav-group-icon" aria-hidden="true">
                    {isOpen ? '−' : '+'}
                  </span>
                </button>

                {isOpen ? (
                  <div className="nav-group-links">
                    {group.links.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        end={link.to === '/'}
                        className={({ isActive }) =>
                          isActive
                            ? 'nav-link nav-link-grouped active'
                            : 'nav-link nav-link-grouped'
                        }
                      >
                        {link.label}
                      </NavLink>
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <label>
            {t('common.language')}
            <select value={locale} onChange={(event) => setLocale(event.target.value as 'en' | 'es')}>
              <option value="es">Espanol</option>
              <option value="en">English</option>
            </select>
          </label>
          {user?.teams?.length ? (
            <label>
              {t('common.team')}
              <select
                value={user.activeTeamId ?? ''}
                onChange={(event) => handleTeamChange(Number(event.target.value))}
              >
                {user.teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div>
            <strong>{user?.name}</strong>
            <p className="muted">{user?.email}</p>
          </div>
          <div>
            <p className="muted">v{APP_VERSION}</p>
            <p className="muted">build {APP_BUILD}</p>
          </div>
          <button className="ghost-button" onClick={logout}>
            {t('common.signOut')}
          </button>
        </div>
      </aside>
      <main className="content">
        {isImpersonating && user?.impersonation ? (
          <section className="card" style={{ marginBottom: '1rem' }}>
            <div className="list-item-actions">
              <div>
                <strong>Modo soporte activo</strong>
                <p className="muted">
                  Estas navegando como {user.name} ({user.email}). Sesion iniciada por{' '}
                  {user.impersonation.adminName}.
                </p>
              </div>
              <button type="button" className="ghost-button" onClick={exitImpersonation}>
                Volver a mi sesion
              </button>
            </div>
          </section>
        ) : null}
        <Outlet />
      </main>
    </div>
  );
}

function buildInitialOpenGroups(groups: NavGroup[], pathname: string) {
  const fallbackState = Object.fromEntries(groups.map((group) => [group.id, false]));

  if (typeof window === 'undefined') {
    return ensureActiveGroupOpen(fallbackState, groups, pathname);
  }

  try {
    const rawValue = window.localStorage.getItem('propia.sidebar.groups');
    if (!rawValue) {
      return ensureActiveGroupOpen(fallbackState, groups, pathname);
    }

    const parsed = JSON.parse(rawValue) as Record<string, boolean>;
    const merged = Object.fromEntries(
      groups.map((group) => [group.id, Boolean(parsed[group.id])]),
    );
    return ensureActiveGroupOpen(merged, groups, pathname);
  } catch {
    return ensureActiveGroupOpen(fallbackState, groups, pathname);
  }
}

function ensureActiveGroupOpen(
  current: Record<string, boolean>,
  groups: NavGroup[],
  pathname: string,
) {
  const activeGroup = groups.find((group) =>
    group.links.some((link) => isRouteActive(pathname, link.to)),
  );

  if (!activeGroup || current[activeGroup.id]) {
    return current;
  }

  return {
    ...current,
    [activeGroup.id]: true,
  };
}

function isRouteActive(pathname: string, to: string) {
  if (to === '/') {
    return pathname === '/';
  }

  return pathname === to || pathname.startsWith(`${to}/`);
}
