import React, { useState } from 'react';
import api from '../api';

interface UploaderProps {
  onUploadSuccess: () => void;
}

export const BillUploader: React.FC<UploaderProps> = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFile(event.target.files[0]);
      setMessage('');
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first.');
      return;
    }
    setIsLoading(true);
    setError('');
    setMessage('');
    const formData = new FormData();
    formData.append('bill', selectedFile);
    try {
      const response = await api.post('/api/process-bill', formData);
      setMessage(response.data.message || 'Processing Complete!');
      onUploadSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="uploader-container">
      <h2>Upload Utility Bill</h2>
      <p>Upload an image (jpg, png) of a bill to add it to the system.</p>
      <div className="upload-controls">
        <input type="file" onChange={handleFileChange} accept="image/png, image/jpeg" />
        <button onClick={handleUpload} disabled={isLoading || !selectedFile}>
          {isLoading ? 'Processing...' : 'Calculate Emissions'}
        </button>
      </div>
      {error && <div className="result-box error"><p>{error}</p></div>}
      {message && <div className="result-box success"><p>{message}</p></div>}
    </div>
  );
};