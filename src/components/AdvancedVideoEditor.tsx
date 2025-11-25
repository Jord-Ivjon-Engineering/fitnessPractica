import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Player } from '@remotion/player';
import { OverlayVideoComposition } from '../remotion/OverlayVideo';
import { WorkoutVideoComposition } from '../remotion/WorkoutVideo';
import { 
  Play, Pause, ZoomIn, ZoomOut, Scissors, Layers, 
  Film, Image as ImageIcon, Type, Clock, Settings,
  Download, Save, Undo, Redo, Maximize2, X
} from 'lucide-react';
import MultiTrackTimeline from './timeline/MultiTrackTimeline';
import EffectsPanel from './editor/EffectsPanel';
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
  onExercisesChange?: (exercises: Exercise[]) => void;
  onOverlaysChange?: (overlays: Overlay[]) => void;
  onDurationChange?: (duration: number) => void;
  onExport?: (data: { exercises: Exercise[]; overlays: Overlay[] }) => void;
}

const AdvancedVideoEditor: React.FC<AdvancedVideoEditorProps> = ({
  videoUrl,
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
  const [activePanel, setActivePanel] = useState<'media' | 'effects' | 'properties'>('media');
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showRemotionPreview, setShowRemotionPreview] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const nextExerciseId = useRef(1);
  const nextClipId = useRef(1);
  const handleDeleteClipRef = useRef<(clipId: string) => void>();

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

  const useOverlayComposition = overlays.length > 0;
  const durationInFrames = Math.ceil(duration * 30);

  return (
    <div className="advanced-video-editor">
      {/* Top Toolbar */}
      <Toolbar
        onPlayPause={handlePlayPause}
        playing={playing}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onZoomIn={() => setZoom(prev => Math.min(prev + 0.1, 3))}
        onZoomOut={() => setZoom(prev => Math.max(prev - 0.1, 0.5))}
        zoom={zoom}
        onExport={handleExportClick}
        onSave={() => saveHistory()}
      />

      <div className="editor-layout">
        {/* Left Sidebar */}
        <div className="editor-sidebar">
          <div className="sidebar-tabs">
            <button
              className={activePanel === 'media' ? 'active' : ''}
              onClick={() => setActivePanel('media')}
            >
              <Film size={20} /> Media
            </button>
            <button
              className={activePanel === 'effects' ? 'active' : ''}
              onClick={() => setActivePanel('effects')}
            >
              <Layers size={20} /> Effects
            </button>
            <button
              className={activePanel === 'properties' ? 'active' : ''}
              onClick={() => setActivePanel('properties')}
            >
              <Settings size={20} /> Properties
            </button>
          </div>

          <div className="sidebar-content">
            {activePanel === 'media' && (
              <MediaLibrary
                videoUrl={videoUrl}
                onAddExercise={handleAddExercise}
                onAddOverlay={handleAddOverlay}
                currentTime={currentTime}
              />
            )}
            {activePanel === 'effects' && (
              <EffectsPanel
                selectedClip={selectedClip}
                clips={tracks.flatMap(t => t.clips)}
                onEffectAdd={(clipId, effect) => {
                  setTracks(prev => prev.map(track => ({
                    ...track,
                    clips: track.clips.map(clip =>
                      clip.id === clipId
                        ? { ...clip, effects: [...(clip.effects || []), effect] }
                        : clip
                    ),
                  })));
                  saveHistory();
                }}
              />
            )}
            {activePanel === 'properties' && selectedClip && (
              <div className="properties-panel">
                <h3>Clip Properties</h3>
                {/* Properties editing UI */}
              </div>
            )}
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="editor-main">
          {/* Video Preview */}
          <div className="video-preview-container">
            <div className="video-wrapper">
              <video
                ref={videoRef}
                src={videoUrl}
                controls={false}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onTimeUpdate={() => {
                  if (videoRef.current) {
                    setCurrentTime(videoRef.current.currentTime);
                  }
                }}
              />
              <div className="preview-overlay">
                <button onClick={handlePlayPause} className="play-button">
                  {playing ? <Pause size={32} /> : <Play size={32} />}
                </button>
              </div>
            </div>
            <div className="preview-time">
              {formatTime(currentTime)} / {formatTime(duration)}
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

