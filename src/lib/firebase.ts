import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Storage configuration
export const getStorageMetadata = (file: File, dentistId: string, patientId: string, type: '2D' | '3D', group: string = 'Unsorted') => ({
  contentType: getContentType(file, type),
  customMetadata: {
    dentistId,
    patientId,
    fileType: type,
    group,
    originalName: file.name,
    uploadedAt: new Date().toISOString()
  }
});

// File type helpers
export const getContentType = (file: File, type: '2D' | '3D'): string => {
  if (type === '2D') {
    return file.type;
  }
  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension === 'stl' ? 'application/vnd.ms-pki.stl' : 'application/x-ply';
};

// File validation
export const validateFile = (file: File, type: '2D' | '3D') => {
  const maxSize = 100 * 1024 * 1024; // 100MB
  
  if (file.size > maxSize) {
    throw new Error('File size exceeds 100MB limit');
  }

  if (type === '2D') {
    const validImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validImageTypes.includes(file.type)) {
      throw new Error('Invalid image format. Please use JPG, PNG, or WebP');
    }
  } else {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !['stl', 'ply'].includes(extension)) {
      throw new Error('Invalid 3D model format. Please use STL or PLY');
    }
  }

  return true;
};

// Generate storage paths
export const generateStoragePath = (file: File, patientId: string, type: '2D' | '3D', isEdited = false) => {
  const fileId = uuidv4();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = isEdited ? `${fileId}-edited-${safeName}` : `${fileId}-${safeName}`;
  const folder = type === '2D' ? 'images' : 'models';
  return `patients/${patientId}/${folder}/${fileName}`;
};

// Generate thumbnail path
export const generateThumbnailPath = (originalPath: string) => {
  const pathParts = originalPath.split('/');
  const fileName = pathParts.pop();
  return `${pathParts.join('/')}/thumbnails/${fileName}`;
};

// Validate storage rules
export const validateStorageRules = (dentistId: string, patientId: string) => {
  if (!dentistId || !patientId) {
    throw new Error('Missing required metadata');
  }
  return true;
};