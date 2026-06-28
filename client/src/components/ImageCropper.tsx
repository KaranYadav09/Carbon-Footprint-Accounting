import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { FiZoomIn, FiZoomOut, FiCheck, FiX } from 'react-icons/fi';
import getCroppedImg from '../utils/cropImage';
import './ImageCropper.css';

interface ImageCropperProps {
    imageSrc: string;
    onCancel: () => void;
    onCropComplete: (croppedImage: string) => void;
}

const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, onCancel, onCropComplete }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    const onCropChange = (crop: { x: number; y: number }) => {
        setCrop(crop);
    };

    const onZoomChange = (zoom: number) => {
        setZoom(zoom);
    };

    const onCropCompleteHandler = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const showCroppedImage = useCallback(async () => {
        try {
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
            if (croppedImage) {
                onCropComplete(croppedImage);
            }
        } catch (e) {
            console.error(e);
        }
    }, [imageSrc, croppedAreaPixels, onCropComplete]);

    return (
        <div className="cropper-modal-overlay">
            <div className="cropper-modal-container">
                <div className="cropper-header">
                    <h3>Edit Profile Picture</h3>
                    <button className="close-btn" onClick={onCancel}>
                        <FiX size={24} />
                    </button>
                </div>

                <div className="cropper-area">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        onCropChange={onCropChange}
                        onCropComplete={onCropCompleteHandler}
                        onZoomChange={onZoomChange}
                        cropShape="round"
                        showGrid={false}
                    />
                </div>

                <div className="cropper-controls">
                    <div className="slider-container">
                        <FiZoomOut size={16} />
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="zoom-slider"
                        />
                        <FiZoomIn size={20} />
                    </div>

                    <div className="cropper-actions">
                        <button className="btn-cancel" onClick={onCancel}>Cancel</button>
                        <button className="btn-save" onClick={showCroppedImage}>
                            <FiCheck size={18} />
                            Save Photo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageCropper;
