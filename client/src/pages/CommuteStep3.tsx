import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiCheck, FiAward, FiCloud } from 'react-icons/fi';
import api from '../api';
import { toast } from 'sonner';

const CommuteStep3: React.FC = () => {
  const navigate = useNavigate();
  const [points, setPoints] = useState<number>(0);
  const [co2Saved, setCo2Saved] = useState<string>("0");
  const [loading, setLoading] = useState<boolean>(false);
  const [transportMode, setTransportMode] = useState<any>(null);
  const [distance, setDistance] = useState<number>(0);

  const savingsFactors: Record<string, number> = {
    "walk": 0.17, "cycle": 0.17, "bus": 0.07, "metro": 0.13, "train": 0.13, "bike": 0.06, "car": 0
  };

  useEffect(() => {
    const mode = localStorage.getItem("transportMode");
    const dist = localStorage.getItem("commuteDistance");

    if (mode && dist) {
      const parsedMode = JSON.parse(mode);
      const parsedDist = parseFloat(dist);
      setTransportMode(parsedMode);
      setDistance(parsedDist);

      setPoints(Math.floor(parsedDist * parsedMode.multiplier));
      setCo2Saved((parsedDist * (savingsFactors[parsedMode.name.toLowerCase()] || 0)).toFixed(2));
    } else {
      navigate("/dashboard/commute");
    }
  }, [navigate]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const response = await api.post("/api/commute", {
        distance: distance,
        transport: transportMode.name.toLowerCase(),
      });

      toast.success(`Commute logged! +${points} Eco Points`);

      if (response.data.new_achievements && response.data.new_achievements.length > 0) {
        response.data.new_achievements.forEach((ach: any) => {
          toast(`🏆 Achievement Unlocked: ${ach.name}`, {
            description: ach.description,
            duration: 5000,
          });
        });
      }

      // Cleanup
      localStorage.removeItem("transportMode");
      localStorage.removeItem("commuteDistance");

      navigate("/dashboard");
    } catch (err) {
      console.error("Error logging commute:", err);
      toast.error("Failed to log commute. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!transportMode) return null;

  return (
    <div className="commute-step-container" style={{ maxWidth: '600px', margin: '40px auto', padding: '20px' }}>
      <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '10px', textAlign: 'center' }}>Well Done! 🌿</h2>
      <p style={{ color: '#64748b', textAlign: 'center', marginBottom: '30px' }}>Review your eco-impact before saving.</p>

      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '24px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
        marginBottom: '30px'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', marginBottom: '8px' }}>
              <FiAward style={{ color: '#10b981' }} /> Eco Points
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>+{points}</div>
          </div>
          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', marginBottom: '8px' }}>
              <FiCloud style={{ color: '#0ea5e9' }} /> CO₂ Saved
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{co2Saved}kg</div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ color: '#64748b' }}>Transport Mode</span>
            <span style={{ fontWeight: 600 }}>{transportMode.name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Total Distance</span>
            <span style={{ fontWeight: 600 }}>{distance} km</span>
          </div>
        </div>
      </div>

      <button
        onClick={handleConfirm}
        disabled={loading}
        style={{
          width: '100%',
          padding: '18px',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '16px',
          fontSize: '18px',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          boxShadow: '0 8px 16px rgba(16, 185, 129, 0.2)',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
        onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
      >
        {loading ? 'Saving...' : <><FiCheck size={22} /> Confirm & Log Commute</>}
      </button>

      <button
        onClick={() => navigate('/dashboard/commute')}
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px',
          background: 'transparent',
          color: '#64748b',
          border: 'none',
          marginTop: '10px',
          fontSize: '15px',
          fontWeight: 500,
          cursor: 'pointer'
        }}
      >
        Cancel
      </button>
    </div>
  );
};

export default CommuteStep3;
