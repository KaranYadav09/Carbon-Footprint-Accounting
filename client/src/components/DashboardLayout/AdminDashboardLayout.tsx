import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './DashboardLayout.css';
import { FiGrid, FiBarChart2, FiUpload, FiLogOut, FiEdit, FiAlertTriangle, FiUsers, FiMenu, FiX } from "react-icons/fi";
import { Leaf, Sprout } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export const AdminDashboardLayout: React.FC<LayoutProps> = ({ children }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isExcludedPage = location.pathname === '/admin/students' || location.pathname === '/admin/reviews';

  return (
    <div className="dashboard-layout">
      {/* Mobile Toggle Button */}
      <button 
        className="mobile-sidebar-toggle" 
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          position: 'fixed',
          top: '15px',
          left: '15px',
          zIndex: 1100,
          background: '#10b981',
          color: 'white',
          border: 'none',
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          display: 'none', // Controlled by CSS @media
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
          cursor: 'pointer'
        }}
      >
        {sidebarOpen ? <FiX /> : <FiMenu />}
      </button>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(2px)',
            zIndex: 999
          }}
        />
      )}

      <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo-container">
            <Leaf className="sidebar-logo-icon" size={24} />
          </div>
          <h1>EcoTrace</h1>
        </div>

        <ul className="nav-links" style={{ marginTop: '20px' }}>
          {/* Dashboard */}
          <li>
            <NavLink to="/dashboard" className="nav-link" end>
              <FiGrid className="nav-icon" /><span>Dashboard</span><div className="active-dot"></div>
            </NavLink>
          </li>

          {/* Upload Data */}
          <li>
            <NavLink to="/dashboard/upload" className="nav-link">
              <FiUpload className="nav-icon" /><span>Smart Upload</span><div className="active-dot"></div>
            </NavLink>
          </li>

          {/* Manual Entry */}
          <li>
            <NavLink to="/dashboard/manual-entry" className="nav-link">
              <FiEdit className="nav-icon" /><span>Manual Entry</span><div className="active-dot"></div>
            </NavLink>
          </li>

          {/* Analytics */}
          <li>
            <NavLink to="/dashboard/analytics" className="nav-link">
              <FiBarChart2 className="nav-icon" /><span>Analytics</span><div className="active-dot"></div>
            </NavLink>
          </li>

          {/* Hotspots */}
          <li>
            <NavLink to="/dashboard/hotspots" className="nav-link">
              <FiAlertTriangle className="nav-icon" /><span>Hotspots</span><div className="active-dot"></div>
            </NavLink>
          </li>

          {/* Reports */}
          <li>
            <NavLink to="/dashboard/reports" className="nav-link">
              <FiBarChart2 className="nav-icon" /><span>Reports</span><div className="active-dot"></div>
            </NavLink>
          </li>

          {/* Student Activities Section */}
          <li className="sidebar-section-title" style={{ paddingLeft: '1rem', paddingTop: '1.5rem', paddingBottom: '0.5rem' }}>
            STUDENT ACTIVITIES
          </li>

          <li>
            <NavLink to="/admin/students" className="nav-link">
              <FiUsers className="nav-icon" /><span>Student Management</span><div className="active-dot"></div>
            </NavLink>
          </li>

          <li>
            <NavLink to="/admin/reviews" className="nav-link">
              <FiEdit className="nav-icon" /><span>Review & Assign</span><div className="active-dot"></div>
            </NavLink>
          </li>
        </ul>

        <div className="sidebar-footer">
          {deferredPrompt && (
            <button 
              onClick={handleInstallClick} 
              className="nav-link install-btn"
              style={{
                width: '100%',
                background: '#10b981',
                color: 'white',
                border: 'none',
                padding: '10px',
                borderRadius: '12px',
                marginBottom: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: '600',
                justifyContent: 'center'
              }}
            >
              <Sprout size={18} /> Install App
            </button>
          )}
          <button onClick={handleLogout} className="nav-link logout-btn">
            <FiLogOut className="nav-icon" /><span>Logout</span>
          </button>
        </div>
      </nav>

      <main className={`main-content ${isExcludedPage ? 'white-bg' : 'light-mint-bg'}`}>
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="mobile-bottom-nav">
        <NavLink to="/dashboard" className="bottom-nav-item" end>
          <FiGrid size={22} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/dashboard/upload" className="bottom-nav-item">
          <FiUpload size={22} />
          <span>Upload</span>
        </NavLink>
        <NavLink to="/dashboard/analytics" className="bottom-nav-item">
          <FiBarChart2 size={22} />
          <span>Analytics</span>
        </NavLink>
        <button className="bottom-nav-item" onClick={() => setSidebarOpen(true)}>
          <FiMenu size={22} />
          <span>More</span>
        </button>
      </div>
    </div>
  );
};
