import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, ChevronDown, History, Trophy } from 'lucide-react';
import api from '../api';

export const ProfileDropdown: React.FC = () => {
    const { decodedToken, logout } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const toggle = () => setIsOpen(!isOpen);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const [profilePic, setProfilePic] = useState<string | null>(null);
    const [profileName, setProfileName] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                // Ideally this should be cached or in context, but ensuring fresh data for now
                const res = await api.get('/api/profile');
                if (res.data.profile_picture) {
                    setProfilePic(res.data.profile_picture);
                }
                if (res.data.name) {
                    setProfileName(res.data.name);
                } else if (res.data.username) {
                    setProfileName(res.data.username);
                }
            } catch (err) {
                console.error("Failed to fetch profile pic", err);
            }
        };
        fetchProfile();
    }, []);

    const name = profileName || decodedToken?.name || 'Student';
    const initials = name.substring(0, 2).toUpperCase();
    const email = decodedToken?.sub || 'user@example.com';

    return (
        <div style={{ position: 'relative', zIndex: 100 }} ref={dropdownRef}>
            <div
                onClick={toggle}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    background: 'white',
                    padding: '6px 12px',
                    borderRadius: '30px',
                    border: '1px solid #eee',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                }}
            >
                <div style={{
                    width: '32px', height: '32px',
                    background: '#10b981', color: 'white',
                    borderRadius: '50%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontWeight: '600', fontSize: '14px',
                    overflow: 'hidden'
                }}>
                    {profilePic ? (
                        <img src={profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        initials
                    )}
                </div>
                <span className="profile-name-text" style={{ fontWeight: 500, color: '#333', fontSize: '14px' }}>{name}</span>
                <ChevronDown size={14} color="#666" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 5px)', right: 0,
                    background: 'white',
                    minWidth: '220px',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                    border: '1px solid #f0f0f0',
                    padding: '8px',
                    animation: 'fadeIn 0.2s'
                }}>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid #f5f5f5', marginBottom: '4px' }}>
                        <p style={{ margin: 0, fontWeight: 600, color: '#333', fontSize: '14px' }}>{name}</p>
                        <p style={{ margin: 0, fontSize: '12px', color: '#888', marginTop: '2px', wordBreak: 'break-all' }}>{email}</p>
                    </div>
                    <Link to="/dashboard/profile"
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', textDecoration: 'none', color: '#4b5563', borderRadius: '8px', fontSize: '14px' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        onClick={() => setIsOpen(false)}
                    >
                        <User size={16} /> Edit Profile
                    </Link>
                    <Link to="/dashboard/history"
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', textDecoration: 'none', color: '#4b5563', borderRadius: '8px', fontSize: '14px' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        onClick={() => setIsOpen(false)}
                    >
                        <History size={16} /> History
                    </Link>
                    <Link to="/dashboard/leaderboard"
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', textDecoration: 'none', color: '#4b5563', borderRadius: '8px', fontSize: '14px' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        onClick={() => setIsOpen(false)}
                    >
                        <Trophy size={16} /> Leaderboard
                    </Link>
                    <div
                        onClick={handleLogout}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', cursor: 'pointer', color: '#ef4444', borderRadius: '8px', fontSize: '14px' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <LogOut size={16} /> Logout
                    </div>
                </div>
            )}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @media (max-width: 640px) {
                    .profile-name-text {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
};
