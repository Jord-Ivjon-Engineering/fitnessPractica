import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/VideoEditor.css';
import { trainingProgramApi, TrainingProgram } from '../services/api';

interface Exercise {
  name: string;
  start: number;
  duration: number;
}

const VideoEditor = () => {
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseName, setExerciseName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [programsError, setProgramsError] = useState<string>('');
  const [attachStatus, setAttachStatus] = useState<string>('');

  useEffect(() => {
    // Wait for auth to finish loading
    if (isLoading) {
      return;
    }

    // Check if user is authenticated and is admin
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
    // fetch programs so admin can choose where to attach processed videos
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

  const addExercise = () => {
    const name = exerciseName.trim();
    const start = parseInt(startTime, 10);
    const dur = parseInt(duration, 10);

    if (!name || Number.isNaN(start) || Number.isNaN(dur) || start < 0 || dur <= 0) {
      setError('Please fill all fields correctly (name, non-negative start, positive duration).');
      return;
    }

    setExercises([...exercises, { name, start, duration: dur }]);
    setExerciseName('');
    setStartTime('');
    setDuration('');
    setError('');
  };

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const processVideo = async () => {
    if (!videoFile) {
      setError('Please upload a video.');
      return;
    }

    if (exercises.length === 0) {
      setError('Please add at least one exercise.');
      return;
    }

    if (!token) {
      setError('Authentication token not found. Please log in again.');
      return;
    }

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('exercises', JSON.stringify(exercises));

    setIsProcessing(true);
    setError('');
    setResult('Processing video...');

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
        setResult('');
        return;
      }

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (data && data.fileUrl) {
          const fileUrl = `${API_URL}${data.fileUrl}`;
          setResult(`Video processed successfully!`);
          setError('');
          // Auto-attach to selected program if one is chosen
          const relativeUrl = data.fileUrl.replace(/^\//, '');
          if (selectedProgramId) {
            try {
              setAttachStatus('Attaching to program...');
              await trainingProgramApi.attachVideo(selectedProgramId, `/${relativeUrl}`);
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
          setResult('');
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
        setResult('Video processed successfully! Download started.');
        setError('');
      }
    } catch (error) {
      console.error(error);
      setError('Error connecting to server.');
      setResult('');
    } finally {
      setIsProcessing(false);
    }
  };

  // Show loading while auth is initializing
  if (isLoading) {
    return (
      <div className="video-editor-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  // Don't render if not admin
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
      <div className="video-editor-content">
        <h1>Video Editor</h1>
        <p className="subtitle">Add exercise labels to your fitness videos</p>

        {error && <div className="error-message">{error}</div>}

        <div className="upload-section">
          <label htmlFor="videoInput" className="upload-label">
            Upload Video
          </label>
          <input
            id="videoInput"
            type="file"
            accept="video/*"
            onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
            disabled={isProcessing}
          />
          {videoFile && (
            <p className="file-info">Selected: {videoFile.name}</p>
          )}
        </div>

        <div className="exercise-form">
          <h2>Add Exercise</h2>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="exerciseName">Exercise Name</label>
              <input
                id="exerciseName"
                type="text"
                value={exerciseName}
                onChange={(e) => setExerciseName(e.target.value)}
                placeholder="e.g., Push-ups"
                disabled={isProcessing}
              />
            </div>
            <div className="form-group">
              <label htmlFor="startTime">Start Time (seconds)</label>
              <input
                id="startTime"
                type="number"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="0"
                min="0"
                disabled={isProcessing}
              />
            </div>
            <div className="form-group">
              <label htmlFor="duration">Duration (seconds)</label>
              <input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="10"
                min="1"
                disabled={isProcessing}
              />
            </div>
          </div>
          <button
            onClick={addExercise}
            disabled={isProcessing}
            className="btn-add"
          >
            Add Exercise
          </button>
        </div>

        {exercises.length > 0 && (
          <div className="exercise-list">
            <h2>Exercises ({exercises.length})</h2>
            <ul>
              {exercises.map((ex, index) => (
                <li key={index} className="exercise-item">
                  <span>
                    {ex.name} ({ex.start}s - {ex.start + ex.duration}s)
                  </span>
                  <button
                    onClick={() => removeExercise(index)}
                    disabled={isProcessing}
                    className="btn-remove"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="process-section">
          <button
            onClick={processVideo}
            disabled={isProcessing || !videoFile || exercises.length === 0}
            className="btn-process"
          >
            {isProcessing ? 'Processing...' : 'Process Video'}
          </button>
        </div>

        <div className="program-select">
          <h2>Attach to Training Program</h2>
          {programsError ? (
            <div className="error-message">Failed loading programs: {programsError}</div>
          ) : programs.length === 0 ? (
            <p>No programs found.</p>
          ) : (
            <select value={selectedProgramId ?? ''} onChange={(e) => setSelectedProgramId(Number(e.target.value))} disabled={isProcessing}>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.category})</option>
              ))}
            </select>
          )}
          <p className="hint">Select a training program above — processed video will be automatically attached after processing.</p>
          {attachStatus && <p className="status">{attachStatus}</p>}
        </div>

        {result && (
          <div className="result-message">
            <p>{result}</p>
            {result.includes('successfully') && (
              <p className="download-hint">Download should start automatically. If not, check your browser's download folder.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoEditor;

