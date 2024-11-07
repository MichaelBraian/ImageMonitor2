import { useState, useEffect } from 'react';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

export function useImageLoader(url: string) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadImage = async () => {
      if (!url) {
        setError('No URL provided');
        setLoading(false);
        return;
      }

      try {
        let finalUrl = url;
        
        // Handle Firebase Storage URLs
        if (url.includes('firebasestorage.googleapis.com')) {
          const path = decodeURIComponent(url.split('/o/')[1]?.split('?')[0]);
          if (path) {
            const storageRef = ref(storage, path);
            finalUrl = await getDownloadURL(storageRef);
          }
        }

        // Pre-load the image
        const img = new Image();
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => {
            reject(new Error('Failed to load image'));
          };

          // Add crossOrigin attribute
          img.crossOrigin = 'anonymous';
          img.src = finalUrl;
        });

        setImageUrl(finalUrl);
        setError(null);
      } catch (err) {
        console.error('Error loading image:', err);
        setError('Failed to load image');
        setImageUrl(null);
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [url]);

  const retryLoading = () => {
    setLoading(true);
    setError(null);
    setImageUrl(null);
  };

  return { imageUrl, loading, error, retryLoading };
}