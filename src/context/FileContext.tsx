import { createContext, useContext, ReactNode } from "react";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { storage, db } from "../lib/firebase";
import { useAuth } from "./AuthContext";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";
import type { DentalFile } from "../types";

interface FileContextType {
  uploadFile: (file: File, patientId: string, type: FileType, group: FileGroup | string) => Promise<DentalFile>;
  getPatientFiles: (patientId: string) => Promise<DentalFile[]>;
  deleteFile: (fileId: string, storagePath: string) => Promise<void>;
  updateFileGroup: (fileId: string, newGroup: string) => Promise<void>;
}

type FileType = '2D' | '3D';
type FileGroup = 'Before' | 'After' | 'Unsorted';

const FileContext = createContext<FileContextType | null>(null);

async function generateThumbnail(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_HEIGHT = 300; // Maximum height for thumbnails
      
      // Calculate new dimensions while preserving aspect ratio
      let width = img.width;
      let height = img.height;
      
      // Scale down to max height while maintaining aspect ratio
      if (height > MAX_HEIGHT) {
        width = (MAX_HEIGHT / height) * width;
        height = MAX_HEIGHT;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create thumbnail'));
          }
        },
        'image/jpeg',
        0.7
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

export function FileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const getContentType = (file: File, type: FileType): string => {
    if (type === '2D') {
      return file.type;
    }
    const extension = file.name.split('.').pop()?.toLowerCase();
    return extension === 'stl' ? 'application/vnd.ms-pki.stl' : 'application/x-ply';
  };

  const uploadFile = async (file: File, patientId: string, type: FileType, group: FileGroup | string): Promise<DentalFile> => {
    try {
      if (!user) {
        throw new Error('User must be authenticated to upload files');
      }

      const fileId = uuidv4();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${fileId}-${sanitizedFileName}`;
      const contentType = getContentType(file, type);
      const folder = type === '2D' ? 'images' : 'models';
      const storagePath = `patients/${patientId}/${folder}/${fileName}`;
      
      // Only generate thumbnail for 2D images
      let thumbnailUrl: string | undefined;
      if (type === '2D') {
        try {
          const thumbnail = await generateThumbnail(file);
          const thumbnailPath = `patients/${patientId}/${folder}/thumbnails/${fileName}`;
          const thumbnailRef = ref(storage, thumbnailPath);
          const thumbnailMetadata = {
            contentType: 'image/jpeg',
            cacheControl: 'public, max-age=31536000',
            customMetadata: {
              dentistId: user.uid,
              patientId: patientId,
              fileType: type,
              group: group,
              originalName: file.name
            }
          };
          await uploadBytes(thumbnailRef, thumbnail, thumbnailMetadata);
          thumbnailUrl = await getDownloadURL(thumbnailRef);
        } catch (error) {
          console.error('Failed to generate thumbnail:', error);
        }
      }

      const storageRef = ref(storage, storagePath);
      const metadata = {
        contentType,
        cacheControl: 'public, max-age=31536000',
        customMetadata: {
          dentistId: user.uid,
          patientId: patientId,
          fileType: type,
          format: type === '3D' ? file.name.split('.').pop()?.toUpperCase() : '2D',
          group: group,
          originalName: file.name
        }
      };

      const uploadResult = await uploadBytes(storageRef, file, metadata);
      const url = await getDownloadURL(uploadResult.ref);

      // Create the file document with conditional thumbnailUrl
      const fileData: Partial<DentalFile> = {
        id: fileId,
        name: file.name,
        url: url,
        type: type,
        format: type === '3D' ? file.name.split('.').pop()?.toUpperCase() || 'STL' : '2D',
        group: group,
        patientId: patientId,
        dentistId: user.uid,
        path: storagePath,
        uploadedAt: new Date().toISOString()
      };

      // Only add thumbnailUrl if it exists (for 2D images)
      if (thumbnailUrl) {
        fileData.thumbnailUrl = thumbnailUrl;
      }

      const docRef = await addDoc(collection(db, 'files'), fileData);
      
      toast.success('File uploaded successfully');
      return { ...fileData, id: docRef.id } as DentalFile;
    } catch (error: any) {
      console.error('Upload error:', error);
      
      let errorMessage = 'Failed to upload file';
      if (error.code === 'storage/unauthorized') {
        errorMessage = 'You do not have permission to upload files for this patient';
      } else if (error.code === 'storage/canceled') {
        errorMessage = 'File upload was canceled';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      throw error;
    }
  };

  const getPatientFiles = async (patientId: string): Promise<DentalFile[]> => {
    if (!user) {
      throw new Error('User must be authenticated to get files');
    }

    try {
      const filesQuery = query(
        collection(db, 'files'),
        where('patientId', '==', patientId),
        where('dentistId', '==', user.uid)
      );

      const snapshot = await getDocs(filesQuery);
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as DentalFile);
    } catch (error: any) {
      console.error('Error loading files:', error);
      toast.error('Failed to load files');
      throw error;
    }
  };

  const updateFileGroup = async (fileId: string, newGroup: string): Promise<void> => {
    if (!user) {
      throw new Error('User must be authenticated to update files');
    }

    try {
      await updateDoc(doc(db, 'files', fileId), {
        group: newGroup,
        updatedAt: new Date().toISOString()
      });
      toast.success('File category updated');
    } catch (error: any) {
      console.error('Error updating file:', error);
      toast.error('Failed to update file category');
      throw error;
    }
  };

  const deleteFile = async (fileId: string, storagePath: string): Promise<void> => {
    if (!user) {
      throw new Error('User must be authenticated to delete files');
    }

    try {
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);

      if (storagePath.includes('/images/')) {
        const thumbnailPath = storagePath.replace('/images/', '/images/thumbnails/');
        try {
          const thumbnailRef = ref(storage, thumbnailPath);
          await deleteObject(thumbnailRef);
        } catch (error) {
          console.error('Error deleting thumbnail:', error);
        }
      }

      await deleteDoc(doc(db, 'files', fileId));
      
      toast.success('File deleted successfully');
    } catch (error: any) {
      console.error('Delete error:', error);
      let errorMessage = 'Failed to delete file';
      if (error.code === 'storage/object-not-found') {
        errorMessage = 'File not found';
      } else if (error.code === 'storage/unauthorized') {
        errorMessage = 'You do not have permission to delete this file';
      }
      toast.error(errorMessage);
      throw error;
    }
  };

  return (
    <FileContext.Provider value={{ uploadFile, getPatientFiles, deleteFile, updateFileGroup }}>
      {children}
    </FileContext.Provider>
  );
}

export function useFiles() {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error('useFiles must be used within a FileProvider');
  }
  return context;
}