import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Filter, Calendar, MapPin, TreePine, Award } from 'lucide-react';
import api from '../api';
import './HistoryPage.css';

interface ActivityItem {
    id: string;
    type: string;
    details: string;
    points: number;
    status: string;
    timestamp: string;
}

export const HistoryPage: React.FC = () => {
    const navigate = useNavigate();
    const [history, setHistory] = useState<ActivityItem[]>([]);
    const [filter, setFilter] = useState("All");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await api.get('/api/student/history');
                setHistory(res.data);
            } catch (err) {
                console.error("Failed to fetch history", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const filteredHistory = filter === "All"
        ? history
        : history.filter(item => {
            if (filter === "Commute") return item.type === "Commute";
            if (filter === "Tree") return item.type === "Tree Plantation";
            if (filter === "Event") return item.type === "Event";
            return true;
        });

    const getIcon = (type: string) => {
        if (type === "Commute") return <MapPin size={20} color="#3b82f6" />;
        if (type === "Tree Plantation") return <TreePine size={20} color="#16a34a" />;
        if (type === "Event") return <Calendar size={20} color="#7c3aed" />;
        return <Award size={20} color="#f59e0b" />;
    };

    return (
        <div className="history-page-wrapper">
            <div className="history-hero-bg"></div>

            <div className="history-container">
                {/* Header */}
                <div className="history-header">
                    <button onClick={() => navigate('/dashboard')} className="history-back-btn">
                        <ArrowLeft size={24} />
                    </button>
                    <h1>Activity History</h1>
                </div>

                {/* Filters */}
                <div className="history-filters">
                    <div className="filter-label">
                        <Filter size={16} />
                        <span>Filter:</span>
                    </div>
                    {["All", "Commute", "Tree", "Event"].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`filter-btn ${filter === f ? 'active' : ''}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {/* List Container */}
                <div className="history-list-container">
                    {loading ? (
                        <div className="history-loading">Gathering your eco-journey...</div>
                    ) : filteredHistory.length === 0 ? (
                        <div className="history-empty">No activities found in this realm yet.</div>
                    ) : (
                        filteredHistory.map((item) => {
                            const iconClass = item.type === "Commute" ? "icon-commute" :
                                item.type === "Tree Plantation" ? "icon-tree" :
                                    item.type === "Event" ? "icon-event" : "icon-default";

                            return (
                                <div key={item.id} className="activity-card">
                                    <div className="activity-card-left">
                                        <div className={`activity-icon-wrap ${iconClass}`}>
                                            {getIcon(item.type)}
                                        </div>
                                        <div className="activity-details">
                                            <h4>{item.type}</h4>
                                            <p>{item.details}</p>
                                            <div className="activity-time">
                                                {new Date(item.timestamp).toLocaleString(undefined, {
                                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="activity-card-right">
                                        <div className={`activity-points ${item.points > 0 ? 'points-positive' : ''}`}>
                                            +{item.points} <span style={{ fontSize: '14px', fontWeight: 600 }}>pts</span>
                                        </div>
                                        <div className={`status-badge status-${item.status.toLowerCase()}`}>
                                            {item.status}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};
