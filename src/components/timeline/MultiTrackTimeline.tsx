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
  const timelineRef = useRef<HTMLDivElement>(null);
  const tracksContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ clipId: string; startX: number; startTime: number } | null>(null);
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
  const [resizeStart, setResizeStart] = useState<{ clipId: string; startX: number; startTime: number; startDuration: number } | null>(null);

  // Synchronize horizontal scrolling between ruler and tracks
  useEffect(() => {
    const ruler = timelineRef.current;
    const tracks = tracksContainerRef.current;
    
    if (!ruler || !tracks) return;

    const handleRulerScroll = () => {
      tracks.scrollLeft = ruler.scrollLeft;
    };

    const handleTracksScroll = () => {
      ruler.scrollLeft = tracks.scrollLeft;
    };

    ruler.addEventListener('scroll', handleRulerScroll);
    tracks.addEventListener('scroll', handleTracksScroll);

    return () => {
      ruler.removeEventListener('scroll', handleRulerScroll);
      tracks.removeEventListener('scroll', handleTracksScroll);
    };
  }, []);

  // Minimum pixels per second to ensure readable spacing
  const minPixelsPerSecond = 30;
  const pixelsPerSecond = Math.max(minPixelsPerSecond, 50 * zoom);
  const timelineWidth = duration * pixelsPerSecond;

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

  // Generate second markers
  const generateSecondMarkers = (): Array<{ time: number; position: number; isMajor: boolean; showLabel: boolean }> => {
    if (duration <= 0) return [];
    
    const markers: Array<{ time: number; position: number; isMajor: boolean; showLabel: boolean }> = [];
    const totalSeconds = Math.ceil(duration);
    
    // Calculate label interval based on zoom and duration
    // Show labels more frequently when zoomed in or for shorter videos
    let labelInterval = 5; // Default: every 5 seconds for very long videos at default zoom
    if (zoom > 1) {
      // When zoomed in at all, show every second
      labelInterval = 1;
    } else if (duration <= 300) {
      // For videos 5 minutes or less, show every second
      labelInterval = 1;
    } else if (duration <= 600) {
      // For videos 10 minutes or less, show every 2 seconds
      labelInterval = 2;
    } else if (duration <= 1200) {
      // For videos 20 minutes or less, show every 3 seconds
      labelInterval = 3;
    }
    
    // Generate markers for every second - always show the line, conditionally show label
    for (let i = 0; i <= totalSeconds; i++) {
      if (i <= duration) {
        const shouldShowLabel = i % labelInterval === 0 || i === 0 || i === totalSeconds;
        markers.push({
          time: i,
          position: (i / duration) * 100,
          isMajor: true,
          showLabel: shouldShowLabel,
        });
      }
    }
    
    // Add sub-second markers if zoomed in enough
    if (zoom > 1 && duration > 0) {
      const subSecondInterval = zoom > 2 ? 0.1 : 0.5;
      for (let t = 0; t <= duration; t += subSecondInterval) {
        const wholeSecond = Math.floor(t);
        const remainder = t - wholeSecond;
        // Don't duplicate whole seconds
        if (remainder > 0.01 && remainder < 0.99) {
          markers.push({
            time: t,
            position: (t / duration) * 100,
            isMajor: false,
            showLabel: false,
          });
        }
      }
    }
    
    return markers.sort((a, b) => a.time - b.time);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (timelineRef.current && !isDragging && !isResizing && duration > 0) {
      const rect = timelineRef.current.getBoundingClientRect();
      const scrollLeft = timelineRef.current.scrollLeft || 0;
      const clickX = e.clientX - rect.left + scrollLeft;
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
      if (isDragging && dragStart && timelineRef.current) {
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
  }, [isDragging, isResizing, dragStart, resizeStart, duration, tracks, onClipUpdate]);

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
        <div 
          className="timeline-ruler" 
          ref={timelineRef} 
          onClick={handleTimelineClick}
          style={{ width: `${timelineWidth}px`, minWidth: '100%' }}
        >
          {duration > 0 && generateSecondMarkers().map((marker, index) => (
            <div
              key={`marker-${marker.time}-${index}`}
              className={`ruler-mark ${marker.isMajor ? 'major' : 'minor'}`}
              style={{ left: `${timeToPixels(marker.time)}px` }}
            >
              <div className={`ruler-line ${marker.isMajor ? 'major-line' : 'minor-line'}`} />
              {marker.isMajor && marker.showLabel && (
                <span className="ruler-label">{formatTime(marker.time)}</span>
              )}
            </div>
          ))}
          <div
            className="playhead"
            style={{ left: `${timeToPixels(currentTime)}px` }}
          />
        </div>
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
              style={{ width: `${timelineWidth}px`, minWidth: '100%' }}
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

      <div className="timeline-footer">
        <div className="zoom-controls">
          <span>Zoom: {Math.round(zoom * 100)}%</span>
        </div>
      </div>
    </div>
  );
};

export default MultiTrackTimeline;

