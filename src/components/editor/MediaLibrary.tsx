import React, { useState, useEffect } from 'react';
import { Plus, Clock, Zap } from 'lucide-react';
import { Overlay } from '../AdvancedVideoEditor';
import '../../styles/MediaLibrary.css';

interface MediaLibraryProps {
  videoUrl: string;
  videoDimensions?: { width: number; height: number } | null;
  onAddExercise: (name: string, start: number, end: number) => void;
  onAddOverlay: (overlay: Overlay) => void;
  currentTime: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  playing: boolean;
  videoDuration: number;
  onPreviewSegmentsChange?: (segments: Array<{ name: string; start: number; end: number; type: 'exercise' | 'break' }>) => void;
}

const MediaLibrary: React.FC<MediaLibraryProps> = ({
  videoDimensions,
  onAddExercise,
  onAddOverlay,
  currentTime,
  videoRef,
  playing,
  videoDuration,
  onPreviewSegmentsChange,
}) => {
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseStart, setExerciseStart] = useState<number | string>(0);
  const [exerciseEnd, setExerciseEnd] = useState<number | string>(5);
  const [wasPlayingBeforeAdd, setWasPlayingBeforeAdd] = useState(false);
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [autoExerciseTime, setAutoExerciseTime] = useState(40);
  const [autoBreakTime, setAutoBreakTime] = useState(20);
  const [autoExerciseName, setAutoExerciseName] = useState('Exercise');
  const [autoBreakName, setAutoBreakName] = useState('Break');
  const [autoFirstExerciseStart, setAutoFirstExerciseStart] = useState(0);
  const [previewSegments, setPreviewSegments] = useState<Array<{ name: string; start: number; end: number; type: 'exercise' | 'break' }>>([]);
  // Keep preview visible after adding; button remains functional

  // Notify parent when preview segments change
  useEffect(() => {
    onPreviewSegmentsChange?.(previewSegments);
  }, [previewSegments, onPreviewSegmentsChange]);

  const handleShowAddExercise = () => {
    // Pause video when opening add exercise form
    if (videoRef.current && playing) {
      videoRef.current.pause();
      setWasPlayingBeforeAdd(true);
    }
    setShowAddExercise(true);
  };

  const handleCancelAddExercise = () => {
    // Resume video if it was playing before
    if (videoRef.current && wasPlayingBeforeAdd) {
      videoRef.current.play();
      setWasPlayingBeforeAdd(false);
    }
    setShowAddExercise(false);
  };

  const handleAddExercise = () => {
    if (exerciseName.trim()) {
      const startNum = typeof exerciseStart === 'string' ? parseFloat(exerciseStart) : exerciseStart;
      const endNum = typeof exerciseEnd === 'string' ? parseFloat(exerciseEnd) : exerciseEnd;
      
      if (isNaN(startNum) || isNaN(endNum)) {
        alert('Please enter valid numbers for start and end times');
        return;
      }
      
      if (endNum <= startNum) {
        alert('End time must be greater than start time');
        return;
      }
      
      onAddExercise(exerciseName.trim(), startNum, endNum);
      setExerciseName('');
      setExerciseStart(0);
      setExerciseEnd(5);
      setShowAddExercise(false);
      
      // Resume video if it was playing before
      if (videoRef.current && wasPlayingBeforeAdd) {
        videoRef.current.play();
        setWasPlayingBeforeAdd(false);
      }
    }
  };


  const handleAddTimerOverlay = () => {
    const overlay: Overlay = {
      id: `timer-${Date.now()}`,
      type: 'timer',
      startTime: currentTime,
      endTime: currentTime + 30,
      x: 50,
      y: 10,
      fontSize: 48,
      fontColor: '#FFFFFF',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      timerType: 'countdown',
      timerFormat: 'MM:SS',
    };
    onAddOverlay(overlay);
  };

  const handleAutomaticGeneration = () => {
    if (videoDuration <= 0) {
      alert('Video duration not available. Please wait for the video to load.');
      return;
    }

    // Validate first exercise start time
    const startTime = Math.max(0, Math.min(autoFirstExerciseStart, videoDuration - 1));

    // Generate preview segments
    const segments: Array<{ name: string; start: number; end: number; type: 'exercise' | 'break' }> = [];
    let currentPos = startTime;
    let exerciseCounter = 1;

    while (currentPos < videoDuration) {
      // Add exercise
      const exerciseEnd = Math.min(currentPos + autoExerciseTime, videoDuration);
      if (exerciseEnd > currentPos) {
        segments.push({
          name: `${autoExerciseName} ${exerciseCounter}`,
          start: currentPos,
          end: exerciseEnd,
          type: 'exercise'
        });
        currentPos = exerciseEnd;
        exerciseCounter++;
      }

      // Add break (if there's time remaining)
      if (currentPos < videoDuration) {
        const breakEnd = Math.min(currentPos + autoBreakTime, videoDuration);
        if (breakEnd > currentPos) {
          segments.push({
            name: autoBreakName,
            start: currentPos,
            end: breakEnd,
            type: 'break'
          });
          currentPos = breakEnd;
        }
      }
    }

  setPreviewSegments(segments);
  };

  const handleConfirmGeneration = () => {
    const count = previewSegments.length;
    
    // Add all segments as exercises
    previewSegments.forEach(segment => {
      onAddExercise(segment.name, segment.start, segment.end);
    });

  setShowAutoModal(false);
  // Keep preview visible below the Overlays section (no clearing)
    
    // Show success message after a brief delay to ensure state updates
    setTimeout(() => {
      alert(`Successfully added ${count} segments!`);
    }, 100);
  };

  // Handle "Add All" from below overlays section
  const handleAddAllPreview = () => {
    const count = previewSegments.length;
    
    // Add all segments as exercises
    previewSegments.forEach(segment => {
      onAddExercise(segment.name, segment.start, segment.end);
    });

  // Keep preview visible after adding (no clearing)
    
    // Show success message
    setTimeout(() => {
      alert(`Successfully added ${count} segments!`);
    }, 100);
  };

  const handleUpdateSegmentName = (index: number, newName: string) => {
    setPreviewSegments(prev => prev.map((seg, i) => i === index ? { ...seg, name: newName } : seg));
  };


  const calculateAspectRatio = (width: number, height: number): string => {
    const gcd = (a: number, b: number): number => {
      return b === 0 ? a : gcd(b, a % b);
    };
    
    const divisor = gcd(width, height);
    const ratioWidth = width / divisor;
    const ratioHeight = height / divisor;
    
    const commonRatios: { [key: string]: string } = {
      '16:9': '16:9',
      '4:3': '4:3',
      '21:9': '21:9',
      '1:1': '1:1',
      '9:16': '9:16',
    };
    
    const ratioKey = `${ratioWidth}:${ratioHeight}`;
    if (commonRatios[ratioKey]) {
      return commonRatios[ratioKey];
    }
    
    return `${ratioWidth}:${ratioHeight}`;
  };

  return (
    <div className="media-library">
      {videoDimensions && (
        <div className="media-section video-info-section">
          <h3>Video Info</h3>
          <div className="video-info">
            <p>Resolution: <strong>{videoDimensions.width} × {videoDimensions.height}</strong></p>
            <p>Aspect Ratio: <strong>{calculateAspectRatio(videoDimensions.width, videoDimensions.height)}</strong></p>
          </div>
        </div>
      )}
      <div className="media-section">
        <h3>Exercises</h3>
        <div className="exercise-actions">
          {!showAddExercise ? (
            <>
              <button
                onClick={handleShowAddExercise}
                className="add-item-btn"
              >
                <Plus size={18} /> Add Exercise
              </button>
              <button
                onClick={() => {
                  if (videoDuration <= 0) {
                    alert('Video duration not available. Please wait for the video to load.');
                    return;
                  }

                  // Validate first exercise start time
                  const startTime = Math.max(0, Math.min(autoFirstExerciseStart, videoDuration - 1));

                  // Generate preview segments inline to ensure they're set before modal opens
                  const segments: Array<{ name: string; start: number; end: number; type: 'exercise' | 'break' }> = [];
                  let currentPos = startTime;
                  let exerciseCounter = 1;

                  while (currentPos < videoDuration) {
                    // Add exercise
                    const exerciseEnd = Math.min(currentPos + autoExerciseTime, videoDuration);
                    if (exerciseEnd > currentPos) {
                      segments.push({
                        name: `${autoExerciseName} ${exerciseCounter}`,
                        start: currentPos,
                        end: exerciseEnd,
                        type: 'exercise'
                      });
                      currentPos = exerciseEnd;
                      exerciseCounter++;
                    }

                    // Add break (if there's time remaining)
                    if (currentPos < videoDuration) {
                      const breakEnd = Math.min(currentPos + autoBreakTime, videoDuration);
                      if (breakEnd > currentPos) {
                        segments.push({
                          name: autoBreakName,
                          start: currentPos,
                          end: breakEnd,
                          type: 'break'
                        });
                        currentPos = breakEnd;
                      }
                    }
                  }

                  setPreviewSegments(segments);
                  setShowAutoModal(true);
                }}
                className="add-item-btn auto-btn"
                title="Automatically divide video into exercises and breaks"
              >
                <Zap size={18} /> Automatic
              </button>
            </>
          ) : (
            <div className="add-exercise-form">
              <input
                type="text"
                placeholder="Exercise name"
                value={exerciseName}
                onChange={(e) => setExerciseName(e.target.value)}
                className="form-input"
              />
              <div className="current-time-info">
                <p>Current video time: <strong>{Math.round(currentTime * 10) / 10}s</strong></p>
              </div>
              <div className="time-inputs">
                <div>
                  <label>Start (s)</label>
                  <input
                    type="number"
                    value={exerciseStart}
                    onChange={(e) => setExerciseStart(e.target.value)}
                    min="0"
                    className="form-input"
                    placeholder="Enter start time"
                  />
                </div>
                <div>
                  <label>End (s)</label>
                  <input
                    type="number"
                    value={exerciseEnd}
                    onChange={(e) => setExerciseEnd(e.target.value)}
                    min="0"
                    className="form-input"
                    placeholder="Enter end time"
                  />
                </div>
              </div>
              <div className="form-actions">
                <button onClick={handleAddExercise} className="btn-primary">
                  Add
                </button>
                <button onClick={handleCancelAddExercise} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Automatic Generation Modal */}
      {showAutoModal && (
        <div className="modal-overlay" onClick={() => setShowAutoModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <h3>Automatic Exercise Generation</h3>
            <p>Divide the entire video ({Math.round(videoDuration)}s) into exercises and breaks.</p>
            
            <div className="auto-layout">
              {/* Left side: Configuration */}
              <div className="auto-config">
                <div className="form-group">
                  <label>Exercise Duration (seconds)</label>
                  <input
                    type="number"
                    value={autoExerciseTime}
                    onChange={(e) => {
                      setAutoExerciseTime(parseInt(e.target.value) || 40);
                      setPreviewSegments([]); // Clear preview when config changes
                    }}
                    min="1"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Break Duration (seconds)</label>
                  <input
                    type="number"
                    value={autoBreakTime}
                    onChange={(e) => {
                      setAutoBreakTime(parseInt(e.target.value) || 20);
                      setPreviewSegments([]); // Clear preview when config changes
                    }}
                    min="1"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>First Exercise Start Time (seconds)</label>
                  <input
                    type="number"
                    value={autoFirstExerciseStart}
                    onChange={(e) => {
                      setAutoFirstExerciseStart(parseFloat(e.target.value) || 0);
                      setPreviewSegments([]); // Clear preview when config changes
                    }}
                    min="0"
                    step="0.1"
                    className="form-input"
                  />
                  <small>Where the first exercise should start in the video</small>
                </div>
                <div className="form-group">
                  <label>Exercise Name Template</label>
                  <input
                    type="text"
                    value={autoExerciseName}
                    onChange={(e) => setAutoExerciseName(e.target.value || 'Exercise')}
                    className="form-input"
                    placeholder="e.g., Exercise, Workout, Set"
                  />
                  <small>Will be numbered automatically (e.g., Exercise 1, Exercise 2)</small>
                </div>
                <div className="form-group">
                  <label>Break Name</label>
                  <input
                    type="text"
                    value={autoBreakName}
                    onChange={(e) => setAutoBreakName(e.target.value || 'Break')}
                    className="form-input"
                    placeholder="e.g., Break, Rest, Pause"
                  />
                </div>
                <button onClick={handleAutomaticGeneration} className="btn-primary" style={{ marginTop: '12px' }}>
                  Generate Preview
                </button>
              </div>

              {/* Right side: Preview */}
              <div className="auto-preview">
                <h4>Preview Timeline</h4>
                {previewSegments.length === 0 ? (
                  <p className="preview-empty">Click "Generate Preview" to see the timeline breakdown.</p>
                ) : (
                  <div className="preview-list">
                    {previewSegments.map((segment, index) => (
                      <div key={index} className={`preview-segment ${segment.type}`}>
                        <div className="segment-time">
                          {Math.floor(segment.start)}s - {Math.floor(segment.end)}s
                        </div>
                        <input
                          type="text"
                          value={segment.name}
                          onChange={(e) => handleUpdateSegmentName(index, e.target.value)}
                          className="segment-name-input"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions">
              {previewSegments.length > 0 && (
                <button onClick={handleConfirmGeneration} className="btn-primary">
                  Add All to Timeline
                </button>
              )}
              <button onClick={() => {
                setShowAutoModal(false);
                // Don't clear preview segments - keep them visible below Overlays
              }} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="media-section">
        <h3>Overlays</h3>
        <div className="overlay-buttons">
          <button onClick={handleAddTimerOverlay} className="overlay-btn">
            <Clock size={20} />
            <span>Timer</span>
          </button>
        </div>
        {/* Render automatic preview list directly below overlays */}
        {previewSegments.length > 0 && (
          <div className="auto-preview-below-overlays" style={{ marginTop: '12px' }}>
            <h4 style={{ margin: '8px 0' }}>Preview Timeline</h4>
            <div className="preview-list">
              {previewSegments.map((segment, index) => (
                <div key={`overlay-preview-${index}`} className={`preview-segment ${segment.type}`}>
                  <div className="segment-time">
                    {Math.floor(segment.start)}s - {Math.floor(segment.end)}s
                  </div>
                  <input
                    type="text"
                    value={segment.name}
                    onChange={(e) => handleUpdateSegmentName(index, e.target.value)}
                    className="segment-name-input"
                  />
                </div>
              ))}
            </div>
            <div className="preview-actions" style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={handleAddAllPreview} className="btn-primary">
                Add All to Timeline
              </button>
              <button onClick={() => setPreviewSegments([])} className="btn-secondary">
                Clear Preview
              </button>
              {/* Removed extra status text to reduce clutter; the disabled button label is enough feedback */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaLibrary;

