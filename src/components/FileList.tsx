import React, { useState, useEffect } from 'react';
import { Box, Upload, SlidersHorizontal } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import type { DentalFile } from '../types';
import FilePreview from './FilePreview';
import ImageThumbnail from './ImageThumbnail';
import toast from 'react-hot-toast';

const FileCard: React.FC<{ file: DentalFile; onClick: () => void }> = ({ file, onClick }) => {
  if (file.type !== '2D') {
    return (
      <div
        className="border dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white dark:bg-gray-800 cursor-pointer"
        onClick={onClick}
      >
        <div className="h-48 bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
          <Box className="w-16 h-16 text-green-600" />
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
      className="border dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white dark:bg-gray-800 cursor-pointer"
      onClick={onClick}
    >
      <div className="relative group h-48">
        <ImageThumbnail 
          url={file.thumbnailUrl || file.url} 
          alt={file.name}
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity" />
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
};

const FileList: React.FC = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState<DentalFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<DentalFile | null>(null);

  useEffect(() => {
    if (user) {
      loadFiles();
    }
  }, [user]);

  const loadFiles = async () => {
    try {
      const filesQuery = query(
        collection(db, 'files'),
        where('dentistId', '==', user?.uid)
      );
      
      const snapshot = await getDocs(filesQuery);
      const fileData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as DentalFile[];
      
      setFiles(fileData);
    } catch (error) {
      console.error('Error loading files:', error);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow transition-colors">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Files</h2>
          <div className="flex space-x-4">
            <button className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filter
            </button>
            <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="text-center text-gray-500 dark:text-gray-400">Loading files...</div>
        ) : files.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400">No files uploaded yet</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                onClick={() => setSelectedFile(file)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedFile && (
        <FilePreview
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          onGroupChange={() => {}}
          availableGroups={['Before', 'After', 'Unsorted']}
        />
      )}
    </div>
  );
};

export default FileList;