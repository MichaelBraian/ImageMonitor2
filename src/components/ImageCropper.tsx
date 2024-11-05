import React, { useState, useRef, useEffect } from 'react';
import { X, Check } from 'lucide-react';

interface ImageCropperProps {
  image: string;
  onCropComplete: (croppedImage: string) => void;
  onClose: () => void;
}

const ImageCropper: React.FC<ImageCropperProps> = ({ image, onCropComplete, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 200, height: 200 });
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = image;
    img.onload = () => {
      setImageObj(img);
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const scale = Math.min(
            canvas.width / img.width,
            canvas.height / img.height
          );
          
          const x = (canvas.width - img.width * scale) / 2;
          const y = (canvas.height - img.height * scale) / 2;
          
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          
          // Center the crop area
          setCropArea({
            x: (canvas.width - 200) / 2,
            y: (canvas.height - 200) / 2,
            width: 200,
            height: 200
          });
        }
      }
    };
  }, [image]);

  useEffect(() => {
    if (canvasRef.current && imageObj) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw image
        const scale = Math.min(
          canvas.width / imageObj.width,
          canvas.height / imageObj.height
        );
        const x = (canvas.width - imageObj.width * scale) / 2;
        const y = (canvas.height - imageObj.height * scale) / 2;
        ctx.drawImage(imageObj, x, y, imageObj.width * scale, imageObj.height * scale);
        
        // Draw dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw semi-transparent crop area
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
        
        // Draw crop area border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
      }
    }
  }, [cropArea, imageObj]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      if (
        x >= cropArea.x &&
        x <= cropArea.x + cropArea.width &&
        y >= cropArea.y &&
        y <= cropArea.y + cropArea.height
      ) {
        setIsDragging(true);
        setStartPos({ x: x - cropArea.x, y: y - cropArea.y });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging && canvasRef.current) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      let newX = e.clientX - rect.left - startPos.x;
      let newY = e.clientY - rect.top - startPos.y;
      
      newX = Math.max(0, Math.min(newX, canvas.width - cropArea.width));
      newY = Math.max(0, Math.min(newY, canvas.height - cropArea.height));
      
      setCropArea(prev => ({
        ...prev,
        x: newX,
        y: newY
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Function to change crop area size
  const changeCropSize = (newSize: number) => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const maxSize = Math.min(canvas.width, canvas.height) - 40; // Leave some margin
      const size = Math.min(Math.max(100, newSize), maxSize); // Min 100px, max maxSize
      
      // Keep the crop area centered when resizing
      const newX = cropArea.x + (cropArea.width - size) / 2;
      const newY = cropArea.y + (cropArea.height - size) / 2;
      
      setCropArea({
        x: Math.max(0, Math.min(newX, canvas.width - size)),
        y: Math.max(0, Math.min(newY, canvas.height - size)),
        width: size,
        height: size
      });
    }
  };

  const handleCropComplete = () => {
    if (canvasRef.current && imageObj) {
      const canvas = document.createElement('canvas');
      canvas.width = cropArea.width;
      canvas.height = cropArea.height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        const scale = Math.min(
          canvasRef.current.width / imageObj.width,
          canvasRef.current.height / imageObj.height
        );
        
        const sourceX = (cropArea.x - (canvasRef.current.width - imageObj.width * scale) / 2) / scale;
        const sourceY = (cropArea.y - (canvasRef.current.height - imageObj.height * scale) / 2) / scale;
        const sourceWidth = cropArea.width / scale;
        const sourceHeight = cropArea.height / scale;
        
        ctx.drawImage(
          imageObj,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          cropArea.width,
          cropArea.height
        );
        
        onCropComplete(canvas.toDataURL('image/jpeg', 0.9));
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-[100] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-medium text-white">
            Adjust Profile Photo
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={() => handleCropComplete()}
              className="p-2 text-green-500 hover:text-green-400 transition-colors"
              aria-label="Save"
            >
              <Check className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-300 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4">
          <canvas
            ref={canvasRef}
            width={Math.min(600, window.innerWidth - 32)}
            height={Math.min(400, window.innerHeight - 200)}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={(e) => {
              const touch = e.touches[0];
              handleMouseDown({ 
                clientX: touch.clientX, 
                clientY: touch.clientY 
              } as React.MouseEvent<HTMLCanvasElement>);
            }}
            onTouchMove={(e) => {
              const touch = e.touches[0];
              handleMouseMove({ 
                clientX: touch.clientX, 
                clientY: touch.clientY 
              } as React.MouseEvent<HTMLCanvasElement>);
            }}
            onTouchEnd={handleMouseUp}
            className="max-w-full max-h-[70vh] object-contain cursor-move"
          />
          <div className="mt-4 flex justify-center items-center space-x-4">
            <input
              type="range"
              min="100"
              max="300"
              value={cropArea.width}
              onChange={(e) => changeCropSize(Number(e.target.value))}
              className="w-48 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span className="text-sm text-gray-400">
              Adjust crop size
            </span>
          </div>
          <p className="mt-2 text-sm text-center text-gray-400">
            Drag to adjust position • Use slider to resize
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;