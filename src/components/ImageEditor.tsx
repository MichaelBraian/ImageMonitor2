import React, { useState, useCallback } from 'react';
import { X, Check, Loader2, RefreshCw, RotateCw, RotateCcw, ZoomIn, ZoomOut, FlipHorizontal, FlipVertical, Minus, Plus } from 'lucide-react';
import Cropper, { Area, Point } from 'react-easy-crop';
import { useImageLoader } from '../hooks/useImageLoader';
import { getCroppedImg } from '../utils/imageProcessing';
import toast from 'react-hot-toast';

interface ImageEditorProps {
  imageUrl: string;
  onSave: (editedImageUrl: string) => void;
  onClose: () => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ imageUrl: initialImageUrl, onSave, onClose }) => {
  const { imageUrl, loading, error, retryLoading } = useImageLoader(initialImageUrl);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!imageUrl || !croppedAreaPixels) {
      toast.error('Please make a selection first');
      return;
    }

    setSaving(true);
    try {
      const croppedImage = await getCroppedImg(
        imageUrl,
        croppedAreaPixels,
        rotation,
        { horizontal: flipH, vertical: flipV }
      );

      if (!croppedImage.startsWith('data:image/')) {
        throw new Error('Invalid image data generated');
      }

      await onSave(croppedImage);
      toast.success('Image saved successfully');
      onClose();
    } catch (error) {
      console.error('Error saving image:', error);
      toast.error('Failed to save image. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const containerStyle = {
    height: '60vh',
    transform: `scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1})`,
    transition: 'transform 0.3s ease'
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-gray-900 dark:text-white">Loading image...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Failed to Load Image</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={retryLoading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!imageUrl) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex flex-col h-screen">
      <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900">
        <h3 className="text-lg font-medium text-white">Edit Image</h3>
        <div className="flex space-x-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span className="hidden sm:inline">Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Save Changes</span>
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-200 rounded-lg"
            disabled={saving}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="relative" style={containerStyle}>
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={undefined}
          onCropChange={setCrop}
          onCropComplete={onCropComplete}
          onZoomChange={setZoom}
          objectFit="contain"
          cropShape="rect"
          showGrid={true}
        />
      </div>

      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="flex flex-col space-y-4 max-w-lg mx-auto">
          <div className="flex items-center justify-center space-x-4">
            <Minus className="w-4 h-4 text-gray-400 hidden sm:block" />
            <input
              type="range"
              min="-180"
              max="180"
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="w-full sm:w-64 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
              title={`Rotation: ${rotation}°`}
            />
            <Plus className="w-4 h-4 text-gray-400 hidden sm:block" />
            <span className="text-gray-400 min-w-[60px] text-sm hidden sm:block">
              {rotation.toFixed(0)}°
            </span>
          </div>

          <div className="flex justify-center flex-wrap gap-2">
            <button
              onClick={() => setRotation(r => r - 90)}
              className="p-2 text-gray-400 hover:text-white rounded-lg"
              title="Rotate Left 90°"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setRotation(r => r + 90)}
              className="p-2 text-gray-400 hover:text-white rounded-lg"
              title="Rotate Right 90°"
            >
              <RotateCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setZoom(z => Math.min(z + 0.1, 3))}
              className="p-2 text-gray-400 hover:text-white rounded-lg"
              title="Zoom In"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={() => setZoom(z => Math.max(z - 0.1, 1))}
              className="p-2 text-gray-400 hover:text-white rounded-lg"
              title="Zoom Out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={() => setFlipH(f => !f)}
              className={`p-2 rounded-lg ${
                flipH ? 'text-blue-500 bg-blue-500/20' : 'text-gray-400 hover:text-white'
              }`}
              title="Flip Horizontal"
            >
              <FlipHorizontal className="w-5 h-5" />
            </button>
            <button
              onClick={() => setFlipV(f => !f)}
              className={`p-2 rounded-lg ${
                flipV ? 'text-blue-500 bg-blue-500/20' : 'text-gray-400 hover:text-white'
              }`}
              title="Flip Vertical"
            >
              <FlipVertical className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;