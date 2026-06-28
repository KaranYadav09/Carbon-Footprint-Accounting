import React from 'react';
import { FileUpload } from '../components/FileUpload';

// This function is passed as a prop to FileUpload to handle success events
const handleUploadSuccess = (message: string) => {
  console.log('Upload was successful from UploadPage!', message);
};

export const UploadPage: React.FC = () => {
  return (
    <>
      {/* --- CSS is included directly in the file using a <style> tag --- */}
      <style>{`
        :root {
          /* Sidebar-like accent (not exact, just visually similar) */
          --eco-green: #22c55e;
          --eco-green-dark: #16a34a;
          --eco-green-soft: #ecfdf5;
        }

        .upload-page-wrapper {
          min-height: 100vh;
          padding: 2.5rem 3rem;
          background: radial-gradient(circle at top left, #e3f9ef 0, #f3f4f6 40%, #ffffff 100%);
        }

        .dashboard-header {
          margin-bottom: 2rem;
        }
        .dashboard-header h1 {
          font-size: 2.25rem;
          color: #0f172a;
          margin: 0;
          font-weight: 700;
        }
        .dashboard-header p {
          font-size: 1rem;
          color: #6b7280;
          margin-top: 0.25rem;
        }

        .upload-page-content {
          max-width: 900px;
          margin: 0 auto; /* Centering the uploader */
        }

        /* --- Main File Uploader Card --- */
        .file-uploader-container {
          background-color: #ffffff;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.06);
          padding: 2.5rem;
          border-top: 5px solid var(--eco-green); /* green accent bar */
        }

        .file-dropzone {
          border: 2px dashed #a7f3d0;
          border-radius: 12px;
          padding: 2.75rem;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.2s, background-color 0.2s, box-shadow 0.2s, transform 0.15s;
          background-color: #f9fafb;
        }
        .file-dropzone.is-dragging {
          border-color: var(--eco-green);
          background-color: var(--eco-green-soft);
          box-shadow: 0 12px 30px rgba(22, 163, 74, 0.16);
          transform: translateY(-1px);
        }
        .file-dropzone:hover {
          border-color: #6ee7b7;
          background-color: #f3f4ff;
        }

        .upload-instructions {
          color: #6b7280;
        }
        .upload-instructions svg {
          font-size: 3rem;
          color: #9ca3af;
          margin-bottom: 1rem;
        }
        .upload-instructions p {
          margin: 0.5rem 0;
          font-weight: 500;
        }

        .file-input-label {
          color: var(--eco-green);
          font-weight: 600;
          cursor: pointer;
        }
        .file-input-label:hover {
          color: var(--eco-green-dark);
          text-decoration: underline;
        }

        /* Hidden file input */
        .file-input {
          display: none;
        }

        /* Preview area for the selected file */
        .file-preview {
          margin-top: 1.5rem;
          padding: 1rem 1.25rem;
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.95rem;
        }
        .file-preview span {
          font-weight: 500;
          color: #374151;
        }
        .file-preview button { /* For a 'Remove' button */
          background: none;
          border: none;
          color: #ef4444;
          cursor: pointer;
          font-size: 1.1rem;
        }

        /* Upload Button and Status Messages */
        .upload-actions {
          margin-top: 1.75rem;
          text-align: right;
        }
        .upload-status {
          margin-top: 1rem;
          padding: 0.75rem;
          border-radius: 8px;
          text-align: center;
          font-size: 0.95rem;
        }
        .upload-status.success {
          background-color: #d1fae5;
          color: #065f46;
        }
        .upload-status.error {
          background-color: #fee2e2;
          color: #b91c1c;
        }

        /* Reusable button styles */
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.7rem 1.4rem;
          border-radius: 999px;
          font-weight: 600;
          border: 1px solid transparent;
          cursor: pointer;
          transition: background-color 0.2s, box-shadow 0.2s, transform 0.1s;
          font-size: 0.95rem;
        }
        .btn-primary {
          background-color: var(--eco-green);
          color: #ffffff;
          box-shadow: 0 10px 25px rgba(22, 163, 74, 0.25);
        }
        .btn-primary:hover {
          background-color: var(--eco-green-dark);
          box-shadow: 0 14px 30px rgba(22, 163, 74, 0.3);
          transform: translateY(-1px);
        }
        .btn:disabled {
          background-color: #9ca3af;
          box-shadow: none;
          cursor: not-allowed;
          transform: none;
        }
      `}</style>

      {/* --- JSX for the Page --- */}
      <div className="upload-page-wrapper">
        <div className="dashboard-header">
          <h1>Zero-Click Upload</h1>
          <p>Process new bills to add their carbon footprint data to the system.</p>
        </div>

        <div className="upload-page-content">
          {/* FileUpload internally uses .file-uploader-container, .file-dropzone, etc. */}
          <FileUpload onUploadSuccess={handleUploadSuccess} />
        </div>
      </div>
    </>
  );
};
