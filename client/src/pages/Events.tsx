import React, { useState, useEffect } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { Calendar, MapPin, Trophy, ArrowRight, CheckCircle, Clock, Users, Camera, X, ArrowLeft } from "lucide-react";

interface EventType {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  reward_points: number;
  image_url?: string;
  status: string;
  user_status?: string; // added
}

const Events: React.FC = () => {
  const [events, setEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate(); // Hook for navigation

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem("token");
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const res = await api.get("/api/events", config);
      setEvents(res.data);
    } catch (err) {
      console.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinEvent = async (id: number) => {
    console.log("Attempting to join event:", id);
    try {
      const res = await api.post(`/api/events/${id}/join`);
      console.log("Join response:", res.status, res.data);

      if (res.status === 200 || res.status === 201) {
        alert("Successfully joined event! Attend to earn points.");

        // Optimistically update the specific event's user_status
        setEvents(prevEvents => {
          const updated = prevEvents.map(event =>
            event.id === id ? { ...event, user_status: 'joined' } : event
          );
          console.log("Updated events state:", updated);
          return updated;
        });

        // Removed immediate re-fetch to avoid race condition or stale data
        // fetchEvents();
      }
    } catch (err: any) {
      console.error("Join error:", err);
      alert(err.response?.data?.message || "Failed to join event");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div style={styles.page}>
      {/* Header Section */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={styles.backBtn}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(-3px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
            title="Back to Dashboard"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 style={styles.pageTitle}>Community Events</h2>
            <p style={styles.pageSubtitle}>Join local eco-initiatives, make an impact, and earn rewards.</p>
          </div>
        </div>
        <div style={styles.statBadge}>
          <Users size={18} />
          <span>{events.length} Active Events</span>
        </div>
      </div>

      {loading ? (
        <div style={styles.loadingState}>
          <div className="spinner"></div>
          <p>Discovering events near you...</p>
        </div>
      ) : events.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIconBg}>
            <Calendar size={48} color="#10b981" />
          </div>
          <h3 style={styles.emptyTitle}>No events scheduled yet</h3>
          <p style={styles.emptyText}>Check back later for new opportunities to get involved!</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {events.map((event) => (
            <div key={event.id} style={styles.card}>
              {/* Event Image / Placeholder Gradient */}
              <div style={styles.cardMedia}>
                {event.image_url ? (
                  <img src={event.image_url} alt={event.title} style={styles.cardImage} />
                ) : (
                  <div style={styles.cardPlaceholder}>
                    <Calendar size={32} color="white" style={{ opacity: 0.8 }} />
                  </div>
                )}
                <div style={styles.statusBadge(event.status)}>
                  {event.status}
                </div>
              </div>

              <div style={styles.cardContent}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>{event.title}</h3>
                  <div style={styles.pointsBadge}>
                    <Trophy size={14} fill="#eab308" color="#eab308" />
                    <span>{event.reward_points} pts</span>
                  </div>
                </div>

                <div style={styles.metaInfo}>
                  <div style={styles.metaItem}>
                    <Clock size={16} />
                    <span>{formatDate(event.date)} • {event.time}</span>
                  </div>
                  <div style={styles.metaItem}>
                    <MapPin size={16} />
                    <span>{event.location}</span>
                  </div>
                </div>

                <p style={styles.description}>
                  {event.description || "Join us for this eco-friendly activity and make a difference."}
                </p>

                <div style={styles.actionArea}>
                  {event.status === 'upcoming' ? (
                    event.user_status === 'joined' ? (
                      <button style={styles.joinedBtn} disabled>
                        <CheckCircle size={18} /> Registered
                      </button>
                    ) : (
                      <button
                        onClick={() => handleJoinEvent(event.id)}
                        style={styles.joinBtn}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        Join Event <ArrowRight size={18} />
                      </button>
                    )
                  ) : event.status === 'ongoing' ? (
                    event.user_status === 'proof_submitted' ? (
                      <button style={{ ...styles.joinedBtn, background: '#e0f2fe', color: '#0284c7', border: '1px solid #bae6fd' }} disabled>
                        <Clock size={18} /> Under Review
                      </button>
                    ) : event.user_status === 'attended' ? (
                      <button style={styles.joinedBtn} disabled>
                        <CheckCircle size={18} /> Completed
                      </button>
                    ) : event.user_status === 'attendance_rejected' || event.user_status === 'rejected' ? (
                      <button style={{ ...styles.joinedBtn, background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }} disabled>
                        <X size={18} /> Rejected
                      </button>
                    ) : event.user_status === 'joined' ? (
                      <button
                        onClick={() => navigate(`/dashboard/events/${event.id}/submit`)}
                        style={{ ...styles.joinBtn, background: '#f59e0b' }} // Amber for action
                      >
                        Submit Proof <Camera size={18} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleJoinEvent(event.id)}
                        style={styles.joinBtn}
                      >
                        Join Event
                      </button>
                    )
                  ) : (
                    <button style={styles.disabledBtn} disabled>
                      Event Completed
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Events;

// --- Styles ---
const styles: { [key: string]: any } = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    padding: "30px",
    fontFamily: "'Inter', sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: "30px",
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: "20px",
  },
  pageTitle: {
    fontSize: "28px",
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: "8px",
    letterSpacing: "-0.5px",
  },
  pageSubtitle: {
    color: "#64748b",
    fontSize: "16px",
    maxWidth: "600px",
  },
  statBadge: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "white",
    padding: "8px 16px",
    borderRadius: "20px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
    color: "#10b981",
    fontWeight: "600",
    fontSize: "14px",
  },
  // Grid Layout
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
    gap: "24px",
  },
  // Card
  card: {
    background: "white",
    borderRadius: "20px",
    overflow: "hidden",
    boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05)",
    border: "1px solid #f1f5f9",
    display: "flex",
    flexDirection: "column",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
    cursor: "default",
  },
  cardMedia: {
    height: "160px",
    background: "linear-gradient(135deg, #34d399 0%, #10b981 100%)",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  cardPlaceholder: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },
  statusBadge: (status: string) => ({
    position: "absolute",
    top: "12px",
    right: "12px",
    background: status === 'completed' ? 'rgba(0,0,0,0.6)' : 'white',
    color: status === 'completed' ? 'white' : '#10b981',
    padding: "6px 12px",
    borderRadius: "100px",
    fontSize: "12px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    backdropFilter: "blur(4px)",
  }),
  cardContent: {
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "16px",
  },
  cardTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#1e293b",
    margin: 0,
    lineHeight: "1.3",
  },
  pointsBadge: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    background: "#fef9c3",
    color: "#a16207",
    padding: "4px 8px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "700",
    flexShrink: 0,
    marginLeft: "10px",
  },
  metaInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "20px",
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    color: "#64748b",
    fontSize: "14px",
  },
  description: {
    color: "#475569",
    fontSize: "14px",
    lineHeight: "1.6",
    marginBottom: "24px",
    flex: 1,
  },
  actionArea: {
    marginTop: "auto",
  },
  joinBtn: {
    width: "100%",
    padding: "14px",
    background: "#10b981",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)",
  },
  joinedBtn: {
    width: "100%",
    padding: "14px",
    background: "#d1fae5",
    color: "#059669",
    border: "1px solid #a7f3d0",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "default",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  disabledBtn: {
    width: "100%",
    padding: "14px",
    background: "#f1f5f9",
    color: "#94a3b8",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "not-allowed",
  },
  // Empty State
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    background: "white",
    borderRadius: "24px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
  },
  emptyIconBg: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    background: "#ecfdf5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
  },
  emptyTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: "8px",
  },
  emptyText: {
    color: "#64748b",
    fontSize: "16px",
  },
  loadingState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px",
    color: "#64748b",
    gap: "15px",
  },
  backBtn: {
    background: 'white',
    border: 'none',
    padding: '10px',
    borderRadius: '12px',
    cursor: 'pointer',
    color: '#64748b',
    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  }
};
