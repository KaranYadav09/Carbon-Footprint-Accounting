import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

// --- SVG Icons ---
const FiUploadCloud = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#9ca3af', marginBottom: '1rem' }}>
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
    <polyline points="16 16 12 12 8 16"></polyline>
  </svg>
);

const FiFile = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
    <polyline points="13 2 13 9 20 9"></polyline>
  </svg>
);

const FiXCircle = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>
);

interface FileUploadProps {
  onUploadSuccess: (message: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setStatus('idle');
      setMessage('');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': ['.jpeg', '.jpg'], 'image/png': ['.png'], 'application/pdf': ['.pdf'] },
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file) return;

    const token = localStorage.getItem('token');
    if (!token) {
      alert('You must be logged in to upload a bill.');
      return;
    }

    setStatus('uploading');
    setMessage('Analyzing bill, please wait...');

    const formData = new FormData();
    formData.append('bill', file);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/process-bill`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`, // <-- Send token here
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message);
        onUploadSuccess(data.message);
        setFile(null);
      } else {
        setStatus('error');
        setMessage(data.error || data.msg || 'An unknown error occurred.');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Could not connect to the server. Please try again.');
    }
  };

  return (
    <div className="file-uploader-container">
      <div {...getRootProps()} className={`file-dropzone ${isDragActive ? 'is-dragging' : ''}`}>
        <input {...getInputProps()} className="file-input" />
        <div className="upload-instructions">
          <FiUploadCloud />
          <p>Drag & drop your bill here</p>
          <p>or <span className="file-input-label">select a file</span> from your computer</p>
          <small>PNG, JPG or PDF</small>
        </div>
      </div>

      {file && (
        <div className="file-preview">
          <FiFile />
          <span>{file.name}</span>
          <button onClick={() => setFile(null)}><FiXCircle /></button>
        </div>
      )}

      <div className="upload-actions">
        <button
          onClick={handleUpload}
          className="btn btn-primary"
          disabled={!file || status === 'uploading'}
        >
          {status === 'uploading' ? 'Processing...' : 'Process Bill'}
        </button>
      </div>

      {message && (
        <div className={`upload-status ${status}`}>
          {message}
        </div>
      )}
    </div>
  );
};
