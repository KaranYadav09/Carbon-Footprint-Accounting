import React, { useState, useEffect } from "react";
import { studentApi } from "../api";

interface StudentProfile {
  id: number;
  username: string;
  name: string | null;
  email: string | null;
  department: string | null;
  student_id: string | null;
  phone_number: string | null;
  verified: boolean;
}

const StudentVerificationRequest: React.FC = () => {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showRequestForm, setShowRequestForm] = useState(false);
  
  const [formData, setFormData] = useState({
    student_id: "",
    name: "",
    email: "",
    department: "",
    phone_number: ""
  });

  // Fetch current profile
  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await studentApi.getStudentProfile();
      setProfile(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to fetch profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const response = await studentApi.requestVerification(formData);
      setSuccess(response.data.message);
      setShowRequestForm(false);
      // Update local profile state
      setProfile(prev => prev ? {
        ...prev,
        ...formData,
        verified: Boolean(formData.student_id)
      } : null);
      setFormData({
        student_id: "",
        name: "",
        email: "",
        department: "",
        phone_number: ""
      });
      setTimeout(() => setSuccess(""), 5000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // If student is already verified, don't show the request form
  if (profile?.verified) {
    return (
      <div className="verification-container">
        <style>{`
          .verification-container {
            background: #0f172a;
            color: #f9fafb;
            padding: 24px;
            border-radius: 18px;
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.35);
            margin-top: 24px;
            text-align: center;
          }
          .verified-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 999px;
            background: rgba(16, 185, 129, 0.2);
            color: #10b981;
            border: 1px solid rgba(16, 185, 129, 0.4);
            font-weight: 600;
            margin-bottom: 16px;
          }
        `}</style>
        <h2>Student Verification</h2>
        <div className="verified-badge">✅ Account Verified</div>
        <p>Your student ID has been verified. You can now access all features.</p>
      </div>
    );
  }

  return (
    <div className="verification-container">
      <style>{`
        .verification-container {
          background: #0f172a;
          color: #f9fafb;
          padding: 24px;
          border-radius: 18px;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.35);
          margin-top: 24px;
        }
        .verification-header {
          margin-bottom: 24px;
        }
        .verification-header h2 {
          margin: 0 0 8px 0;
          font-size: 24px;
          font-weight: 700;
        }
        .verification-header p {
          color: #94a3b8;
          margin: 0;
        }
        .status-card {
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 24px;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 999px;
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.4);
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .request-btn {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .request-btn:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }
        .message {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .error {
          background: rgba(239, 68, 68, 0.15);
          color: #fecaca;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .success {
          background: rgba(16, 185, 129, 0.15);
          color: #a7f3d0;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: #0f172a;
          padding: 24px;
          border-radius: 18px;
          width: 90%;
          max-width: 500px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-weight: 500;
          color: #cbd5e1;
        }
        .form-group input {
          width: 100%;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid #1e293b;
          background: #020617;
          color: #f9fafb;
          font-size: 14px;
        }
        .form-group input:focus {
          outline: none;
          border-color: #3b82f6;
        }
        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }
        .form-btn {
          flex: 1;
          padding: 12px;
          border-radius: 8px;
          border: none;
          font-weight: 600;
          cursor: pointer;
        }
        .submit-btn {
          background: #3b82f6;
          color: white;
        }
        .cancel-btn {
          background: #1e293b;
          color: #f9fafb;
        }
        .loading {
          text-align: center;
          padding: 20px;
          color: #94a3b8;
        }
      `}</style>

      <div className="verification-header">
        <h2>Student Verification</h2>
        <p>Submit your student ID for admin verification</p>
      </div>

      {error && <div className="message error">{error}</div>}
      {success && <div className="message success">{success}</div>}

      <div className="status-card">
        <div className="status-badge">⚠️ Pending Verification</div>
        <p>Your account is not yet verified. Please submit your student ID for admin approval.</p>
      </div>

      <button className="request-btn" onClick={() => setShowRequestForm(true)}>
        Request Verification
      </button>

      <div style={{ marginTop: "24px", padding: "16px", background: "rgba(59, 130, 246, 0.15)", border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: "12px" }}>
        <h4 style={{ margin: "0 0 8px 0", color: "#93c5fd" }}>💡 For Other Students:</h4>
        <p style={{ margin: "0", color: "#bfdbfe", fontSize: "14px" }}>
          If you have an account but it's not verified, click the "Request Verification" button and submit your Student ID.
          The admin will verify your account and you can then login and use the dashboard.
        </p>
      </div>

      {/* Verification Request Modal */}
      {showRequestForm && (
        <div className="modal-backdrop" onClick={() => setShowRequestForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Request Verification</h3>
            <p style={{ color: "#94a3b8", marginBottom: "20px" }}>
              Submit your student ID and details for admin verification.
            </p>
            <form onSubmit={handleSubmitRequest}>
              <div className="form-group">
                <label>Student ID *</label>
                <input
                  type="text"
                  value={formData.student_id}
                  onChange={(e) => setFormData({...formData, student_id: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="form-btn cancel-btn" onClick={() => setShowRequestForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="form-btn submit-btn" disabled={loading}>
                  {loading ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentVerificationRequest;