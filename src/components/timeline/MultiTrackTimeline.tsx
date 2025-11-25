import React, { useRef, useState, useEffect } from 'react';
import { GripVertical, Scissors, Trash2 } from 'lucide-react';
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
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ clipId: string; startX: number; startTime: number } | null>(null);
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
  const [resizeStart, setResizeStart] = useState<{ clipId: string; startX: number; startTime: number; startDuration: number } | null>(null);

  const pixelsPerSecond = 50 * zoom;
  const timelineWidth = duration * pixelsPerSecond;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const timeToPosition = (time: number): number => {
    return (time / duration) * 100;
  };

  const positionToTime = (percent: number): number => {
    return (percent / 100) * duration;
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (timelineRef.current && !isDragging && !isResizing) {
      const rect = timelineRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const time = (clickX / rect.width) * duration;
      onSeek(time);
    }
  };

  const handleClipMouseDown = (e: React.MouseEvent, clip: TimelineClip) => {
    e.stopPropagation();
    onClipSelect(clip.id);
    
    const rect = e.currentTarget.getBoundingClientRect();
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
        const rect = timelineRef.current.getBoundingClientRect();
        const deltaX = e.clientX - dragStart.startX;
        const deltaTime = (deltaX / rect.width) * duration;
        const newStartTime = Math.max(0, Math.min(dragStart.startTime + deltaTime, duration - (dragStart.startTime + deltaTime)));
        const clipDuration = tracks
          .flatMap(t => t.clips)
          .find(c => c.id === dragStart.clipId)?.endTime - tracks
          .flatMap(t => t.clips)
          .find(c => c.id === dragStart.clipId)?.startTime || 0;
        
        onClipUpdate(dragStart.clipId, {
          startTime: newStartTime,
          endTime: newStartTime + clipDuration,
        });
      }

      if (isResizing && resizeStart && timelineRef.current) {
        const rect = timelineRef.current.getBoundingClientRect();
        const deltaX = e.clientX - resizeStart.startX;
        const deltaTime = (deltaX / rect.width) * duration;
        
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
        <div className="timeline-ruler" ref={timelineRef} onClick={handleTimelineClick}>
          {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => (
            <div
              key={i}
              className="ruler-mark"
              style={{ left: `${(i / duration) * 100}%` }}
            >
              <div className="ruler-line" />
              <span className="ruler-label">{formatTime(i)}</span>
            </div>
          ))}
          <div
            className="playhead"
            style={{ left: `${timeToPosition(currentTime)}%` }}
          />
        </div>
      </div>

      <div className="timeline-tracks">
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
            <div className="track-clips-container" onClick={handleTimelineClick}>
              {track.clips.map((clip) => {
                const clipWidth = ((clip.endTime - clip.startTime) / duration) * 100;
                const clipLeft = (clip.startTime / duration) * 100;
                const isSelected = selectedClip === clip.id;

                return (
                  <div
                    key={clip.id}
                    className={`timeline-clip ${isSelected ? 'selected' : ''}`}
                    style={{
                      left: `${clipLeft}%`,
                      width: `${clipWidth}%`,
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

