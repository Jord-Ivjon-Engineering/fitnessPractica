import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AdvancedVideoEditor from '../components/AdvancedVideoEditor';
import '../styles/VideoEditorContainer.css';

interface Overlay {
  id: string;
  type: 'text' | 'timer' | 'image';
  content: string;
  startTime: number;
  endTime: number;
  position: { x: number; y: number };
  style?: any;
}

interface VideoData {
  url: string;
  name: string;
  isExisting?: boolean;
  existingVideoId?: number;
  fileSize?: number;
}

const ProgramVideoEditor = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get video data from location state
  const videoDataFromState = location.state as VideoData | null;
  const programId = location.state?.programId as number | undefined;
  const videoFileSize = videoDataFromState?.fileSize;
  
  const [exercises, setExercises] = useState<Array<{ id: number; name: string; start: number; end: number }>>([]);
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [videoError, setVideoError] = useState<string>('');
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string>('');
  const [videoTitle, setVideoTitle] = useState<string>(videoDataFromState?.name || 'Untitled Video');

  useEffect(() => {
    // Hide header and footer when editor is active
    document.body.classList.add('video-editor-active');
    
    return () => {
      document.body.classList.remove('video-editor-active');
    };
  }, []);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }

    if (user.role !== 'admin') {
      setVideoError('Access denied. Admin privileges required.');
      setTimeout(() => {
        navigate('/');
      }, 2000);
      return;
    }

    // If no video data, redirect back to admin dashboard
    if (!videoDataFromState?.url) {
      navigate('/admin/dashboard');
    }
  }, [user, isAuthenticated, isLoading, navigate, videoDataFromState]);

  const handleExercisesUpdate = (updatedExercises: Array<{ id: number; name: string; start: number; end: number }>) => {
    setExercises(updatedExercises);
  };

  const processVideo = async () => {
    if (!videoDataFromState) {
      setVideoError('No video data available.');
      return;
    }

    // Allow processing with either exercises or overlays
    if (exercises.length === 0 && overlays.length === 0) {
      setVideoError('Please add at least one exercise or overlay.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setVideoError('Authentication token not found. Please log in again.');
      return;
    }

    // Convert exercises format for backend (start, duration instead of start, end)
    const backendExercises = exercises.length > 0 ? exercises.map(ex => ({
      name: ex.name,
      start: ex.start,
      duration: ex.end - ex.start
    })) : [];

    const formData = new FormData();
    
    // If it's a blob URL, we need to fetch and upload the file
    // Otherwise, use the video URL from state
    if (videoDataFromState.url.startsWith('blob:')) {
      // Fetch the blob and convert to File
      try {
        const response = await fetch(videoDataFromState.url);
        const blob = await response.blob();
        const file = new File([blob], videoDataFromState.name || 'video.mp4', { type: blob.type });
        formData.append('video', file);
      } catch (error) {
        setVideoError('Failed to process video file. Please try uploading again.');
        return;
      }
    } else {
      // Use the video URL (server URL)
      formData.append('videoUrl', videoDataFromState.url);
    }
    
    // Add exercises if any
    if (backendExercises.length > 0) {
      formData.append('exercises', JSON.stringify(backendExercises));
    }
    
    // Add overlays if any
    if (overlays.length > 0) {
      formData.append('overlays', JSON.stringify(overlays));
    }

    setIsProcessingVideo(true);
    setVideoError('');
    setProcessedVideoUrl('');

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const baseUrl = API_URL.replace('/api', '');

      // Use XMLHttpRequest to report upload progress
      const xhr = new XMLHttpRequest();

      xhr.open('POST', `${baseUrl}/video/edit`, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      };

      const resultPromise: Promise<any> = new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const json = JSON.parse(xhr.responseText);
              resolve(json);
            } catch (e) {
              reject(new Error('Invalid server response'));
            }
          } else {
            let message = 'Server error';
            try {
              const json = JSON.parse(xhr.responseText);
              message = json.error || message;
            } catch {}
            reject(new Error(`${message}: ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.onabort = () => reject(new Error('Upload aborted'));
      });

      xhr.send(formData);

      const result = await resultPromise;
      if (result.success && result.data?.url) {
        setProcessedVideoUrl(result.data.url);
        setVideoError('');
        // Update video title after processing (you can customize this based on your API response)
        // For now, we'll append " (Processed)" or use a timestamp
        const timestamp = new Date().toLocaleString();
        setVideoTitle(`${videoTitle} - Processed ${timestamp}`);
      } else {
        throw new Error(result.error || 'Video processing failed');
      }
    } catch (err: any) {
      console.error('Error processing video:', err);
      setVideoError(err.message || 'Failed to process video');
    } finally {
      setUploadProgress(0);
      setIsProcessingVideo(false);
    }
  };

  const handleBackToUpload = () => {
    navigate('/admin/dashboard', { 
      state: { 
        programId,
        returnToUpload: true,
        programStep: 'upload'
      } 
    });
  };

  if (!videoDataFromState?.url) {
    return null; // Will redirect in useEffect
  }

  // Handle blob URLs (from file upload) or server URLs
  const videoUrl = videoDataFromState.url.startsWith('blob:') || videoDataFromState.url.startsWith('http')
    ? videoDataFromState.url 
    : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001'}${videoDataFromState.url}`;

  return (
    <div className="video-editor-container">
      <div className="video-editor-wrapper">
        {/* Advanced Video Editor */}
        <AdvancedVideoEditor
          videoUrl={videoUrl}
          videoTitle={videoTitle}
          videoSize={videoFileSize}
          onTitleChange={setVideoTitle}
          onExercisesChange={(exs) => {
            setExercises(exs);
            handleExercisesUpdate(exs);
          }}
          onOverlaysChange={setOverlays}
          onDurationChange={setVideoDuration}
          onExport={({ exercises, overlays }) => {
            // Trigger video processing
            processVideo();
          }}
        />

        {videoError && (
          <div className="error-message">{videoError}</div>
        )}

        {processedVideoUrl && (
          <div className="video-result">
            <h4>Video Processed Successfully!</h4>
            {processedVideoUrl.startsWith('/') ? (
              <>
                <video 
                  controls 
                  src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001'}${processedVideoUrl}`} 
                  className="processed-video" 
                />
                <a 
                  href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001'}${processedVideoUrl}`} 
                  download 
                  className="btn-download"
                >
                  Download Processed Video
                </a>
              </>
            ) : (
              <>
                <video controls src={processedVideoUrl} className="processed-video" />
                <a href={processedVideoUrl} download className="btn-download">
                  Download Processed Video
                </a>
              </>
            )}
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            onClick={handleBackToUpload}
            disabled={isProcessingVideo}
            className="btn-secondary"
          >
            Back to Upload Video
          </button>
          <button
            type="button"
            onClick={processVideo}
            disabled={(!videoDataFromState) || (exercises.length === 0 && overlays.length === 0) || isProcessingVideo}
            className="btn-process"
          >
            {isProcessingVideo ? 'Processing...' : 'Process & Export Video'}
          </button>
          {isProcessingVideo && (
            <div className="upload-progress">
              <div className="progress-label">Uploading: {uploadProgress}%</div>
              <input
                type="range"
                min={0}
                max={100}
                value={uploadProgress}
                readOnly
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgramVideoEditor;

