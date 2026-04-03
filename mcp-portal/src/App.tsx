import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Pricing from './pages/Pricing';
import Docs from './pages/Docs';
import Apply from './pages/Apply';
import Console from './pages/console/Dashboard';
import Usage from './pages/console/Usage';
import Sandbox from './pages/console/Sandbox';
import QuickStart from './pages/console/QuickStart';
import Business from './pages/console/Business';
import Billing from './pages/console/Billing';
import PublicLayout from './layouts/PublicLayout';
import ConsoleLayout from './layouts/ConsoleLayout';
import AdminLayout from './layouts/AdminLayout';
import AdminApps from './pages/admin/Apps';
import AdminStats from './pages/admin/Stats';
import AdminPricing from './pages/admin/Pricing';

export default function App() {
    return (
        <Routes>
            <Route element={<PublicLayout />}>
                <Route path="/" element={<Landing />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/docs" element={<Docs />} />
                <Route path="/apply" element={<Apply />} />
            </Route>
            <Route path="/console" element={<ConsoleLayout />}>
                <Route index element={<Console />} />
                <Route path="usage" element={<Usage />} />
                <Route path="sandbox" element={<Sandbox />} />
                <Route path="quickstart" element={<QuickStart />} />
                <Route path="business" element={<Business />} />
                <Route path="billing" element={<Billing />} />
            </Route>
            <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminApps />} />
                <Route path="stats" element={<AdminStats />} />
                <Route path="pricing" element={<AdminPricing />} />
            </Route>
        </Routes>
    );
}
