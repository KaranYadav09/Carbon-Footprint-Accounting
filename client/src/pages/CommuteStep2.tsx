import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Navigation, CheckCircle } from "lucide-react";

const CommuteStep2: React.FC = () => {
  const navigate = useNavigate();
  const [distance, setDistance] = useState<string>("");
  const [transportMode, setTransportMode] = useState<any>(null);

  useEffect(() => {
    const mode = localStorage.getItem("transportMode");
    if (mode) {
      setTransportMode(JSON.parse(mode));
    } else {
      navigate("/dashboard/commute");
    }
  }, [navigate]);

  const handleNext = () => {
    if (!distance || parseFloat(distance) <= 0) {
      alert("Please enter a valid distance.");
      return;
    }
    localStorage.setItem("commuteDistance", distance);
    navigate("/dashboard/commute/summary");
  };

  if (!transportMode) return null;

  return (
    <div className="commute-step-container" style={{ maxWidth: '600px', margin: '40px auto', padding: '20px' }}>
      {/* Back Button */}
      <div style={{ marginBottom: '30px' }}>
        <button
          onClick={() => navigate('/dashboard/commute')}
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
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '24px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
        textAlign: 'center'
      }}>
        <div style={{
          width: '70px',
          height: '70px',
          background: '#ecfccb',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          color: '#10b981'
        }}>
          <Navigation size={32} />
        </div>

        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '10px' }}>Confirm Distance</h2>
        <p style={{ color: '#64748b', marginBottom: '30px' }}>
          How many kilometers did you travel via <strong>{transportMode.name}</strong>?
        </p>

        <div style={{ position: 'relative', marginBottom: '30px' }}>
          <input
            type="number"
            placeholder="0.00"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            style={{
              width: '100%',
              padding: '15px 20px',
              fontSize: '20px',
              fontWeight: 600,
              borderRadius: '16px',
              border: '2px solid #e2e8f0',
              textAlign: 'center',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#10b981'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
          />
          <span style={{
            position: 'absolute',
            right: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontWeight: 600,
            color: '#94a3b8'
          }}>
            km
          </span>
        </div>

        <button
          onClick={handleNext}
          style={{
            width: '100%',
            padding: '16px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '16px',
            fontSize: '18px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <CheckCircle size={20} />
          Continue
        </button>
      </div>
    </div>
  );
};

export default CommuteStep2;
