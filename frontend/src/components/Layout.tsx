import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';

export function Layout() {
  const { user, logout } = useAuth();
  const { locale, setLocale, t } = useI18n();

  const links = [
    { to: '/', label: t('nav.dashboard') },
    { to: '/calendar', label: t('nav.calendar') },
    { to: '/contacts', label: t('nav.contacts') },
    { to: '/properties', label: t('nav.properties') },
    { to: '/requirements', label: t('nav.requirements') },
    { to: '/activities', label: t('nav.activities') },
    { to: '/visits', label: t('nav.visits') },
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">InmoFlow</p>
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
          <div>
            <strong>{user?.name}</strong>
            <p className="muted">{user?.email}</p>
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
