import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// THE FIX IS ON THIS LINE: Import from the new file
import { AuthProvider } from './context/AuthProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* This AuthProvider is now correctly imported */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);