import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function BackofficeRoute() {
  const { user } = useAuth();
  return user?.appRole === 'ADMIN' && user.backofficeAccess ? (
    <Outlet />
  ) : (
    <Navigate to="/" replace />
  );
}
