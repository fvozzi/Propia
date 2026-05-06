import { useEffect } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import type { LoginResponse } from '../types';

export function AuthCallbackPage() {
  const { completeGoogleLogin, isAuthenticated } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const userRaw = searchParams.get('user');

    if (!token || !userRaw) {
      navigate('/login', { replace: true });
      return;
    }

    try {
      const user = JSON.parse(userRaw) as LoginResponse['user'];
      completeGoogleLogin({
        accessToken: token,
        user,
      });
      navigate('/', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  }, [completeGoogleLogin, navigate, searchParams]);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <p>{t('common.loading')}</p>;
}
