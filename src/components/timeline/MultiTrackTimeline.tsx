import React, { useRef, useState, useEffect } from 'react';
import { GripVertical, Trash2 } from 'lucide-react';
import { TimelineTrack, TimelineClip } from '../AdvancedVideoEditor';
import '../../styles/MultiTrackTimeline.css';

interface MultiTrackTimelineProps {
  tracks: TimelineTrack[];
  currentTime: number;
  duration: number;
  zoom: number;
  onSeek: (time: number) => void;
  onClipSelect: (clipId: string | null) => void;
  onClipUpdate: (clipId: string, updates: Partial<TimelineClip>) => void;
  onClipDelete: (clipId: string) => void;
  selectedClip: string | null;
}

const MultiTrackTimeline: React.FC<MultiTrackTimelineProps> = ({
  tracks,
  currentTime,
  duration,
  zoom,
  onSeek,
  onClipSelect,
  onClipUpdate,
  onClipDelete,
  selectedClip,
}) => {
  const tracksContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ clipId: string; startX: number; startTime: number } | null>(null);
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
  const [resizeStart, setResizeStart] = useState<{ clipId: string; startX: number; startTime: number; startDuration: number } | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Calculate pixels per second based on container width and duration
  useEffect(() => {
    const updateWidth = () => {
      if (tracksContainerRef.current) {
        // Get the width of the tracks container
        const tracksWidth = tracksContainerRef.current.offsetWidth;
        // Subtract the track-controls width (160px) to get the clips container width
        const clipsWidth = tracksWidth - 160;
        setContainerWidth(Math.max(0, clipsWidth));
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    // Use ResizeObserver for more accurate width tracking
    const resizeObserver = new ResizeObserver(updateWidth);
    if (tracksContainerRef.current) {
      resizeObserver.observe(tracksContainerRef.current);
    }
    
    return () => {
      window.removeEventListener('resize', updateWidth);
      resizeObserver.disconnect();
    };
  }, []);

  const pixelsPerSecond = duration > 0 && containerWidth > 0 
    ? containerWidth / duration 
    : 50;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const timeToPixels = (time: number): number => {
    return time * pixelsPerSecond;
  };

  const pixelsToTime = (pixels: number): number => {
    return pixels / pixelsPerSecond;
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging && !isResizing && duration > 0 && containerWidth > 0) {
      const target = e.currentTarget;
      const rect = target.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const time = Math.max(0, Math.min(pixelsToTime(clickX), duration));
      onSeek(time);
    }
  };

  const handleClipMouseDown = (e: React.MouseEvent, clip: TimelineClip) => {
    e.stopPropagation();
    onClipSelect(clip.id);
    
    const startX = e.clientX;
    const startTime = clip.startTime;
    
    setIsDragging(true);
    setDragStart({ clipId: clip.id, startX, startTime });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, clip: TimelineClip, side: 'left' | 'right') => {
    e.stopPropagation();
    e.preventDefault();
    
    const startX = e.clientX;
    setIsResizing(side);
    setResizeStart({
      clipId: clip.id,
      startX,
      startTime: clip.startTime,
      startDuration: clip.endTime - clip.startTime,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && dragStart) {
        const deltaX = e.clientX - dragStart.startX;
        const deltaTime = pixelsToTime(deltaX);
        const clip = tracks.flatMap(t => t.clips).find(c => c.id === dragStart.clipId);
        const clipDuration = clip ? clip.endTime - clip.startTime : 0;
        const newStartTime = Math.max(0, Math.min(dragStart.startTime + deltaTime, duration - clipDuration));
        
        onClipUpdate(dragStart.clipId, {
          startTime: newStartTime,
          endTime: newStartTime + clipDuration,
        });
      }

      if (isResizing && resizeStart) {
        const deltaX = e.clientX - resizeStart.startX;
        const deltaTime = pixelsToTime(deltaX);
        
        if (isResizing === 'left') {
          const newStartTime = Math.max(0, resizeStart.startTime + deltaTime);
          const newDuration = resizeStart.startDuration - deltaTime;
          if (newDuration > 0.1) {
            onClipUpdate(resizeStart.clipId, {
              startTime: newStartTime,
              endTime: newStartTime + newDuration,
            });
          }
        } else {
          const newDuration = resizeStart.startDuration + deltaTime;
          if (newDuration > 0.1 && resizeStart.startTime + newDuration <= duration) {
            onClipUpdate(resizeStart.clipId, {
              endTime: resizeStart.startTime + newDuration,
            });
          }
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(null);
      setDragStart(null);
      setResizeStart(null);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart, duration, tracks, onClipUpdate, pixelsPerSecond, pixelsToTime]);

  const getClipColor = (type: string): string => {
    switch (type) {
      case 'video': return '#3b82f6';
      case 'audio': return '#10b981';
      case 'text': return '#f59e0b';
      case 'image': return '#8b5cf6';
      case 'timer': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className="multi-track-timeline">
      <div className="timeline-header">
        <div className="track-label-header">Tracks</div>
      </div>

      <div className="timeline-tracks" ref={tracksContainerRef}>
        {tracks.map((track) => (
          <div key={track.id} className="timeline-track">
            <div className="track-controls">
              <button className="track-lock" title={track.locked ? 'Unlock' : 'Lock'}>
                {track.locked ? '🔒' : '🔓'}
              </button>
              <button className="track-mute" title={track.muted ? 'Unmute' : 'Mute'}>
                {track.muted ? '🔇' : '🔊'}
              </button>
              <span className="track-name">{track.name}</span>
            </div>
            <div 
              className="track-clips-container" 
              onClick={handleTimelineClick}
            >
              {track.clips.map((clip) => {
                const clipWidth = timeToPixels(clip.endTime - clip.startTime);
                const clipLeft = timeToPixels(clip.startTime);
                const isSelected = selectedClip === clip.id;

                return (
                  <div
                    key={clip.id}
                    className={`timeline-clip ${isSelected ? 'selected' : ''}`}
                    style={{
                      left: `${clipLeft}px`,
                      width: `${clipWidth}px`,
                      minWidth: '20px',
                      backgroundColor: getClipColor(clip.type),
                    }}
                    onMouseDown={(e) => handleClipMouseDown(e, clip)}
                  >
                    <div className="clip-resize-handle left" onMouseDown={(e) => handleResizeMouseDown(e, clip, 'left')} />
                    <div className="clip-content">
                      <GripVertical size={12} className="clip-drag-handle" />
                      <span className="clip-label">
                        {clip.type === 'text' && clip.data?.name
                          ? clip.data.name
                          : clip.type}
                      </span>
                      <span className="clip-time">
                        {formatTime(clip.startTime)} - {formatTime(clip.endTime)}
                      </span>
                    </div>
                    <div className="clip-resize-handle right" onMouseDown={(e) => handleResizeMouseDown(e, clip, 'right')} />
                    {isSelected && (
                      <button
                        className="clip-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClipDelete(clip.id);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MultiTrackTimeline;

