import { createContext, useContext, ReactNode } from "react";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc, getDoc } from "firebase/firestore";
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

const generateFileName = (file: File, patientName: string, group: string): string => {
  const year = new Date().getFullYear();
  const originalExtension = file.name.split('.').pop() || '';
  const sanitizedPatientName = patientName.replace(/[^a-zA-Z0-9]/g, '');
  const sanitizedGroup = group.replace(/[^a-zA-Z0-9]/g, '');
  const uniqueId = uuidv4().slice(0, 8); // Add a short unique ID to prevent naming conflicts
  
  return `${sanitizedPatientName}_${sanitizedGroup}_${year}_${uniqueId}.${originalExtension}`;
};

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

      // Get patient name from Firestore
      const patientDoc = await getDoc(doc(db, 'patients', patientId));
      if (!patientDoc.exists()) {
        throw new Error('Patient not found');
      }
      const patientName = patientDoc.data().name;

      // Generate new filename with patient name and category
      const newFileName = generateFileName(file, patientName, group);
      const fileId = uuidv4();
      const folder = type === '2D' ? 'images' : 'models';
      const storagePath = `patients/${patientId}/${folder}/${newFileName}`;
      
      // Only generate thumbnail for 2D images
      let thumbnailUrl: string | undefined;
      if (type === '2D') {
        try {
          const thumbnail = await generateThumbnail(file);
          const thumbnailPath = `patients/${patientId}/${folder}/thumbnails/${newFileName}`;
          const thumbnailRef = ref(storage, thumbnailPath);
          await uploadBytes(thumbnailRef, thumbnail, {
            contentType: 'image/jpeg',
            cacheControl: 'public, max-age=31536000',
            customMetadata: {
              dentistId: user.uid,
              patientId: patientId,
              fileType: type,
              group: group,
              originalName: file.name,
              patientName: patientName
            }
          });
          thumbnailUrl = await getDownloadURL(thumbnailRef);
        } catch (error) {
          console.error('Failed to generate thumbnail:', error);
        }
      }

      const storageRef = ref(storage, storagePath);
      const metadata = {
        contentType: getContentType(file, type),
        cacheControl: 'public, max-age=31536000',
        customMetadata: {
          dentistId: user.uid,
          patientId: patientId,
          fileType: type,
          format: type === '3D' ? (file.name.split('.').pop()?.toUpperCase() || 'STL') : '2D',
          group: group,
          originalName: file.name,
          patientName: patientName
        }
      };

      const uploadResult = await uploadBytes(storageRef, file, metadata);
      const url = await getDownloadURL(uploadResult.ref);

      // Create the file document without thumbnailUrl first
      const fileData: Omit<DentalFile, 'thumbnailUrl'> = {
        id: fileId,
        name: newFileName,
        url: url,
        type: type,
        format: type === '3D' ? file.name.split('.').pop()?.toUpperCase() || 'STL' : '2D',
        group: group,
        patientId: patientId,
        dentistId: user.uid,
        path: storagePath,
        uploadedAt: new Date().toISOString()
      };

      // Only add thumbnailUrl if it exists for 2D files
      const docData = type === '2D' && thumbnailUrl 
        ? { ...fileData, thumbnailUrl } 
        : fileData;

      const docRef = await addDoc(collection(db, 'files'), docData);
      
      toast.success('File uploaded successfully');
      return { ...fileData, id: docRef.id };
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
      // Get the file document
      const fileDoc = await getDoc(doc(db, 'files', fileId));
      if (!fileDoc.exists()) {
        throw new Error('File not found');
      }
      const fileData = fileDoc.data() as DentalFile;

      // Get patient name
      const patientDoc = await getDoc(doc(db, 'patients', fileData.patientId));
      if (!patientDoc.exists()) {
        throw new Error('Patient not found');
      }
      const patientName = patientDoc.data().name;

      // Generate new filename
      const originalExtension = fileData.name.split('.').pop() || '';
      const newFileName = generateFileName(
        new File([], fileData.name), // Dummy file object for the generateFileName function
        patientName,
        newGroup
      );

      // Generate new paths
      const folder = fileData.type === '2D' ? 'images' : 'models';
      const newStoragePath = `patients/${fileData.patientId}/${folder}/${newFileName}`;

      // Get old and new storage references
      const oldStorageRef = ref(storage, fileData.path);
      const newStorageRef = ref(storage, newStoragePath);

      // Copy the file to new location
      const oldFileBlob = await (await fetch(fileData.url)).blob();
      await uploadBytes(newStorageRef, oldFileBlob, {
        contentType: oldFileBlob.type,
        customMetadata: {
          ...fileData,
          group: newGroup,
          updatedAt: new Date().toISOString()
        }
      });

      // Get new URL
      const newUrl = await getDownloadURL(newStorageRef);

      // Handle thumbnail if it exists
      let newThumbnailUrl = fileData.thumbnailUrl;
      if (fileData.type === '2D' && fileData.thumbnailUrl) {
        const oldThumbnailPath = fileData.path.replace('/images/', '/images/thumbnails/');
        const newThumbnailPath = newStoragePath.replace('/images/', '/images/thumbnails/');
        const oldThumbnailRef = ref(storage, oldThumbnailPath);
        const newThumbnailRef = ref(storage, newThumbnailPath);

        // Copy thumbnail
        const thumbnailBlob = await (await fetch(fileData.thumbnailUrl)).blob();
        await uploadBytes(newThumbnailRef, thumbnailBlob, {
          contentType: 'image/jpeg',
          customMetadata: {
            ...fileData,
            group: newGroup,
            updatedAt: new Date().toISOString()
          }
        });

        newThumbnailUrl = await getDownloadURL(newThumbnailRef);
      }

      // Update Firestore document
      await updateDoc(doc(db, 'files', fileId), {
        name: newFileName,
        path: newStoragePath,
        url: newUrl,
        thumbnailUrl: newThumbnailUrl,
        group: newGroup,
        updatedAt: new Date().toISOString()
      });

      // Delete old files
      await deleteObject(oldStorageRef);
      if (fileData.type === '2D' && fileData.thumbnailUrl) {
        const oldThumbnailRef = ref(storage, fileData.path.replace('/images/', '/images/thumbnails/'));
        await deleteObject(oldThumbnailRef);
      }

      toast.success('File category updated successfully');
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