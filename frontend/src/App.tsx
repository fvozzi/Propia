import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AdminRoute } from './components/AdminRoute';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './lib/auth';
import { I18nProvider } from './lib/i18n';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { ActivitiesCreatePage } from './pages/ActivitiesCreatePage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { CalendarPage } from './pages/CalendarPage';
import { ContactCreatePage } from './pages/ContactCreatePage';
import { ContactDetailPage } from './pages/ContactDetailPage';
import { ContactsPage } from './pages/ContactsPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { PropertiesCreatePage } from './pages/PropertiesCreatePage';
import { PropertiesPage } from './pages/PropertiesPage';
import { PropertyDetailPage } from './pages/PropertyDetailPage';
import { SearchRequirementCreatePage } from './pages/SearchRequirementCreatePage';
import { SearchRequirementsPage } from './pages/SearchRequirementsPage';
import { UsersPage } from './pages/UsersPage';
import { VisitsPage } from './pages/VisitsPage';

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/contacts" element={<ContactsPage />} />
                <Route path="/contacts/new" element={<ContactCreatePage />} />
                <Route path="/contacts/:id" element={<ContactDetailPage />} />
                <Route path="/properties" element={<PropertiesPage />} />
                <Route path="/properties/new" element={<PropertiesCreatePage />} />
                <Route path="/properties/:id" element={<PropertyDetailPage />} />
                <Route path="/requirements" element={<SearchRequirementsPage />} />
                <Route path="/requirements/new" element={<SearchRequirementCreatePage />} />
                <Route path="/activities" element={<ActivitiesPage />} />
                <Route path="/activities/new" element={<ActivitiesCreatePage />} />
                <Route path="/activities/:id/edit" element={<ActivitiesCreatePage />} />
                <Route path="/visits" element={<VisitsPage />} />
                <Route element={<AdminRoute />}>
                  <Route path="/users" element={<UsersPage />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  );
}
