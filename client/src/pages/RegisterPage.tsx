import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api'; // Using our configured api instance
import './LoginPage.css'; // We can reuse the same CSS file from the login page
import { FiUser, FiLock, FiArrowRight, FiMail, FiMapPin, FiPhone } from 'react-icons/fi';

export const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      await api.post('/api/register', {
        username,
        password,
        name,
        email,
        student_id: studentId,
        department,
        phone_number: phoneNumber
      });
      setMessage('Registration successful! Redirecting...');
      // Wait for 1.5 seconds before redirecting
      setTimeout(() => {
        navigate('/registration-pending');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try a different username.');
      setIsLoading(false); // Stop loading on error
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-panel">
        {/* Left side with the registration form */}
        <div className="login-form-section">
          <div className="form-content">
            <Link to="/" className="logo-link">
              <span role="img" aria-label="leaf"></span>
              <h1>Create an Account</h1>
            </Link>
            <p className="subtitle">Join EcoTrace and start making a difference today.</p>

            <form onSubmit={handleRegister}>
              <div className="input-group">
                <FiUser className="input-icon" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  required
                  autoComplete="username"
                />
              </div>
              <div className="input-group">
                <FiUser className="input-icon" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  autoComplete="name"
                />
              </div>
              <div className="input-group">
                <FiUser className="input-icon" />
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="Student ID"
                  autoComplete="off"
                />
              </div>
              <div className="input-group">
                <FiMapPin className="input-icon" />
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Department"
                  autoComplete="organization"
                />
              </div>
              <div className="input-group">
                <FiMail className="input-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  autoComplete="email"
                />
              </div>
              <div className="input-group">
                <FiPhone className="input-icon" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Phone number"
                  autoComplete="tel"
                />
              </div>
              <div className="input-group">
                <FiLock className="input-icon" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                  autoComplete="new-password"
                />
              </div>

              {error && <p className="error-message">{error}</p>}
              {message && <p className="success-message">{message}</p>}

              <button type="submit" className="login-btn" disabled={isLoading}>
                {isLoading ? 'Creating account...' : 'Register'}
                <FiArrowRight />
              </button>
            </form>

            <p className="auth-switch">
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </div>
        </div>

        {/* Right side with a decorative panel */}
        <div className="decorative-section">
          <h2>Your Journey to Sustainability Starts Here.</h2>
          <p>Track your impact, join challenges, and be a part of the solution.</p>
        </div>
      </div>
    </div>
  );
};