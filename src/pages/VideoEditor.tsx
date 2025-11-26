import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SimpleVideoEditor from '../components/SimpleVideoEditor';
import { adminApi, TrainingProgram, trainingProgramApi } from '../services/api';
import '../styles/VideoEditor.css';

const VideoEditor = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [exercises, setExercises] = useState<Array<{ id: number; name: string; start: number; end: number }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string>('');
  const [processingError, setProcessingError] = useState<string>('');
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [videoTitle, setVideoTitle] = useState<string>('');
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);

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
      return;
    }

    // Load programs
    loadPrograms();
  }, [user, isAuthenticated, isLoading, navigate]);

  const loadPrograms = async () => {
    try {
      const response = await adminApi.getAllPrograms();
      if (response.data.success) {
        setPrograms(response.data.data);
      }
    } catch (err) {
      console.error('Error loading programs:', err);
    }
  };

  const handleExport = async (exercises: Array<{ id: number; name: string; start: number; end: number }>) => {
    if (!videoFile) {
      setProcessingError('Please upload a video first.');
      return;
    }

    if (exercises.length === 0) {
      setProcessingError('Please add at least one exercise.');
      return;
    }

    if (!selectedProgramId) {
      setProcessingError('Please select a program to upload the video to.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setProcessingError('Authentication token not found. Please log in again.');
      return;
    }

    // Convert exercises format for backend (start, duration instead of start, end)
    const backendExercises = exercises.map(ex => ({
      name: ex.name,
      start: ex.start,
      duration: ex.end - ex.start
    }));

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('exercises', JSON.stringify(backendExercises));

    setIsProcessing(true);
    setProcessingError('');
    setProcessedVideoUrl('');
    setUploadSuccess(false);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const baseUrl = API_URL.replace('/api', '');
      const response = await fetch(`${baseUrl}/video/edit`, {
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
        setProcessingError(errMsg);
        return;
      }

      const data = await response.json();
      if (data && data.fileUrl) {
        setProcessedVideoUrl(data.fileUrl);
        setProcessingError('');
        
        // Attach the processed video to the selected program
        try {
          await trainingProgramApi.attachVideo(
            selectedProgramId, 
            data.fileUrl, 
            videoTitle || `Video - ${new Date().toLocaleDateString()}`
          );
          setUploadSuccess(true);
          setProcessingError('');
        } catch (err) {
          console.error('Error attaching video to program:', err);
          setProcessingError('Video processed but failed to attach to program. Please try again.');
        }
      }
    } catch (err) {
      console.error('Error processing video:', err);
      setProcessingError(err instanceof Error ? err.message : 'Failed to process video');
    } finally {
      setIsProcessing(false);
    }
  };

  if (error) {
    return (
      <div className="video-editor-page">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="video-editor-page">
      <div className="container">
        <h1>Video Editor</h1>
        
        {/* Program Selection */}
        <div className="program-selection" style={{ marginBottom: '20px', padding: '20px', background: '#ffffff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
          <h3 style={{ marginTop: 0 }}>Select Program</h3>
          <select 
            value={selectedProgramId || ''} 
            onChange={(e) => setSelectedProgramId(Number(e.target.value))}
            style={{ 
              width: '100%', 
              padding: '12px', 
              fontSize: '16px', 
              borderRadius: '8px', 
              border: '2px solid #e5e7eb',
              marginBottom: '15px'
            }}
          >
            <option value="">-- Select a program to upload video to --</option>
            {programs.map(program => (
              <option key={program.id} value={program.id}>
                {program.name} - {program.category}
              </option>
            ))}
          </select>
          
          <input
            type="text"
            placeholder="Video Title (optional)"
            value={videoTitle}
            onChange={(e) => setVideoTitle(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '12px', 
              fontSize: '16px', 
              borderRadius: '8px', 
              border: '2px solid #e5e7eb'
            }}
          />
        </div>
        
        <SimpleVideoEditor 
          onExport={handleExport}
          onExercisesChange={(exs) => setExercises(exs)}
          onVideoUpload={(file) => setVideoFile(file)}
        />

        {processingError && (
          <div className="error-message" style={{ marginTop: '20px' }}>
            {processingError}
          </div>
        )}

        {isProcessing && (
          <div className="processing-message" style={{ marginTop: '20px', padding: '20px', background: '#fef3c7', borderRadius: '8px' }}>
            <p>Processing video with exercises... This may take a few minutes.</p>
          </div>
        )}

        {uploadSuccess && processedVideoUrl && (
          <div className="video-result" style={{ marginTop: '20px', padding: '20px', background: '#f0fdf4', borderRadius: '8px' }}>
            <h4>✅ Video Successfully Uploaded to Program!</h4>
            <p>The video has been processed and added to the selected program. Users who purchase this program will now see this video.</p>
            <video 
              controls 
              src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001'}${processedVideoUrl}`} 
              style={{ width: '100%', maxWidth: '800px', marginTop: '10px', borderRadius: '8px' }}
            />
            <a 
              href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001'}${processedVideoUrl}`} 
              download 
              style={{ 
                display: 'inline-block', 
                marginTop: '15px', 
                padding: '12px 24px', 
                background: 'linear-gradient(135deg, hsl(14, 90%, 55%), hsl(25, 95%, 53%))',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                fontWeight: '600'
              }}
            >
              Download Processed Video
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoEditor;
