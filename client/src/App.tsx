// import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Page Imports
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { RegistrationPendingPage } from './pages/RegistrationPendingPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { AdminDashboard } from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';
import { UploadPage } from './pages/UploadPage';
import { ReportsPage } from './pages/ReportsPage';
import ManualEntryPage from "./pages/ManualEntryPage";
import { AnalyticsDashboard } from "./pages/AnalyticsDashboard";
import { Hotspot } from "./pages/Hotspot";
import ProfilePage from './pages/ProfilePage';
import LeaderboardPage from './pages/LeaderboardPage';
import StudentManagementPage from './pages/StudentManagementPage';
import { ReviewAssignPoints } from './pages/ReviewAssignPoints';

import CommuteStep1 from './pages/CommuteStep1';
import CommuteStep2 from './pages/CommuteStep2';
import CommuteStep3 from './pages/CommuteStep3';
// GPS Pages
import CommuteActive from './pages/CommuteActive';
import CommuteSummary from './pages/CommuteSummary';
import PlantTree from './pages/PlantTree';
import Events from './pages/Events';
import EventSubmissionPage from './pages/EventSubmissionPage';
import { HistoryPage } from './pages/HistoryPage';
import { AdminHistoryPage } from './pages/AdminHistoryPage';

// Layout Imports
import { StudentDashboardLayout } from './components/DashboardLayout/StudentDashboardLayout';
import { AdminDashboardLayout } from './components/DashboardLayout/AdminDashboardLayout';

import { ChallengesPage } from './pages/ChallengesPage';
import { StudentAnalytics } from './pages/StudentAnalytics';

// Protect routes
const PrivateRoutes = () => {
  const { token, isLoading } = useAuth();
  if (isLoading) return <div>Loading session...</div>;
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

// Decide dashboard type
const DashboardHomePage = () => {
  const { decodedToken } = useAuth();
  const Layout = decodedToken?.role === 'admin' ? AdminDashboardLayout : StudentDashboardLayout;
  const MainDashboard = decodedToken?.role === 'admin' ? AdminDashboard : StudentDashboard;

  return <Layout><MainDashboard /></Layout>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/registration-pending" element={<RegistrationPendingPage />} />

        {/* --- Protected Routes --- */}
        <Route element={<PrivateRoutes />}>
          <Route path="/dashboard" element={<DashboardHomePage />} />

          {/* Student Routes */}
          <Route path="/dashboard/challenges" element={<StudentDashboardLayout><ChallengesPage /></StudentDashboardLayout>} />
          <Route path="/dashboard/student-analytics" element={<StudentDashboardLayout><StudentAnalytics /></StudentDashboardLayout>} />
          <Route path="/dashboard/leaderboard" element={<StudentDashboardLayout><LeaderboardPage /></StudentDashboardLayout>} />
          <Route path="/dashboard/profile" element={<StudentDashboardLayout><ProfilePage /></StudentDashboardLayout>} />

          {/* 🌍 ECO COMMUTE FLOW */}
          <Route path="/dashboard/commute" element={<StudentDashboardLayout><CommuteStep1 /></StudentDashboardLayout>} />
          <Route path="/dashboard/commute/verify" element={<StudentDashboardLayout><CommuteStep2 /></StudentDashboardLayout>} />
          <Route path="/dashboard/commute/summary" element={<StudentDashboardLayout><CommuteStep3 /></StudentDashboardLayout>} />

          {/* 📍 GPS TRACKING FLOW */}
          <Route path="/dashboard/commute/track" element={<StudentDashboardLayout><CommuteActive /></StudentDashboardLayout>} />
          <Route path="/dashboard/commute/track/summary" element={<StudentDashboardLayout><CommuteSummary /></StudentDashboardLayout>} />

          {/* 🌳 TREE PLANTATION */}
          <Route path="/dashboard/plant-tree" element={<StudentDashboardLayout><PlantTree /></StudentDashboardLayout>} />

          {/* 🎉 ECO EVENTS */}
          <Route path="/dashboard/events" element={<StudentDashboardLayout><Events /></StudentDashboardLayout>} />
          <Route path="/dashboard/events/:id/submit" element={<StudentDashboardLayout><EventSubmissionPage /></StudentDashboardLayout>} />
          <Route path="/dashboard/history" element={<StudentDashboardLayout><HistoryPage /></StudentDashboardLayout>} />

          {/* Admin Routes */}
          <Route path="/dashboard/upload" element={<AdminDashboardLayout><UploadPage /></AdminDashboardLayout>} />
          <Route path="/dashboard/reports" element={<AdminDashboardLayout><ReportsPage /></AdminDashboardLayout>} />
          <Route path="/dashboard/manual-entry" element={<AdminDashboardLayout><ManualEntryPage /></AdminDashboardLayout>} />
          <Route path="/dashboard/analytics" element={<AdminDashboardLayout><AnalyticsDashboard /></AdminDashboardLayout>} />
          <Route path="/dashboard/hotspots" element={<AdminDashboardLayout><Hotspot /></AdminDashboardLayout>} />
          <Route path="/dashboard/hotspots" element={<AdminDashboardLayout><Hotspot /></AdminDashboardLayout>} />
          <Route path="/admin/students" element={<AdminDashboardLayout><StudentManagementPage /></AdminDashboardLayout>} />
          <Route path="/admin/reviews" element={<AdminDashboardLayout><ReviewAssignPoints /></AdminDashboardLayout>} />

          <Route path="/admin/history" element={<AdminDashboardLayout><AdminHistoryPage /></AdminDashboardLayout>} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
