import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Footprints, Bike, Bus, Train, Car, Navigation } from "lucide-react";

type Mode = {
  name: string;
  multiplier: number;
  icon: React.ReactNode;
  color: string;
};

const modes: Mode[] = [
  { name: "Walk", multiplier: 10, icon: <Footprints size={24} />, color: "#10b981" },
  { name: "Cycle", multiplier: 9, icon: <Bike size={24} />, color: "#059669" },
  { name: "Bus", multiplier: 6, icon: <Bus size={24} />, color: "#0ea5e9" },
  { name: "Metro", multiplier: 6, icon: <Navigation size={24} />, color: "#6366f1" },
  { name: "Train", multiplier: 6, icon: <Train size={24} />, color: "#8b5cf6" },
  { name: "Bike", multiplier: 3, icon: <Bike size={24} />, color: "#f59e0b" },
  { name: "Car", multiplier: 1, icon: <Car size={24} />, color: "#64748b" },
];

const CommuteStep1: React.FC = () => {
  const navigate = useNavigate();

  const selectMode = (mode: Mode) => {
    localStorage.setItem("transportMode", JSON.stringify({ name: mode.name, multiplier: mode.multiplier }));
    navigate("/dashboard/commute/verify");
  };

  return (
    <div className="commute-step-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>

      {/* Back Button */}
      <div style={{ marginBottom: '30px' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'white',
            border: 'none',
            padding: '12px',
            borderRadius: '12px',
            cursor: 'pointer',
            color: '#64748b',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(-3px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '10px', color: '#0f172a' }}>Log Your Commute</h2>
        <p style={{ color: '#64748b', fontSize: '16px' }}>Choose how you moved today to earn Eco Points.</p>
      </div>

      {/* GPS Commute Button */}
      <div style={{ marginBottom: '40px' }}>
        <button
          onClick={() => navigate('/dashboard/commute/track')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            padding: '24px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            border: 'none',
            borderRadius: '24px',
            cursor: 'pointer',
            fontSize: '20px',
            fontWeight: 700,
            color: 'white',
            boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '15px' }}>
            <Navigation size={28} />
          </div>
          <span>Start Live GPS Tracking</span>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Manual Entry</span>
        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
      </div>

      <div style={{
        display: "grid",
        gap: "20px",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        marginBottom: '40px'
      }}>
        {modes.map((mode) => (
          <button
            key={mode.name}
            onClick={() => selectMode(mode)}
            style={{
              background: 'white',
              border: '1px solid #f1f5f9',
              borderRadius: '20px',
              padding: '25px 20px',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.borderColor = mode.color;
              e.currentTarget.style.boxShadow = `0 10px 20px ${mode.color}15`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = '#f1f5f9';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)';
            }}
          >
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '15px',
              background: `${mode.color}15`,
              color: mode.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {mode.icon}
            </div>
            <div style={{ fontWeight: 700, fontSize: '16px', color: '#0f172a' }}>{mode.name}</div>
            <div style={{
              fontSize: '11px',
              fontWeight: 800,
              color: mode.color,
              background: `${mode.color}10`,
              padding: '4px 8px',
              borderRadius: '8px'
            }}>
              x{mode.multiplier} Points
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CommuteStep1;
