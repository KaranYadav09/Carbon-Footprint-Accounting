import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import api from '../api';

export const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        try {
            const res = await api.post('/api/forgot-password', { email });
            setMessage({ type: 'success', text: res.data.message });
        } catch (error: any) {
            setMessage({ 
                type: 'error', 
                text: error.response?.data?.error || "Something went wrong. Please try again." 
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
            fontFamily: "'Outfit', sans-serif"
        }}>
            <div style={{
                background: 'white',
                padding: '40px',
                borderRadius: '24px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                width: '100%',
                maxWidth: '400px',
                textAlign: 'center'
            }}>
                <button 
                    onClick={() => navigate('/login')}
                    style={{
                        background: '#f8fafc',
                        border: 'none',
                        padding: '10px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '24px',
                        fontSize: '14px',
                        fontWeight: 600
                    }}
                >
                    <ArrowLeft size={16} /> Back to Login
                </button>

                <div style={{
                    background: '#d1fae5',
                    color: '#10b981',
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px auto'
                }}>
                    <Mail size={24} />
                </div>

                <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                    Forgot Password?
                </h2 >
                <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '32px' }}>
                    Enter your email address and we'll send you a link to reset your password.
                </p>

                {message && (
                    <div style={{
                        padding: '12px',
                        borderRadius: '12px',
                        marginBottom: '24px',
                        fontSize: '14px',
                        fontWeight: 500,
                        background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
                        color: message.type === 'success' ? '#065f46' : '#991b1b',
                        border: `1px solid ${message.type === 'success' ? '#10b981' : '#f87171'}33`
                    }}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                            Email Address
                        </label>
                        <input 
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@email.com"
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                fontSize: '15px',
                                boxSizing: 'border-box',
                                transition: 'all 0.2s'
                            }}
                        />
                    </div>

                    <button 
                        type="submit"
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '14px',
                            fontWeight: 700,
                            fontSize: '16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)',
                            opacity: isLoading ? 0.7 : 1
                        }}
                    >
                        {isLoading ? "Sending..." : "Send Reset Link"} <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
};
