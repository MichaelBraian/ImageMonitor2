import { useState, useEffect, useRef } from 'react';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

interface LoaderOptions {
  priority?: 'low' | 'high';
  quality?: 'thumbnail' | 'full';
}

export function useImageLoader(url: string, options: LoaderOptions = {}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const observerRef = useRef<IntersectionObserver | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const loadStartTime = useRef<number>(0);

  const loadImage = async (targetUrl: string) => {
    if (!targetUrl) {
      setError('No URL provided');
      setLoading(false);
      return;
    }

    try {
      loadStartTime.current = Date.now();
      let finalUrl = targetUrl;
      
      // Handle Firebase Storage URLs
      if (targetUrl.includes('firebasestorage.googleapis.com')) {
        const path = decodeURIComponent(targetUrl.split('/o/')[1]?.split('?')[0]);
        if (path) {
          const storageRef = ref(storage, path);
          finalUrl = await getDownloadURL(storageRef);
        }
      }

      // Pre-load the image
      const img = new Image();
      imageRef.current = img;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = finalUrl;

        // Add loading priority
        if (options.priority === 'high') {
          img.fetchPriority = 'high';
        }

        // Add loading attribute for better performance
        img.loading = options.priority === 'high' ? 'eager' : 'lazy';
      });

      setImageUrl(finalUrl);
      setError(null);

      // Log loading time for performance monitoring
      const loadTime = Date.now() - loadStartTime.current;
      console.debug(`Image loaded in ${loadTime}ms`, { url: targetUrl, options });

    } catch (err) {
      console.error('Error loading image:', err);
      setError('Failed to load image');
      
      // Retry logic with exponential backoff
      if (retryCount < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
        setRetryCount(prev => prev + 1);
        setTimeout(() => loadImage(targetUrl), delay);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Set up intersection observer for lazy loading
    if (options.priority === 'low') {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              loadImage(url);
              observerRef.current?.disconnect();
            }
          });
        },
        { rootMargin: '50px' }
      );
    } else {
      loadImage(url);
    }

    return () => {
      observerRef.current?.disconnect();
      if (imageRef.current) {
        imageRef.current.src = '';
      }
    };
  }, [url, options.priority]);

  const retryLoading = async () => {
    setLoading(true);
    setError(null);
    setRetryCount(0);
    await loadImage(url);
  };

  return { imageUrl, loading, error, retryLoading };
}