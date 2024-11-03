import React, { useState, useEffect } from 'react';
import { X, Check, Loader2, RefreshCw } from 'lucide-react';
import { ImageEditor as ReactImageEditor } from '@swimmingkiim/react-image-editor';
import toast from 'react-hot-toast';
import type { ImageEditorProps } from './types';

const ImageEditor: React.FC<ImageEditorProps> = ({ image, onSave, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);
  const retryCount = React.useRef(0);
  const maxRetries = 3;

  const loadImage = async () => {
    setLoading(true);
    setError(null);
    setImageData(null);

    try {
      const response = await fetch(image, {
        mode: 'cors',
        headers: {
          'Accept': 'image/*'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) {
        throw new Error('Invalid image format received');
      }

      const reader = new FileReader();
      await new Promise<void>((resolve, reject) => {
        reader.onload = () => {
          setImageData(reader.result as string);
          resolve();
        };
        reader.onerror = () => reject(new Error('Failed to convert image'));
        reader.readAsDataURL(blob);
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading image:', error);
      
      if (retryCount.current < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount.current), 8000);
        retryCount.current += 1;
        
        setTimeout(() => {
          loadImage();
        }, delay);
      } else {
        setError('Failed to load image after multiple attempts');
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadImage();
  }, [image]);

  const handleSave = async (editedImage: string) => {
    try {
      setSaving(true);
      await onSave(editedImage);
    } catch (error) {
      console.error('Error saving image:', error);
      toast.error('Failed to save edited image');
    } finally {
      setSaving(false);
    }
  };

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
                onClick={() => {
                  retryCount.current = 0;
                  loadImage();
                }}
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

  if (loading || !imageData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-gray-900 dark:text-white">Loading editor...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-6xl overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h3 className="text-lg font-medium text-white">Edit Image</h3>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-200 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <div className="relative w-full" style={{ height: 'calc(100vh - 200px)' }}>
          <ReactImageEditor
            image={imageData}
            onSave={handleSave}
            onClose={onClose}
            theme={{
              primary: '#1e293b',
              secondary: '#2d3748',
              background: '#1a1a1a',
              surface: '#374151',
              text: '#ffffff',
              border: '#4b5563'
            }}
            tools={{
              crop: true,
              rotate: true,
              flip: true,
              filter: true,
              adjust: true,
              draw: true,
              text: true,
              sticker: false,
              frame: false
            }}
            defaultTool="filter"
            saveButtonLabel={
              saving ? (
                <div className="flex items-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </div>
              ) : (
                <div className="flex items-center">
                  <Check className="w-4 h-4 mr-2" />
                  Save Changes
                </div>
              )
            }
            i18n={{
              save: 'Save Changes',
              cancel: 'Cancel',
              reset: 'Reset',
              crop: 'Crop',
              rotate: 'Rotate',
              flip: 'Flip',
              filter: 'Filter',
              adjust: 'Adjust',
              draw: 'Draw',
              text: 'Text',
              loading: 'Loading...'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;