// In client/src/components/Layout.tsx

import React from 'react';
import { Outlet } from 'react-router-dom';
import { NavBar } from './Navbar'

export const Layout: React.FC = () => {
  return (
    <div className="App">
      <NavBar />
      <main>
        <Outlet /> 
      </main>
    </div>
  );
};