import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Player } from '@remotion/player';
import { OverlayVideoComposition } from '../remotion/OverlayVideo';
import { WorkoutVideoComposition } from '../remotion/WorkoutVideo';
import { 
  Play, Pause, ZoomIn, ZoomOut, Scissors, 
  Film, Image as ImageIcon, Type, Clock,
  Download, Save, Undo, Redo, Maximize2, X
} from 'lucide-react';
import MultiTrackTimeline from './timeline/MultiTrackTimeline';
import MediaLibrary from './editor/MediaLibrary';
import Toolbar from './editor/Toolbar';
import '../styles/AdvancedVideoEditor.css';

export interface TimelineTrack {
  id: string;
  type: 'video' | 'audio' | 'overlay' | 'effect';
  name: string;
  clips: TimelineClip[];
  locked?: boolean;
  muted?: boolean;
}

export interface TimelineClip {
  id: string;
  type: 'video' | 'audio' | 'text' | 'image' | 'timer' | 'effect';
  startTime: number;
  endTime: number;
  startOffset?: number; // For trimming
  endOffset?: number; // For trimming
  data: any; // Clip-specific data
  effects?: Effect[];
}

export interface Effect {
  id: string;
  type: 'filter' | 'transition' | 'animation';
  name: string;
  params: Record<string, any>;
}

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

interface AdvancedVideoEditorProps {
  videoUrl: string;
  videoTitle?: string;
  videoSize?: number;
  onTitleChange?: (title: string) => void;
  onExercisesChange?: (exercises: Exercise[]) => void;
  onOverlaysChange?: (overlays: Overlay[]) => void;
  onDurationChange?: (duration: number) => void;
  onExport?: (data: { exercises: Exercise[]; overlays: Overlay[] }) => void;
}

