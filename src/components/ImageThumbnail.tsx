import React from 'react';
import { Loader2, RefreshCw, ImageOff } from 'lucide-react';
import { useImageLoader } from '../hooks/useImageLoader';

interface ImageThumbnailProps {
  url: string;
  alt: string;
  className?: string;
}

const ImageThumbnail: React.FC<ImageThumbnailProps> = ({ url, alt, className = '' }) => {
  const { imageUrl, loading, error, retryLoading } = useImageLoader(url);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-700 p-4">
        <ImageOff className="w-6 h-6 text-gray-400 mb-2" />
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-2">
          {error}
        </p>
        <button 
          onClick={retryLoading}
          className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 flex items-center text-xs"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Retry
        </button>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
        <ImageOff className="w-6 h-6 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
      <img
        src={imageUrl}
        alt={alt}
        className={`max-h-full max-w-full object-contain ${className}`}
        loading="lazy"
        onError={retryLoading}
      />
      <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-opacity" />
    </div>
  );
};

export default React.memo(ImageThumbnail);