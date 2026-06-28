import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css'; 

import { FiLogIn, FiArrowRight, FiBarChart2, FiGlobe } from 'react-icons/fi';
import { Leaf } from 'lucide-react';

// Import your asset images
import heroImageUrl from '../assets/hero-illustration.png'; 
import logoUrl from '../assets/ecotrace-logo.png';

export const HomePage: React.FC = () => {
  return (
    <div className="landing-container">
      <header className="landing-header">
        <div className="logo">
            <img src={logoUrl} alt="EcoTrace Logo" className="logo-image" />
            {/* 1. ADD THIS H1 TAG FOR THE NEW TITLE */}
            <h1 className="header-title">Carbon Footprint Accounting</h1>
        </div>
        <nav className="header-actions">
          {/* Using btn-secondary for the outline style */}
          <Link to="/login" className="btn btn-secondary">
            <FiLogIn />
            <span>Login</span>
          </Link>
          {/* Using btn-primary for the solid style */}
          <Link to="/register" className="btn btn-primary">
            <span>Get Started</span>
            <FiArrowRight />
          </Link>
        </nav>
      </header>

      <main className="landing-main">
        <div className="hero-content">
          <h2 className="tagline">
            Measure,<br />
            Track &<br />
            <span className="highlight-text">
              Reduce<br />
              Carbon.
            </span>
          </h2>
          <p className="description">
            The all-in-one platform for businesses to automate carbon accounting, identify hotspots, and achieve net-zero goals effortlessly.
          </p>
          <Link to="/register" className="btn-primary btn-get-started">
            <span>Start Tracking Now</span>
            <FiArrowRight />
          </Link>
        </div>
        <div className="hero-image">
          <img src={heroImageUrl} alt="Sustainability and Data Analytics Illustration" />
        </div>
      </main>

      <section id="features" className="features-section">
        <h2>How EcoTrace Works</h2>
        <p className="features-subtitle">Simplify your sustainability journey in 3 easy steps.</p>
        <div className="features-grid">
            <div className="feature-card">
                <div className="feature-icon-wrapper">
                    <FiGlobe className="feature-icon" />
                </div>
                <h3>Zero-Click Upload</h3>
                <p>Upload invoices & bills. Our AI extracts data and calculates emissions automatically.</p>
            </div>
            <div className="feature-card">
                <div className="feature-icon-wrapper">
                    <FiBarChart2 className="feature-icon" />
                </div>
                <h3>Real-time Analytics</h3>
                <p>Track Scope 1, 2, & 3 emissions with interactive dashboards and hotspot analysis.</p>
            </div>
            <div className="feature-card">
                <div className="feature-icon-wrapper">
                    <Leaf className="feature-icon" size={26} />
                </div>
                <h3>Smart Recommendations</h3>
                <p>Get AI-driven actionable insights to reduce your carbon footprint and save costs.</p>
            </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p>&copy; {new Date().getFullYear()} EcoTrace. All Rights Reserved.</p>
      </footer>
    </div>
  );
};