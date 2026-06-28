// In client/src/components/NavBar.tsx

import React from 'react';
import { Link, NavLink } from 'react-router-dom';

export const NavBar: React.FC = () => {
  return (
    <header className="app-header">
      <Link to="/" className="logo-link">
        <h1>🌿 EcoTrace</h1>
      </Link>
      <nav className="navbar">
        <NavLink to="/" className="nav-link" end>
          Home
        </NavLink>
        {/* You can add an "About" or "Features" link here if you want */}
        {/* <a href="/#features" className="nav-link">Features</a> */}
        <Link to="/login" className="btn btn-nav">Login</Link>
      </nav>
    </header>
  );
};