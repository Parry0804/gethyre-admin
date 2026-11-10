import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { Layout } from '@/components/Layout';
import Login from '@/pages/Login';

const Overview = lazy(() => import('@/pages/Overview'));
const Users = lazy(() => import('@/pages/Users'));
const UserProfile = lazy(() => import('@/pages/UserProfile'));
const Resumes = lazy(() => import('@/pages/Resumes'));
const Interviews = lazy(() => import('@/pages/Interviews'));
const InterviewDetail = lazy(() => import('@/pages/InterviewDetail'));
const Payments = lazy(() => import('@/pages/Payments'));
const Limits = lazy(() => import('@/pages/Limits'));
const Exports = lazy(() => import('@/pages/Exports'));

function Protected() {
  const { admin, checking } = useAuth();
  if (checking) return <div className="grid min-h-screen place-items-center text-sm text-ink-3">Loading…</div>;
  return admin ? <Layout /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-ink-3">Loading…</div>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Protected />}>
          <Route index element={<Overview />} />
          <Route path="users" element={<Users />} />
          <Route path="users/:id" element={<UserProfile />} />
          <Route path="resumes" element={<Resumes />} />
          <Route path="interviews" element={<Interviews />} />
          <Route path="interviews/:id" element={<InterviewDetail />} />
          <Route path="payments" element={<Payments />} />
          <Route path="limits" element={<Limits />} />
          <Route path="exports" element={<Exports />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
