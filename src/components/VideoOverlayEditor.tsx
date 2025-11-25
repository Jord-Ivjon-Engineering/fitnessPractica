import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Move, Type, Clock, Image as ImageIcon } from 'lucide-react';

export interface Overlay {
  id: string;
  type: 'timer' | 'text' | 'image';
  startTime: number;
  endTime: number;
  // Position (0-100 for percentage)
  x: number;
  y: number;
  // Size/Scale (0-100)
  width?: number;
  height?: number;
  // Content
  text?: string;
  fontSize?: number;
  fontColor?: string;
  backgroundColor?: string;
  // Timer specific
  timerType?: 'countdown' | 'elapsed';
  timerFormat?: 'MM:SS' | 'SS';
  // Image specific
  imageUrl?: string;
}

interface VideoOverlayEditorProps {
  videoUrl: string;
  videoDuration: number;
  onOverlaysChange: (overlays: Overlay[]) => void;
  initialOverlays?: Overlay[];
}

const VideoOverlayEditor: React.FC<VideoOverlayEditorProps> = ({
  videoUrl,
  videoDuration,
  onOverlaysChange,
  initialOverlays = []
}) => {
  const [overlays, setOverlays] = useState<Overlay[]>(initialOverlays);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedOverlay, setSelectedOverlay] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editingOverlay, setEditingOverlay] = useState<Overlay | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [actualDuration, setActualDuration] = useState(videoDuration);

  // Update overlays when initialOverlays prop changes
  useEffect(() => {
    if (initialOverlays.length > 0 && overlays.length === 0) {
      setOverlays(initialOverlays);
    }
  }, [initialOverlays]);

  useEffect(() => {
    onOverlaysChange(overlays);
  }, [overlays, onOverlaysChange]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const handleLoadedMetadata = () => {
        if (video.duration && !isNaN(video.duration)) {
          setActualDuration(video.duration);
        }
      };
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      // Check if already loaded
      if (video.duration && !isNaN(video.duration)) {
        setActualDuration(video.duration);
      }
      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    }
  }, [videoUrl]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      const seekTime = Math.max(0, Math.min(time, actualDuration || videoDuration));
      videoRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const addOverlay = (type: 'timer' | 'text' | 'image') => {
    const newOverlay: Overlay = {
      id: Date.now().toString(),
      type,
      startTime: currentTime,
      endTime: Math.min(currentTime + 5, videoDuration),
      x: 50,
      y: 50,
      width: type === 'image' ? 200 : undefined,
      height: type === 'image' ? 200 : undefined,
      text: type === 'text' ? 'Enter text' : undefined,
      fontSize: 48,
      fontColor: '#FFFFFF',
      backgroundColor: type === 'text' ? 'rgba(0,0,0,0.6)' : undefined,
      timerType: type === 'timer' ? 'countdown' : undefined,
      timerFormat: 'MM:SS',
    };
    setOverlays([...overlays, newOverlay]);
    setSelectedOverlay(newOverlay.id);
    setEditingOverlay(newOverlay);
    setShowAddMenu(false);
  };

  const deleteOverlay = (id: string) => {
    setOverlays(overlays.filter(o => o.id !== id));
    if (selectedOverlay === id) {
      setSelectedOverlay(null);
      setEditingOverlay(null);
    }
  };

  const updateOverlay = (id: string, updates: Partial<Overlay>) => {
    setOverlays(overlays.map(o => o.id === id ? { ...o, ...updates } : o));
    if (editingOverlay?.id === id) {
      setEditingOverlay({ ...editingOverlay, ...updates });
    }
  };

  const handleOverlayClick = (overlay: Overlay, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOverlay(overlay.id);
    setEditingOverlay(overlay);
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current) {
      setSelectedOverlay(null);
      setEditingOverlay(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getOverlayStyle = (overlay: Overlay) => {
    const isActive = currentTime >= overlay.startTime && currentTime <= overlay.endTime;
    return {
      position: 'absolute' as const,
      left: `${overlay.x}%`,
      top: `${overlay.y}%`,
      transform: 'translate(-50%, -50%)',
      opacity: isActive ? 1 : 0.3,
      border: selectedOverlay === overlay.id ? '2px solid #667eea' : '2px dashed transparent',
      cursor: 'pointer',
      zIndex: selectedOverlay === overlay.id ? 10 : 1,
    };
  };

  const renderOverlayPreview = (overlay: Overlay) => {
    const isActive = currentTime >= overlay.startTime && currentTime <= overlay.endTime;
    if (!isActive && selectedOverlay !== overlay.id) return null;

    const style: React.CSSProperties = {
      padding: overlay.type === 'text' ? '8px 16px' : '4px 8px',
      backgroundColor: overlay.backgroundColor || 'transparent',
      borderRadius: '8px',
      fontSize: `${overlay.fontSize || 48}px`,
      color: overlay.fontColor || '#FFFFFF',
      whiteSpace: 'nowrap' as const,
      pointerEvents: 'none' as const,
    };

    switch (overlay.type) {
      case 'timer':
        const remaining = Math.max(0, overlay.endTime - currentTime);
        const mins = Math.floor(remaining / 60);
        const secs = Math.floor(remaining % 60);
        const timerText = overlay.timerFormat === 'SS' 
          ? `${Math.floor(remaining)}` 
          : `${mins}:${secs.toString().padStart(2, '0')}`;
        return (
          <div style={style}>
            ⏱️ {timerText}
          </div>
        );
      case 'text':
        return <div style={style}>{overlay.text || 'Text'}</div>;
      case 'image':
        return overlay.imageUrl ? (
          <img 
            src={overlay.imageUrl} 
            alt="Overlay" 
            style={{ 
              width: overlay.width || 200, 
              height: overlay.height || 200,
              objectFit: 'contain' as const
            }} 
          />
        ) : (
          <div style={{ ...style, width: overlay.width || 200, height: overlay.height || 200 }}>
            <ImageIcon size={48} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="video-overlay-editor">
      <div className="editor-main-area">
        <div 
          ref={containerRef}
          className="video-container"
          onClick={handleContainerClick}
        >
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            onTimeUpdate={handleTimeUpdate}
            style={{ width: '100%', height: 'auto' }}
          />
          
          {/* Render overlays */}
          {overlays.map(overlay => (
            <div
              key={overlay.id}
              style={getOverlayStyle(overlay)}
              onClick={(e) => handleOverlayClick(overlay, e)}
            >
              {renderOverlayPreview(overlay)}
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="overlay-timeline">
          <div 
            className="timeline-track"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const duration = actualDuration || videoDuration;
              const time = (clickX / rect.width) * duration;
              handleSeek(time);
            }}
          >
            <div 
              className="timeline-progress"
              style={{ width: `${((actualDuration || videoDuration) > 0 ? (currentTime / (actualDuration || videoDuration)) * 100 : 0)}%` }}
            />
            
            {/* Render overlay ranges */}
            {overlays.map(overlay => {
              const duration = actualDuration || videoDuration;
              return (
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
                title={`${overlay.type}: ${overlay.text || overlay.type}`}
              />
            )})}
          </div>
          <div className="timeline-time">
            {formatTime(currentTime)} / {formatTime(actualDuration || videoDuration)}
          </div>
        </div>
      </div>

      {/* Controls Panel */}
      <div className="editor-controls">
        <div className="controls-header">
          <h3>Overlays</h3>
          <div className="add-overlay-menu">
            <button 
              className="btn-add-overlay"
              onClick={() => setShowAddMenu(!showAddMenu)}
            >
              <Plus size={20} /> Add Overlay
            </button>
            {showAddMenu && (
              <div className="overlay-type-menu">
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

        {/* Overlay List */}
        <div className="overlay-list">
          {overlays.length === 0 ? (
            <p className="empty-message">No overlays added. Click "Add Overlay" to start.</p>
          ) : (
            overlays.map(overlay => (
              <div 
                key={overlay.id}
                className={`overlay-item ${selectedOverlay === overlay.id ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedOverlay(overlay.id);
                  setEditingOverlay(overlay);
                  handleSeek(overlay.startTime);
                }}
              >
                <div className="overlay-item-header">
                  <span className="overlay-type-badge">{overlay.type}</span>
                  <span className="overlay-time">
                    {formatTime(overlay.startTime)} - {formatTime(overlay.endTime)}
                  </span>
                  <button
                    className="btn-delete-overlay"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteOverlay(overlay.id);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {overlay.text && (
                  <div className="overlay-preview-text">{overlay.text}</div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Edit Panel */}
        {editingOverlay && (
          <div className="edit-panel">
            <h4>Edit Overlay</h4>
            
            <div className="form-group">
              <label>Start Time (seconds)</label>
              <input
                type="number"
                value={editingOverlay.startTime}
                onChange={(e) => updateOverlay(editingOverlay.id, { startTime: parseFloat(e.target.value) || 0 })}
                min="0"
                max={actualDuration || videoDuration}
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
                max={actualDuration || videoDuration}
                step="0.1"
              />
            </div>

            <div className="form-group">
              <label>Position X (%)</label>
              <input
                type="range"
                min="0"
                max="100"
                value={editingOverlay.x}
                onChange={(e) => updateOverlay(editingOverlay.id, { x: parseFloat(e.target.value) })}
              />
              <span>{editingOverlay.x}%</span>
            </div>

            <div className="form-group">
              <label>Position Y (%)</label>
              <input
                type="range"
                min="0"
                max="100"
                value={editingOverlay.y}
                onChange={(e) => updateOverlay(editingOverlay.id, { y: parseFloat(e.target.value) })}
              />
              <span>{editingOverlay.y}%</span>
            </div>

            {editingOverlay.type === 'text' && (
              <>
                <div className="form-group">
                  <label>Text</label>
                  <input
                    type="text"
                    value={editingOverlay.text || ''}
                    onChange={(e) => updateOverlay(editingOverlay.id, { text: e.target.value })}
                    placeholder="Enter text"
                  />
                </div>
                <div className="form-group">
                  <label>Font Size</label>
                  <input
                    type="number"
                    value={editingOverlay.fontSize || 48}
                    onChange={(e) => updateOverlay(editingOverlay.id, { fontSize: parseInt(e.target.value) || 48 })}
                    min="12"
                    max="200"
                  />
                </div>
                <div className="form-group">
                  <label>Text Color</label>
                  <input
                    type="color"
                    value={editingOverlay.fontColor || '#FFFFFF'}
                    onChange={(e) => updateOverlay(editingOverlay.id, { fontColor: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Background Color</label>
                  <input
                    type="color"
                    value={editingOverlay.backgroundColor || 'rgba(0,0,0,0.6)'}
                    onChange={(e) => updateOverlay(editingOverlay.id, { backgroundColor: e.target.value })}
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
                    <option value="SS">Seconds</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Font Size</label>
                  <input
                    type="number"
                    value={editingOverlay.fontSize || 48}
                    onChange={(e) => updateOverlay(editingOverlay.id, { fontSize: parseInt(e.target.value) || 48 })}
                    min="12"
                    max="200"
                  />
                </div>
                <div className="form-group">
                  <label>Text Color</label>
                  <input
                    type="color"
                    value={editingOverlay.fontColor || '#FFFFFF'}
                    onChange={(e) => updateOverlay(editingOverlay.id, { fontColor: e.target.value })}
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
                    onChange={(e) => updateOverlay(editingOverlay.id, { width: parseInt(e.target.value) || 200 })}
                    min="50"
                    max="1000"
                  />
                </div>
                <div className="form-group">
                  <label>Height</label>
                  <input
                    type="number"
                    value={editingOverlay.height || 200}
                    onChange={(e) => updateOverlay(editingOverlay.id, { height: parseInt(e.target.value) || 200 })}
                    min="50"
                    max="1000"
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoOverlayEditor;

