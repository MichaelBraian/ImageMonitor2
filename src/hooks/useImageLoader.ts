import { useState, useEffect } from 'react';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

export function useImageLoader(url: string) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

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
        img.onerror = reject;
        img.src = finalUrl;
      });

      setImageUrl(finalUrl);
      setError(null);
    } catch (err) {
      console.error('Error loading image:', err);
      setError('Failed to load image');
      
      // Retry logic
      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        await loadImage();
      }
    } finally {
      setLoading(false);
    }
  };

  const retryLoading = async () => {
    setLoading(true);
    setError(null);
    setRetryCount(0);
    await loadImage();
  };

  useEffect(() => {
    loadImage();
  }, [url]);

  return { imageUrl, loading, error, retryLoading };
}