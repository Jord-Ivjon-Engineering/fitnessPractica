import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Player } from '@remotion/player';
import VideoUploader from '../components/VideoUploader';
import { WorkoutVideoComposition } from '../remotion/WorkoutVideo';
import { createPreviewClips } from '../utils/ffmpegHelper';
import { trainingProgramApi, TrainingProgram } from '../services/api';
import '../styles/VideoEditor.css';

interface Exercise {
  id: number;
  name: string;
  start: number;
  end: number;
}

interface VideoData {
  file: File;
  url: string;
  name: string;
  size: number;
}

const VideoEditor = () => {
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [video, setVideo] = useState<VideoData | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [previews, setPreviews] = useState<Array<{ exerciseId: number; url: string; showAt: number }>>([]);
  const [processing, setProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string>('');
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [programsError, setProgramsError] = useState<string>('');
  const [attachStatus, setAttachStatus] = useState<string>('');

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }

    if (user.role !== 'admin') {
      setError('Access denied. Admin privileges required.');
      setTimeout(() => {
        navigate('/');
      }, 2000);
    }
  }, [user, isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const resp = await trainingProgramApi.getAll();
        if (resp && resp.data && resp.data.data) {
          setPrograms(resp.data.data);
          if (resp.data.data.length > 0) setSelectedProgramId(resp.data.data[0].id);
        }
      } catch (err: any) {
        console.error('Error fetching programs', err);
        const msg = err?.response?.data?.error || err?.message || 'Unknown error fetching programs';
        setProgramsError(String(msg));
      }
    };

    fetchPrograms();
  }, []);

  const handleVideoLoad = (videoData: VideoData) => {
    setVideo(videoData);
    setExercises([]);
    setPreviews([]);
    setShowPreview(false);
    setError('');
  };

  const handleExercisesUpdate = (updatedExercises: Exercise[]) => {
    setExercises(updatedExercises);
  };

  const generateVideo = async () => {
    if (!video) {
      setError('Please upload a video first!');
      return;
    }

    if (exercises.length === 0) {
      setError('Please mark at least one exercise first!');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // Generate preview clips using FFmpeg
      const previewClips = await createPreviewClips(video.file, exercises);
      setPreviews(previewClips);
      setShowPreview(true);
    } catch (error) {
      console.error('Error processing video:', error);
      setError('Error generating preview clips. You can still process the video with the backend.');
    } finally {
      setProcessing(false);
    }
  };

  const processVideoBackend = async () => {
    if (!video) {
      setError('Please upload a video.');
      return;
    }

    if (exercises.length === 0) {
      setError('Please mark at least one exercise.');
      return;
    }

    if (!token) {
      setError('Authentication token not found. Please log in again.');
      return;
    }

    // Convert exercises format for backend (start, duration instead of start, end)
    const backendExercises = exercises.map(ex => ({
      name: ex.name,
      start: ex.start,
      duration: ex.end - ex.start
    }));

    const formData = new FormData();
    formData.append('video', video.file);
    formData.append('exercises', JSON.stringify(backendExercises));

    setProcessing(true);
    setError('');

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/video/edit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        let errMsg = `Server error: ${response.status} ${response.statusText}`;
        try {
          const errJson = await response.json();
          if (errJson && errJson.error) errMsg = `Error: ${errJson.error}`;
        } catch (e) {
          // ignore JSON parse error
        }
        setError(errMsg);
        return;
      }

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (data && data.fileUrl) {
          // Check if it's already a full URL (Spaces CDN) or a relative path
          let fileUrl: string;
          let relativeUrl: string;
          
          if (data.fileUrl.startsWith('http://') || data.fileUrl.startsWith('https://')) {
            // Already a full URL from Spaces CDN, use it directly
            fileUrl = data.fileUrl;
            // For attachVideo, use the full URL as-is
            relativeUrl = data.fileUrl;
          } else {
            // Relative path, prepend API base URL
            fileUrl = `${API_URL}${data.fileUrl}`;
            relativeUrl = data.fileUrl.replace(/^\//, '');
          }
          
          setError('');
          // Auto-attach to selected program if one is chosen
          if (selectedProgramId) {
            try {
              setAttachStatus('Attaching to program...');
              // Use the original fileUrl format (full URL or relative path)
              await trainingProgramApi.attachVideo(selectedProgramId, data.fileUrl.startsWith('http') ? data.fileUrl : `/${relativeUrl}`);
              setAttachStatus('Attached successfully!');
            } catch (attachErr) {
              console.error('Auto-attach error', attachErr);
              setAttachStatus('Warning: Video processed but failed to attach to program.');
            }
          } else {
            setAttachStatus('No program selected — video processed but not attached.');
          }
          // Create download link
          setTimeout(() => {
            const link = document.createElement('a');
            link.href = fileUrl;
            link.download = fileUrl.split('/').pop() || 'edited_video.mp4';
            link.target = '_blank';
            link.click();
          }, 100);
        } else {
          setError('Processing finished but server returned unexpected JSON.');
        }
      } else {
        // Server returned the file directly
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const cd = response.headers.get('content-disposition') || '';
        const match = cd.match(/filename="?([^"]+)"?/);
        a.download = match ? match[1] : 'edited_video.mp4';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setError('');
      }
    } catch (error) {
      console.error(error);
      setError('Error connecting to server.');
    } finally {
      setProcessing(false);
    }
  };

  // Calculate video duration for Remotion player
  const getVideoDuration = () => {
    // Estimate duration - in a real app, you'd get this from the video metadata
    if (exercises.length > 0) {
      const lastExercise = exercises[exercises.length - 1];
      return Math.ceil(lastExercise.end + 10) * 30; // Add 10 seconds buffer, convert to frames (30 fps)
    }
    return 300 * 30; // Default 5 minutes
  };

  if (isLoading) {
    return (
      <div className="video-editor-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user || user.role !== 'admin') {
    return (
      <div className="video-editor-container">
        <div className="error-message">
          {error || 'Access denied. Admin privileges required.'}
        </div>
      </div>
    );
  }

  return (
    <div className="video-editor-container">
      <header className="editor-header">
        <h1>🏋️ Workout Video Editor</h1>
        <p>Upload, mark exercises, and generate automatic timers</p>
      </header>

      <main className="editor-main">
        {!video ? (
          <VideoUploader onVideoLoad={handleVideoLoad} />
        ) : (
          <>
            {/* Timeline removed intentionally */}

            {error && <div className="error-message">{error}</div>}

            <div className="action-buttons">
              <button 
                onClick={generateVideo} 
                disabled={processing || exercises.length === 0}
                className="btn-generate"
              >
                {processing ? 'Generating Preview...' : 'Generate Preview with Overlays'}
              </button>
              <button 
                onClick={processVideoBackend} 
                disabled={processing || exercises.length === 0}
                className="btn-process"
              >
                {processing ? 'Processing...' : 'Process & Export Video'}
              </button>
              <button 
                onClick={() => {
                  setVideo(null);
                  setExercises([]);
                  setPreviews([]);
                  setShowPreview(false);
                }}
                className="btn-reset"
              >
                Upload Different Video
              </button>
            </div>

            {showPreview && (
              <div className="preview-section">
                <h2>Preview with Overlays</h2>
                <Player
                  component={WorkoutVideoComposition}
                  inputProps={{
                    videoUrl: video.url,
                    exercises: exercises,
                    previews: previews
                  }}
                  durationInFrames={getVideoDuration()}
                  fps={30}
                  compositionWidth={1920}
                  compositionHeight={1080}
                  style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}
                  controls
                />
              </div>
            )}

            <div className="program-select">
              <h2>Attach to Training Program</h2>
              {programsError ? (
                <div className="error-message">Failed loading programs: {programsError}</div>
              ) : programs.length === 0 ? (
                <p>No programs found.</p>
              ) : (
                <select 
                  value={selectedProgramId ?? ''} 
                  onChange={(e) => setSelectedProgramId(Number(e.target.value))} 
                  disabled={processing}
                >
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.category})</option>
                  ))}
                </select>
              )}
              <p className="hint">Select a training program above — processed video will be automatically attached after processing.</p>
              {attachStatus && <p className="status">{attachStatus}</p>}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default VideoEditor;

