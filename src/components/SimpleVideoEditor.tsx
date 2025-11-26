import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Trash2, Upload, Download } from 'lucide-react';
import '../styles/SimpleVideoEditor.css';

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

interface SimpleVideoEditorProps {
  onExport?: (exercises: Exercise[]) => void;
  videoUrl?: string;
  onExercisesChange?: (exercises: Exercise[]) => void;
  onVideoUpload?: (file: File) => void;
}

const SimpleVideoEditor = ({ onExport, videoUrl, onExercisesChange, onVideoUpload }: SimpleVideoEditorProps) => {
  const [video, setVideo] = useState<VideoData | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [markingStart, setMarkingStart] = useState(false);
  const [tempStart, setTempStart] = useState<number | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // If videoUrl is provided, use it
  useEffect(() => {
    if (videoUrl && !video) {
      setVideo({
        file: null as any,
        url: videoUrl,
        name: 'Selected Video',
        size: 0
      });
    }
  }, [videoUrl]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleTimeUpdate = () => {
      setCurrentTime(videoElement.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(videoElement.duration);
    };

    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [video]);

  // Notify parent when exercises change
  useEffect(() => {
    if (onExercisesChange) {
      onExercisesChange(exercises);
    }
  }, [exercises, onExercisesChange]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setVideo({
        file,
        url,
        name: file.name,
        size: file.size
      });
      setExercises([]);
      setCurrentTime(0);
      setPlaying(false);
      
      // Notify parent component about the video upload
      if (onVideoUpload) {
        onVideoUpload(file);
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying(!playing);
  };

  const handleMarkStart = () => {
    setTempStart(currentTime);
    setMarkingStart(true);
  };

  const handleMarkEnd = () => {
    if (tempStart === null) return;
    
    const name = prompt('Enter exercise name:');
    if (name) {
      const newExercise: Exercise = {
        id: Date.now(),
        name,
        start: tempStart,
        end: currentTime
      };
      setExercises([...exercises, newExercise]);
      setTempStart(null);
      setMarkingStart(false);
    }
  };

  const handleDeleteExercise = (id: number) => {
    setExercises(exercises.filter(ex => ex.id !== id));
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleExport = () => {
    if (onExport) {
      onExport(exercises);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="simple-video-editor">
      {!video ? (
        <div className="upload-area">
          <Upload size={48} />
          <h3>Upload Video</h3>
          <p>Click the button below to select a video file</p>
          <button 
            className="upload-button"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={20} />
            Choose Video File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>
      ) : (
        <div className="editor-container">
          {/* Video Player */}
          <div className="video-section">
            <div className="video-player">
              <video
                ref={videoRef}
                src={video.url}
                className="video-element"
                onClick={togglePlay}
              />
              <div className="video-controls">
                <button onClick={togglePlay} className="play-button">
                  {playing ? <Pause size={24} /> : <Play size={24} />}
                </button>
                <div className="time-display">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="timeline-section">
              <div className="timeline-bar" onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                handleSeek(percent * duration);
              }}>
                <div 
                  className="timeline-progress" 
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
                {tempStart !== null && (
                  <div 
                    className="temp-marker" 
                    style={{ left: `${(tempStart / duration) * 100}%` }}
                  />
                )}
                {exercises.map(ex => (
                  <div
                    key={ex.id}
                    className="exercise-segment"
                    style={{
                      left: `${(ex.start / duration) * 100}%`,
                      width: `${((ex.end - ex.start) / duration) * 100}%`
                    }}
                    title={ex.name}
                  />
                ))}
              </div>

              {/* Marking Controls */}
              <div className="marking-controls">
                {!markingStart ? (
                  <button onClick={handleMarkStart} className="mark-button">
                    Mark Exercise Start
                  </button>
                ) : (
                  <button onClick={handleMarkEnd} className="mark-button active">
                    Mark Exercise End (Started at {formatTime(tempStart || 0)})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Exercises List */}
          <div className="exercises-section">
            <div className="exercises-header">
              <h3>Exercises ({exercises.length})</h3>
              {exercises.length > 0 && (
                <button onClick={handleExport} className="export-button">
                  <Download size={16} />
                  Process & Export
                </button>
              )}
            </div>
            <div className="exercises-list">
              {exercises.length === 0 ? (
                <div className="empty-state">
                  <p>No exercises marked yet</p>
                  <p className="hint">Play the video and use "Mark Exercise Start/End" to add exercises</p>
                </div>
              ) : (
                exercises.map((exercise, index) => (
                  <div key={exercise.id} className="exercise-item">
                    <div className="exercise-number">{index + 1}</div>
                    <div className="exercise-info">
                      <div className="exercise-name">{exercise.name}</div>
                      <div className="exercise-time">
                        {formatTime(exercise.start)} → {formatTime(exercise.end)} 
                        <span className="duration">({Math.floor(exercise.end - exercise.start)}s)</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteExercise(exercise.id)}
                      className="delete-button"
                      title="Delete exercise"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="upload-new-section">
              <button 
                className="upload-new-button"
                onClick={() => {
                  setVideo(null);
                  setExercises([]);
                  setCurrentTime(0);
                  setPlaying(false);
                  setMarkingStart(false);
                  setTempStart(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
              >
                <Upload size={16} />
                Upload New Video
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleVideoEditor;
