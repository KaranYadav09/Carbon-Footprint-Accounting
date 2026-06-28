import React, { useEffect, useState } from 'react';
import { Bell, Check } from 'lucide-react';
import api from '../api';

export const NotificationBell: React.FC = () => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/api/notifications');
            setNotifications(res.data);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 30 seconds for live updates
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleMarkRead = async (id: number) => {
        try {
            await api.put(`/api/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (error) {
            console.error("Failed to mark read", error);
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    padding: '10px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                    transition: 'all 0.2s'
                }}
            >
                <Bell size={20} color="#475569" />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '-5px',
                        right: '-5px',
                        background: '#ef4444',
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: 700,
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 0 2px white'
                    }}>
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '50px',
                    right: 0,
                    width: '320px',
                    background: 'white',
                    borderRadius: '16px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    border: '1px solid #f1f5f9',
                    zIndex: 100,
                    overflow: 'hidden'
                }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: '#0f172a', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Notifications</span>
                        {unreadCount > 0 && <span style={{ fontSize: '12px', color: '#10b981' }}>{unreadCount} new</span>}
                    </div>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                                No notifications yet.
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div 
                                    key={n.id} 
                                    style={{
                                        padding: '12px 16px',
                                        borderBottom: '1px solid #f8fafc',
                                        background: n.read ? 'white' : '#f0fdf4',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        gap: '10px'
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#334155', fontWeight: n.read ? 400 : 600 }}>
                                            {n.message}
                                        </p>
                                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                            {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    {!n.read && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id); }}
                                            style={{
                                                background: '#d1fae5',
                                                border: 'none',
                                                borderRadius: '50%',
                                                width: '24px',
                                                height: '24px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                color: '#10b981',
                                                flexShrink: 0
                                            }}
                                            title="Mark as read"
                                        >
                                            <Check size={14} />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
