import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiCheck } from 'react-icons/fi';
import api from '../api';
import { toast } from 'sonner';

interface LocationState {
    distanceKm: number;
    elapsedTime: number;
    path: any[];
}

const COMMUTE_MODES = [
    { name: "Walk", multiplier: 10, co2PerKm: 0.17 },
    { name: "Cycle", multiplier: 9, co2PerKm: 0.17 },
    { name: "Bus", multiplier: 6, co2PerKm: 0.07 },
    { name: "Metro", multiplier: 6, co2PerKm: 0.13 },
    { name: "Train", multiplier: 6, co2PerKm: 0.13 },
    { name: "Bike", multiplier: 3, co2PerKm: 0.06 },
    { name: "Car", multiplier: 1, co2PerKm: 0 }
];

const CommuteSummary: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state as LocationState;

    const [selectedMode, setSelectedMode] = useState(COMMUTE_MODES[0]);
    const [submitting, setSubmitting] = useState(false);

    // If accessed directly without state, redirect back
    useEffect(() => {
        if (!state) {
            navigate('/dashboard/commute');
        }
    }, [state, navigate]);

    if (!state) return null;

    const { distanceKm, elapsedTime } = state;

    const points = Math.floor(distanceKm * selectedMode.multiplier);
    const co2Saved = (distanceKm * selectedMode.co2PerKm).toFixed(2);

    const handleSave = async () => {
        setSubmitting(true);
        try {
            const res = await api.post('/api/commute', {
                distance: distanceKm,
                transport: selectedMode.name.toLowerCase(),
            });

            toast.success(`Commute saved! +${points} Eco Points`);

            // Show achievement notifications if any
            if (res.data.new_achievements && res.data.new_achievements.length > 0) {
                res.data.new_achievements.forEach((ach: any) => {
                    toast(`🏆 Achievement Unlocked: ${ach.name}`, {
                        description: ach.description,
                        duration: 5000,
                    });
                });
            }

            navigate('/dashboard');
        } catch (error) {
            console.error(error);
            toast.error("Failed to save commute.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
            <h2 style={{ marginBottom: '20px' }}>Commute Summary</h2>

            <div style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>Total Distance</div>
                        <div style={{ fontSize: '24px', fontWeight: 700 }}>{distanceKm.toFixed(2)} km</div>
                    </div>
                    <div>
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>Duration</div>
                        <div style={{ fontSize: '24px', fontWeight: 700 }}>{Math.floor(elapsedTime / 60)} min</div>
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontWeight: 500, color: '#333' }}>
                        How did you travel?
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                        {COMMUTE_MODES.map(mode => (
                            <button
                                key={mode.name}
                                onClick={() => setSelectedMode(mode)}
                                style={{
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: selectedMode.name === mode.name ? '2px solid #10b981' : '1px solid #ddd',
                                    background: selectedMode.name === mode.name ? '#ecfccb' : 'white',
                                    cursor: 'pointer',
                                    fontWeight: 500
                                }}
                            >
                                {mode.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '14px', color: '#666' }}>Estimated Impact</div>
                        <div style={{ fontWeight: 600, color: '#059669' }}>{co2Saved} kg CO₂ Saved</div>
                    </div>
                    <div style={{ background: '#10b981', color: 'white', padding: '5px 10px', borderRadius: '20px', fontWeight: 700 }}>
                        +{points} Pts
                    </div>
                </div>
            </div>

            <button
                onClick={handleSave}
                disabled={submitting}
                style={{
                    width: '100%',
                    padding: '15px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                }}
            >
                {submitting ? 'Saving...' : <><FiCheck /> Confirm & Save Log</>}
            </button>
        </div>
    );
};

export default CommuteSummary;
