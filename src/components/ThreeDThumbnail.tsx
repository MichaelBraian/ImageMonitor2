import React, { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, PerspectiveCamera } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { Box, Loader2 } from 'lucide-react';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import type { BufferGeometry } from 'three';
import { TOUCH } from 'three';

interface ThreeDThumbnailProps {
  url: string;
  format: string;
  alt: string;
}

const ThreeDThumbnail: React.FC<ThreeDThumbnailProps> = ({ url, format, alt }) => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [geometry, setGeometry] = React.useState<BufferGeometry | null>(null);
  const [hasColors, setHasColors] = React.useState(false);

  useEffect(() => {
    const loadModel = async () => {
      try {
        let modelUrl = url;
        if (url.includes('firebasestorage.googleapis.com')) {
          const path = decodeURIComponent(url.split('/o/')[1]?.split('?')[0]);
          if (path) {
            const storageRef = ref(storage, path);
            modelUrl = await getDownloadURL(storageRef);
          }
        }

        const loader = format.toLowerCase() === 'ply' ? new PLYLoader() : new STLLoader();
        
        loader.load(
          modelUrl,
          (loadedGeometry: BufferGeometry) => {
            loadedGeometry.computeVertexNormals();
            setHasColors(loadedGeometry.attributes.color !== undefined);
            setGeometry(loadedGeometry);
            setLoading(false);
          },
          undefined,
          (err: unknown) => {
            console.error('Error loading 3D thumbnail:', err);
            setError('Failed to load thumbnail');
            setLoading(false);
          }
        );
      } catch (error) {
        console.error('Error loading thumbnail:', error);
        setError('Failed to load thumbnail');
        setLoading(false);
      }
    };

    loadModel();
  }, [url, format]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !geometry) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
        <Box className="w-16 h-16 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <Canvas shadows dpr={[1, 2]}>
        <Stage environment="city" intensity={0.6}>
          <mesh geometry={geometry}>
            {hasColors ? (
              <meshStandardMaterial vertexColors />
            ) : (
              <meshStandardMaterial color="#808080" roughness={0.5} metalness={0.5} />
            )}
          </mesh>
        </Stage>
        <OrbitControls 
          enableZoom={false} 
          enablePan={false} 
          autoRotate 
          autoRotateSpeed={2}
          touches={{
            ONE: TOUCH.ROTATE
          }}
        />
        <PerspectiveCamera makeDefault position={[0, 0, 100]} />
      </Canvas>
    </div>
  );
};

export default ThreeDThumbnail; 