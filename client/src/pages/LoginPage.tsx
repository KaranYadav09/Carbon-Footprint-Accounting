import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css'; // We will create a new CSS file for the new design
import { FiUser, FiLock, FiLogIn } from 'react-icons/fi'; // Icons for the form

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        login(data.access_token);
        navigate('/dashboard');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Invalid credentials.');
      }
    } catch (err) {
      setError('Could not connect to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-panel">
        {/* Left side with the form */}
        <div className="login-form-section">
          <div className="form-content">
            <Link to="/" className="logo-link">
              <span role="img" aria-label="leaf"></span>
              <h1>Welcome to EcoTrace</h1>
            </Link>
            <p className="subtitle">Log in to track your carbon footprint.</p>
            
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <FiUser className="input-icon" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  required
                  autoComplete="username"
                />
              </div>
              <div className="input-group">
                <FiLock className="input-icon" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  autoComplete="current-password"
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px', fontSize: '13px' }}>
                <Link to="/forgot-password" style={{ color: '#10b981', fontWeight: 600, textDecoration: 'none' }}>Forgot Password?</Link>
              </div>
              
              {error && <p className="error-message">{error}</p>}
              
              <button type="submit" className="login-btn" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login'}
                <FiLogIn />
              </button>
            </form>
            
            <p className="auth-switch">
              Don't have an account? <Link to="/register">Sign up</Link>
            </p>
          </div>
        </div>

        {/* Right side with a decorative panel (visible on larger screens) */}
        <div className="decorative-section">
          <h2>Measure. Monitor. Mobilize.</h2>
          <p>Join our community and help create a greener campus for a sustainable future.</p>
        </div>
      </div>
    </div>
  );
};