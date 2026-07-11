import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import logo from '../assests/logoTransparente.png';
import { useAuth } from '../lib/auth';
import { APP_BUILD, APP_VERSION } from '../lib/build-info';
import { useI18n } from '../lib/i18n';

export function Layout() {
  const { user, logout, switchTeam } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const links = [
    { to: '/', label: t('nav.dashboard') },
    { to: '/calendar', label: t('nav.calendar') },
    { to: '/contacts', label: t('nav.contacts') },
    { to: '/documents', label: t('nav.documents') },
    { to: '/finances', label: t('nav.finances') },
    { to: '/opportunities', label: t('nav.commercialOpportunities') },
    { to: '/properties', label: t('nav.properties') },
    { to: '/map', label: t('nav.map') },
    { to: '/appraisals', label: t('nav.appraisals') },
    { to: '/requirements', label: t('nav.requirements') },
    { to: '/activities', label: t('nav.activities') },
    { to: '/visits', label: t('nav.visits') },
    { to: '/use-cases', label: t('nav.useCases') },
    { to: '/settings', label: t('nav.settings') },
    ...(user?.appRole === 'ADMIN' && user.backofficeAccess
      ? [{ to: '/backoffice', label: 'Backoffice' }]
      : []),
    ...(user?.appRole === 'ADMIN' ? [{ to: '/users', label: t('nav.users') }] : []),
  ];

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  async function handleTeamChange(teamId: number) {
    if (teamId === user?.activeTeamId) {
      return;
    }

    await switchTeam(teamId);
    window.location.reload();
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
        <div>
          <img src={logo} alt="Propia" className="brand-logo" />
          <p className="eyebrow">Propia</p>
          <h1>{t('layout.title')}</h1>
          <p className="muted">{t('layout.subtitle')}</p>
        </div>
        <nav className="nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {link.label}
            </NavLink>
          ))}
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
        <Outlet />
      </main>
    </div>
  );
}
