import React, { useState, useEffect } from "react";
import api from "../api";
import { Check, X, Calendar, MapPin, Trophy, CheckCircle, Trash2, Edit2, Plus } from "lucide-react";

interface TreeRequest {
    id: number;
    user_id: number;
    user_name: string;
    tree_type: string;
    photo_url: string; // Filename
    selfie_url: string; // Filename
    timestamp: string;
    status: string;
}

interface ProofRequest {
    id: number;
    user_name: string;
    user_id: string; // Student ID
    department: string;
    event_title: string;
    proof_photo: string;
    proof_selfie: string;
    proof_lat: number;
    proof_lng: number;
    timestamp: string;
}

interface EventType {
    id?: number;
    title: string;
    description: string;
    date: string;
    time: string;
    location: string;
    reward_points: number;
    image_url?: string;
    status: string;
}

export const ReviewAssignPoints: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'trees' | 'events' | 'proofs'>('trees');

    // --- Tree Request State ---
    const [treeRequests, setTreeRequests] = useState<TreeRequest[]>([]);
    const [loadingTrees, setLoadingTrees] = useState(true);
    const [error, setError] = useState("");

    // --- Proof Request State ---
    const [proofRequests, setProofRequests] = useState<ProofRequest[]>([]);
    const [loadingProofs, setLoadingProofs] = useState(true);
    const [deptFilter, setDeptFilter] = useState("all");

    // --- Event State ---
    const [events, setEvents] = useState<EventType[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [showEventForm, setShowEventForm] = useState(false);
    const [editingEvent, setEditingEvent] = useState<EventType | null>(null);
    const [eventFormData, setEventFormData] = useState<EventType>({
        title: "",
        description: "",
        date: "",
        time: "",
        location: "",
        reward_points: 50,
        image_url: "",
        status: "upcoming",
    });

    // --- Fetch Data on Mount/Tab Change ---
    useEffect(() => {
        if (activeTab === 'trees') fetchTreeRequests();
        else if (activeTab === 'events') fetchEvents();
        else if (activeTab === 'proofs') fetchProofs();
    }, [activeTab, deptFilter]);

    // ================= PROOF LOGIC =================
    const fetchProofs = async () => {
        setLoadingProofs(true);
        try {
            const res = await api.get(`/api/admin/event-proofs?department=${deptFilter}`);
            setProofRequests(res.data);
        } catch (err) {
            console.error("Failed to fetch proofs", err);
        } finally {
            setLoadingProofs(false);
        }
    };

    const handleApproveProof = async (id: number) => {
        try {
            await api.put(`/api/event-proof/${id}/approve`);
            setProofRequests(prev => prev.filter(p => p.id !== id));
        } catch (err) {
            alert("Failed to approve proof");
        }
    };

    const handleRejectProof = async (id: number) => {
        if (!window.confirm("Reject this proof?")) return;
        try {
            await api.put(`/api/event-proof/${id}/reject`);
            setProofRequests(prev => prev.filter(p => p.id !== id));
        } catch (err) {
            alert("Failed to reject proof");
        }
    };

    // ================= TREE LOGIC =================
    const fetchTreeRequests = async () => {
        setLoadingTrees(true);
        try {
            const response = await api.get("/api/admin/trees?status=pending");
            setTreeRequests(response.data);
            setError("");
        } catch (err) {
            setError("Failed to fetch tree requests.");
        } finally {
            setLoadingTrees(false);
        }
    };

    const handleApproveTree = async (id: number) => {
        try {
            await api.put(`/api/tree/${id}/approve`);
            setTreeRequests((prev) => prev.filter((req) => req.id !== id));
        } catch (err) {
            alert("Failed to approve request.");
        }
    };

    const handleRejectTree = async (id: number) => {
        if (!window.confirm("Reject this tree request?")) return;
        try {
            await api.put(`/api/tree/${id}/reject`);
            setTreeRequests((prev) => prev.filter((req) => req.id !== id));
        } catch (err) {
            alert("Failed to reject request.");
        }
    };

    // ================= EVENT LOGIC =================
    const fetchEvents = async () => {
        setLoadingEvents(true);
        try {
            const res = await api.get("/api/events");
            setEvents(res.data);
        } catch (err) {
            console.error("Failed to load events", err);
        } finally {
            setLoadingEvents(false);
        }
    };

    const handleOpenEventForm = (event?: EventType) => {
        if (event) {
            setEditingEvent(event);
            setEventFormData(event);
        } else {
            setEditingEvent(null);
            setEventFormData({
                title: "",
                description: "",
                date: "",
                time: "",
                location: "",
                reward_points: 50,
                image_url: "",
                status: "upcoming",
            });
        }
        setShowEventForm(true);
    };

    const handleEventSubmit = async () => {
        // Validation
        if (!eventFormData.title.trim() || !eventFormData.date.trim() || !eventFormData.time.trim() || !eventFormData.location.trim()) {
            alert("Please fill in all required fields (Title, Date, Time, Location).");
            return;
        }

        try {
            if (editingEvent) {
                await api.put(`/api/events/${editingEvent.id}`, eventFormData);
            } else {
                await api.post("/api/events", eventFormData);
            }
            setShowEventForm(false);
            fetchEvents();
            alert(editingEvent ? "Event updated!" : "Event created successfully!");
        } catch (err: any) {
            console.error("Error saving event:", err);
            // Try to extract specific error from backend
            const backendError = err.response?.data?.error;
            const fallbackError = "Error saving event. Please check inputs.";
            alert(backendError || fallbackError);
        }
    };

    const handleDeleteEvent = async (id?: number) => {
        if (!id) return;
        if (!window.confirm("Delete this event?")) return;
        try {
            await api.delete(`/api/events/${id}`);
            fetchEvents();
        } catch (err) {
            alert("Failed to delete event");
        }
    };

    const handleCompleteEvent = async (id?: number) => {
        if (!id) return;
        if (!window.confirm("Mark as Completed and award points to ALL joined participants? This cannot be undone.")) return;
        try {
            const res = await api.post(`/api/events/${id}/complete`);
            alert(res.data.message);
            fetchEvents();
        } catch (err: any) {
            alert(err.response?.data?.error || "Failed to complete event");
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Review & Assign</h2>
            </div>

            {/* Tabs */}
            <div style={styles.tabs}>
                <button
                    onClick={() => setActiveTab('trees')}
                    style={{
                        ...styles.tab,
                        ...(activeTab === 'trees' ? styles.activeTab : styles.inactiveTab)
                    }}
                >
                    Tree Approvals
                </button>
                <button
                    onClick={() => setActiveTab('events')}
                    style={{
                        ...styles.tab,
                        ...(activeTab === 'events' ? styles.activeTab : styles.inactiveTab)
                    }}
                >
                    Manage Events
                </button>

            </div>

            {/* TREE REQUESTS CONTENT */}
            {activeTab === 'trees' && (
                <div>
                    {loadingTrees ? (
                        <p>Loading requests...</p>
                    ) : error ? (
                        <div style={{ color: 'red', background: '#fee2e2', padding: '10px', borderRadius: '8px' }}>{error}</div>
                    ) : treeRequests.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px' }}>
                            <CheckCircle size={48} color="#cbd5e1" style={{ margin: '0 auto 10px' }} />
                            <p style={{ color: '#64748b' }}>No pending tree requests.</p>
                        </div>
                    ) : (
                        <div style={styles.grid}>
                            {treeRequests.map((req) => (
                                <div key={req.id} style={styles.card}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', height: '150px' }}>
                                        <img
                                            src={req.photo_url && req.photo_url.startsWith('http') ? req.photo_url : `${api.defaults.baseURL}/uploads/${req.photo_url}`}
                                            alt="Tree"
                                            style={styles.image}
                                        />
                                        <img
                                            src={req.selfie_url && req.selfie_url.startsWith('http') ? req.selfie_url : `${api.defaults.baseURL}/uploads/${req.selfie_url}`}
                                            alt="Selfie"
                                            style={styles.image}
                                        />
                                    </div>

                                    <div style={{ padding: '15px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                            <div>
                                                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>{req.user_name}</h3>
                                                <p style={{ fontSize: '0.8rem', color: '#64748b' }}>ID: {req.user_id}</p>
                                            </div>
                                            <span style={styles.badge}>
                                                {req.tree_type}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '15px' }}>
                                            {new Date(req.timestamp).toLocaleString()}
                                        </p>

                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button
                                                onClick={() => handleRejectTree(req.id)}
                                                style={styles.rejectBtn}
                                            >
                                                <X size={16} /> Reject
                                            </button>
                                            <button
                                                onClick={() => handleApproveTree(req.id)}
                                                style={styles.approveBtn}
                                            >
                                                <Check size={16} /> Approve
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* MANAGE EVENTS CONTENT */}
            {activeTab === 'events' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '20px' }}>
                        <button
                            onClick={() => handleOpenEventForm()}
                            style={styles.createBtn}
                        >
                            <Plus size={18} /> Create Event
                        </button>
                        <button
                            onClick={() => setActiveTab('proofs')}
                            style={{ ...styles.createBtn, background: '#f59e0b' }}
                        >
                            <CheckCircle size={18} /> Verify Proofs
                        </button>

                    </div>

                    {loadingEvents ? (
                        <p>Loading events...</p>
                    ) : events.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px' }}>
                            <Calendar size={48} color="#cbd5e1" style={{ margin: '0 auto 10px' }} />
                            <p style={{ color: '#64748b' }}>No events created yet.</p>
                        </div>
                    ) : (
                        <div style={styles.grid}>
                            {events.map((event) => (
                                <div key={event.id} style={{ ...styles.card, padding: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{event.title}</h3>
                                        <span style={{
                                            fontSize: '0.75rem', padding: '4px 8px', borderRadius: '12px', fontWeight: 600,
                                            background: event.status === 'completed' ? '#dcfce7' : '#f1f5f9',
                                            color: event.status === 'completed' ? '#166534' : '#475569'
                                        }}>
                                            {event.status.toUpperCase()}
                                        </span>
                                    </div>

                                    <div style={styles.eventDetails}>
                                        <p style={styles.detailItem}><Calendar size={14} color="#94a3b8" /> {event.date} at {event.time}</p>
                                        <p style={styles.detailItem}><MapPin size={14} color="#94a3b8" /> {event.location}</p>
                                        <p style={styles.detailItem}><Trophy size={14} color="#eab308" /> {event.reward_points} pts</p>
                                    </div>

                                    <div style={styles.eventActions}>
                                        <button onClick={() => handleOpenEventForm(event)} style={styles.iconBtn} title="Edit">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDeleteEvent(event.id)} style={{ ...styles.iconBtn, color: '#ef4444' }} title="Delete">
                                            <Trash2 size={16} />
                                        </button>
                                        {event.status !== 'completed' && (
                                            <button
                                                onClick={() => handleCompleteEvent(event.id)}
                                                style={styles.completeBtn}
                                            >
                                                <CheckCircle size={14} /> Complete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* EVENT PROOFS CONTENT */}
            {activeTab === 'proofs' && (
                <div>
                    <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>Filter by Dept:</label>
                        <select
                            value={deptFilter}
                            onChange={(e) => setDeptFilter(e.target.value)}
                            style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                        >
                            <option value="all">All Departments</option>
                            <option value="Computer Science">Computer Science</option>
                            <option value="Information Technology">Information Technology</option>
                            <option value="Mechanical">Mechanical</option>
                            <option value="Civil">Civil</option>
                            <option value="Electrical">Electrical</option>
                            <option value="Electronics">Electronics</option>
                        </select>
                    </div>

                    {loadingProofs ? (
                        <p>Loading proofs...</p>
                    ) : proofRequests.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px' }}>
                            <CheckCircle size={48} color="#cbd5e1" style={{ margin: '0 auto 10px' }} />
                            <p style={{ color: '#64748b' }}>No pending proofs.</p>
                        </div>
                    ) : (
                        <div style={styles.grid}>
                            {proofRequests.map((proof) => (
                                <div key={proof.id} style={styles.card}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', height: '150px' }}>
                                        <img
                                            src={proof.proof_photo && proof.proof_photo.startsWith('http') ? proof.proof_photo : `${api.defaults.baseURL}/uploads/${proof.proof_photo}`}
                                            alt="Proof"
                                            style={styles.image}
                                        />
                                        <img
                                            src={proof.proof_selfie && proof.proof_selfie.startsWith('http') ? proof.proof_selfie : `${api.defaults.baseURL}/uploads/${proof.proof_selfie}`}
                                            alt="Proof Selfie"
                                            style={styles.image}
                                        />
                                    </div>

                                    <div style={{ padding: '15px' }}>
                                        <div style={{ marginBottom: '10px' }}>
                                            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>{proof.user_name}</h3>
                                            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{proof.department} | {proof.user_id}</p>
                                        </div>

                                        <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px', marginBottom: '10px' }}>
                                            <p style={{ fontSize: '0.85rem', margin: 0, fontWeight: 500, color: '#334155' }}>
                                                Event: {proof.event_title}
                                            </p>
                                            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '4px 0 0' }}>
                                                {new Date(proof.timestamp).toLocaleString()}
                                            </p>
                                        </div>

                                        {proof.proof_lat && (
                                            <p style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '10px' }}>
                                                <MapPin size={12} /> {proof.proof_lat.toFixed(4)}, {proof.proof_lng.toFixed(4)}
                                            </p>
                                        )}

                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button
                                                onClick={() => handleRejectProof(proof.id)}
                                                style={styles.rejectBtn}
                                            >
                                                <X size={16} /> Reject
                                            </button>
                                            <button
                                                onClick={() => handleApproveProof(proof.id)}
                                                style={styles.approveBtn}
                                            >
                                                <Check size={16} /> Verify
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* EVENT FORM MODAL */}
            {showEventForm && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalBox}>
                        <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{editingEvent ? "Edit Event" : "Create New Event"}</h3>
                        </div>

                        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Title *</label>
                                <input
                                    placeholder="Ex: Beach Cleanup"
                                    style={styles.input}
                                    value={eventFormData.title}
                                    onChange={e => setEventFormData({ ...eventFormData, title: e.target.value })}
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Description</label>
                                <textarea
                                    placeholder="Event details..."
                                    style={styles.textarea}
                                    value={eventFormData.description}
                                    onChange={e => setEventFormData({ ...eventFormData, description: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Date *</label>
                                    <input
                                        type="date"
                                        style={styles.input}
                                        value={eventFormData.date}
                                        onChange={e => setEventFormData({ ...eventFormData, date: e.target.value })}
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Time *</label>
                                    <input
                                        type="time"
                                        style={styles.input}
                                        value={eventFormData.time}
                                        onChange={e => setEventFormData({ ...eventFormData, time: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Location *</label>
                                <input
                                    placeholder="Ex: Central Park"
                                    style={styles.input}
                                    value={eventFormData.location}
                                    onChange={e => setEventFormData({ ...eventFormData, location: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Points</label>
                                    <input
                                        type="number"
                                        style={styles.input}
                                        value={eventFormData.reward_points}
                                        onChange={e => setEventFormData({ ...eventFormData, reward_points: Number(e.target.value) })}
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Status</label>
                                    <select
                                        style={styles.input}
                                        value={eventFormData.status}
                                        onChange={e => setEventFormData({ ...eventFormData, status: e.target.value })}
                                    >
                                        <option value="upcoming">Upcoming</option>
                                        <option value="ongoing">Ongoing</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button
                                    onClick={() => setShowEventForm(false)}
                                    style={styles.cancelBtn}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleEventSubmit}
                                    style={styles.submitBtn}
                                >
                                    {editingEvent ? "Update" : "Create"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Styles object for Vanilla CSS (React inline styles)
const styles: { [key: string]: React.CSSProperties } = {
    page: {
        padding: "20px",
        background: "#f8fafc",
        minHeight: "100vh",
    },
    header: {
        marginBottom: "20px",
    },
    tabs: {
        display: "flex",
        gap: "20px",
        marginBottom: "20px",
        borderBottom: "1px solid #e2e8f0",
    },
    tab: {
        background: "none",
        border: "none",
        padding: "10px 5px",
        cursor: "pointer",
        fontSize: "1rem",
        fontWeight: 600,
        position: "relative",
    },
    activeTab: {
        color: "#10b981",
        borderBottom: "2px solid #10b981",
    },
    inactiveTab: {
        color: "#64748b",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: "20px",
    },
    card: {
        background: "white",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
        border: "1px solid #f1f5f9",
    },
    image: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
    },
    badge: {
        background: "#ecfdf5",
        color: "#047857",
        padding: "4px 8px",
        borderRadius: "12px",
        fontSize: "0.75rem",
        fontWeight: 600,
    },
    approveBtn: {
        flex: 1,
        background: "#10b981",
        color: "white",
        border: "none",
        padding: "10px",
        borderRadius: "8px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "5px",
        fontWeight: 600,
    },
    rejectBtn: {
        flex: 1,
        background: "white",
        border: "1px solid #fecaca",
        color: "#ef4444",
        padding: "10px",
        borderRadius: "8px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "5px",
        fontWeight: 600,
    },
    createBtn: {
        background: "#10b981",
        color: "white",
        border: "none",
        padding: "10px 20px",
        borderRadius: "8px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontWeight: 600,
        boxShadow: "0 2px 5px rgba(16, 185, 129, 0.3)",
    },
    eventDetails: {
        marginBottom: '15px',
        display: 'flex',
        flexDirection: 'column',
        gap: '5px'
    },
    detailItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.9rem',
        color: '#64748b',
        margin: 0
    },
    eventActions: {
        display: 'flex',
        gap: '8px',
        borderTop: '1px solid #f1f5f9',
        paddingTop: '15px',
        marginTop: 'auto'
    },
    iconBtn: {
        background: 'none',
        border: 'none',
        padding: '8px',
        borderRadius: '8px',
        cursor: 'pointer',
        color: '#64748b',
        transition: 'background 0.2s',
    },
    completeBtn: {
        marginLeft: 'auto',
        background: '#ecfdf5',
        color: '#15803d',
        border: '1px solid #bbf7d0',
        padding: '6px 12px',
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        fontSize: '0.8rem',
        fontWeight: 600,
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)'
    },
    modalBox: {
        background: 'white',
        width: '90%',
        maxWidth: '500px',
        borderRadius: '16px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        overflow: 'hidden'
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '5px'
    },
    label: {
        fontSize: '0.9rem',
        fontWeight: 600,
        color: '#334155'
    },
    input: {
        padding: '10px',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        fontSize: '1rem',
        outline: 'none',
    },
    textarea: {
        padding: '10px',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        fontSize: '1rem',
        minHeight: '100px',
        fontFamily: 'inherit',
        resize: 'none',
        outline: 'none',
    },
    submitBtn: {
        flex: 1,
        background: "#10b981",
        color: "white",
        border: "none",
        padding: "12px",
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 600,
    },
    cancelBtn: {
        flex: 1,
        background: "#f1f5f9",
        color: "#475569",
        border: "none",
        padding: "12px",
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 600,
    }
};
