import React, { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { X, Check, Loader2 } from 'lucide-react';
import { getCroppedImg } from '../../utils/imageProcessing';

interface ImageEditorProps {
  imageUrl: string;
  onSave: (editedImageUrl: string) => void;
  onClose: () => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ imageUrl, onSave, onClose }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [selectedAspect, setSelectedAspect] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const aspectRatios = [
    { label: 'Free', value: undefined },
    { label: '16:9', value: 16 / 9 },
    { label: '9:16', value: 9 / 16 }
  ];

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    try {
      if (!croppedAreaPixels) return;
      setSaving(true);
      const croppedImage = await getCroppedImg(imageUrl, croppedAreaPixels, rotation);
      await onSave(croppedImage);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex flex-col h-screen">
      {/* Top Bar */}
      <div className="flex justify-between items-center p-4 bg-gray-900">
        <h3 className="text-lg font-medium text-white">Edit Image</h3>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                <span>Save Changes</span>
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-200 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="relative flex-1">
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          aspect={selectedAspect}
          onCropChange={setCrop}
          onCropComplete={onCropComplete}
          onZoomChange={setZoom}
          rotation={rotation}
        />
      </div>

      {/* Bottom Controls */}
      <div className="bg-gray-900 p-4">
        <div className="flex flex-col space-y-4 max-w-lg mx-auto">
          {/* Aspect Ratio Selector */}
          <div className="flex items-center justify-center space-x-4">
            <select
              value={selectedAspect?.toString() || 'free'}
              onChange={(e) => {
                const value = e.target.value === 'free' 
                  ? undefined 
                  : parseFloat(e.target.value);
                setSelectedAspect(value);
              }}
              className="px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {aspectRatios.map((ratio) => (
                <option 
                  key={ratio.label} 
                  value={ratio.value?.toString() || 'free'}
                >
                  {ratio.label}
                </option>
              ))}
            </select>
          </div>

          {/* Zoom Slider */}
          <div className="flex items-center justify-center space-x-4">
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Rotation Slider */}
          <div className="flex items-center justify-center space-x-4">
            <input
              type="range"
              min={-180}
              max={180}
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-white min-w-[3ch]">{rotation}°</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;