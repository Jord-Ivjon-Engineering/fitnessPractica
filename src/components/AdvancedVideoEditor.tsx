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
  onPreviewSegmentsChange?: (segments: Array<{ name: string; start: number; end: number; type: 'exercise' | 'break' }>) => void;
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
  onPreviewSegmentsChange,
}) => {
  const [tracks, setTracks] = useState<TimelineTrack[]>([
    {
      id: 'video-1',
      type: 'video',
      name: 'Exercises',
      clips: [],
    },
    {
      id: 'overlay-1',
      type: 'overlay',
      name: 'Breaks',
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

  // One-time migration: ensure existing exercises have sequential odd IDs (1,3,5,...)
  const hasMigratedRef = useRef(false);
  useEffect(() => {
    if (hasMigratedRef.current) return;
    if (exercises.length === 0) return;
    // If any exercise has an even ID, remap all to odd sequential IDs preserving order
    const hasEven = exercises.some(ex => ex.id % 2 === 0);
    if (!hasEven) {
      hasMigratedRef.current = true;
      return;
    }
    const sorted = [...exercises].sort((a, b) => a.start - b.start);
    let nextOdd = 1;
    const remapped = sorted.map(ex => {
      const newEx = { ...ex, id: nextOdd };
      nextOdd += 2;
      return newEx;
    });
    // Preserve original order indices by mapping back
    const byStartMap = new Map(sorted.map((ex, idx) => [ex.start, remapped[idx]]));
    const finalOrder = exercises.map(ex => byStartMap.get(ex.start) || ex);
    setExercises(finalOrder);
    hasMigratedRef.current = true;
  }, [exercises]);
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showRemotionPreview, setShowRemotionPreview] = useState(false);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null);
  // Auto-generation overlay panel state
  const [showAutoPanel, setShowAutoPanel] = useState(false);
  const [autoExerciseTime, setAutoExerciseTime] = useState(40);
  const [autoBreakTime, setAutoBreakTime] = useState(20);
  const [autoExerciseName, setAutoExerciseName] = useState('Exercise');
  const [autoBreakName, setAutoBreakName] = useState('Break');
  const [autoFirstExerciseStart, setAutoFirstExerciseStart] = useState(0);
  const [previewSegments, setPreviewSegments] = useState<Array<{ name: string; start: number; end: number; type: 'exercise' | 'break' }>>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [videoRenderedSize, setVideoRenderedSize] = useState<{ width: number; height: number; left: number; top: number } | null>(null);
  const nextExerciseId = useRef(1);
  const nextClipId = useRef(1);
  const handleDeleteClipRef = useRef<((clipId: string) => void) | null>(null);

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

  // Notify parent when preview segments change
  useEffect(() => {
    onPreviewSegmentsChange?.(previewSegments);
  }, [previewSegments, onPreviewSegmentsChange]);

  // Calculate video's rendered size (accounting for object-fit: contain)
  useEffect(() => {
    const updateVideoSize = () => {
      if (videoRef.current && videoContainerRef.current && videoDimensions) {
        const container = videoContainerRef.current;
        const video = videoRef.current;
        // Get container dimensions (not viewport-relative)
        const containerWidth = container.offsetWidth || container.clientWidth;
        const containerHeight = container.offsetHeight || container.clientHeight;
        const videoAspect = videoDimensions.width / videoDimensions.height;
        const containerAspect = containerWidth / containerHeight;
        
        let renderedWidth: number;
        let renderedHeight: number;
        let left: number;
        let top: number;
        
        if (videoAspect > containerAspect) {
          // Video is wider - fit to width
          renderedWidth = containerWidth;
          renderedHeight = containerWidth / videoAspect;
          left = 0;
          top = (containerHeight - renderedHeight) / 2;
        } else {
          // Video is taller - fit to height
          renderedHeight = containerHeight;
          renderedWidth = containerHeight * videoAspect;
          left = (containerWidth - renderedWidth) / 2;
          top = 0;
        }
        
        setVideoRenderedSize({ width: renderedWidth, height: renderedHeight, left, top });
      }
    };
    
    updateVideoSize();
    window.addEventListener('resize', updateVideoSize);
    const video = videoRef.current;
    const container = videoContainerRef.current;
    
    if (video) {
      video.addEventListener('loadedmetadata', updateVideoSize);
      video.addEventListener('resize', updateVideoSize);
    }
    
    // Use ResizeObserver for more reliable size tracking
    let resizeObserver: ResizeObserver | null = null;
    if (container && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        updateVideoSize();
      });
      resizeObserver.observe(container);
      if (video) {
        resizeObserver.observe(video);
      }
    }
    
    return () => {
      window.removeEventListener('resize', updateVideoSize);
      if (video) {
        video.removeEventListener('loadedmetadata', updateVideoSize);
        video.removeEventListener('resize', updateVideoSize);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [videoDimensions, videoUrl]);

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
      // Ensure exercise IDs are always odd so breaks (even IDs) are excluded
      id: nextExerciseId.current,
      name,
      start,
      end,
    };
    // Increment by 2 to keep IDs odd: 1,3,5,...
    nextExerciseId.current += 2;
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
            {/* All Exercises Editable Section - Always visible */}
            <div className="odd-exercises-section" style={{ marginBottom: '20px', padding: '10px', background: '#fafafa', borderRadius: '8px', border: '2px solid #764ba2' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#764ba2' }}>
                Ushtrimet ne video te shtuara manualisht - {exercises.length}
              </h3>
              
              {/* Preview Timeline (ALL exercises) */}
              <div style={{ marginBottom: '16px', background: '#1a1a1a', padding: '12px', borderRadius: '6px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600, color: '#fff' }}>Preview Timeline</h4>
                {exercises.length === 0 ? (
                  <div style={{ color: '#888', fontStyle: 'italic', fontSize: '12px' }}>
                    No exercises added yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {exercises.map(exercise => (
                      <div key={exercise.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '4px', height: '40px', background: '#667eea', borderRadius: '2px' }} />
                        <div style={{ flex: 1, background: '#2a2a2a', padding: '8px 10px', borderRadius: '4px', border: '1px solid #3a3a3a' }}>
                          <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                            {Math.floor(exercise.start)}s - {Math.floor(exercise.end)}s
                          </div>
                          <input
                            type="text"
                            value={exercise.name}
                            onChange={e => {
                              const newName = e.target.value;
                              setExercises(prev => prev.map(ei => ei.id === exercise.id ? { ...ei, name: newName } : ei));
                            }}
                            style={{
                              width: '100%',
                              background: '#1a1a1a',
                              border: '1px solid #4a4a4a',
                              borderRadius: '3px',
                              padding: '4px 6px',
                              fontSize: '12px',
                              color: '#fff',
                              fontWeight: 500
                            }}
                            placeholder="Exercise name"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* If user has generated an automatic preview but not added yet, show it here too */}
                {previewSegments && previewSegments.length > 0 && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #333' }}>
                    <h5 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: '#ddd' }}>Pending Preview (not yet added)</h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {previewSegments.map((seg, i) => (
                        <div key={`preview-${i}`} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 80px', gap: '8px', alignItems: 'center' }}>
                          <div style={{ fontSize: 11, color: '#bbb' }}>{Math.floor(seg.start)}s - {Math.floor(seg.end)}s</div>
                          <input
                            type="text"
                            value={seg.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPreviewSegments(prev => prev.map((s, idx) => idx === i ? { ...s, name: val } : s));
                            }}
                            style={{ width: '100%', background: '#2a2a2a', border: '1px solid #555', color: '#fff', borderRadius: 4, padding: '6px 8px', fontSize: 12 }}
                          />
                          <button
                            onClick={() => handleAddExercise(seg.name, seg.start, seg.end)}
                            style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 8px', cursor: 'pointer', fontSize: 12 }}
                          >
                            Add
                          </button>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => {
                          previewSegments.forEach(seg => handleAddExercise(seg.name, seg.start, seg.end));
                          // Don't clear previewSegments - keep them for processing video
                          // setPreviewSegments([]);
                        }}
                        style={{ background: '#667eea', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 12px', cursor: 'pointer', fontSize: 12 }}
                      >
                        Add All to Exercises
                      </button>
                      <button
                        onClick={() => setPreviewSegments([])}
                        style={{ background: '#444', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 12px', cursor: 'pointer', fontSize: 12 }}
                      >
                        Clear Preview
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {exercises.length === 0 ? (
                <div style={{ color: '#888', fontStyle: 'italic', fontSize: '13px' }}>
                  No exercises yet. Add exercises using the Media panel below.
                </div>
              ) : null}
            </div>

            {activePanel === 'media' && (
              <MediaLibrary
                videoUrl={videoUrl}
                videoDimensions={videoDimensions}
                onAddExercise={handleAddExercise}
                onAddOverlay={handleAddOverlay}
                currentTime={currentTime}
                videoRef={videoRef}
                playing={playing}
                videoDuration={duration}
                onPreviewSegmentsChange={onPreviewSegmentsChange}
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
              <div 
                ref={videoContainerRef}
                style={{ position: 'relative', width: '100%', height: '100%', maxHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
              >
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls={true}
                  controlsList="nodownload nofullscreen"
                  disablePictureInPicture={true}
                  preload="auto"
                  style={{ width: '100%', height: '100%', maxHeight: '70vh', display: 'block', objectFit: 'contain' }}
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
                <div 
                  className="overlay-preview-layer" 
                  style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    width: '100%', 
                    height: '100%', 
                    pointerEvents: 'none', 
                    overflow: 'visible',
                    zIndex: 10
                  }}
                >
                {/* Quick toggle button to open auto-generation panel */}
                {!showAutoPanel && (
                  <div style={{ position: 'absolute', right: 12, top: 12, pointerEvents: 'auto' }}>
                    <button onClick={() => setShowAutoPanel(true)}
                      style={{ background: '#764ba2', color: '#fff', border: '1px solid #555', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>
                      Automatic
                    </button>
                  </div>
                )}
                {overlays
                  .filter(ov => ov.type === 'timer' && currentTime >= ov.startTime && currentTime <= ov.endTime)
                  .map(ov => {
                    // Calculate centered position based on video's rendered size
                    let left: string | number;
                    let top: string | number;

                    if (videoRenderedSize) {
                      const xPercent = Math.max(0, Math.min(100, ov.x)) / 100;
                      const yPercent = Math.max(0, Math.min(100, ov.y)) / 100;
                      const xPos = videoRenderedSize.left + (videoRenderedSize.width * xPercent);
                      const yPos = videoRenderedSize.top + (videoRenderedSize.height * yPercent);
                      left = xPos;
                      top = yPos;
                    } else {
                      left = `${Math.max(0, Math.min(100, ov.x))}%`;
                      top = `${Math.max(0, Math.min(100, ov.y))}%`;
                    }

                    return (
                      <div
                        key={`live-${ov.id}`}
                        style={{
                          position: 'absolute',
                          left: typeof left === 'number' ? `${left}px` : left,
                          top: typeof top === 'number' ? `${top}px` : top,
                          transform: 'translate(-50%, -50%)',
                          backgroundColor: 'transparent',
                          borderRadius: 0,
                          padding: 0,
                          color: '#fff',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          textAlign: 'center',
                          zIndex: 1000,
                        }}
                      >
                        <div style={{ fontSize: Math.max(24, Math.floor((ov.fontSize || 18) * 1.2)), lineHeight: 1.1, fontWeight: 700, marginBottom: 6 }}>
                          {ov.text || ''}
                        </div>
                        <div style={{ fontSize: Math.max(32, Math.floor((ov.fontSize || 18) * 1.6)), fontWeight: 700 }}>
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
                {/* Auto-generation panel rendered at top-right over the video */}
                {showAutoPanel && (
                  <div
                    className="auto-panel"
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: 12,
                      width: 340,
                      maxHeight: 360,
                      backgroundColor: 'rgba(26,26,26,0.95)',
                      border: '1px solid #444',
                      borderRadius: 8,
                      padding: 12,
                      color: '#fff',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                      pointerEvents: 'auto'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>Automatic Generation</strong>
                      <button onClick={() => setShowAutoPanel(false)} style={{ background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer' }}>✕</button>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, color: '#bbb' }}>Video length: {Math.round(duration)}s</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                      <div>
                        <label style={{ fontSize: 11, color: '#ccc' }}>Exercise sec</label>
                        <input type="number" value={autoExerciseTime} min={1} onChange={(e) => { setAutoExerciseTime(parseInt(e.target.value)||40); setPreviewSegments([]); }}
                          style={{ width: '100%', background: '#2a2a2a', border: '1px solid #555', color: '#fff', borderRadius: 4, padding: '6px 8px' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: '#ccc' }}>Break sec</label>
                        <input type="number" value={autoBreakTime} min={1} onChange={(e) => { setAutoBreakTime(parseInt(e.target.value)||20); setPreviewSegments([]); }}
                          style={{ width: '100%', background: '#2a2a2a', border: '1px solid #555', color: '#fff', borderRadius: 4, padding: '6px 8px' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: '#ccc' }}>Exercise name</label>
                        <input type="text" value={autoExerciseName} onChange={(e) => setAutoExerciseName(e.target.value||'Exercise')}
                          style={{ width: '100%', background: '#2a2a2a', border: '1px solid #555', color: '#fff', borderRadius: 4, padding: '6px 8px' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: '#ccc' }}>Break name</label>
                        <input type="text" value={autoBreakName} onChange={(e) => setAutoBreakName(e.target.value||'Break')}
                          style={{ width: '100%', background: '#2a2a2a', border: '1px solid #555', color: '#fff', borderRadius: 4, padding: '6px 8px' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: '#ccc' }}>First start (s)</label>
                        <input type="number" value={autoFirstExerciseStart} min={0} step={0.1} onChange={(e) => { setAutoFirstExerciseStart(parseFloat(e.target.value)||0); setPreviewSegments([]); }}
                          style={{ width: '100%', background: '#2a2a2a', border: '1px solid #555', color: '#fff', borderRadius: 4, padding: '6px 8px' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                      <button
                        onClick={() => {
                          if (duration <= 0) return;
                          const startTime = Math.max(0, Math.min(autoFirstExerciseStart, duration - 1));
                          const segs: Array<{ name: string; start: number; end: number; type: 'exercise'|'break' }> = [];
                          let pos = startTime; let idx = 1;
                          while (pos < duration) {
                            const eEnd = Math.min(pos + autoExerciseTime, duration);
                            if (eEnd > pos) { segs.push({ name: `${autoExerciseName} ${idx}`, start: pos, end: eEnd, type: 'exercise' }); pos = eEnd; idx++; }
                            if (pos < duration) {
                              const bEnd = Math.min(pos + autoBreakTime, duration);
                              if (bEnd > pos) { segs.push({ name: autoBreakName, start: pos, end: bEnd, type: 'break' }); pos = bEnd; }
                            }
                          }
                          // Set preview segments for user to review before adding
                          setPreviewSegments(segs);
                        }}
                        style={{ flex: 1, background: '#667eea', color: '#fff', border: 'none', borderRadius: 4, padding: '8px', cursor: 'pointer' }}
                      >
                        Preview
                      </button>
                      {previewSegments.length > 0 && (
                        <button
                          onClick={() => {
                            previewSegments.forEach(seg => handleAddExercise(seg.name, seg.start, seg.end));
                            // Don't clear previewSegments - keep them for processing video
                            // setPreviewSegments([]);
                            setShowAutoPanel(false);
                          }}
                          style={{ flex: 1, background: '#22c55e', color: '#fff', border: 'none', borderRadius: 4, padding: '8px', cursor: 'pointer' }}
                        >
                          Add All
                        </button>
                      )}
                    </div>
                    <div style={{ marginTop: 10, maxHeight: 160, overflowY: 'auto', borderTop: '1px solid #444', paddingTop: 8 }}>
                      {previewSegments.length === 0 ? (
                        <div style={{ fontSize: 12, color: '#888' }}>No preview yet. Click Preview.</div>
                      ) : (
                        previewSegments.map((seg, i) => (
                          <div key={i} style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 8, alignItems: 'center', padding: '6px 8px', background: seg.type==='break' ? '#2d2a22' : '#333', borderLeft: `3px solid ${seg.type==='break' ? '#f59e0b' : '#667eea'}`, borderRadius: 4, marginBottom: 6 }}>
                            <div style={{ fontSize: 11, color: '#bbb', textAlign: 'center' }}>{Math.floor(seg.start)}s - {Math.floor(seg.end)}s</div>
                            <input type="text" value={seg.name} onChange={(e)=> setPreviewSegments(prev=> prev.map((s, idx)=> idx===i ? { ...s, name: e.target.value } : s))}
                              style={{ width: '100%', background: '#2a2a2a', border: '1px solid #555', color: '#fff', borderRadius: 4, padding: '6px 8px', fontSize: 12 }} />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
                </div>
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
            component={(useOverlayComposition ? OverlayVideoComposition : WorkoutVideoComposition) as any}
            inputProps={{
              videoUrl,
              exercises: exercises.length > 0 ? exercises : undefined,
              overlays: overlays.length > 0 ? overlays : undefined,
              previews: []
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

