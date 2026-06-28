import React, { useEffect, useState } from 'react';
import {
  FiUser,
  FiMail,
  FiMapPin,
  FiPhone,
  FiEdit2,
  FiX,
  FiCamera,
  FiCheck
} from 'react-icons/fi';
import api from '../api';
import './ProfilePage.css';
import ImageCropper from '../components/ImageCropper';

interface UserProfile {
  id: string;
  username: string;
  name?: string;
  email?: string;
  department?: string;
  student_id?: string;
  phone_number?: string;
  profile_picture?: string;
  role: string;
}

const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editData, setEditData] = useState<Partial<UserProfile>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Cropper State
  const [showCropper, setShowCropper] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/profile');
      setProfile(res.data);
      setEditData(res.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/api/profile', editData);
      setProfile(prev => prev ? { ...prev, ...editData } : null);
      setIsEditing(false);
      setImagePreview(null);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData(profile || {});
    setImagePreview(null);
    setShowCropper(false);
    setTempImage(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempImage(reader.result as string);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleCropSave = (croppedImage: string) => {
    setImagePreview(croppedImage);
    setEditData(prev => ({
      ...prev,
      profile_picture: croppedImage
    }));
    setShowCropper(false);
    setTempImage(null);
  };


  if (loading) {
    return <div className="profile-loading">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="profile-error">Failed to load profile</div>;
  }

  return (
    <div className="profile-page">
      {/* Image Cropper Modal */}
      {showCropper && tempImage && (
        <ImageCropper
          imageSrc={tempImage}
          onCancel={() => {
            setShowCropper(false);
            setTempImage(null);
          }}
          onCropComplete={handleCropSave}
        />
      )}

      <div className="profile-container">

        <div className="profile-header">
          <h1>My Profile</h1>
          {!isEditing ? (
            <button className="btn-edit" onClick={() => setIsEditing(true)}>
              <FiEdit2 size={18} />
              <span>Edit Profile</span>
            </button>
          ) : (
            <div className="edit-actions">
              <button className="btn-cancel" onClick={handleCancel} disabled={saving}>
                <FiX size={18} />
                <span>Cancel</span>
              </button>
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="spinner-small" style={{ width: '16px', height: '16px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'lb-spin 1s linear infinite' }}></div>
                    <span>Saving...</span>
                  </div>
                ) : (
                  <>
                    <FiCheck size={18} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="profile-card">
          <div className="profile-banner" />

          <div className="profile-card-header">

            <div className="profile-picture">
              <div className="avatar-container">
                <img
                  className="avatar"
                  src={imagePreview || profile.profile_picture || `https://ui-avatars.com/api/?name=${profile.username}`}
                  alt="Profile"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://ui-avatars.com/api/?name=${profile.username}&background=10b981&color=fff&font-family=Outfit`;
                  }}
                />

                {isEditing && (
                  <div className="upload-overlay">
                    <label htmlFor="profile-image-upload" className="upload-label">
                      <FiCamera size={20} />
                      <input
                        id="profile-image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="profile-info">
              <div className="profile-vitals">
                <h2 className="profile-section-title">
                  {editData.name || profile.name || profile.username}
                </h2>
                <span className="info-badge">{profile.role}</span>
              </div>

              {isEditing ? (
                <div className="form-section">
                  <div className="form-group">
                    <label htmlFor="name">Full Name</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={editData.name || ''}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={editData.email || ''}
                      onChange={handleInputChange}
                      placeholder="Enter your email"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="student_id">Student ID</label>
                    <input
                      type="text"
                      id="student_id"
                      name="student_id"
                      value={editData.student_id || ''}
                      onChange={handleInputChange}
                      placeholder="Enter your student ID"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="department">Department</label>
                    <input
                      type="text"
                      id="department"
                      name="department"
                      value={editData.department || ''}
                      onChange={handleInputChange}
                      placeholder="Enter your department"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone_number">Phone Number</label>
                    <input
                      type="tel"
                      id="phone_number"
                      name="phone_number"
                      value={editData.phone_number || ''}
                      onChange={handleInputChange}
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>
              ) : (
                <div className="info-section">
                  <div className="info-item">
                    <FiMail className="info-icon" />
                    <div className="info-content">
                      <div className="info-label">Email</div>
                      <div className="info-value">{profile.email || 'Not provided'}</div>
                    </div>
                  </div>

                  <div className="info-item">
                    <FiUser className="info-icon" />
                    <div className="info-content">
                      <div className="info-label">Student ID</div>
                      <div className="info-value">{profile.student_id || 'Not provided'}</div>
                    </div>
                  </div>

                  <div className="info-item">
                    <FiMapPin className="info-icon" />
                    <div className="info-content">
                      <div className="info-label">Department</div>
                      <div className="info-value">{profile.department || 'Not provided'}</div>
                    </div>
                  </div>

                  <div className="info-item">
                    <FiPhone className="info-icon" />
                    <div className="info-content">
                      <div className="info-label">Phone</div>
                      <div className="info-value">{profile.phone_number || 'Not provided'}</div>
                    </div>
                  </div>

                  <div className="info-item">
                    <div className="info-icon"><FiUser /></div>
                    <div className="info-content">
                      <div className="info-label">Username</div>
                      <div className="info-value">@{profile.username}</div>
                    </div>
                  </div>

                  <div className="info-item">
                    <FiUser className="info-icon" />
                    <div className="info-content">
                      <div className="info-label">Role</div>
                      <span className="info-badge">{profile.role}</span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProfilePage;
