import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Award, Zap, Footprints, TreeDeciduous, Calendar, CheckCircle2 } from 'lucide-react';
import api from '../api';

type Challenge = {
    id: number;
    title: string;
    description: string;
    reward_points: number;
    goal_value: number;
    category: string;
    joined: boolean;
    progress: number;
    completed: boolean;
};

export const ChallengesPage: React.FC = () => {
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [activeTab, setActiveTab] = useState('all');
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    const fetchChallenges = async () => {
        try {
            const res = await api.get('/api/challenges');
            setChallenges(res.data);
        } catch (error) {
            console.error("Failed to fetch challenges", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchChallenges();
    }, []);

    const handleJoin = async (id: number) => {
        try {
            await api.post(`/api/challenges/${id}/join`);
            // Refresh list
            fetchChallenges();
        } catch (error) {
            console.error("Failed to join challenge", error);
        }
    };

    const getIcon = (category: string) => {
        switch (category) {
            case 'commute': return <Footprints size={24} color="#10b981" />;
            case 'tree': return <TreeDeciduous size={24} color="#059669" />;
            case 'event': return <Calendar size={24} color="#0ea5e9" />;
            default: return <Zap size={24} color="#f59e0b" />;
        }
    };

    const filteredChallenges = activeTab === 'all' 
        ? challenges 
        : challenges.filter(c => c.category === activeTab);

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px', fontFamily: "'Outfit', sans-serif" }}>
            
            {/* Header */}
            <div style={{ marginBottom: '40px', textAlign: 'center' }}>
                <div style={{
                    background: '#d1fae5',
                    color: '#10b981',
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px auto',
                    boxShadow: '0 4px 10px rgba(16, 185, 129, 0.1)'
                }}>
                    <Trophy size={28} />
                </div>
                <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                    Eco Challenges
                </h1>
                <p style={{ color: '#64748b', fontSize: '16px' }}>
                    Join limited-time challenges and earn bonus Eco Points!
                </p>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '32px',
                background: '#f1f5f9',
                padding: '6px',
                borderRadius: '14px',
                width: 'fit-content',
                margin: '0 auto 32px auto'
            }}>
                {['all', 'commute', 'tree', 'event'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '10px',
                            border: 'none',
                            background: activeTab === tab ? 'white' : 'transparent',
                            color: activeTab === tab ? '#0f172a' : '#64748b',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '14px',
                            textTransform: 'capitalize',
                            boxShadow: activeTab === tab ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>Loading tasks...</div>
            ) : filteredChallenges.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '40px', background: 'white', borderRadius: '16px' }}>
                    No challenges in this category right now.
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                    {filteredChallenges.map(challenge => {
                        const progressPercent = Math.min((challenge.progress / challenge.goal_value) * 100, 100);
                        
                        return (
                            <div 
                                key={challenge.id}
                                style={{
                                    background: 'white',
                                    borderRadius: '20px',
                                    padding: '24px',
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.03)',
                                    border: '1px solid #f1f5f9',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                {challenge.completed && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '16px',
                                        right: '16px',
                                        color: '#10b981',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '12px',
                                        fontWeight: 700
                                    }}>
                                        <CheckCircle2 size={16} /> Completed
                                    </div>
                                )}

                                <div>
                                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                                        <div style={{
                                            background: '#f8fafc',
                                            padding: '12px',
                                            borderRadius: '14px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            {getIcon(challenge.category)}
                                        </div>
                                        <div>
                                            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                                                {challenge.title}
                                            </h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b', fontSize: '13px', fontWeight: 600 }}>
                                                <Award size={14} /> +{challenge.reward_points} Points
                                            </div>
                                        </div>
                                    </div>

                                    <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#64748b', lineHeight: 1.5 }}>
                                        {challenge.description}
                                    </p>
                                </div>

                                <div>
                                    {challenge.joined && (
                                        <div style={{ marginBottom: '20px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                                                <span style={{ color: '#64748b' }}>Progress</span>
                                                <span style={{ fontWeight: 700, color: '#0f172a' }}>{challenge.progress} / {challenge.goal_value}</span>
                                            </div>
                                            <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{
                                                    width: `${progressPercent}%`,
                                                    height: '100%',
                                                    background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                                                    borderRadius: '4px'
                                                }} />
                                            </div>
                                        </div>
                                    )}

                                    {!challenge.joined ? (
                                        <button 
                                            onClick={() => handleJoin(challenge.id)}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                background: '#f1f5f9',
                                                color: '#334155',
                                                border: 'none',
                                                borderRadius: '12px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                        >
                                            Join Challenge
                                        </button>
                                    ) : challenge.completed ? (
                                        <div style={{
                                            textAlign: 'center',
                                            color: '#059669',
                                            fontWeight: 700,
                                            fontSize: '14px',
                                            padding: '12px',
                                            background: '#d1fae5',
                                            borderRadius: '12px'
                                        }}>
                                            Reward Claimed! Check Notifications.
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => navigate(challenge.category === 'commute' ? '/dashboard' : '/dashboard')}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '12px',
                                                fontWeight: 700,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Track Activity
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
