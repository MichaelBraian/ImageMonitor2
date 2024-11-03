import { Area } from 'react-easy-crop/types';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

const loadImageWithCORS = async (url: string): Promise<HTMLImageElement> => {
  try {
    // Get fresh download URL for Firebase Storage URLs
    if (url.includes('firebasestorage.googleapis.com')) {
      const path = decodeURIComponent(url.split('/o/')[1]?.split('?')[0]);
      if (!path) throw new Error('Invalid storage URL');
      const storageRef = ref(storage, path);
      url = await getDownloadURL(storageRef);
    }

    // Create a new image with CORS settings
    const image = new Image();
    image.crossOrigin = 'anonymous';

    // Load image with timeout
    await new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        image.src = '';
        reject(new Error('Image load timeout'));
      }, 15000);

      image.onload = () => {
        clearTimeout(timeoutId);
        resolve();
      };

      image.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error('Failed to load image'));
      };

      // Add cache buster and token
      const cacheBuster = `_t=${Date.now()}`;
      const separator = url.includes('?') ? '&' : '?';
      image.src = `${url}${separator}${cacheBuster}`;
    });

    return image;
  } catch (error) {
    console.error('Error loading image:', error);
    throw error instanceof Error ? error : new Error('Failed to load image');
  }
};

export const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0,
  flip = { horizontal: false, vertical: false }
): Promise<string> => {
  try {
    const image = await loadImageWithCORS(imageSrc);

    // Create buffer canvas
    const bufferCanvas = document.createElement('canvas');
    const bufferCtx = bufferCanvas.getContext('2d', { willReadFrequently: true });
    if (!bufferCtx) throw new Error('Failed to get buffer canvas context');

    // Calculate rotated dimensions
    const rotatedSize = getRotatedSize(image.width, image.height, rotation);
    bufferCanvas.width = rotatedSize.width;
    bufferCanvas.height = rotatedSize.height;

    // Fill background
    bufferCtx.fillStyle = '#FFFFFF';
    bufferCtx.fillRect(0, 0, bufferCanvas.width, bufferCanvas.height);

    // Apply transformations
    bufferCtx.save();
    bufferCtx.translate(bufferCanvas.width / 2, bufferCanvas.height / 2);
    bufferCtx.rotate((rotation * Math.PI) / 180);
    bufferCtx.scale(
      flip.horizontal ? -1 : 1,
      flip.vertical ? -1 : 1
    );
    bufferCtx.translate(-image.width / 2, -image.height / 2);

    // Draw image
    bufferCtx.drawImage(image, 0, 0);
    bufferCtx.restore();

    // Create output canvas
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = pixelCrop.width;
    outputCanvas.height = pixelCrop.height;
    const outputCtx = outputCanvas.getContext('2d', { willReadFrequently: true });
    if (!outputCtx) throw new Error('Failed to get output canvas context');

    // Fill background
    outputCtx.fillStyle = '#FFFFFF';
    outputCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

    // Draw cropped image
    outputCtx.drawImage(
      bufferCanvas,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    // Convert to base64
    try {
      const base64Image = outputCanvas.toDataURL('image/jpeg', 0.95);
      if (!base64Image || base64Image === 'data:,') {
        throw new Error('Failed to generate base64 image');
      }
      return base64Image;
    } catch (error) {
      console.error('Error converting to base64:', error);
      throw new Error('Failed to convert image to base64');
    } finally {
      // Clean up
      bufferCanvas.width = 0;
      bufferCanvas.height = 0;
      outputCanvas.width = 0;
      outputCanvas.height = 0;
    }
  } catch (error) {
    console.error('Error processing image:', error);
    throw error instanceof Error ? error : new Error('Failed to process image');
  }
};

const getRotatedSize = (width: number, height: number, rotation: number) => {
  const rotRad = (rotation * Math.PI) / 180;
  const rotatedWidth = Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height);
  const rotatedHeight = Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height);
  return {
    width: Math.ceil(rotatedWidth),
    height: Math.ceil(rotatedHeight)
  };
};