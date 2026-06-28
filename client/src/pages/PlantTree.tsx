import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { MapPin, Check, X, Camera, Image as ImageIcon, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import api from "../api";
import "./PlantTree.css";

const PlantTree: React.FC = () => {
  const navigate = useNavigate();

  // Form State
  const [treeType, setTreeType] = useState("");
  const [treePhoto, setTreePhoto] = useState<File | null>(null);
  const [treePreview, setTreePreview] = useState<string | null>(null);

  const [selfiePhoto, setSelfiePhoto] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Location Capture
  const handleCaptureLocation = () => {
    setLoadingLocation(true);
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      setLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoadingLocation(false);
        toast.success("Location captured successfully");
      },
      (err) => {
        console.error(err);
        toast.error("Failed to capture location. Please allow GPS access.");
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // File Validation & Handling
  const validateFile = (file: File): boolean => {
    // Check type
    if (!file.type.startsWith('image/')) {
      toast.error("Only image files (JPG, PNG) are allowed.");
      return false;
    }
    // Check size (5MB = 5 * 1024 * 1024 bytes)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error("File size must be less than 5MB.");
      return false;
    }
    return true;
  };

  const handleTreePhotoDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && validateFile(file)) {
      setTreePhoto(file);
      setTreePreview(URL.createObjectURL(file));
    }
  }, []);

  const handleSelfiePhotoDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && validateFile(file)) {
      setSelfiePhoto(file);
      setSelfiePreview(URL.createObjectURL(file));
    }
  }, []);

  const removeTreePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTreePhoto(null);
    if (treePreview) URL.revokeObjectURL(treePreview);
    setTreePreview(null);
  };

  const removeSelfiePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelfiePhoto(null);
    if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    setSelfiePreview(null);
  };

  // Dropzone Hooks
  const { getRootProps: getTreeProps, getInputProps: getTreeInput } = useDropzone({
    onDrop: handleTreePhotoDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png'] },
    maxFiles: 1,
    multiple: false
  });

  const { getRootProps: getSelfieProps, getInputProps: getSelfieInput } = useDropzone({
    onDrop: handleSelfiePhotoDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png'] },
    maxFiles: 1,
    multiple: false
  });

  // Submission
  const handleSubmit = async () => {
    if (!treePhoto || !selfiePhoto || !location) return;

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("treeType", treeType || "Unknown");
    formData.append("treePhoto", treePhoto);
    formData.append("selfiePhoto", selfiePhoto);
    formData.append("lat", location.lat.toString());
    formData.append("lng", location.lng.toString());

    try {
      // Adjust API call as needed for your backend setup
      await api.post("/api/tree", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setIsSuccess(true);
    } catch (error) {
      console.error("Submission failed", error);
      toast.error("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = treePhoto && selfiePhoto && location;

  if (isSuccess) {
    return (
      <div className="success-container">
        <div className="success-icon">
          <Check size={40} strokeWidth={3} />
        </div>
        <h2 className="success-title">Submission Verified!</h2>
        <p className="success-desc">
          Thank you! Your plantation proof has been sent for admin verification.
          Once approved, you will receive your Eco Points.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="btn-dashboard"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="plant-tree-container">
      <div className="plant-header" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
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
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1>Plant a Tree</h1>
          <p>Submit your plantation proof to earn eco points</p>
        </div>
      </div>

      <div className="plant-card">

        {/* 1. Tree Type */}
        <div className="form-group">
          <label className="form-label">Tree Type (optional)</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g., Mango, Neem"
            value={treeType}
            onChange={(e) => setTreeType(e.target.value)}
          />
        </div>

        {/* 2. Tree Photo */}
        <div className="form-group">
          <label className="form-label">Photo of Planted Tree <span style={{ color: 'red' }}>*</span></label>
          <div {...getTreeProps()} className={`file-upload-box ${treePhoto ? 'has-file' : ''}`}>
            <input {...getTreeInput()} />
            {treePreview ? (
              <>
                <img src={treePreview} alt="Tree Preview" className="preview-image" />
                <div className="remove-file" onClick={removeTreePhoto}>
                  <X size={16} color="#ef4444" />
                </div>
              </>
            ) : (
              <div className="upload-placeholder">
                <ImageIcon size={32} />
                <span>Click to upload tree photo</span>
                <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>(JPG, PNG - Max 5MB)</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Selfie Photo */}
        <div className="form-group">
          <label className="form-label">Selfie with Tree <span style={{ color: 'red' }}>*</span></label>
          <div {...getSelfieProps()} className={`file-upload-box ${selfiePhoto ? 'has-file' : ''}`}>
            <input {...getSelfieInput()} />
            {selfiePreview ? (
              <>
                <img src={selfiePreview} alt="Selfie Preview" className="preview-image" />
                <div className="remove-file" onClick={removeSelfiePhoto}>
                  <X size={16} color="#ef4444" />
                </div>
              </>
            ) : (
              <div className="upload-placeholder">
                <Camera size={32} />
                <span>Click to upload selfie</span>
                <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>(JPG, PNG - Max 5MB)</span>
              </div>
            )}
          </div>
        </div>

        {/* 4. Location */}
        <div className="form-group">
          <button
            className={`btn-location ${location ? 'success' : ''}`}
            onClick={handleCaptureLocation}
            disabled={loadingLocation}
          >
            {loadingLocation ? (
              <span>Getting location...</span>
            ) : location ? (
              <>
                <Check size={18} />
                <span>Location captured</span>
              </>
            ) : (
              <>
                <MapPin size={18} />
                <span>Capture Location</span>
              </>
            )}
          </button>
          {location && (
            <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.8rem', color: '#059669' }}>
              Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          className="btn-submit"
          disabled={!isFormValid || isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? "Submitting..." : "Submit for Verification"}
        </button>

      </div>
    </div>
  );
};

export default PlantTree;
