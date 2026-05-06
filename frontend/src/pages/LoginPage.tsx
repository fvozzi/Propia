import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { getGoogleAuthUrl, isGoogleAuthEnabled } from '../lib/api';
import { useI18n } from '../lib/i18n';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const googleAuthEnabled = isGoogleAuthEnabled();
  const [email, setEmail] = useState('agent@propia.local');
  const [password, setPassword] = useState('propia123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
    } catch {
      setError(t('login.error'));
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleLogin() {
    window.location.href = getGoogleAuthUrl();
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <p className="eyebrow">Propia</p>
        <h1>{t('login.title')}</h1>
        <p className="muted">{t('login.subtitle')}</p>
        <label className="full-span">
          {t('common.language')}
          <select value={locale} onChange={(event) => setLocale(event.target.value as 'en' | 'es')}>
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </label>
        {googleAuthEnabled ? (
          <>
            <button type="button" className="google-button" onClick={handleGoogleLogin}>
              {t('login.google')}
            </button>
            <div className="login-divider">
              <span>{t('login.or')}</span>
            </div>
          </>
        ) : null}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            {t('common.email')}
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            {t('common.password')}
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <div className="alert">{error}</div> : null}
          <button type="submit" disabled={loading}>
            {loading ? t('login.submitting') : t('login.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
