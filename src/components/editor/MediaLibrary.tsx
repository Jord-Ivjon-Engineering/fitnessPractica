import React, { useState } from 'react';
import { Plus, Clock } from 'lucide-react';
import { Exercise, Overlay } from '../AdvancedVideoEditor';
import '../../styles/MediaLibrary.css';

interface MediaLibraryProps {
  videoUrl: string;
  onAddExercise: (name: string, start: number, end: number) => void;
  onAddOverlay: (overlay: Overlay) => void;
  currentTime: number;
}

const MediaLibrary: React.FC<MediaLibraryProps> = ({
  onAddExercise,
  onAddOverlay,
  currentTime,
}) => {
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseStart, setExerciseStart] = useState(0);
  const [exerciseEnd, setExerciseEnd] = useState(5);

  const handleAddExercise = () => {
    if (exerciseName.trim()) {
      onAddExercise(exerciseName.trim(), exerciseStart, exerciseEnd);
      setExerciseName('');
      setExerciseStart(0);
      setExerciseEnd(5);
      setShowAddExercise(false);
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
            onClick={() => setShowAddExercise(true)}
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
            <div className="time-inputs">
              <div>
                <label>Start (s)</label>
                <input
                  type="number"
                  value={exerciseStart}
                  onChange={(e) => setExerciseStart(parseFloat(e.target.value) || 0)}
                  step="0.1"
                  className="form-input"
                />
              </div>
              <div>
                <label>End (s)</label>
                <input
                  type="number"
                  value={exerciseEnd}
                  onChange={(e) => setExerciseEnd(parseFloat(e.target.value) || 5)}
                  step="0.1"
                  className="form-input"
                />
              </div>
            </div>
            <div className="form-actions">
              <button onClick={handleAddExercise} className="btn-primary">
                Add
              </button>
              <button onClick={() => setShowAddExercise(false)} className="btn-secondary">
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

