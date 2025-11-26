import React, { useState, useRef, useEffect } from 'react';
import { Player } from '@remotion/player';
import RemotionPreview from './RemotionPreview';
import { Plus, Trash2, Type, Clock, Image as ImageIcon, Play, Pause } from 'lucide-react';
import '../styles/UnifiedVideoEditor.css';

export interface Exercise {
  id: number;
  name: string;
  start: number;
  end: number;
}

export interface Overlay {
  id: string;
  type: 'timer' | 'text' | 'image';
  startTime: number;
  endTime: number;
  x: number;
  y: number;
  text?: string;
  fontSize?: number;
  fontColor?: string;
  backgroundColor?: string;
  timerType?: 'countdown' | 'elapsed';
  timerFormat?: 'MM:SS' | 'SS';
  imageUrl?: string;
  width?: number;
  height?: number;
}

interface UnifiedVideoEditorProps {
  videoUrl: string;
  onExercisesChange?: (exercises: Exercise[]) => void;
  onOverlaysChange?: (overlays: Overlay[]) => void;
  onDurationChange?: (duration: number) => void;
}

const UnifiedVideoEditor: React.FC<UnifiedVideoEditorProps> = ({
  videoUrl,
  onExercisesChange,
  onOverlaysChange,
  onDurationChange,
}) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<number | null>(null);
  const [selectedOverlay, setSelectedOverlay] = useState<string | null>(null);
  const [editingOverlay, setEditingOverlay] = useState<Overlay | null>(null);
  const [showAddOverlayMenu, setShowAddOverlayMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'exercises' | 'overlays' | 'preview'>('exercises');
  const [markerMode, setMarkerMode] = useState<'start' | 'end' | null>(null);
  const [tempExercise, setTempExercise] = useState<{ start: number; end: number | null } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const nextExerciseId = useRef(1);

  useEffect(() => {
    if (videoRef.current) {
      const handleLoadedMetadata = () => {
        if (videoRef.current && videoRef.current.duration) {
          const dur = videoRef.current.duration;
          setDuration(dur);
          onDurationChange?.(dur);
        }
      };
      videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
      if (videoRef.current.duration) {
        setDuration(videoRef.current.duration);
        onDurationChange?.(videoRef.current.duration);
      }
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
        }
      };
    }
  }, [videoUrl, onDurationChange]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && playing) {
        setCurrentTime(videoRef.current.currentTime);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [playing]);

  useEffect(() => {
    onExercisesChange?.(exercises);
  }, [exercises, onExercisesChange]);

  useEffect(() => {
    onOverlaysChange?.(overlays);
  }, [overlays, onOverlaysChange]);

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(time, duration));
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setPlaying(!playing);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const time = (clickX / rect.width) * duration;
    handleSeek(time);
  };

  const markExercise = () => {
    if (markerMode === null) {
      setMarkerMode('start');
      setTempExercise({ start: currentTime, end: null });
    } else if (markerMode === 'start') {
      if (tempExercise && currentTime > tempExercise.start) {
        const exerciseName = prompt('Enter exercise name:');
        if (exerciseName) {
          const newExercise: Exercise = {
            id: nextExerciseId.current++,
            name: exerciseName,
            start: tempExercise.start,
            end: currentTime,
          };
          setExercises([...exercises, newExercise].sort((a, b) => a.start - b.start));
        }
        setMarkerMode(null);
        setTempExercise(null);
      }
    }
  };

  const deleteExercise = (id: number) => {
    setExercises(exercises.filter(ex => ex.id !== id));
  };

  const addOverlay = (type: 'timer' | 'text' | 'image') => {
    const newOverlay: Overlay = {
      id: Date.now().toString(),
      type,
      startTime: currentTime,
      endTime: currentTime + 5,
      x: 50,
      y: 50,
      fontSize: 48,
      fontColor: '#FFFFFF',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      ...(type === 'text' && { text: 'Enter text' }),
      ...(type === 'timer' && { timerType: 'countdown', timerFormat: 'MM:SS' }),
    };
    setOverlays([...overlays, newOverlay]);
    setEditingOverlay(newOverlay);
    setShowAddOverlayMenu(false);
  };

  const updateOverlay = (id: string, updates: Partial<Overlay>) => {
    setOverlays(overlays.map(ov => ov.id === id ? { ...ov, ...updates } : ov));
    if (editingOverlay?.id === id) {
      setEditingOverlay({ ...editingOverlay, ...updates });
    }
  };

  const deleteOverlay = (id: string) => {
    setOverlays(overlays.filter(ov => ov.id !== id));
    if (editingOverlay?.id === id) {
      setEditingOverlay(null);
    }
  };

  // Derived flag no longer needed after RemotionPreview adapter
  const durationInFrames = Math.ceil(duration * 30);

  return (
    <div className="unified-video-editor">
      <div className="editor-tabs">
        <button
          className={activeTab === 'exercises' ? 'active' : ''}
          onClick={() => setActiveTab('exercises')}
        >
          Exercises
        </button>
        <button
          className={activeTab === 'overlays' ? 'active' : ''}
          onClick={() => setActiveTab('overlays')}
        >
          Overlays
        </button>
        <button
          className={activeTab === 'preview' ? 'active' : ''}
          onClick={() => setActiveTab('preview')}
        >
          Preview
        </button>
      </div>

      <div className="video-section">
        <div className="video-container">
          <video
            ref={videoRef}
            src={videoUrl}
            controls={true}
            preload="auto"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={() => {
              if (videoRef.current) {
                setCurrentTime(videoRef.current.currentTime);
              }
            }}
            onStalled={() => {
              // Attempt recovery if playback stalls (often manifests around a specific timestamp)
              const v = videoRef.current;
              if (!v) return;
              // Log buffered ranges for diagnostics
              try {
                const ranges: Array<[number, number]> = [];
                for (let i = 0; i < v.buffered.length; i++) {
                  ranges.push([v.buffered.start(i), v.buffered.end(i)]);
                }
                // eslint-disable-next-line no-console
                console.warn('Video stalled. Buffered ranges:', ranges, 'currentTime:', v.currentTime, 'readyState:', v.readyState);
              } catch {}
              // Nudge playback forward or reload if necessary
              const nearEndOfBuffer = (() => {
                try {
                  const i = v.buffered.length - 1;
                  if (i >= 0) {
                    const end = v.buffered.end(i);
                    return v.currentTime >= end - 0.25;
                  }
                  return false;
                } catch {
                  return false;
                }
              })();
              if (nearEndOfBuffer) {
                // Try slight seek forward to prompt additional buffering
                v.currentTime = Math.min(v.currentTime + 0.1, v.duration || v.currentTime + 0.1);
              }
              // Try resuming playback
              v.play().catch(() => {
                // If play fails, reload and resume
                v.load();
                setTimeout(() => {
                  v.play().catch(() => {/* ignore */});
                }, 200);
              });
            }}
            onWaiting={() => {
              const v = videoRef.current;
              if (!v) return;
              // eslint-disable-next-line no-console
              console.info('Video waiting at', v.currentTime, 'readyState:', v.readyState);
              v.play().catch(() => {
                v.load();
                setTimeout(() => v.play().catch(() => {/* ignore */}), 200);
              });
            }}
          />
          {/* Keep the overlay play/pause as an optional helper but ensure it doesn't block native controls */}
          <div className="video-overlay-controls" style={{ pointerEvents: 'none' }}>
            <button onClick={handlePlayPause} className="play-pause-btn" style={{ pointerEvents: 'auto' }}>
              {playing ? <Pause size={24} /> : <Play size={24} />}
            </button>
          </div>
        </div>

        <div className="timeline-container">
          <div className="timeline" onClick={handleTimelineClick}>
            <div
              className="timeline-progress"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
            
            {/* Exercise ranges */}
            {exercises.map(ex => (
              <div
                key={ex.id}
                className={`exercise-range ${selectedExercise === ex.id ? 'selected' : ''}`}
                style={{
                  left: `${duration > 0 ? (ex.start / duration) * 100 : 0}%`,
                  width: `${duration > 0 ? ((ex.end - ex.start) / duration) * 100 : 0}%`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedExercise(ex.id);
                }}
                title={ex.name}
              />
            ))}

            {/* Overlay ranges */}
            {overlays.map(overlay => (
              <div
                key={overlay.id}
                className={`overlay-range ${selectedOverlay === overlay.id ? 'selected' : ''}`}
                style={{
                  left: `${duration > 0 ? (overlay.startTime / duration) * 100 : 0}%`,
                  width: `${duration > 0 ? ((overlay.endTime - overlay.startTime) / duration) * 100 : 0}%`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedOverlay(overlay.id);
                  setEditingOverlay(overlay);
                }}
                title={overlay.type}
              />
            ))}

            {/* Temp exercise marker */}
            {tempExercise && (
              <div
                className="temp-marker"
                style={{
                  left: `${duration > 0 ? (tempExercise.start / duration) * 100 : 0}%`,
                }}
              />
            )}
          </div>
          <div className="timeline-time">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      </div>

      <div className="editor-panel">
        {activeTab === 'exercises' && (
          <div className="exercises-panel">
            <div className="panel-header">
              <h3>Exercises</h3>
              <button
                onClick={markExercise}
                className="btn-mark"
                disabled={markerMode === 'start'}
              >
                {markerMode === null ? 'Mark Start' : markerMode === 'start' ? 'Mark End' : 'Mark Start'}
              </button>
            </div>
            <div className="exercises-list">
              {exercises.map(ex => (
                <div
                  key={ex.id}
                  className={`exercise-item ${selectedExercise === ex.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedExercise(ex.id);
                    handleSeek(ex.start);
                  }}
                >
                  <div className="exercise-info">
                    <strong>{ex.name}</strong>
                    <span>{formatTime(ex.start)} - {formatTime(ex.end)}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteExercise(ex.id);
                    }}
                    className="btn-delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {exercises.length === 0 && (
                <p className="empty-state">No exercises marked. Click "Mark Start" to begin.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'overlays' && (
          <div className="overlays-panel">
            <div className="panel-header">
              <h3>Overlays</h3>
              <div className="add-overlay-menu">
                <button
                  onClick={() => setShowAddOverlayMenu(!showAddOverlayMenu)}
                  className="btn-add"
                >
                  <Plus size={20} /> Add Overlay
                </button>
                {showAddOverlayMenu && (
                  <div className="overlay-menu-dropdown">
                    <button onClick={() => addOverlay('timer')}>
                      <Clock size={16} /> Timer
                    </button>
                    <button onClick={() => addOverlay('text')}>
                      <Type size={16} /> Text
                    </button>
                    <button onClick={() => addOverlay('image')}>
                      <ImageIcon size={16} /> Image
                    </button>
                  </div>
                )}
              </div>
            </div>

            {editingOverlay && (
              <div className="overlay-editor">
                <h4>Edit {editingOverlay.type} Overlay</h4>
                <div className="form-group">
                  <label>Start Time (seconds)</label>
                  <input
                    type="number"
                    value={editingOverlay.startTime}
                    onChange={(e) => updateOverlay(editingOverlay.id, { startTime: parseFloat(e.target.value) || 0 })}
                    min="0"
                    max={duration}
                    step="0.1"
                  />
                </div>
                <div className="form-group">
                  <label>End Time (seconds)</label>
                  <input
                    type="number"
                    value={editingOverlay.endTime}
                    onChange={(e) => updateOverlay(editingOverlay.id, { endTime: parseFloat(e.target.value) || 0 })}
                    min={editingOverlay.startTime}
                    max={duration}
                    step="0.1"
                  />
                </div>
                <div className="form-group">
                  <label>X Position (%)</label>
                  <input
                    type="number"
                    value={editingOverlay.x}
                    onChange={(e) => updateOverlay(editingOverlay.id, { x: parseFloat(e.target.value) || 0 })}
                    min="0"
                    max="100"
                  />
                </div>
                <div className="form-group">
                  <label>Y Position (%)</label>
                  <input
                    type="number"
                    value={editingOverlay.y}
                    onChange={(e) => updateOverlay(editingOverlay.id, { y: parseFloat(e.target.value) || 0 })}
                    min="0"
                    max="100"
                  />
                </div>
                {editingOverlay.type === 'text' && (
                  <>
                    <div className="form-group">
                      <label>Text</label>
                      <input
                        type="text"
                        value={editingOverlay.text || ''}
                        onChange={(e) => updateOverlay(editingOverlay.id, { text: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Font Size</label>
                      <input
                        type="number"
                        value={editingOverlay.fontSize || 48}
                        onChange={(e) => updateOverlay(editingOverlay.id, { fontSize: parseFloat(e.target.value) || 48 })}
                        min="12"
                        max="200"
                      />
                    </div>
                    <div className="form-group">
                      <label>Font Color</label>
                      <input
                        type="color"
                        value={editingOverlay.fontColor || '#FFFFFF'}
                        onChange={(e) => updateOverlay(editingOverlay.id, { fontColor: e.target.value })}
                      />
                    </div>
                  </>
                )}
                {editingOverlay.type === 'timer' && (
                  <>
                    <div className="form-group">
                      <label>Timer Type</label>
                      <select
                        value={editingOverlay.timerType || 'countdown'}
                        onChange={(e) => updateOverlay(editingOverlay.id, { timerType: e.target.value as 'countdown' | 'elapsed' })}
                      >
                        <option value="countdown">Countdown</option>
                        <option value="elapsed">Elapsed</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Format</label>
                      <select
                        value={editingOverlay.timerFormat || 'MM:SS'}
                        onChange={(e) => updateOverlay(editingOverlay.id, { timerFormat: e.target.value as 'MM:SS' | 'SS' })}
                      >
                        <option value="MM:SS">MM:SS</option>
                        <option value="SS">SS</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Font Size</label>
                      <input
                        type="number"
                        value={editingOverlay.fontSize || 48}
                        onChange={(e) => updateOverlay(editingOverlay.id, { fontSize: parseFloat(e.target.value) || 48 })}
                        min="12"
                        max="200"
                      />
                    </div>
                  </>
                )}
                {editingOverlay.type === 'image' && (
                  <>
                    <div className="form-group">
                      <label>Image URL</label>
                      <input
                        type="text"
                        value={editingOverlay.imageUrl || ''}
                        onChange={(e) => updateOverlay(editingOverlay.id, { imageUrl: e.target.value })}
                        placeholder="https://example.com/image.png"
                      />
                    </div>
                    <div className="form-group">
                      <label>Width</label>
                      <input
                        type="number"
                        value={editingOverlay.width || 200}
                        onChange={(e) => updateOverlay(editingOverlay.id, { width: parseFloat(e.target.value) || 200 })}
                        min="50"
                        max="1000"
                      />
                    </div>
                    <div className="form-group">
                      <label>Height</label>
                      <input
                        type="number"
                        value={editingOverlay.height || 200}
                        onChange={(e) => updateOverlay(editingOverlay.id, { height: parseFloat(e.target.value) || 200 })}
                        min="50"
                        max="1000"
                      />
                    </div>
                  </>
                )}
                <button
                  onClick={() => {
                    deleteOverlay(editingOverlay.id);
                    setEditingOverlay(null);
                  }}
                  className="btn-delete-overlay"
                >
                  <Trash2 size={16} /> Delete Overlay
                </button>
              </div>
            )}

            <div className="overlays-list">
              {overlays.map(overlay => (
                <div
                  key={overlay.id}
                  className={`overlay-item ${selectedOverlay === overlay.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedOverlay(overlay.id);
                    setEditingOverlay(overlay);
                    handleSeek(overlay.startTime);
                  }}
                >
                  <div className="overlay-info">
                    <strong>{overlay.type}</strong>
                    <span>{formatTime(overlay.startTime)} - {formatTime(overlay.endTime)}</span>
                  </div>
                </div>
              ))}
              {overlays.length === 0 && (
                <p className="empty-state">No overlays added. Click "Add Overlay" to begin.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="preview-panel">
            <h3>Remotion Preview</h3>
            {(exercises.length > 0 || overlays.length > 0) ? (
              <Player
                component={RemotionPreview}
                inputProps={{
                  videoUrl,
                  exercises: Array.isArray(exercises) ? exercises : [],
                  overlays: Array.isArray(overlays) ? overlays : [],
                }}
                durationInFrames={durationInFrames}
                fps={30}
                compositionWidth={1920}
                compositionHeight={1080}
                style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}
                controls
                acknowledgeRemotionLicense
              />
            ) : (
              <p className="empty-state">Add exercises or overlays to see preview.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedVideoEditor;

