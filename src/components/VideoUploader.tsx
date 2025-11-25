import React, { useState } from 'react';
import { Upload } from 'lucide-react';

interface VideoUploaderProps {
  onVideoLoad: (videoData: { file: File; url: string; name: string; size: number }) => void;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({ onVideoLoad }) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      handleFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFile = (file: File) => {
    const videoUrl = URL.createObjectURL(file);
    onVideoLoad({
      file,
      url: videoUrl,
      name: file.name,
      size: file.size
    });
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`upload-zone ${dragActive ? 'active' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <Upload size={48} />
      <h3>Upload Workout Video</h3>
      <p>Drag and drop or click to select</p>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileInput}
        style={{ display: 'none' }}
        id="video-upload"
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          fileInputRef.current?.click();
        }}
      >
        Choose File
      </button>
    </div>
  );
};

export default VideoUploader;

