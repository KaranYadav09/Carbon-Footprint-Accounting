import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGeoLocation } from '../hooks/useGeoLocation';
import LiveCommuteMap from '../components/LiveCommuteMap';
import { FiStopCircle, FiClock, FiMapPin } from 'react-icons/fi';

const CommuteActive: React.FC = () => {
    const navigate = useNavigate();
    const {
        currentLocation,
        path,
        distanceKm,
        elapsedTime,
        startTracking,
        stopTracking,
        isTracking,
        error
    } = useGeoLocation();

    // Auto-start tracking on mount
    useEffect(() => {
        startTracking();
        return () => stopTracking();
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStop = () => {
        stopTracking();
        // Navigate to summary with data
        navigate('/dashboard/commute/track/summary', {
            state: {
                distanceKm,
                elapsedTime,
                path
            }
        });
    };

    return (
        <div style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header / Stats */}
            <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666', fontSize: '14px' }}>
                        <FiClock /> Duration
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'monospace' }}>
                        {formatTime(elapsedTime)}
                    </div>
                </div>

                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666', fontSize: '14px' }}>
                        <FiMapPin /> Distance
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 700 }}>
                        {distanceKm.toFixed(2)} <span style={{ fontSize: '16px', fontWeight: 500 }}>km</span>
                    </div>
                </div>

                <button
                    onClick={handleStop}
                    style={{
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer'
                    }}
                >
                    <FiStopCircle size={20} /> Stop
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '8px' }}>
                    Error: {error}
                </div>
            )}

            {/* Map Area */}
            <div style={{ flex: 1, background: '#eee', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
                <LiveCommuteMap currentLocation={currentLocation} path={path} />

                {!isTracking && !error && (
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        zIndex: 1000
                    }}>
                        Initializing GPS...
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommuteActive;
