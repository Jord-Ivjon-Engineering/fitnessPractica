import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { Play, Pause, Plus, Trash2 } from 'lucide-react';

interface Exercise {
  id: number;
  name: string;
  start: number;
  end: number;
}

interface VideoTimelineProps {
  videoUrl: string;
  onExercisesUpdate: (exercises: Exercise[]) => void;
  onDurationChange?: (duration: number) => void;
}

const VideoTimeline: React.FC<VideoTimelineProps> = ({ videoUrl, onExercisesUpdate, onDurationChange }) => {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [markerMode, setMarkerMode] = useState<'start' | 'end' | null>(null);
  const [tempExercise, setTempExercise] = useState<{ start: number; end: number | null } | null>(null);
  const [useNativePlayer, setUseNativePlayer] = useState(false);
  
  const playerRef = useRef<ReactPlayer>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const nativeVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    console.log('VideoTimeline - videoUrl:', videoUrl);
    if (!videoUrl) {
      console.warn('VideoTimeline - No videoUrl provided');
      return;
    }
    
    // Use native player for blob URLs as they're more reliable
    if (videoUrl.startsWith('blob:')) {
      console.log('VideoTimeline - Using native player for blob URL');
      setUseNativePlayer(true);
    }
  }, [videoUrl]);

  useEffect(() => {
    // Get the video element when player is ready
    if (playerRef.current) {
      try {
        const internalPlayer = (playerRef.current as any).getInternalPlayer?.();
        if (internalPlayer && internalPlayer.tagName === 'VIDEO') {
          videoElementRef.current = internalPlayer as HTMLVideoElement;
          // Set up duration listener
          internalPlayer.addEventListener('loadedmetadata', () => {
            if (internalPlayer.duration && !isNaN(internalPlayer.duration)) {
              setDuration(internalPlayer.duration);
              onDurationChange?.(internalPlayer.duration);
            }
          });
          // Get duration if already loaded
          if (internalPlayer.duration && !isNaN(internalPlayer.duration)) {
            setDuration(internalPlayer.duration);
            onDurationChange?.(internalPlayer.duration);
          }
        }
      } catch (error) {
        console.error('Error accessing internal player:', error);
      }
    }
  }, [videoUrl]);

  const handleProgress = (state: { playedSeconds: number; played: number; loaded: number; loadedSeconds: number }) => {
    setCurrentTime(state.playedSeconds);
  };

  const handleReady = () => {
    // Try to get duration from internal player
    if (playerRef.current) {
      try {
        const internalPlayer = (playerRef.current as any).getInternalPlayer?.();
        if (internalPlayer && internalPlayer.tagName === 'VIDEO') {
          videoElementRef.current = internalPlayer as HTMLVideoElement;
          if (internalPlayer.duration && !isNaN(internalPlayer.duration)) {
            setDuration(internalPlayer.duration);
            onDurationChange?.(internalPlayer.duration);
          }
        }
      } catch (error) {
        console.error('Error in handleReady:', error);
        // Fallback to native player if ReactPlayer fails
        setUseNativePlayer(true);
      }
    }
  };

  // Native video handlers
  const handleNativeTimeUpdate = () => {
    if (nativeVideoRef.current) {
      setCurrentTime(nativeVideoRef.current.currentTime);
    }
  };

  const handleNativeLoadedMetadata = () => {
    if (nativeVideoRef.current && nativeVideoRef.current.duration) {
      setDuration(nativeVideoRef.current.duration);
    }
  };

  const handleNativeSeeked = () => {
    if (nativeVideoRef.current) {
      setCurrentTime(nativeVideoRef.current.currentTime);
    }
  };

  const seekTo = (seconds: number) => {
    if (useNativePlayer && nativeVideoRef.current) {
      nativeVideoRef.current.currentTime = seconds;
      setCurrentTime(seconds);
      return;
    }

    // Try ReactPlayer's seekTo method first
    if (playerRef.current) {
      try {
        const seekMethod = (playerRef.current as any).seekTo;
        if (typeof seekMethod === 'function') {
          seekMethod(seconds, 'seconds');
          setCurrentTime(seconds);
          return;
        }
      } catch (error) {
        // Fall through to direct video element access
      }
    }
    
    // Fallback: use direct video element access
    if (videoElementRef.current) {
      videoElementRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    } else if (playerRef.current) {
      // Try to get internal player on the fly
      try {
        const internalPlayer = (playerRef.current as any).getInternalPlayer?.();
        if (internalPlayer && internalPlayer.tagName === 'VIDEO') {
          internalPlayer.currentTime = seconds;
          setCurrentTime(seconds);
        }
      } catch (error) {
        console.error('Error seeking:', error);
        // Fallback to native player
        setUseNativePlayer(true);
        if (nativeVideoRef.current) {
          nativeVideoRef.current.currentTime = seconds;
          setCurrentTime(seconds);
        }
      }
    }
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const time = percentage * duration;
    seekTo(time);
  };

  const startMarkingExercise = () => {
    setMarkerMode('start');
    setTempExercise({ start: currentTime, end: null });
  };

  const endMarkingExercise = () => {
    if (tempExercise) {
      const exerciseName = prompt('Enter exercise name:');
      if (exerciseName && exerciseName.trim()) {
        const newExercise: Exercise = {
          ...tempExercise,
          end: currentTime,
          name: exerciseName.trim(),
          id: Date.now()
        };
        const updatedExercises = [...exercises, newExercise].sort((a, b) => a.start - b.start);
        setExercises(updatedExercises);
        onExercisesUpdate(updatedExercises);
      }
      setTempExercise(null);
      setMarkerMode(null);
    }
  };

  const deleteExercise = (id: number) => {
    const updated = exercises.filter(ex => ex.id !== id);
    setExercises(updated);
    onExercisesUpdate(updated);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!videoUrl) {
    return (
      <div className="video-timeline-container">
        <div className="error-message">No video URL provided. Please upload a video first.</div>
      </div>
    );
  }

  return (
    <div className="video-timeline-container">
      <div className="video-player-wrapper">
        {useNativePlayer ? (
          <video
            ref={nativeVideoRef}
            src={videoUrl}
            controls={false}
            style={{ width: '100%', height: 'auto', display: 'block' }}
            onTimeUpdate={handleNativeTimeUpdate}
            onLoadedMetadata={handleNativeLoadedMetadata}
            onSeeked={handleNativeSeeked}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
        ) : (
          <ReactPlayer
            ref={playerRef}
            url={videoUrl}
            playing={playing}
            controls={false}
            width="100%"
            height="auto"
            onProgress={handleProgress}
            onReady={handleReady}
            onError={(error) => {
              console.error('ReactPlayer error:', error);
              setUseNativePlayer(true);
            }}
            progressInterval={100}
            config={{
              file: {
                attributes: {
                  onLoadedMetadata: (e: React.SyntheticEvent<HTMLVideoElement>) => {
                    const target = e.target as HTMLVideoElement;
                  videoElementRef.current = target;
                  if (target.duration && !isNaN(target.duration)) {
                    setDuration(target.duration);
                    onDurationChange?.(target.duration);
                  }
                  }
                }
              }
            }}
          />
        )}
      </div>

      <div className="controls">
        <button onClick={() => {
          if (useNativePlayer && nativeVideoRef.current) {
            if (playing) {
              nativeVideoRef.current.pause();
            } else {
              nativeVideoRef.current.play();
            }
          }
          setPlaying(!playing);
        }}>
          {playing ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
        
        {!markerMode && (
          <button onClick={startMarkingExercise} className="marker-btn">
            <Plus size={20} /> Mark Exercise Start
          </button>
        )}
        
        {markerMode === 'start' && (
          <button onClick={endMarkingExercise} className="marker-btn end">
            Mark Exercise End
          </button>
        )}
      </div>

      <div className="timeline" onClick={handleTimelineClick}>
        <div className="timeline-progress" style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} />
        
        {/* Render exercise segments */}
        {exercises.map((exercise) => (
          <div
            key={exercise.id}
            className="exercise-segment"
            style={{
              left: `${duration > 0 ? (exercise.start / duration) * 100 : 0}%`,
              width: `${duration > 0 ? ((exercise.end - exercise.start) / duration) * 100 : 0}%`
            }}
            title={exercise.name}
          />
        ))}
        
        {/* Render temp marker */}
        {tempExercise && duration > 0 && (
          <div
            className="temp-marker"
            style={{
              left: `${(tempExercise.start / duration) * 100}%`,
              width: `${tempExercise.end ? ((tempExercise.end - tempExercise.start) / duration) * 100 : ((currentTime - tempExercise.start) / duration) * 100}%`
            }}
          />
        )}
      </div>

      {/* Exercise List */}
      <div className="exercise-list">
        <h3>Marked Exercises</h3>
        {exercises.length === 0 ? (
          <p>No exercises marked yet</p>
        ) : (
          <ul>
            {exercises.map((exercise) => (
              <li key={exercise.id}>
                <span>{exercise.name}</span>
                <span>{formatTime(exercise.start)} - {formatTime(exercise.end)}</span>
                <span>Duration: {formatTime(exercise.end - exercise.start)}</span>
                <button onClick={() => deleteExercise(exercise.id)}>
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default VideoTimeline;

