import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { ToastProvider } from "./components/ToastProvider";
import DashboardPage from "./pages/DashboardPage";
import NotFoundPage from "./pages/NotFoundPage";

// Recharts (and the analytics dashboards built on it) is the single largest
// dependency in the bundle — most dashboard visits never open this page, so it's
// split into its own chunk instead of shipping it on every initial page load.
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));

function PageLoadingFallback() {
  return <div className="p-10 text-center text-sm text-slate-500">Loading…</div>;
}

export default function App() {
  return (
    <ToastProvider>
      <Layout>
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/links/:id/analytics" element={<AnalyticsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </Layout>
    </ToastProvider>
  );
}
