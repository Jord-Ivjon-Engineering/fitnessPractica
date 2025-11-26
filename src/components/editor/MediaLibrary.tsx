import React, { useState } from 'react';
import { Plus, Clock } from 'lucide-react';
import { Overlay } from '../AdvancedVideoEditor';
import '../../styles/MediaLibrary.css';

interface MediaLibraryProps {
  videoUrl: string;
  onAddExercise: (name: string, start: number, end: number) => void;
  onAddOverlay: (overlay: Overlay) => void;
  currentTime: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  playing: boolean;
}

const MediaLibrary: React.FC<MediaLibraryProps> = ({
  onAddExercise,
  onAddOverlay,
  currentTime,
  videoRef,
  playing,
}) => {
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseStart, setExerciseStart] = useState<number | string>(0);
  const [exerciseEnd, setExerciseEnd] = useState<number | string>(5);
  const [wasPlayingBeforeAdd, setWasPlayingBeforeAdd] = useState(false);

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


  return (
    <div className="media-library">
      <div className="media-section">
        <h3>Exercises</h3>
        {!showAddExercise ? (
          <button
            onClick={handleShowAddExercise}
            className="add-item-btn"
          >
            <Plus size={18} /> Add Exercise
          </button>
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

      <div className="media-section">
        <h3>Overlays</h3>
        <div className="overlay-buttons">
          <button onClick={handleAddTimerOverlay} className="overlay-btn">
            <Clock size={20} />
            <span>Timer</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MediaLibrary;

