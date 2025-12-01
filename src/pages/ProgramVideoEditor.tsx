import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AdvancedVideoEditor from '../components/AdvancedVideoEditor';
import { io, Socket } from 'socket.io-client';
import { trainingProgramApi } from '../services/api';
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
  const [attachStatus, setAttachStatus] = useState<string>('');
  const [previewSegments, setPreviewSegments] = useState<Array<{ name: string; start: number; end: number; type: 'exercise' | 'break' }>>([]);
  const [placeholderVideoId, setPlaceholderVideoId] = useState<number | null>(null);
  const [initialExercisesData, setInitialExercisesData] = useState<any>(null);

  // Load existing video data from database if editing
  useEffect(() => {
    const loadExistingVideoData = async () => {
      if (!videoDataFromState?.existingVideoId) return;
      
      try {
        console.log('Loading existing video data for ID:', videoDataFromState.existingVideoId);
        const response = await trainingProgramApi.getProgramVideos(programId || 0);
        
        if (response.data.success && response.data.data) {
          const existingVideo = response.data.data.find((v: any) => v.id === videoDataFromState.existingVideoId);
          
          if (existingVideo && existingVideo.exercisesData) {
            console.log('Found existing video with exercisesData:', existingVideo.exercisesData);
            setInitialExercisesData(existingVideo.exercisesData);
          }
        }
      } catch (error) {
        console.error('Error loading existing video data:', error);
      }
    };
    
    loadExistingVideoData();
  }, [videoDataFromState?.existingVideoId, programId]);

  // Convert preview segments to exercisesData format (defined early so it can be used in useEffect)
  const convertPreviewSegmentsToExercisesData = useCallback((
    segments: Array<{ name: string; start: number; end: number; type: 'exercise' | 'break' }>
  ) => {
    if (segments.length === 0) {
      console.log('convertPreviewSegmentsToExercisesData: segments array is empty');
      return null;
    }

    console.log('convertPreviewSegmentsToExercisesData: input segments', segments);

    // Separate exercises and breaks
    const exercises = segments
      .filter(seg => seg.type === 'exercise')
      .map(seg => ({
        name: seg.name,
        startTime: seg.start,
        endTime: seg.end,
      }));

    const breaks = segments
      .filter(seg => seg.type === 'break')
      .map(seg => {
        // Find the next exercise after this break
        const currentIndex = segments.indexOf(seg);
        const nextExercise = segments
          .slice(currentIndex + 1)
          .find(s => s.type === 'exercise');
        
        return {
          startTime: seg.start,
          endTime: seg.end,
          duration: seg.end - seg.start,
          nextExerciseName: nextExercise?.name || '',
        };
      });

    console.log('convertPreviewSegmentsToExercisesData: exercises', exercises);
    console.log('convertPreviewSegmentsToExercisesData: breaks', breaks);

    return {
      exercises,
      breaks,
    };
  }, []);

  // Debug: Log when preview segments change
  useEffect(() => {
    console.log('ProgramVideoEditor: previewSegments updated', previewSegments);
  }, [previewSegments]);

  // Create placeholder video when preview segments are generated
  useEffect(() => {
    const createPlaceholder = async () => {
      // Only create placeholder if:
      // 1. We have preview segments
      // 2. We have a programId
      // 3. We don't already have a placeholder or existing video
      if (previewSegments.length > 0 && programId && !placeholderVideoId && !videoDataFromState?.existingVideoId) {
        try {
          const exercisesData = convertPreviewSegmentsToExercisesData(previewSegments);
          console.log('Creating placeholder video with exercisesData:', exercisesData);
          const response = await trainingProgramApi.createPlaceholderVideo(programId, videoTitle, exercisesData);
          if (response.data.success && response.data.data?.id) {
            setPlaceholderVideoId(response.data.data.id);
            console.log('Placeholder video created with ID:', response.data.data.id);
          }
        } catch (error) {
          console.error('Error creating placeholder video:', error);
          // Don't show error to user - this is a background operation
        }
      }
    };

    createPlaceholder();
  }, [previewSegments, programId, videoTitle, placeholderVideoId, videoDataFromState?.existingVideoId, convertPreviewSegmentsToExercisesData]);

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

    socketRef.current.on('video:progress', async (progress: ProcessingProgress) => {
      console.log('Progress update:', progress);
      setProcessingProgress(progress);

      // Cleanup of placeholder videos moved server-side with an age cutoff
      // to avoid race conditions with updateVideo.
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
        const processedUrl = result.data.url;
        // Use preview segments if available, otherwise use backend-calculated exercisesData
        const exercisesData = previewSegments.length > 0 
          ? convertPreviewSegmentsToExercisesData(previewSegments)
          : (result.data.exercisesData || null);
        setProcessedVideoUrl(processedUrl);
        setVideoError('');
        const timestamp = new Date().toLocaleString();
        const updatedTitle = `${videoTitle} - Processed ${timestamp}`;
        setVideoTitle(updatedTitle);
        
        // Auto-attach/update video to program if programId is available
        if (programId) {
          try {
            setAttachStatus('Attaching video to program...');
            const existingVideoId = videoDataFromState?.existingVideoId || placeholderVideoId;
            
            if (existingVideoId) {
              // Update existing video (or placeholder) with URL, updated title, and exercisesData
              await trainingProgramApi.updateVideo(programId, existingVideoId, processedUrl, updatedTitle, exercisesData);
              setAttachStatus('Video updated successfully!');
              // Clear placeholder ID since it's now a real video
              if (placeholderVideoId) {
                setPlaceholderVideoId(null);
              }
            } else {
              // Attach new video to program with exercises data
              await trainingProgramApi.attachVideo(programId, processedUrl, updatedTitle, exercisesData);
              setAttachStatus('Video attached to program successfully!');
            }
          } catch (attachErr: any) {
            console.error('Error attaching/updating video to program:', attachErr);
            const errorMsg = attachErr?.response?.data?.error || attachErr?.message || 'Unknown error';
            setAttachStatus(`Warning: Video processed but failed to attach to program: ${errorMsg}`);
          }
        } else {
          setAttachStatus('No program ID available — video processed but not attached.');
        }
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
          initialExercisesData={initialExercisesData}
          onTitleChange={setVideoTitle}
          onExercisesChange={(exs) => {
            setExercises(exs);
            handleExercisesUpdate(exs);
          }}
          onOverlaysChange={setOverlays}
          onDurationChange={setVideoDuration}
          onPreviewSegmentsChange={setPreviewSegments}
          onExport={({ exercises, overlays }) => {
            processVideo();
          }}
        />

        {videoError && (
          <div className="error-message">{videoError}</div>
        )}
        
        {attachStatus && (
          <div className={attachStatus.includes('Warning') || attachStatus.includes('failed') ? 'error-message' : 'success-message'}>
            {attachStatus}
          </div>
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