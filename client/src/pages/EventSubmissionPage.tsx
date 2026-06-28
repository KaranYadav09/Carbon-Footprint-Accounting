import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { Camera, MapPin, Upload, X, CheckCircle, ArrowLeft } from 'lucide-react';
import { toast, Toaster } from 'sonner';

const EventSubmissionPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // File states
    const [proofPhoto, setProofPhoto] = useState<File | null>(null);
    const [proofSelfie, setProofSelfie] = useState<File | null>(null);

    // Previews
    const [proofPreview, setProofPreview] = useState<string | null>(null);
    const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

    // --- Location Logic ---
    const handleGetLocation = () => {
        setIsLoadingLocation(true);
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser");
            setIsLoadingLocation(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                toast.success("Location captured!");
                setIsLoadingLocation(false);
            },
            (error) => {
                console.error(error);
                toast.error("Unable to retrieve your location");
                setIsLoadingLocation(false);
            }
        );
    };

    // --- File Handling ---
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'proof' | 'selfie') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                if (type === 'proof') {
                    setProofPhoto(file);
                    setProofPreview(reader.result as string);
                } else {
                    setProofSelfie(file);
                    setSelfiePreview(reader.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    // --- Submit Logic ---
    const handleSubmit = async () => {
        if (!proofPhoto || !proofSelfie) {
            toast.error("Please upload both event photo and selfie.");
            return;
        }

        // Location is optional but recommended
        // if (!location) { ... }

        setSubmitting(true);
        const formData = new FormData();
        formData.append("proof_photo", proofPhoto);
        formData.append("proof_selfie", proofSelfie);
        if (location) {
            formData.append("lat", location.lat.toString());
            formData.append("lng", location.lng.toString());
        }

        try {
            await api.post(`/api/events/${id}/submit`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            toast.success("Proof submitted successfully!");
            setTimeout(() => navigate('/dashboard/events'), 1500);
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.error || "Failed to submit proof.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={styles.page}>
            <Toaster position="top-center" />

            <div style={styles.container}>
                <button onClick={() => navigate(-1)} style={styles.backBtn}>
                    <ArrowLeft size={18} /> Back
                </button>

                <div style={styles.header}>
                    <h2 style={styles.title}>Submit Event Proof</h2>
                    <p style={styles.subtitle}>Upload photos to verify your attendance and earn points.</p>
                </div>

                <div style={styles.formContainer}>

                    {/* 1. Location */}
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>1. Location Verification</h3>
                        <div style={styles.locationBox}>
                            {location ? (
                                <div style={styles.locationActive}>
                                    <MapPin size={20} color="#10b981" />
                                    <span>Location Captured: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
                                    <CheckCircle size={18} color="#10b981" style={{ marginLeft: 'auto' }} />
                                </div>
                            ) : (
                                <button
                                    onClick={handleGetLocation}
                                    style={styles.locationBtn}
                                    disabled={isLoadingLocation}
                                >
                                    <MapPin size={18} />
                                    {isLoadingLocation ? "Getting Location..." : "Capture Current Location"}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 2. Event Photo */}
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>2. Event Photo</h3>
                        <p style={styles.helpText}>Take a photo of the event activity (e.g., the cleanup site, tree planting).</p>

                        <div style={styles.uploadArea}>
                            {proofPreview ? (
                                <div style={styles.previewContainer}>
                                    <img src={proofPreview} alt="Event" style={styles.previewImage} />
                                    <button onClick={() => { setProofPhoto(null); setProofPreview(null) }} style={styles.removeBtn}>
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <label style={styles.uploadLabel}>
                                    <Upload size={24} color="#64748b" />
                                    <span style={{ marginTop: '8px', color: '#64748b' }}>Tap to upload Event Photo</span>
                                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'proof')} hidden />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* 3. Selfie */}
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>3. Selfie at Event</h3>
                        <p style={styles.helpText}>Take a selfie of yourself at the event location.</p>

                        <div style={styles.uploadArea}>
                            {selfiePreview ? (
                                <div style={styles.previewContainer}>
                                    <img src={selfiePreview} alt="Selfie" style={styles.previewImage} />
                                    <button onClick={() => { setProofSelfie(null); setSelfiePreview(null) }} style={styles.removeBtn}>
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <label style={styles.uploadLabel}>
                                    <Camera size={24} color="#64748b" />
                                    <span style={{ marginTop: '8px', color: '#64748b' }}>Tap to take Selfie</span>
                                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'selfie')} hidden />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmit}
                        style={styles.submitBtn}
                        disabled={submitting}
                    >
                        {submitting ? "Submitting..." : "Submit Proof"}
                    </button>

                </div>
            </div>
        </div>
    );
};

export default EventSubmissionPage;

const styles: { [key: string]: React.CSSProperties } = {
    page: {
        minHeight: '100vh',
        background: '#f8fafc',
        padding: '20px',
        fontFamily: "'Inter', sans-serif"
    },
    container: {
        maxWidth: '600px',
        margin: '0 auto',
    },
    backBtn: {
        background: 'none',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        color: '#64748b',
        cursor: 'pointer',
        fontWeight: 600,
        marginBottom: '20px'
    },
    header: {
        marginBottom: '30px'
    },
    title: {
        fontSize: '1.75rem',
        fontWeight: 800, // Extra bold
        color: '#1e293b',
        marginBottom: '5px'
    },
    subtitle: {
        color: '#64748b',
        fontSize: '1rem'
    },
    formContainer: {
        background: 'white',
        borderRadius: '20px',
        padding: '25px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
    },
    section: {
        marginBottom: '30px'
    },
    sectionTitle: {
        fontSize: '1.1rem',
        fontWeight: 700,
        color: '#334155',
        marginBottom: '5px'
    },
    helpText: {
        fontSize: '0.9rem',
        color: '#94a3b8',
        marginBottom: '15px'
    },
    locationBox: {
        marginTop: '10px'
    },
    locationBtn: {
        width: '100%',
        padding: '12px',
        background: '#f1f5f9', // Slate-100
        border: '1px dashed #cbd5e1',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        color: '#475569',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    locationActive: {
        padding: '12px',
        background: '#ecfdf5', // Emerald-50
        border: '1px solid #10b981',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        color: '#065f46',
        fontWeight: 500
    },
    uploadArea: {
        width: '100%',
        height: '180px',
        background: '#f8fafc',
        borderRadius: '16px',
        border: '2px dashed #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative'
    },
    uploadLabel: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: 'pointer',
        width: '100%',
        height: '100%',
        justifyContent: 'center'
    },
    previewContainer: {
        width: '100%',
        height: '100%',
        position: 'relative'
    },
    previewImage: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        borderRadius: '14px' // slightly less than container
    },
    removeBtn: {
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'rgba(0,0,0,0.5)',
        color: 'white',
        border: 'none',
        borderRadius: '50%',
        width: '28px',
        height: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer'
    },
    submitBtn: {
        width: '100%',
        padding: '16px',
        background: '#10b981', // Emerald-500
        color: 'white',
        border: 'none',
        borderRadius: '14px',
        fontSize: '1.1rem',
        fontWeight: 700,
        cursor: 'pointer',
        marginTop: '10px',
        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
        transition: 'transform 0.2s'
    }
};
