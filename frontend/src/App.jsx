import { Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import AppointmentsPage from './pages/AppointmentsPage';
import EmployeesPage from './pages/EmployeesPage';
import InventoryPage from './pages/InventoryPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AdvancedAnalytics from './pages/AdvancedAnalytics';
import Customer from './pages/Customer';
import AdminAuth from './pages/AdminAuth';

function App() {
  return (
    <Routes>
      {/* Customer-facing (no sidebar) */}
      <Route path="/" element={<Customer />} />
      <Route path="/admin/login" element={<AdminAuth mode="login" />} />
      <Route path="/admin/register" element={<AdminAuth mode="register" />} />

      {/* Dashboard (with sidebar layout) */}
      <Route path="/admin" element={<DashboardLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="advanced-analytics" element={<AdvancedAnalytics />} />
      </Route>
    </Routes>
  );
}

export default App;
