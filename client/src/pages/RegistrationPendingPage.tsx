
import React from 'react';
import { Link } from 'react-router-dom';
import './LoginPage.css'; // Reusing login styles for consistency
import { FiClock, FiCheckCircle } from 'react-icons/fi';

export const RegistrationPendingPage: React.FC = () => {
    return (
        <div className="login-page-container">
            <div className="login-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <div className="login-form-section" style={{ width: '100%' }}>
                    <div className="form-content" style={{ textAlign: 'center', padding: '40px' }}>

                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                            <div style={{
                                width: '80px', height: '80px', borderRadius: '50%',
                                background: '#ecfdf5', color: '#10b981',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <FiCheckCircle size={48} />
                            </div>
                        </div>

                        <h1 style={{ marginBottom: '16px', color: '#111827' }}>Registration Successful!</h1>

                        <div style={{
                            background: '#fff7ed', border: '1px solid #ffedd5',
                            borderRadius: '12px', padding: '24px', margin: '24px 0',
                            textAlign: 'left'
                        }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <FiClock style={{ color: '#f59e0b', marginTop: '4px', flexShrink: 0 }} size={24} />
                                <div>
                                    <h3 style={{ margin: '0 0 8px 0', color: '#9a3412', fontSize: '1.1rem' }}>Awaiting Admin Approval</h3>
                                    <p style={{ margin: 0, color: '#9a3412', lineHeight: '1.5' }}>
                                        Your account has been created and is currently pending verification.
                                        An administrator needs to review and approve your registration before you can log in.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <p style={{ color: '#6b7280', marginBottom: '32px' }}>
                            Please check back later. You will be able to log in once your account status is updated.
                        </p>

                        <Link to="/" className="login-btn" style={{ textDecoration: 'none', display: 'inline-flex', justifyContent: 'center' }}>
                            Back to Home
                        </Link>

                        <div style={{ marginTop: '20px' }}>
                            <Link to="/login" style={{ color: '#10b981', fontWeight: 600 }}>
                                Already approved? Log in here
                            </Link>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};
