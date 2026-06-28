import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Leaf,
  Calendar,
  Award,
  TrendingUp,
  TreePine,
  Info,
  X,
  Footprints,
  Bus,
  Zap,
  Cloud,
  Bike,
  PersonStanding,
  Map,
  Trophy,
  Sprout,
  Trees,
  Ticket,
  Users,
  Scissors,
  ShieldCheck,
  Star,
  Crown,
  Navigation,
} from "lucide-react";
import { FiMapPin, FiBarChart2 } from "react-icons/fi";

import { ProfileDropdown } from "../components/ProfileDropdown";
import { NotificationBell } from "../components/NotificationBell";
import { useAuth } from "../context/AuthContext";
import api from "../api";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { decodedToken } = useAuth();
  const [userName, setUserName] = useState(decodedToken?.name || "Student");
  const [stats, setStats] = useState({
    id: 0,
    eco_points: 0,
    co2_saved_kg: 0,
    trees_planted: 0,
    events_attended: 0,
  });
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };
  const [achievements, setAchievements] = useState<any[]>([]);
  const [selectedStat, setSelectedStat] = useState<{
    title: string;
    description: string;
    when: string;
  } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/api/students/me");
        if (res.data.name) {
          setUserName(res.data.name);
        } else if (res.data.username) {
          setUserName(res.data.username);
        }

        setStats({
          id: res.data.id,
          eco_points: res.data.eco_points || 0,
          co2_saved_kg: res.data.co2_saved_kg || 0,
          trees_planted: res.data.trees_planted || 0,
          events_attended: res.data.events_attended || 0,
        });

        const achRes = await api.get("/api/achievements/me");
        setAchievements(achRes.data);
      } catch (error: any) {
        console.error("Failed to fetch profile", error);
      }
    };
    fetchProfile();
  }, [location]);

  return (
    <div
      className="sd-dashboard-container"
      style={{
        padding: "40px",
        background: "radial-gradient(ellipse at top left, #f1f5f9 0%, #f8fafc 100%)",
        minHeight: "100vh",
        fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        
        @media (max-width: 768px) {
          .sd-dashboard-container {
            padding: 16px !important;
          }
          .sd-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 16px !important;
          }
          .sd-achievement-wall {
            padding: 20px !important;
            border-radius: 20px !important;
          }
          .sd-welcome h1 {
            font-size: 28px !important;
          }
        }
        
        .sd-premium-card {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          border-radius: 20px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .sd-premium-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          background: rgba(255, 255, 255, 0.95);
        }

        .sd-action-card {
          border-radius: 20px;
          padding: 24px;
          color: white;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          position: relative;
          overflow: hidden;
        }

        .sd-action-card::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%);
          pointer-events: none;
        }

        .sd-action-card:hover {
          transform: translateY(-6px) scale(1.02);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
        }

        .sd-ach-card {
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .sd-ach-card:hover {
          transform: translateY(-5px) scale(1.03);
        }
      `}</style>

      {/* Header */}
      <div
        className="sd-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "40px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              padding: "12px",
              borderRadius: "14px",
              boxShadow: "0 4px 10px rgba(16, 185, 129, 0.3)",
            }}
          >
            <Leaf color="white" size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: "28px", fontWeight: 800, margin: 0, color: "#0f172a", letterSpacing: "-0.02em" }}>
              EcoTrace
            </h2>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, letterSpacing: "0.05em", textTransform: 'uppercase' }}>
              Student Portal
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {deferredPrompt && (
            <button 
              onClick={handleInstallClick}
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                padding: '10px 14px',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 600,
                fontSize: '14px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
              }}
            >
              <Sprout size={16} /> Install
            </button>
          )}
          <button 
             onClick={() => navigate('/dashboard/student-analytics')}
             style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                padding: '10px',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                transition: 'all 0.2s'
             }}
             title="Detailed Analytics"
          >
             <FiBarChart2 size={20} color="#475569" />
          </button>
          <NotificationBell />
          <ProfileDropdown />
        </div>
      </div>

      {/* Welcome Hero */}
      <div className="sd-welcome" style={{ marginBottom: "40px" }}>
        <h1 style={{ fontSize: "36px", fontWeight: 800, color: "#0f172a", margin: "0 0 8px 0", letterSpacing: "-0.02em" }}>
          Welcome back, <span style={{ color: "#10b981" }}>{userName}</span>!
        </h1>
        <p style={{ color: "#64748b", fontSize: "16px", margin: 0, fontWeight: 500 }}>
          Here is your sustainability impact map. Let's make today greener.
        </p>
      </div>

      {/* Top Action Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
          gap: "24px",
          marginBottom: "40px",
        }}
      >
        <ActionCard
          gradient="linear-gradient(135deg, #10b981 0%, #047857 100%)"
          title="Log Commute"
          desc="Record your daily travel & save CO₂"
          icon={<FiMapPin size={28} />}
          onClick={() => navigate("/dashboard/commute")}
        />

        <ActionCard
          gradient="linear-gradient(135deg, #16a34a 0%, #15803d 100%)"
          title="Plant a Tree"
          desc="Submit plantation proof for points"
          icon={<Trees size={28} />}
          onClick={() => navigate("/dashboard/plant-tree")}
        />

        <ActionCard
          gradient="linear-gradient(135deg, #6366f1 0%, #4338ca 100%)"
          title="Join Events"
          desc="Participate in campus green events"
          icon={<Calendar size={28} />}
          onClick={() => navigate("/dashboard/events")}
        />
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: "24px",
          marginBottom: "40px",
        }}
      >
        <StatCard
          icon={<Award size={24} />}
          iconColor="#f59e0b"
          iconBg="#fef3c7"
          label="Eco Points"
          value={stats.eco_points.toLocaleString()}
          onClick={() => setSelectedStat(statDescriptions["Eco Points"])}
        />
        <StatCard
          icon={<TrendingUp size={24} />}
          iconColor="#10b981"
          iconBg="#d1fae5"
          label="CO₂ Saved"
          value={`${stats.co2_saved_kg.toFixed(2)} kg`}
          onClick={() => setSelectedStat(statDescriptions["CO₂ Saved"])}
        />
        <StatCard
          icon={<TreePine size={24} />}
          iconColor="#16a34a"
          iconBg="#dcfce7"
          label="Trees Planted"
          value={stats.trees_planted.toLocaleString()}
          onClick={() => setSelectedStat(statDescriptions["Trees Planted"])}
        />
        <StatCard
          icon={<Calendar size={24} />}
          iconColor="#6366f1"
          iconBg="#e0e7ff"
          label="Events Attended"
          value={stats.events_attended.toLocaleString()}
          onClick={() => setSelectedStat(statDescriptions["Events Attended"])}
        />
      </div>

      {/* Info Modal */}
      {selectedStat && (
        <StatInfoModal
          title={selectedStat.title}
          description={selectedStat.description}
          when={selectedStat.when}
          onClose={() => setSelectedStat(null)}
        />
      )}

      {/* Achievement Wall */}
      <div
        className="sd-achievement-wall"
        style={{
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          padding: "40px",
          borderRadius: "32px",
          border: "1px solid rgba(255, 255, 255, 0.8)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "32px" }}>
          <div>
            <h2 style={{ fontSize: "28px", fontWeight: 800, margin: 0, color: "#0f172a", letterSpacing: "-0.02em" }}>
              Achievement Wall
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px" }}>
              <div style={{ height: "6px", width: "100px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(achievements.filter((a) => a.earned).length / achievements.length) * 100}%`, background: "#10b981", borderRadius: "3px" }} />
              </div>
              <p style={{ color: "#64748b", fontSize: "14px", fontWeight: 600, margin: 0 }}>
                {achievements.filter((a) => a.earned).length} of {achievements.length} unlocked
              </p>
            </div>
          </div>
          <Trophy size={48} color="#10b981" strokeWidth={1.5} style={{ opacity: 0.15, transform: "rotate(10deg)" }} />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: "24px",
          }}
        >
          {achievements.sort((a, b) => a.id - b.id).map((ach) => {
            const tiers = ["BRONZE", "SILVER", "GOLD"];
            const tierColors = ["#b45309", "#475569", "#b45309"]; // Darker text colors
            const bgColors = ["#fef3c7", "#f1f5f9", "#fef3c7"]; // For unearned state
            const glowColors = [
              "rgba(245, 158, 11, 0.4)",
              "rgba(148, 163, 184, 0.4)",
              "rgba(251, 191, 36, 0.6)",
            ];

            // Heuristic matching
            const val = ach.requirement_value;
            let tierIdx = 0;
            if (ach.icon === "walk") { if (val >= 10) tierIdx = 1; if (val >= 50) tierIdx = 2; }
            else if (ach.icon === "cycle") { if (val >= 25) tierIdx = 1; if (val >= 100) tierIdx = 2; }
            else if (ach.icon === "transit") { if (val >= 50) tierIdx = 1; if (val >= 200) tierIdx = 2; }
            else if (ach.icon === "tree") { if (val >= 5) tierIdx = 1; if (val >= 10) tierIdx = 2; }
            else if (ach.icon === "event") { if (val >= 5) tierIdx = 1; if (val >= 10) tierIdx = 2; }
            else if (ach.icon === "co2") { if (val >= 25) tierIdx = 1; if (val >= 100) tierIdx = 2; }
            else if (ach.icon === "points") { if (val >= 500) tierIdx = 1; if (val >= 1000) tierIdx = 2; }

            const tierName = tiers[tierIdx];
            const tColor = tierColors[tierIdx];
            const gColor = glowColors[tierIdx];
            const bColor = bgColors[tierIdx];

            const getIcon = (name: string, cat: string) => {
              // Exact name mapping for unique logos
              if (name === "First Steps") return <PersonStanding size={28} />;
              if (name === "Pavement Hero") return <Footprints size={28} />;
              if (name === "Walking Legend") return <Map size={28} />;

              if (name === "Green Cyclist") return <Bike size={28} />;
              if (name === "Pedal Pro") return <Trophy size={28} />;
              if (name === "Cycle Champion") return <Crown size={28} />;

              if (name === "Bus Rider") return <Bus size={28} />;
              if (name === "Transit Pro") return <Navigation size={28} />;
              if (name === "Metro Master") return <ShieldCheck size={28} />;

              if (name === "Seedling") return <Sprout size={28} />;
              if (name === "Tree Planter") return <TreePine size={28} />;
              if (name === "Forest Guardian") return <Trees size={28} />;

              if (name === "Event Goer") return <Ticket size={28} />;
              if (name === "Eco Activist") return <Users size={28} />;
              if (name === "Community Leader") return <Star size={28} />;

              if (name === "CO2 Cutter") return <Scissors size={28} />;
              if (name === "Carbon Saver") return <Cloud size={28} />;
              if (name === "Carbon Warrior") return <Zap size={28} />;

              if (name === "Eco Starter") return <Leaf size={28} />;
              if (name === "Eco Champion") return <Trophy size={28} />;
              if (name === "Sustainability Hero") return <Crown size={28} />;

              // Fallback
              if (cat === "walk") return <Footprints size={28} />;
              if (cat === "cycle") return <Bike size={28} />;
              if (cat === "transit") return <Bus size={28} />;
              if (cat === "tree") return <TreePine size={28} />;
              if (cat === "event") return <Calendar size={28} />;
              if (cat === "co2") return <Cloud size={28} />;
              if (cat === "points") return <Zap size={28} />;
              return <Award size={28} />;
            };

            const unitMap: Record<string, string> = { walk: "km", cycle: "km", transit: "km", tree: "Trees", event: "Events", co2: "kg", points: "Pts" };
            const unit = unitMap[ach.icon as string] || "";

            return (
              <div
                key={ach.id}
                className="sd-ach-card"
                title={`${ach.description}\n${ach.earned ? "Unlocked!" : "Locked: " + ach.requirement_value + " " + unit + " required"}`}
                style={{
                  textAlign: "center",
                  padding: "24px 16px",
                  borderRadius: "24px",
                  background: ach.earned ? "#ffffff" : bColor,
                  border: ach.earned ? `1px solid ${tColor}33` : "1px dashed rgba(15, 23, 42, 0.1)",
                  opacity: ach.earned ? 1 : 0.6,
                  filter: ach.earned ? "none" : "grayscale(100%)",
                  cursor: "help",
                  boxShadow: ach.earned ? `0 12px 24px -6px ${gColor}` : "none",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  position: "relative",
                  overflow: "hidden"
                }}
              >
                {ach.earned && tierIdx === 2 && (
                  <div style={{ position: 'absolute', top: '-15px', right: '-15px', width: '50px', height: '50px', background: 'radial-gradient(circle, rgba(251,191,36,0.8) 0%, rgba(251,191,36,0) 70%)', filter: 'blur(10px)' }} />
                )}

                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    background: ach.earned ? `${tColor}15` : "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "16px",
                    border: ach.earned ? `2.5px solid ${tColor}` : "none",
                    color: ach.earned ? tColor : "#94a3b8",
                    boxShadow: ach.earned ? `0 0 20px ${gColor}` : "inset 0 2px 4px rgba(0,0,0,0.05)",
                    zIndex: 1
                  }}
                >
                  {getIcon(ach.name, ach.icon)}
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#0f172a",
                    marginBottom: "6px",
                    lineHeight: 1.2,
                    zIndex: 1
                  }}
                >
                  {ach.name}
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    color: tColor,
                    letterSpacing: "0.05em",
                    padding: "4px 10px",
                    borderRadius: "12px",
                    background: ach.earned ? `${tColor}15` : 'rgba(255,255,255,0.7)',
                    display: "inline-block",
                    zIndex: 1
                  }}
                >
                  {tierName}
                </div>

                <div
                  style={{
                    fontSize: "11px",
                    color: ach.earned ? "#10b981" : "#64748b",
                    marginTop: "12px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    zIndex: 1
                  }}
                >
                  {ach.earned ? "Earned" : `${ach.requirement_value} ${unit}`}
                </div>
              </div>
            );
          })}
        </div>

        {achievements.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px", color: "#94a3b8" }}>
            <Award size={64} style={{ opacity: 0.2, marginBottom: "20px" }} />
            <p style={{ fontSize: "16px", fontWeight: 500 }}>Gathering your sustainability legacy...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

/* 🔹 Reusable Components */

const ActionCard: React.FC<{
  gradient: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  onClick: () => void;
}> = ({ gradient, title, desc, icon, onClick }) => (
  <div className="sd-action-card" onClick={onClick} style={{ background: gradient }}>
    <div style={{ marginBottom: "16px", background: "rgba(255,255,255,0.2)", width: "56px", height: "56px", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {icon}
    </div>
    <h3 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 6px 0", letterSpacing: "-0.01em" }}>{title}</h3>
    <p style={{ fontSize: "14px", opacity: 0.9, margin: 0, fontWeight: 400 }}>{desc}</p>
  </div>
);

const StatCard: React.FC<{
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  onClick?: () => void;
}> = ({ icon, iconColor, iconBg, label, value, onClick }) => (
  <div
    className="sd-premium-card"
    onClick={onClick}
    style={{
      padding: "24px",
      cursor: onClick ? "pointer" : "default",
      position: "relative",
    }}
  >
    <div style={{ position: "absolute", top: "20px", right: "20px", color: "#cbd5e1" }}>
      <Info size={18} />
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
      <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: iconColor }}>
        {icon}
      </div>
      <p style={{ color: "#64748b", fontSize: "15px", fontWeight: 600, margin: 0 }}>{label}</p>
    </div>
    <h3 style={{ fontSize: "32px", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>{value}</h3>
  </div>
);

const StatInfoModal: React.FC<{
  title: string;
  description: string;
  when: string;
  onClose: () => void;
}> = ({ title, description, when, onClose }) => (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(15, 23, 42, 0.4)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      fontFamily: "'Outfit', sans-serif"
    }}
  >
    <div
      style={{
        background: "white",
        padding: "32px",
        borderRadius: "24px",
        maxWidth: "420px",
        width: "90%",
        position: "relative",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          background: "#f1f5f9",
          border: "none",
          cursor: "pointer",
          color: "#64748b",
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s"
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#e2e8f0"; e.currentTarget.style.color = "#0f172a" }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#64748b" }}
      >
        <X size={18} />
      </button>

      <h3 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "24px", color: "#10b981", letterSpacing: "-0.01em" }}>
        {title}
      </h3>

      <div style={{ marginBottom: "24px", background: "#f8fafc", padding: "16px", borderRadius: "16px" }}>
        <h4 style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          How to earn
        </h4>
        <p style={{ fontSize: "15px", color: "#475569", lineHeight: "1.6", margin: 0 }}>
          {description}
        </p>
      </div>

      <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "16px", marginBottom: "24px" }}>
        <h4 style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          When it updates
        </h4>
        <p style={{ fontSize: "15px", color: "#475569", lineHeight: "1.6", margin: 0 }}>
          {when}
        </p>
      </div>

      <button
        onClick={onClose}
        style={{
          width: "100%",
          padding: "16px",
          background: "#0f172a",
          color: "white",
          border: "none",
          borderRadius: "14px",
          fontWeight: 700,
          fontSize: "16px",
          cursor: "pointer",
          transition: "background 0.2s"
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = "#1e293b"}
        onMouseLeave={(e) => e.currentTarget.style.background = "#0f172a"}
      >
        Got it!
      </button>
    </div>
  </div>
);

const statDescriptions: Record<string, { title: string; description: string; when: string }> = {
  "Eco Points": {
    title: "Eco Points",
    description: "Earn points by logging your daily eco-friendly commutes (walking, cycling, public transport), planting trees, and attending sustainability events.",
    when: "Updates immediately after you log a commute. For trees and events, points are added once an Admin approves your submission."
  },
  "CO₂ Saved": {
    title: "CO₂ Saved",
    description: "This tracks the kilograms of Carbon Dioxide emissions you've prevented by choosing sustainable options instead of driving a private car.",
    when: "Updates immediately every time you log a commute."
  },
  "Trees Planted": {
    title: "Trees Planted",
    description: "The total number of trees you have planted and submitted for verification.",
    when: "Updates only after an Admin reviews and approves your tree plantation proof."
  },
  "Events Attended": {
    title: "Events Attended",
    description: "The number of eco-events you have participated in.",
    when: "Updates after an Admin marks the event as 'Completed' and verifies your attendance."
  }
};
