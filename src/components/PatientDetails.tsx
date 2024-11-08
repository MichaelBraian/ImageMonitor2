import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, ArrowLeft, Box, Loader2, AlertTriangle, Check } from 'lucide-react';
import { useFiles } from '../context/FileContext';
import { useAccessControl } from '../hooks/useAccessControl';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { DentalFile, Patient } from '../types';
import FilePreview from './FilePreview';
import ImageThumbnail from './ImageThumbnail';
import toast from 'react-hot-toast';
import ImageEditor from './ImageEditor';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import ThreeDThumbnail from './ThreeDThumbnail';
import { useTouchFeedback } from '../hooks/useTouchFeedback';
import { useNavigate, useParams } from 'react-router-dom';

interface PatientDetailsProps {
  patient: Patient;
  onBack: () => void;
}

interface FileCardProps {
  file: DentalFile;
  onClick: () => void;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
}

interface TouchInfo {
  startY: number;
  currentY: number;
}

const FileCard: React.FC<FileCardProps> = ({ file, onClick, isSelected, onSelect }) => {
  const { touchProps } = useTouchFeedback({
    activeClass: 'bg-gray-100 dark:bg-gray-700'
  });

  if (file.type === '3D') {
    return (
      <div
        className="border dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white dark:bg-gray-800 cursor-pointer"
        onClick={onClick}
      >
        <div className="h-48">
          <ThreeDThumbnail
            url={file.url}
            format={file.format}
            alt={file.name}
          />
        </div>
        <div className="p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {file.name}
          </div>
          <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            {new Date(file.uploadedAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      {...touchProps}
      className={`relative border dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-all bg-white dark:bg-gray-800 cursor-pointer ${touchProps.className}`}
      onClick={onClick}
    >
      <div 
        className="absolute top-2 left-2 z-10"
        onClick={(e) => onSelect(e)}
      >
        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center
          ${isSelected 
            ? 'bg-blue-500 border-blue-500' 
            : 'border-gray-300 dark:border-gray-600'}`}
        >
          {isSelected && <Check className="w-4 h-4 text-white" />}
        </div>
      </div>

      {file.type === '2D' ? (
        <div className="relative group h-48">
          <ImageThumbnail 
            url={file.thumbnailUrl || file.url} 
            alt={file.name}
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity" />
        </div>
      ) : (
        <div className="h-48 bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
          <Box className="w-16 h-16 text-green-600" />
        </div>
      )}
      <div className="p-4">
        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {file.name}
        </div>
        <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          {new Date(file.uploadedAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};

const PatientDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { uploadFile, getPatientFiles, updateFileGroup, deleteFile } = useFiles();
  const { permissions, loading: accessLoading, verifyAccess } = useAccessControl(id);
  const [files, setFiles] = useState<DentalFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const [availableGroups, setAvailableGroups] = useState<string[]>(['Before', 'After', 'Unsorted']);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<DentalFile | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchInfo = useRef<TouchInfo>({ startY: 0, currentY: 0 });
  const PULL_THRESHOLD = 100; // pixels needed to trigger refresh

  const allowedFileTypes = '.jpg,.jpeg,.png,.stl,.ply';

  useEffect(() => {
    if (id && permissions.canRead) {
      loadFiles();
      loadCategories();
    }
  }, [id, permissions.canRead]);

  const loadFiles = async () => {
    try {
      const patientFiles = await getPatientFiles(id);
      setFiles(patientFiles.sort((a, b) => 
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      ));
    } catch (error) {
      console.error('Error loading files:', error);
      toast.error('Failed to load files');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const categoriesDoc = await getDoc(doc(db, 'settings', 'categories'));
      if (categoriesDoc.exists()) {
        const customCategories = categoriesDoc.data().list || [];
        setAvailableGroups(['Before', 'After', 'Unsorted', ...customCategories]);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const hasAccess = await verifyAccess('canWrite');
    if (!hasAccess) return;

    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    const uploadPromises: Promise<DentalFile>[] = [];

    try {
      Array.from(selectedFiles).forEach(file => {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        const fileType = (fileExtension === 'stl' || fileExtension === 'ply') ? '3D' : '2D';
        const targetGroup = selectedGroup === 'All' ? 'Unsorted' : selectedGroup;
        uploadPromises.push(uploadFile(file, id, fileType, targetGroup));
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      setFiles(prev => [...uploadedFiles, ...prev]);
      toast.success(`Successfully uploaded ${uploadedFiles.length} file(s)`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload one or more files');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleGroupChange = async (fileId: string, newGroup: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    try {
      await updateFileGroup(fileId, newGroup);
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, group: newGroup } : f
      ));
      toast.success('File category updated');
      await loadFiles();
    } catch (error) {
      console.error('Error updating file group:', error);
      toast.error('Failed to update file category');
    }
  };

  const handleBulkCategoryUpdate = async (newGroup: string) => {
    if (selectedFiles.size === 0) {
      toast.error('Please select files to update');
      return;
    }

    try {
      const updatePromises = Array.from(selectedFiles).map(fileId =>
        updateFileGroup(fileId, newGroup)
      );

      await Promise.all(updatePromises);
      await loadFiles(); // Reload files to get updated data
      setSelectedFiles(new Set()); // Clear selection
      toast.success(`Updated ${selectedFiles.size} files to category "${newGroup}"`);
    } catch (error) {
      console.error('Error updating files:', error);
      toast.error('Failed to update some files');
    }
  };

  const toggleFileSelection = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation(); // Prevent opening the file preview
    setSelectedFiles(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(fileId)) {
        newSelection.delete(fileId);
      } else {
        newSelection.add(fileId);
      }
      return newSelection;
    });
  };

  const filteredFiles = files.filter(file => 
    selectedGroup === 'All' ? true : file.group === selectedGroup
  );

  const handleImageClick = async (file: DentalFile) => {
    if (file.type === '2D') {
      setSelectedImageUrl(file.url);
      setCurrentFileId(file.id);
    } else {
      setSelectedFile(file);
    }
  };

  const handleSaveEdit = async (editedImageUrl: string) => {
    if (!currentFileId) return;
    
    try {
      const file = files.find(f => f.id === currentFileId);
      if (!file) return;

      const base64Response = await fetch(editedImageUrl);
      const blob = await base64Response.blob();
      const editedFile = new File([blob], file.name, { type: 'image/jpeg' });

      await deleteFile(file.id, file.path);

      await uploadFile(editedFile, id, '2D', file.group);
      
      await loadFiles();
      
      toast.success('Image edited and saved successfully');
    } catch (error) {
      console.error('Error saving edited image:', error);
      toast.error('Failed to save edited image');
    } finally {
      setSelectedImageUrl(null);
      setCurrentFileId(null);
    }
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) { // Only enable pull-to-refresh at top of page
      touchInfo.current.startY = e.touches[0].clientY;
      touchInfo.current.currentY = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchInfo.current.startY > 0) {
      touchInfo.current.currentY = e.touches[0].clientY;
      const distance = Math.max(0, (touchInfo.current.currentY - touchInfo.current.startY) * 0.5);
      setPullDistance(distance);
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await Promise.all([loadFiles(), loadCategories()]);
        toast.success('Data refreshed');
      } catch (error) {
        console.error('Refresh error:', error);
        toast.error('Failed to refresh data');
      } finally {
        setIsRefreshing(false);
      }
    }
    touchInfo.current.startY = 0;
    touchInfo.current.currentY = 0;
    setPullDistance(0);
  }, [pullDistance, isRefreshing, loadFiles, loadCategories]);

  const handleBack = () => {
    navigate('/patients');
  };

  if (accessLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!permissions.canRead) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-4">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Access Denied
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          You do not have permission to view this patient's records.
        </p>
        <button
          onClick={handleBack}
          className="mt-4 inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Patients
        </button>
      </div>
    );
  }

  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-lg shadow transition-colors"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="transition-transform duration-200 ease-out"
        style={{ 
          transform: `translateY(${pullDistance}px)`,
        }}
      >
        {pullDistance > 0 && (
          <div 
            className="absolute top-0 left-0 right-0 flex items-center justify-center p-2 text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700"
            style={{ 
              height: `${pullDistance}px`,
              opacity: Math.min(pullDistance / PULL_THRESHOLD, 1)
            }}
          >
            {isRefreshing ? (
              <div className="flex items-center">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Refreshing...
              </div>
            ) : (
              <div>
                {pullDistance > PULL_THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}
              </div>
            )}
          </div>
        )}

        <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Patients
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{id}'s Records</h2>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {selectedFiles.size > 0 && (
                <select
                  onChange={(e) => handleBulkCategoryUpdate(e.target.value)}
                  className="w-full sm:w-auto rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  defaultValue=""
                >
                  <option value="" disabled>Move to category...</option>
                  {availableGroups.map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              )}
              <label className={`inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Files
                  </>
                )}
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept={allowedFileTypes}
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full sm:w-auto rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
            >
              <option value="All">All Files</option>
              {availableGroups.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
            
            {selectedFiles.size > 0 && (
              <button
                onClick={() => setSelectedFiles(new Set())}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                Clear selection ({selectedFiles.size})
              </button>
            )}
          </div>
        </div>

        <div className="p-4 md:p-6">
          {isLoading ? (
            <div className="text-center text-gray-500 dark:text-gray-400">Loading files...</div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400">
              {files.length === 0 ? 'No files uploaded yet' : 'No files in this category'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFiles.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  onClick={() => handleImageClick(file)}
                  isSelected={selectedFiles.has(file.id)}
                  onSelect={(e) => toggleFileSelection(e, file.id)}
                />
              ))}
            </div>
          )}
        </div>

        {selectedImageUrl && (
          <ImageEditor
            imageUrl={selectedImageUrl}
            onSave={handleSaveEdit}
            onClose={() => {
              setSelectedImageUrl(null);
              setCurrentFileId(null);
            }}
          />
        )}

        {selectedFile && (
          <FilePreview
            file={selectedFile}
            onClose={() => setSelectedFile(null)}
            onGroupChange={handleGroupChange}
            availableGroups={availableGroups}
            allFiles={filteredFiles}
            onFileChange={setSelectedFile}
          />
        )}
      </div>
    </div>
  );
};

export default PatientDetails;