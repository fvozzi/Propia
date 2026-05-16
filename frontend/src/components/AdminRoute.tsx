import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function AdminRoute() {
  const { user } = useAuth();
  return user?.appRole === 'ADMIN' ? <Outlet /> : <Navigate to="/" replace />;
}
