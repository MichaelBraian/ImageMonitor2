import { useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL, uploadString } from 'firebase/storage';
import { storage, validateFile, generateStoragePath, getStorageMetadata, generateThumbnailPath, validateStorageRules } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useAccessControl } from './useAccessControl';
import toast from 'react-hot-toast';

interface UploadProgress {
  progress: number;
  status: 'idle' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export function useFileUpload(patientId?: string) {
  const { user } = useAuth();
  const { permissions } = useAccessControl(patientId);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    progress: 0,
    status: 'idle'
  });

  const uploadFile = async (file: File, type: '2D' | '3D', group: string = 'Unsorted') => {
    if (!user || !patientId) {
      throw new Error('Missing required information');
    }

    if (!permissions.canWrite) {
      throw new Error('You do not have permission to upload files');
    }

    try {
      setUploadProgress({ progress: 0, status: 'uploading' });
      
      // Validate file and permissions
      validateFile(file, type);
      validateStorageRules(user.uid, patientId);

      // Generate paths and metadata
      const storagePath = generateStoragePath(file, patientId, type);
      const metadata = getStorageMetadata(file, user.uid, patientId, type, group);

      // Upload file
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file, metadata);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress({ progress, status: 'uploading' });
          },
          (error) => {
            console.error('Upload error:', error);
            setUploadProgress({
              progress: 0,
              status: 'error',
              error: error.message
            });
            reject(error);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              setUploadProgress({ progress: 100, status: 'completed' });
              resolve({
                url: downloadURL,
                path: storagePath,
                type,
                name: file.name,
                size: file.size,
                metadata: metadata.customMetadata
              });
            } catch (error) {
              setUploadProgress({
                progress: 0,
                status: 'error',
                error: 'Failed to get download URL'
              });
              reject(error);
            }
          }
        );
      });
    } catch (error: any) {
      setUploadProgress({
        progress: 0,
        status: 'error',
        error: error.message
      });
      toast.error(error.message);
      throw error;
    }
  };

  const uploadEditedImage = async (
    imageData: string,
    originalFile: { name: string; patientId: string },
    group: string = 'Unsorted'
  ) => {
    if (!user || !originalFile.patientId) {
      throw new Error('Missing required information');
    }

    if (!permissions.canWrite) {
      throw new Error('You do not have permission to edit files');
    }

    try {
      setUploadProgress({ progress: 0, status: 'uploading' });

      // Generate paths and metadata
      const storagePath = generateStoragePath(
        new File([], originalFile.name),
        originalFile.patientId,
        '2D',
        true
      );

      const metadata = {
        contentType: 'image/jpeg',
        customMetadata: {
          dentistId: user.uid,
          patientId: originalFile.patientId,
          fileType: '2D',
          group,
          originalName: originalFile.name,
          isEdited: 'true',
          editedAt: new Date().toISOString()
        }
      };

      // Upload edited image
      const storageRef = ref(storage, storagePath);
      const base64Data = imageData.split(',')[1];
      
      await uploadString(storageRef, base64Data, 'base64', metadata);
      const downloadURL = await getDownloadURL(storageRef);

      setUploadProgress({ progress: 100, status: 'completed' });
      return {
        url: downloadURL,
        path: storagePath,
        type: '2D' as const,
        name: originalFile.name,
        metadata: metadata.customMetadata
      };
    } catch (error: any) {
      setUploadProgress({
        progress: 0,
        status: 'error',
        error: error.message
      });
      toast.error(error.message);
      throw error;
    }
  };

  const resetProgress = () => {
    setUploadProgress({ progress: 0, status: 'idle' });
  };

  return {
    uploadFile,
    uploadEditedImage,
    uploadProgress,
    resetProgress
  };
}