const AdvancedVideoEditor: React.FC<AdvancedVideoEditorProps> = ({
  videoUrl,
  videoTitle = 'Untitled Video',
  videoSize,
  onTitleChange,
  onExercisesChange,
  onOverlaysChange,
  onDurationChange,
  onExport,
}) => {
  const [tracks, setTracks] = useState<TimelineTrack[]>([
    {
      id: 'video-1',
      type: 'video',
      name: 'Video Track 1',
      clips: [],
    },
    {
      id: 'overlay-1',
      type: 'overlay',
      name: 'Overlays',
      clips: [],
    },
  ]);
  
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [selectedClip, setSelectedClip] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'media'>('media');
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showRemotionPreview, setShowRemotionPreview] = useState(false);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const nextExerciseId = useRef(1);
  const nextClipId = useRef(1);
  const handleDeleteClipRef = useRef<(clipId: string) => void>();

  useEffect(() => {
    if (videoRef.current) {
      const handleLoadedMetadata = () => {
        if (videoRef.current) {
          if (videoRef.current.duration) {
            const dur = videoRef.current.duration;
            setDuration(dur);
            onDurationChange?.(dur);
          }
          if (videoRef.current.videoWidth && videoRef.current.videoHeight) {
            setVideoDimensions({
              width: videoRef.current.videoWidth,
              height: videoRef.current.videoHeight,
            });
          }
        }
      };
      videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
      if (videoRef.current.duration) {
        setDuration(videoRef.current.duration);
        onDurationChange?.(videoRef.current.duration);
      }
      if (videoRef.current.videoWidth && videoRef.current.videoHeight) {
        setVideoDimensions({
          width: videoRef.current.videoWidth,
          height: videoRef.current.videoHeight,
        });
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
    // Convert exercises to timeline clips
    const exerciseClips: TimelineClip[] = exercises.map(ex => ({
      id: `exercise-${ex.id}`,
      type: 'text',
      startTime: ex.start,
      endTime: ex.end,
      data: { name: ex.name, exerciseId: ex.id },
    }));

    // Convert overlays to timeline clips
    const overlayClips: TimelineClip[] = overlays.map(ov => ({
      id: ov.id,
      type: ov.type === 'timer' ? 'timer' : ov.type === 'image' ? 'image' : 'text',
      startTime: ov.startTime,
      endTime: ov.endTime,
      data: ov,
    }));

    // Update overlay track
    setTracks(prev => prev.map(track => 
      track.id === 'overlay-1' 
        ? { ...track, clips: [...exerciseClips, ...overlayClips] }
        : track
    ));
  }, [exercises, overlays]);

  useEffect(() => {
    onExercisesChange?.(exercises);
  }, [exercises, onExercisesChange]);

  useEffect(() => {
    onOverlaysChange?.(overlays);
  }, [overlays, onOverlaysChange]);

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

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(time, duration));
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleAddExercise = (name: string, start: number, end: number) => {
    const newExercise: Exercise = {
      id: nextExerciseId.current++,
      name,
      start,
      end,
    };
    setExercises([...exercises, newExercise].sort((a, b) => a.start - b.start));
    // Add a single timer overlay that carries the exercise name so backend can render a green box
    const timerOverlay: Overlay = {
      id: `exercise-timer-${newExercise.id}`,
      type: 'timer',
      startTime: start,
      endTime: end,
      x: 95, // top-right area (percentage) - closer to right edge
      y: 5,  // closer to top
      text: name, // use text to render name above timer in the same box
      fontSize: 18, // smaller font
      fontColor: '#FFFFFF',
      backgroundColor: '#22c55e', // hint color; backend will draw box
      timerType: 'elapsed',
      timerFormat: 'MM:SS'
    };
    setOverlays(prev => [...prev, timerOverlay]);
    saveHistory();
  };

  const handleAddOverlay = (overlay: Overlay) => {
    setOverlays([...overlays, overlay]);
    saveHistory();
  };

  const saveHistory = () => {
    const newState = { exercises, overlays, tracks };
    setHistory(prev => [...prev.slice(0, historyIndex + 1), newState]);
    setHistoryIndex(prev => prev + 1);
  };

  const handleDeleteClip = (clipId: string) => {
    // Remove from exercises or overlays
    if (clipId.startsWith('exercise-')) {
      const exerciseId = parseInt(clipId.replace('exercise-', ''));
      setExercises(prev => prev.filter(ex => ex.id !== exerciseId));
    } else {
      setOverlays(prev => prev.filter(ov => ov.id !== clipId));
    }
    
    // Remove from tracks
    setTracks(prev => prev.map(track => ({
      ...track,
      clips: track.clips.filter(clip => clip.id !== clipId),
    })));
    saveHistory();
  };

  // Update ref whenever handleDeleteClip changes
  useEffect(() => {
    handleDeleteClipRef.current = handleDeleteClip;
  }, [exercises, overlays, tracks, historyIndex]);

  const handleClipUpdate = (clipId: string, updates: Partial<TimelineClip>) => {
    setTracks(prev => prev.map(track => ({
      ...track,
      clips: track.clips.map(clip => 
        clip.id === clipId ? { ...clip, ...updates } : clip
      ),
    })));

    // Update exercises or overlays accordingly
    const clip = tracks.flatMap(t => t.clips).find(c => c.id === clipId);
    if (clip) {
      if (clipId.startsWith('exercise-')) {
        const exerciseId = parseInt(clipId.replace('exercise-', ''));
        setExercises(exercises.map(ex => 
          ex.id === exerciseId 
            ? { ...ex, start: updates.startTime ?? ex.start, end: updates.endTime ?? ex.end }
            : ex
        ));
      } else {
        setOverlays(overlays.map(ov => 
          ov.id === clipId
            ? { ...ov, startTime: updates.startTime ?? ov.startTime, endTime: updates.endTime ?? ov.endTime }
            : ov
        ));
      }
    }
    saveHistory();
  };

  // Handle keyboard shortcuts for deleting selected clips
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle backspace if a clip is selected and user is not typing in an input/textarea
      if (e.key === 'Backspace' && selectedClip) {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || 
                       target.tagName === 'TEXTAREA' || 
                       target.isContentEditable;
        
        if (!isInput && handleDeleteClipRef.current) {
          e.preventDefault();
          handleDeleteClipRef.current(selectedClip);
          setSelectedClip(null); // Clear selection after deletion
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedClip]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setExercises(prevState.exercises);
      setOverlays(prevState.overlays);
      setTracks(prevState.tracks);
      setHistoryIndex(prev => prev - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setExercises(nextState.exercises);
      setOverlays(nextState.overlays);
      setTracks(nextState.tracks);
      setHistoryIndex(prev => prev + 1);
    }
  };

  const handleExportClick = () => {
    onExport?.({ exercises, overlays });
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateAspectRatio = (width: number, height: number): string => {
    // Calculate GCD to simplify the ratio
    const gcd = (a: number, b: number): number => {
      return b === 0 ? a : gcd(b, a % b);
    };
    
    const divisor = gcd(width, height);
    const ratioWidth = width / divisor;
    const ratioHeight = height / divisor;
    
    // Check for common aspect ratios
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
    
    // Return simplified ratio
    return `${ratioWidth}:${ratioHeight}`;
  };

  const useOverlayComposition = overlays.length > 0;
  const durationInFrames = Math.ceil(duration * 30);

  return (
    <div className="advanced-video-editor">
      {/* Top Toolbar */}
      <Toolbar
        onPlayPause={handlePlayPause}
        playing={playing}
        videoTitle={videoTitle}
        onTitleChange={onTitleChange || (() => {})}
      />

      <div className="editor-layout">
        {/* Left Sidebar */}
        <div className="editor-sidebar">
          <div className="sidebar-tabs">
            <button
              className={activePanel === 'media' ? 'active' : ''}
              onClick={() => setActivePanel('media')}
            >
              <Film size={16} /> Media
            </button>
          </div>

          <div className="sidebar-content">
            {activePanel === 'media' && (
              <MediaLibrary
                videoUrl={videoUrl}
                videoDimensions={videoDimensions}
                onAddExercise={handleAddExercise}
                onAddOverlay={handleAddOverlay}
                currentTime={currentTime}
                videoRef={videoRef}
                playing={playing}
              />
            )}
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="editor-main">
          {/* Video Preview */}
          <div className="video-preview-container">
            <div 
              className="video-wrapper"
              style={videoDimensions ? {
                aspectRatio: `${videoDimensions.width} / ${videoDimensions.height}`
              } : undefined}
            >
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
                  const v = videoRef.current;
                  if (!v) return;
                  try {
                    const ranges: Array<[number, number]> = [];
                    for (let i = 0; i < v.buffered.length; i++) {
                      ranges.push([v.buffered.start(i), v.buffered.end(i)]);
                    }
                    // eslint-disable-next-line no-console
                    console.warn('Video stalled (Advanced). Buffered:', ranges, 't=', v.currentTime, 'rs=', v.readyState);
                  } catch {}
                  const i = v.buffered.length - 1;
                  if (i >= 0) {
                    const end = v.buffered.end(i);
                    if (v.currentTime >= end - 0.25) {
                      v.currentTime = Math.min(v.currentTime + 0.1, v.duration || v.currentTime + 0.1);
                    }
                  }
                  v.play().catch(() => {
                    v.load();
                    setTimeout(() => v.play().catch(() => {}), 200);
                  });
                }}
                onWaiting={() => {
                  const v = videoRef.current;
                  if (!v) return;
                  // eslint-disable-next-line no-console
                  console.info('Video waiting (Advanced) at', v.currentTime, 'rs=', v.readyState);
                  v.play().catch(() => {
                    v.load();
                    setTimeout(() => v.play().catch(() => {}), 200);
                  });
                }}
              />
              {/* Live overlay preview: show timer overlays with exercise name in green box during active interval */}
              <div className="overlay-preview-layer" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                {overlays
                  .filter(ov => ov.type === 'timer' && currentTime >= ov.startTime && currentTime <= ov.endTime)
                  .map(ov => {
                    // Circular badge size for top-right
                    const badgeSize = 120;
                    const left = `${Math.max(0, Math.min(100, ov.x))}%`;
                    const topPxOffset = 10;
                    const top = `calc(${Math.max(0, Math.min(100, ov.y))}% + ${topPxOffset}px)`;
                    // Position badge with its right edge near the percentage x
                    return (
                      <div
                        key={`live-${ov.id}`}
                        style={{
                          position: 'absolute',
                          left,
                          top,
                          transform: `translateX(-${badgeSize}px)`,
                          width: badgeSize,
                          height: badgeSize,
                          backgroundColor: 'rgba(34, 197, 94, 0.9)', // #22c55e @ 0.9
                          borderRadius: '50%', // circular
                          padding: '8px',
                          color: '#fff',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          textAlign: 'center',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        }}
                      >
                        <div style={{ fontSize: Math.min(14, (ov.fontSize || 18) * 0.7), lineHeight: 1.1, fontWeight: 700, marginBottom: 4 }}>
                          {ov.text || ''}
                        </div>
                        <div style={{ fontSize: Math.min(16, (ov.fontSize || 18) * 0.85), fontWeight: 600 }}>
                          {/* Render elapsed MM:SS in preview */}
                          {(() => {
                            const elapsed = Math.max(0, currentTime - ov.startTime);
                            const mm = Math.floor(elapsed / 60).toString().padStart(2, '0');
                            const ss = Math.floor(elapsed % 60).toString().padStart(2, '0');
                            return `${mm}:${ss}`;
                          })()}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
            <div className="preview-info">
              <div className="preview-time">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
              {videoDimensions && (
                <div className="preview-aspect-ratio">
                  {videoDimensions.width} × {videoDimensions.height} ({calculateAspectRatio(videoDimensions.width, videoDimensions.height)})
                </div>
              )}
            </div>
          </div>

          {/* Multi-Track Timeline */}
          <MultiTrackTimeline
            tracks={tracks}
            currentTime={currentTime}
            duration={duration}
            zoom={zoom}
            onSeek={handleSeek}
            onClipSelect={setSelectedClip}
            onClipUpdate={handleClipUpdate}
            onClipDelete={handleDeleteClip}
            selectedClip={selectedClip}
          />
        </div>
      </div>

      {/* Remotion Preview (Optional) */}
      {(exercises.length > 0 || overlays.length > 0) && showRemotionPreview && (
        <div className="remotion-preview-section">
          <div className="preview-header">
            <h3>Remotion Preview</h3>
            <button 
              onClick={() => setShowRemotionPreview(false)}
              className="preview-close-btn"
              title="Close Preview"
            >
              <X size={20} />
            </button>
          </div>
          <Player
            component={useOverlayComposition ? OverlayVideoComposition : WorkoutVideoComposition}
            inputProps={{
              videoUrl,
              exercises: exercises.length > 0 ? exercises : undefined,
              overlays: overlays.length > 0 ? overlays : undefined,
            }}
            durationInFrames={durationInFrames}
            fps={30}
            compositionWidth={1920}
            compositionHeight={1080}
            style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}
            controls
            acknowledgeRemotionLicense
          />
        </div>
      )}
    </div>
  );
};

export default AdvancedVideoEditor;

