import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AdvancedVideoEditor from '../components/AdvancedVideoEditor';
import { io, Socket } from 'socket.io-client';
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

interface ProcessingProgress {
  percent: number;
  stage: string;
  fps?: number;
  speed?: number;
}

const ProgramVideoEditor = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const socketRef = useRef<Socket | null>(null);
  
  const videoDataFromState = location.state as VideoData | null;
  const programId = location.state?.programId as number | undefined;
  const videoFileSize = videoDataFromState?.fileSize;
  
  const [exercises, setExercises] = useState<Array<{ id: number; name: string; start: number; end: number }>>([]);
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null);
  const [videoError, setVideoError] = useState<string>('');
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string>('');
  const [videoTitle, setVideoTitle] = useState<string>(videoDataFromState?.name || 'Untitled Video');

  // Initialize Socket.IO connection
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const baseUrl = API_URL.replace('/api', '');
    
    socketRef.current = io(baseUrl, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected:', socketRef.current?.id);
    });

    socketRef.current.on('video:progress', (progress: ProcessingProgress) => {
      console.log('Progress update:', progress);
      setProcessingProgress(progress);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    document.body.classList.add('video-editor-active');
    return () => {
      document.body.classList.remove('video-editor-active');
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

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

    if (exercises.length === 0 && overlays.length === 0) {
      setVideoError('Please add at least one exercise or overlay.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setVideoError('Authentication token not found. Please log in again.');
      return;
    }

    if (!socketRef.current?.id) {
      setVideoError('WebSocket connection not established. Please refresh the page.');
      return;
    }

    const backendExercises = exercises.length > 0 ? exercises.map(ex => ({
      name: ex.name,
      start: ex.start,
      duration: ex.end - ex.start
    })) : [];

    const formData = new FormData();
    
    if (videoDataFromState.url.startsWith('blob:')) {
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
      formData.append('videoUrl', videoDataFromState.url);
    }
    
    if (backendExercises.length > 0) {
      formData.append('exercises', JSON.stringify(backendExercises));
    }
    
    if (overlays.length > 0) {
      formData.append('overlays', JSON.stringify(overlays));
    }

    // Add socket ID for progress tracking
    formData.append('socketId', socketRef.current.id);

    setIsProcessingVideo(true);
    setVideoError('');
    setProcessedVideoUrl('');
    setUploadProgress(0);
    setProcessingProgress(null);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const baseUrl = API_URL.replace('/api', '');

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
      setProcessingProgress(null);
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
    return null;
  }

  const videoUrl = videoDataFromState.url.startsWith('blob:') || videoDataFromState.url.startsWith('http')
    ? videoDataFromState.url 
    : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001'}${videoDataFromState.url}`;

  return (
    <div className="video-editor-container">
      <div className="video-editor-wrapper">
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
            processVideo();
          }}
        />

        {videoError && (
          <div className="error-message">{videoError}</div>
        )}

        {/* Upload Progress */}
        {isProcessingVideo && uploadProgress > 0 && uploadProgress < 100 && (
          <div className="upload-progress">
            <div className="progress-label">Uploading: {uploadProgress}%</div>
            <div className="progress-bar">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Processing Progress */}
        {isProcessingVideo && processingProgress && (
          <div className="processing-progress">
            <div className="progress-header">
              <div className="progress-label">{processingProgress.stage}</div>
              <div className="progress-percent">{processingProgress.percent}%</div>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-bar-fill processing" 
                style={{ width: `${processingProgress.percent}%` }}
              />
            </div>
            <div className="progress-details">
              {processingProgress.frame && processingProgress.totalFrames && (
                <span>Frame: {processingProgress.frame.toLocaleString()} / {processingProgress.totalFrames.toLocaleString()}</span>
              )}
              {processingProgress.fps && (
                <span>FPS: {Math.round(processingProgress.fps)}</span>
              )}
              {processingProgress.speed && (
                <span>Speed: {processingProgress.speed.toFixed(2)}x</span>
              )}
            </div>
          </div>
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
        </div>
      </div>
    </div>
  );
};

export default ProgramVideoEditor;