import React, { useState } from 'react';
import { Download, Box, Loader2, RefreshCw, Pencil } from 'lucide-react';
import { ref, getDownloadURL, uploadString } from 'firebase/storage';
import { storage, db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { DentalFile } from '../types';
import ImageEditor from './ImageEditor';
import toast from 'react-hot-toast';
import { useImageLoader } from '../hooks/useImageLoader';
import ThreeDViewer from './ThreeDViewer';

interface FilePreviewProps {
  file: DentalFile;
  onClose: () => void;
  onGroupChange: (fileId: string, newGroup: string) => void;
  availableGroups: string[];
}

const FilePreview: React.FC<FilePreviewProps> = ({ 
  file, 
  onClose, 
  onGroupChange,
  availableGroups,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { imageUrl, loading, error, retryLoading } = useImageLoader(file.url);

  const handleDownload = async () => {
    try {
      let downloadUrl = file.url;
      if (file.url.includes('firebasestorage.googleapis.com')) {
        const path = decodeURIComponent(file.url.split('/o/')[1]?.split('?')[0]);
        if (path) {
          const storageRef = ref(storage, path);
          downloadUrl = await getDownloadURL(storageRef);
        }
      }

      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  const handleEditComplete = async (editedImageUrl: string) => {
    setSaving(true);
    try {
      const base64Data = editedImageUrl.split(',')[1];
      if (!base64Data) {
        throw new Error('Invalid image data');
      }

      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const newFileName = `${file.name.replace(`.${fileExtension}`, '')}_edited_${timestamp}.${fileExtension}`;
      const newPath = file.path.replace(file.name, newFileName);

      const storageRef = ref(storage, newPath);
      await uploadString(storageRef, base64Data, 'base64', {
        contentType: 'image/jpeg',
        customMetadata: {
          originalName: file.name,
          edited: 'true',
          editedAt: new Date().toISOString()
        }
      });

      const newUrl = await getDownloadURL(storageRef);

      const fileRef = doc(db, 'files', file.id);
      await updateDoc(fileRef, {
        url: newUrl,
        path: newPath,
        name: newFileName,
        updatedAt: new Date().toISOString()
      });

      toast.success('Image edited and saved successfully');
      setIsEditing(false);
      retryLoading();
    } catch (error) {
      console.error('Error saving edited image:', error);
      toast.error('Failed to save edited image');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <select
              value={file.group}
              onChange={(e) => onGroupChange(file.id, e.target.value)}
              className="text-sm rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              {availableGroups.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            {file.type === '2D' && !saving && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                disabled={saving}
              >
                <Pencil className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={handleDownload}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              disabled={saving}
            >
              <Download className="w-5 h-5" />
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              disabled={saving}
            >
              <span className="text-2xl leading-none">&times;</span>
            </button>
          </div>
        </div>
        
        <div className="p-4">
          {file.type === '3D' ? (
            <ThreeDViewer file={file} />
          ) : loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="text-center p-8">
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <button
                onClick={retryLoading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Loading
              </button>
            </div>
          ) : imageUrl ? (
            <img 
              src={imageUrl}
              alt={file.name}
              className="max-h-[70vh] mx-auto object-contain"
              onError={() => {
                toast.error('Failed to load image');
                retryLoading();
              }}
            />
          ) : (
            <div className="text-center p-8">
              <Box className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <p className="text-gray-700 dark:text-gray-300">Preview not available</p>
              <button 
                onClick={handleDownload}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mt-2 inline-block transition-colors"
              >
                Download to view
              </button>
            </div>
          )}
        </div>
      </div>

      {isEditing && imageUrl && file.type === '2D' && (
        <ImageEditor
          imageUrl={imageUrl}
          onSave={handleEditComplete}
          onClose={() => setIsEditing(false)}
        />
      )}
    </div>
  );
};

export default FilePreview;