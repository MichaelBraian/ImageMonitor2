import React, { useEffect, useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, PerspectiveCamera } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { Loader2 } from 'lucide-react';
import type { DentalFile } from '../types';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import toast from 'react-hot-toast';
import type { BufferGeometry } from 'three';

interface ModelProps {
  url: string;
  format: string;
}

const Model: React.FC<ModelProps> = ({ url, format }) => {
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null);
  const [error, setError] = useState<string | null>(null);

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
            setGeometry(loadedGeometry);
          },
          undefined,
          (err: unknown) => {
            console.error('Error loading 3D model:', err);
            setError('Failed to load 3D model');
            toast.error('Failed to load 3D model');
          }
        );
      } catch (error) {
        console.error('Error loading model:', error);
        setError('Failed to load 3D model');
        toast.error('Failed to load 3D model');
      }
    };

    loadModel();
  }, [url, format]);

  if (error) return null;
  if (!geometry) return null;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#808080" roughness={0.5} metalness={0.5} />
    </mesh>
  );
};

interface ThreeDViewerProps {
  file: DentalFile;
  onClose?: () => void;
}

const ThreeDViewer: React.FC<ThreeDViewerProps> = ({ file, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {file.name}
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <span className="text-2xl">×</span>
            </button>
          )}
        </div>
        
        <div className="relative" style={{ height: '70vh' }}>
          <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 100], fov: 50 }}>
            <Suspense fallback={null}>
              <Stage environment="city" intensity={0.6}>
                <Model url={file.url} format={file.format} />
              </Stage>
            </Suspense>
            <OrbitControls makeDefault />
            <PerspectiveCamera makeDefault position={[0, 0, 100]} />
          </Canvas>

          <div className="absolute bottom-4 right-4 text-sm text-gray-500 dark:text-gray-400">
            Use mouse to rotate • Scroll to zoom • Shift + drag to pan
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreeDViewer; 