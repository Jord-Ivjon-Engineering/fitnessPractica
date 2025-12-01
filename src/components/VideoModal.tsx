import React, { useRef, useEffect, useState } from 'react';
import { X, Lock, ArrowLeft, Maximize, Minimize } from 'lucide-react';
import { trainingProgramApi } from '@/services/api';

interface VideoModalProps {
  isOpen: boolean;
  videoUrl: string;
  videoTitle?: string;
  videoId?: number;
  programId?: number;
  // percentage 0-100 where the user left off
  initialProgressPercent?: number;
  // all videos in the program with their progress
  allVideos?: Array<{ id: number; title: string | null; createdAt: string; url: string; exercisesData?: any }>;
  videoProgress?: Record<number, number>; // videoId -> percentage
  exercisesData?: {
    exercises: Array<{ name: string; startTime: number; endTime: number }>;
    breaks: Array<{ startTime: number; endTime: number; duration: number; nextExerciseName: string }>;
  } | null;
  onVideoSelect?: (videoId: number, videoUrl: string, videoTitle: string, progress: number) => void;
  onProgressUpdate?: (videoId: number, progress: number) => void;
  onClose: () => void;
}

const VideoModal: React.FC<VideoModalProps> = ({ isOpen, videoUrl, videoTitle, videoId, programId, initialProgressPercent, allVideos, videoProgress, exercisesData, onVideoSelect, onProgressUpdate, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedPercentRef = useRef<number>(0);
  const lastBreakStartTimeRef = useRef<number>(-1); // Track which break we last seeked for (persist across renders)
  const exitAnimationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const showPreviewRef = useRef<boolean>(false);
  const isAnimatingOutRef = useRef<boolean>(false);
  const countdownRef = useRef<number | null>(null);
  const [currentProgress, setCurrentProgress] = useState<number>(initialProgressPercent || 0);
  const [currentBreak, setCurrentBreak] = useState<{ startTime: number; endTime: number; duration: number; nextExerciseName: string; nextExerciseStartTime: number } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [breakCountdown, setBreakCountdown] = useState<number | null>(null);

  // Reset current progress when video changes
  useEffect(() => {
    setCurrentProgress(initialProgressPercent || 0);
    setCurrentBreak(null);
    setShowPreview(false);
    setIsAnimatingOut(false);
    setCountdown(null);
    countdownRef.current = null;
    lastBreakStartTimeRef.current = -1; // Reset break tracking when video changes
    showPreviewRef.current = false;
    isAnimatingOutRef.current = false;
    if (exitAnimationTimeoutRef.current) {
      clearTimeout(exitAnimationTimeoutRef.current);
      exitAnimationTimeoutRef.current = null;
    }
  }, [videoId, initialProgressPercent]);

  // Countdown timer for program videos (start-of-video logic)
  useEffect(() => {
    // Only show countdown for program videos (when programId is provided)
    if (!isOpen || !programId || !videoRef.current) {
      setCountdown(null);
      countdownRef.current = null;
      return;
    }

    const video = videoRef.current;

    // If we have exercises and the first exercise starts AFTER 00:00,
    // we do NOT pause at the start. Instead, we use a running countdown
    // similar to breaks (handled in a separate effect below).
    const firstExerciseStartTime = exercisesData?.exercises?.[0]?.startTime ?? 0;
    if (firstExerciseStartTime > 0) {
      setCountdown(null);
      countdownRef.current = null;
      return;
    }

    // If first exercise starts at 00:00 (or no exercises data), use the original paused countdown logic
    // Pause video during countdown
    video.pause();

    // Prevent video from playing during countdown
    const handlePlay = (e: Event) => {
      if (countdownRef.current !== null && countdownRef.current > 0) {
        e.preventDefault();
        video.pause();
      }
    };

    video.addEventListener('play', handlePlay);

    // Start countdown from 5
    setCountdown(5);
    countdownRef.current = 5;

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownInterval);
          countdownRef.current = null;
          // Remove play listener
          video.removeEventListener('play', handlePlay);
          // Start playing video after countdown ends
          setTimeout(() => {
            video.play().catch(() => {
              // Play failed, ignore
            });
          }, 100);
          return null;
        }
        const newCount = prev - 1;
        countdownRef.current = newCount;
        return newCount;
      });
    }, 1000);

    return () => {
      clearInterval(countdownInterval);
      video.removeEventListener('play', handlePlay);
      countdownRef.current = null;
    };
  }, [isOpen, programId, videoId, exercisesData]);

  // Handle first exercise countdown when it starts after 00:00 (break-style, video keeps playing)
  useEffect(() => {
    if (!isOpen || !programId || !videoRef.current || !exercisesData?.exercises || exercisesData.exercises.length === 0) {
      // Only clear countdown if we're not in the initial paused countdown
      if (countdownRef.current === null) {
        setCountdown(null);
      }
      return;
    }

    const video = videoRef.current;
    const firstExercise = exercisesData.exercises[0];
    const firstExerciseStartTime = firstExercise.startTime;

    // Only handle this if first exercise starts after 00:00
    if (firstExerciseStartTime <= 0) {
      return;
    }

    // Ensure video plays when modal opens (for first exercise after 00:00)
    // The video should play continuously, not pause during countdown
    const ensureVideoPlaying = async () => {
      if (video.paused && video.readyState >= 2) {
        try {
          await video.play();
        } catch (err) {
          // Play failed (might need user interaction), ignore
          console.log('Auto-play prevented, user interaction required');
        }
      }
    };

    // Try to play immediately if video is ready
    if (video.readyState >= 2) {
      ensureVideoPlaying();
    } else {
      // Wait for video to be ready
      const handleCanPlay = () => {
        ensureVideoPlaying();
        video.removeEventListener('canplay', handleCanPlay);
      };
      video.addEventListener('canplay', handleCanPlay);
    }

    // Calculate when to start showing countdown (5 seconds before first exercise)
    const countdownStartTime = Math.max(0, firstExerciseStartTime - 5);

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;

      // If we're in the 5 seconds before the first exercise starts, show countdown
      if (currentTime >= countdownStartTime && currentTime < firstExerciseStartTime) {
        const remaining = Math.ceil(firstExerciseStartTime - currentTime);
        const value = Math.min(5, Math.max(1, remaining));
        setCountdown(value);
        countdownRef.current = value;
        
        // Ensure video continues playing during countdown
        if (video.paused) {
          video.play().catch(() => {
            // Play failed, ignore
          });
        }
      } else if (currentTime >= firstExerciseStartTime) {
        // Past the first exercise start, clear countdown
        if (countdownRef.current !== null) {
          setCountdown(null);
          countdownRef.current = null;
        }
      } else {
        // Before countdown should start, clear countdown
        if (countdownRef.current !== null) {
          setCountdown(null);
          countdownRef.current = null;
        }
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);

    // Initial check
    handleTimeUpdate();

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      // Only clear countdown if this effect is cleaning up before the first exercise
      if (video.currentTime < firstExerciseStartTime) {
        if (countdownRef.current !== null) {
          setCountdown(null);
          countdownRef.current = null;
        }
      }
    };
  }, [isOpen, programId, exercisesData, videoId]);

  // Handle fullscreen: exit video fullscreen and allow container fullscreen via custom button
  useEffect(() => {
    const video = videoRef.current;
    const container = videoContainerRef.current;
    
    if (!video || !container || !isOpen) return;

    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement || 
                                (document as any).webkitFullscreenElement ||
                                (document as any).mozFullScreenElement ||
                                (document as any).msFullscreenElement;
      
      const isVideoFullscreen = fullscreenElement === video;
      
      setIsFullscreen(!!fullscreenElement);
      
      if (isVideoFullscreen) {
        // Video went fullscreen - exit it immediately so popup remains visible
        // We can exit fullscreen programmatically (doesn't require user gesture)
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen().catch(() => {});
        } else if ((document as any).mozCancelFullScreen) {
          (document as any).mozCancelFullScreen().catch(() => {});
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen().catch(() => {});
        }
      }
    };

    // Listen for fullscreen change events
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [isOpen, videoRef.current, videoContainerRef.current]);

  // Custom fullscreen handler for container
  const handleContainerFullscreen = async () => {
    const container = videoContainerRef.current;
    if (!container) return;

    const isCurrentlyFullscreen = document.fullscreenElement || 
                                  (document as any).webkitFullscreenElement ||
                                  (document as any).mozFullScreenElement ||
                                  (document as any).msFullscreenElement;

    try {
      if (isCurrentlyFullscreen) {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      } else {
        // Enter fullscreen on container (requires user gesture - this is called from button click)
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if ((container as any).webkitRequestFullscreen) {
          await (container as any).webkitRequestFullscreen();
        } else if ((container as any).mozRequestFullScreen) {
          await (container as any).mozRequestFullScreen();
        } else if ((container as any).msRequestFullscreen) {
          await (container as any).msRequestFullscreen();
        }
      }
    } catch (err) {
      // Fullscreen operation failed
    }
  };

  // Handle video click to toggle play/pause
  const handleVideoClick = (e: React.MouseEvent<HTMLVideoElement>) => {
    const video = videoRef.current;
    if (!video) return;

    // Get the bounding rectangle of the video element
    const rect = video.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const videoHeight = rect.height;
    
    // Controls are typically in the bottom 15% of the video
    // If click is in the control area, let native controls handle it
    const controlAreaHeight = videoHeight * 0.15;
    const isInControlArea = clickY > (videoHeight - controlAreaHeight);
    
    // Only toggle if clicking on the video area (not controls)
    if (!isInControlArea) {
      // Toggle play/pause
      if (video.paused) {
        video.play().catch(() => {
          // Play failed, ignore
        });
      } else {
        video.pause();
      }
    }
  };

  // Detect breaks and show preview / break countdown
  useEffect(() => {
    if (!videoRef.current || !exercisesData || !exercisesData.breaks || exercisesData.breaks.length === 0) {
      setCurrentBreak(null);
      setShowPreview(false);
      setIsAnimatingOut(false);
      setBreakCountdown(null);
      if (exitAnimationTimeoutRef.current) {
        clearTimeout(exitAnimationTimeoutRef.current);
        exitAnimationTimeoutRef.current = null;
      }
      return;
    }

    const video = videoRef.current;
    
    const checkBreak = () => {
      const currentTime = video.currentTime;
      
      // Find if we're in a break period
      for (const breakInfo of exercisesData.breaks) {
        // Calculate when popup should end (25% before break ends)
        const popupEndTime = breakInfo.endTime - (breakInfo.duration * 0.25);
        const breakLastFiveStart = Math.max(breakInfo.startTime, breakInfo.endTime - 5);

        // If we're in the last 5 seconds of this break, show only the countdown (hide popup)
        if (currentTime >= breakLastFiveStart && currentTime < breakInfo.endTime) {
          const remaining = Math.ceil(breakInfo.endTime - currentTime);
          setBreakCountdown(Math.min(5, Math.max(1, remaining)));

          // Ensure the side preview popup is hidden while the 5s timer is visible
          setShowPreview(false);
          showPreviewRef.current = false;
          setIsAnimatingOut(false);
          isAnimatingOutRef.current = false;
          return;
        }

        // Handle main break preview window (before the last 5 seconds)
        if (currentTime >= breakInfo.startTime && currentTime < popupEndTime) {
          // Clear any pending exit animation
          if (exitAnimationTimeoutRef.current) {
            clearTimeout(exitAnimationTimeoutRef.current);
            exitAnimationTimeoutRef.current = null;
          }
          
          // Find the next exercise start time
          const nextExercise = exercisesData.exercises.find(ex => ex.name === breakInfo.nextExerciseName);
          const nextExerciseStartTime = nextExercise?.startTime || breakInfo.endTime;
          
          setCurrentBreak({
            ...breakInfo,
            nextExerciseStartTime,
          });
          setShowPreview(true);
          setIsAnimatingOut(false);
          showPreviewRef.current = true;
          isAnimatingOutRef.current = false;
          return;
        }
      }
      
      // Not in any break range
      setBreakCountdown(null);

      // Not in a break - start exit animation if preview is currently showing
      if (showPreviewRef.current && !isAnimatingOutRef.current) {
        isAnimatingOutRef.current = true;
        setShowPreview(false);
        showPreviewRef.current = false;
        // Clear currentBreak after animation completes (500ms)
        exitAnimationTimeoutRef.current = setTimeout(() => {
          setCurrentBreak(null);
          setIsAnimatingOut(false);
          isAnimatingOutRef.current = false;
          exitAnimationTimeoutRef.current = null;
        }, 500);
      }
    };

    const handleTimeUpdate = () => {
      checkBreak();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    
    // Initial check
    checkBreak();

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      if (exitAnimationTimeoutRef.current) {
        clearTimeout(exitAnimationTimeoutRef.current);
        exitAnimationTimeoutRef.current = null;
      }
    };
  }, [exercisesData, videoRef.current]);

  // Preload the preview video when modal opens
  useEffect(() => {
    const previewVideo = previewVideoRef.current;
    if (!previewVideo || !isOpen || !videoUrl) return;

    // Preload the preview video when modal opens
    previewVideo.muted = true;
    previewVideo.playsInline = true;
    
    // Set src if not already set
    if (!previewVideo.src || previewVideo.src !== videoUrl) {
      previewVideo.src = videoUrl;
      previewVideo.load();
    }

    // Don't pre-seek - let the break detection logic handle seeking dynamically
    // when each break occurs, as different breaks have different nextExerciseStartTime values
  }, [isOpen, videoUrl]);

  // Control preview video playback - plays independently during breaks
  // ---------- Replace this whole useEffect in your component ----------
useEffect(() => {
  const previewVideo = previewVideoRef.current;
  const mainVideo = videoRef.current;

  if (!previewVideo || !mainVideo) return;

  // If no break or preview should be hidden, ensure paused and exit
  if (!currentBreak || !showPreview) {
    // ensure preview is paused and we don't leave it playing
    try {
      previewVideo.pause();
    } catch {}
    return;
  }

  // Ensure element is muted before trying to autoplay (critical for browsers)
  previewVideo.muted = true;
  previewVideo.playsInline = true;
  
  // Video is already preloaded, no need to set src or load again

  const previewStartTime = currentBreak.nextExerciseStartTime;
  const previewEndTime = previewStartTime + currentBreak.duration;

  let aborted = false;               // for cleanup to avoid actions after unmount
  let pendingPlay = false;           // avoid duplicate play calls
  let latestPlayPromise: Promise<void> | null = null;
  let isSeeking = false;             // track if a seek is in progress

  const tryPlayPreview = async () => {
    if (aborted) return;
    
    // If already playing or play pending, skip
    if (!previewVideo.paused || pendingPlay) {
      return;
    }

    // If metadata not loaded, wait for canplay or loadedmetadata
    const seekAndPlay = async () => {
      if (aborted) return;
      
      // CRITICAL: Ensure muted is set immediately before play() call
      previewVideo.muted = true;
      previewVideo.playsInline = true;
      
      // Only seek if we haven't already seeked to this position for this break
      const targetTime = previewVideo.duration && previewStartTime <= previewVideo.duration
        ? Math.min(previewStartTime, previewVideo.duration)
        : previewStartTime;
      
      // Check if we need to seek (new break, before start, or beyond end)
      const isNewBreak = lastBreakStartTimeRef.current !== currentBreak.startTime;
      const currentTime = previewVideo.currentTime;
      // Only seek if BEFORE the start time (hasn't started) or BEYOND the end time (needs to loop)
      // Don't seek if video is within the valid range (previewStartTime to previewEndTime)
      const isBeforeStart = currentTime < previewStartTime - 0.5; // Larger buffer to avoid tiny seeks
      const isBeyondEnd = currentTime > previewEndTime + 0.5; // Larger buffer
      // If it's a new break, we need to seek. Otherwise, only seek if outside valid range
      const needsSeek = isNewBreak || (isBeforeStart || isBeyondEnd);
      
      if (needsSeek && !isSeeking) {
        isSeeking = true;
        try {
          // For new breaks, seek to start. For beyond end, loop back to start. For before start, seek to start.
          const seekToTime = isBeyondEnd ? previewStartTime : targetTime;
          previewVideo.currentTime = seekToTime;
          lastBreakStartTimeRef.current = currentBreak.startTime; // Track which break we seeked for (persist in ref)
          
          // Wait for seek to complete before playing
          await new Promise((resolve) => {
            const onSeeked = () => {
              previewVideo.removeEventListener('seeked', onSeeked);
              isSeeking = false;
              resolve(undefined);
            };
            previewVideo.addEventListener('seeked', onSeeked);
            // Timeout fallback
            setTimeout(() => {
              previewVideo.removeEventListener('seeked', onSeeked);
              isSeeking = false;
              resolve(undefined);
            }, 500);
          });
        } catch (err) {
          // seeking might throw if not ready; ignore and let play attempt handle it
          isSeeking = false;
        }
      }

      // Only try to play if not already playing and not seeking
      // Check if video is in valid range and should be playing
      const isInValidRange = currentTime >= previewStartTime - 1 && currentTime <= previewEndTime + 1;
      
      if (previewVideo.paused && !isSeeking && isInValidRange) {
        pendingPlay = true;
        try {
          latestPlayPromise = previewVideo.play();
          await latestPlayPromise;
        } catch (err: any) {
          // suppress expected AbortError
        } finally {
          pendingPlay = false;
          latestPlayPromise = null;
        }
      }
    };

    // If can play now
    if (previewVideo.readyState >= 2) {
      await seekAndPlay();
    } else {
      // wait until we can play through or at least canplay
      const onCanPlay = async () => {
        previewVideo.removeEventListener('canplay', onCanPlay);
        if (!aborted) await seekAndPlay();
      };
      previewVideo.addEventListener('canplay', onCanPlay);
    }
  };

  // Monitor main video time to determine break presence and to loop preview within preview window
  const tick = () => {
    if (aborted) return;
    const mainCurrent = mainVideo.currentTime;
    const isInBreak = mainCurrent >= currentBreak.startTime && mainCurrent < currentBreak.endTime;
    const isMainPlaying = !mainVideo.paused && !mainVideo.ended;
    

    if (isInBreak && isMainPlaying) {
      // ensure preview is playing
      tryPlayPreview();
      // loop the preview within previewStartTime..previewEndTime
      // Only check/loop if video is playing and not currently seeking
      const currentPreviewTime = previewVideo.currentTime;
      if (!previewVideo.paused && !isSeeking && currentPreviewTime >= previewEndTime) {
        // set currentTime back to previewStartTime (clamp)
        try {
          previewVideo.currentTime = previewStartTime;
        } catch (err) {
          // Loop seek error
        }
      }
    } else {
      // pause preview if it's playing (or wait for pending play to finish then pause)
      if (latestPlayPromise) {
        latestPlayPromise
          .then(() => { if (!aborted) previewVideo.pause(); })
          .catch(() => { if (!aborted) previewVideo.pause(); });
      } else {
        try { previewVideo.pause(); } catch {}
      }
    }
  };

  // Use requestAnimationFrame-driven loop for smooth checking while in break
  let rafId: number | null = null;
  const rafLoop = () => {
    tick();
    rafId = requestAnimationFrame(rafLoop);
  };
  rafId = requestAnimationFrame(rafLoop);

  // initial try
  tryPlayPreview();

  return () => {
    aborted = true;
    if (rafId) cancelAnimationFrame(rafId);
    try {
      previewVideo.pause();
    } catch {}
    // clear src? optional:
    // previewVideo.removeAttribute('src'); previewVideo.load();
  };
  }, [currentBreak, showPreview, videoUrl]);


  // Calculate the day number based on video position in the program
  const getDayTitle = () => {
    if (!videoId || !allVideos || allVideos.length === 0) {
      return videoTitle || 'Video';
    }
    
    const videoIndex = allVideos.findIndex(v => v.id === videoId);
    if (videoIndex === -1) {
      return videoTitle || 'Video';
    }
    
    const dayNumber = videoIndex + 1;
    const title = videoTitle || `Exercises for Day ${dayNumber}`;
    
    return `Day ${dayNumber} - ${title}`;
  };

  useEffect(() => {
    if (!isOpen || !videoRef.current) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      return;
    }

    const video = videoRef.current;

    // If an initial progress percent was passed, seek to that position once metadata is loaded
    const handleLoaded = () => {
      if (typeof initialProgressPercent === 'number' && video.duration && initialProgressPercent > 0) {
        try {
          const seekTime = (initialProgressPercent / 100) * video.duration;
          // don't seek beyond duration
          video.currentTime = Math.min(seekTime, Math.max(0, video.duration));
        } catch (e) {
          // Could not set video currentTime
        }
      }

      // initialize lastSavedPercent based on initialProgressPercent (or 0)
      lastSavedPercentRef.current = typeof initialProgressPercent === 'number' ? Math.round(initialProgressPercent) : 0;

      // Decide threshold: for short videos save less frequently by using a larger percent step
      // e.g., videos under 60s use 10% steps, otherwise 5% steps
      const thresholdPercent = video.duration && video.duration < 60 ? 10 : 5;

      // timeupdate fires periodically as the video plays; use it to save when user crosses percent thresholds
      const handleTimeUpdate = () => {
        if (!(video.duration && video.currentTime >= 0)) return;
        
        const rawPercent = (video.currentTime / video.duration) * 100;
        // Treat positions very close to end as 100%
        const percentage = rawPercent >= 99.5 ? 100 : Math.round(rawPercent);
        
        // Update local state for live UI updates
        setCurrentProgress(percentage);
        
        if (percentage === 100) {
          if (videoId && programId) {
            trainingProgramApi.updateVideoProgress(programId, videoId, 100)
              .catch(() => {});
            lastSavedPercentRef.current = 100;
            // Notify parent component about progress update
            onProgressUpdate?.(videoId, 100);
          }
          return;
        }

        if (percentage - lastSavedPercentRef.current >= thresholdPercent) {
          if (videoId && programId) {
            trainingProgramApi.updateVideoProgress(programId, videoId, percentage)
              .catch(() => {});
            lastSavedPercentRef.current = percentage;
            // Notify parent component about progress update
            onProgressUpdate?.(videoId, percentage);
          }
        }
      };

      video.addEventListener('timeupdate', handleTimeUpdate);

      // when video ends, explicitly save 100%
      const handleEnded = () => {
        setCurrentProgress(100);
        if (videoId && programId) {
          trainingProgramApi.updateVideoProgress(programId, videoId, 100)
            .catch(() => {});
          lastSavedPercentRef.current = 100;
          // Notify parent component about progress update
          onProgressUpdate?.(videoId, 100);
        }
      };
      video.addEventListener('ended', handleEnded);

      // store refs so cleanup can remove the listeners
      (video as any).__vp_handleTimeUpdate = handleTimeUpdate;
      (video as any).__vp_handleEnded = handleEnded;
    };

    video.addEventListener('loadedmetadata', handleLoaded);

    return () => {
      // remove any handlers attached on loadedmetadata
      try {
        const stored = (video as any).__vp_handleTimeUpdate;
        if (stored) video.removeEventListener('timeupdate', stored);
      } catch (e) {
        // ignore
      }
      try {
        video.removeEventListener('loadedmetadata', handleLoaded);
      } catch (e) {}
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isOpen, videoId, programId, initialProgressPercent]);

  // Save progress when video is closed
  useEffect(() => {
    return () => {
      if (!isOpen && videoRef.current && videoId && programId) {
        const video = videoRef.current;
        if (video.duration && video.currentTime > 0) {
          const rawPercent = (video.currentTime / video.duration) * 100;
          const percentage = rawPercent >= 99.5 ? 100 : Math.round(rawPercent);
          trainingProgramApi.updateVideoProgress(programId, videoId, percentage)
            .catch(() => {});
        }
      }
    };
  }, [isOpen, videoId, programId]);

  if (!isOpen) return null;

  return (
    <>
      {/* Hide native video fullscreen button (fallback for browsers that don't support controlsList) */}
      <style>{`
        video::-webkit-media-controls-fullscreen-button {
          display: none !important;
        }
      `}</style>
      <div className="fixed inset-0 bg-background z-40 flex flex-col pt-24">
        {/* Custom header with back button and close button */}
      <div className="bg-white dark:bg-slate-900 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-full">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors flex items-center gap-2"
              aria-label="Back to program"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
              <span className="text-sm font-medium text-foreground">Back to Program</span>
            </button>
          </div>
          <div className="flex-1 text-center mx-4">
            <span className="text-lg font-semibold text-foreground">{getDayTitle()}</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
            aria-label="Close video player"
          >
            <X className="w-6 h-6 text-foreground" />
          </button>
        </div>
      </div>

      {/* Main content: video on left, program content on right */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Video player */}
        <div ref={videoContainerRef} className="flex-1 flex items-center justify-center bg-background p-4 overflow-hidden relative">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            controlsList="nofullscreen"
            autoPlay={
              // Allow autoplay if:
              // 1. No countdown is shown, OR
              // 2. Countdown is shown but first exercise starts after 00:00 (video should keep playing)
              countdown === null || 
              (countdown !== null && (exercisesData?.exercises?.[0]?.startTime ?? 0) > 0)
            }
            className="w-full h-full object-contain"
            onClick={handleVideoClick}
          />

          {/* Countdown Overlay - Only show for program videos */}
          {(countdown !== null || breakCountdown !== null) && programId && (
            (() => {
              const displayCountdown = countdown !== null ? countdown : breakCountdown;
              if (displayCountdown === null) return null;
              return (
            <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/30">
              <div className="text-center">
                <div className="text-8xl md:text-9xl font-bold text-white mb-4 drop-shadow-2xl">
                  {displayCountdown}
                </div>
                <div className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">
                  Get Ready
                </div>
              </div>
            </div>
              );
            })()
          )}

          {/* Custom Fullscreen Button */}
          <button
            onClick={handleContainerFullscreen}
            className="absolute top-4 left-4 z-50 p-2 bg-black/70 hover:bg-black/90 text-white rounded-lg transition-colors flex items-center gap-2"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen (keeps preview visible)"}
          >
            {isFullscreen ? (
              <>
                <Minimize className="w-5 h-5" />
                <span className="text-sm font-medium">Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize className="w-5 h-5" />
                <span className="text-sm font-medium">Fullscreen</span>
              </>
            )}
          </button>

          {/* Exercise Preview Box - Slides in from the right during breaks */}
          <div
            className={`absolute right-4 top-1/2 -translate-y-1/2 w-[800px] bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-border overflow-hidden transition-transform duration-500 ease-in-out z-50 ${
              showPreview && currentBreak
                ? 'translate-x-0'
                : 'translate-x-full'
            }`}
            style={{
              maxHeight: '100vh',
            }}
          >
            {(currentBreak || isAnimatingOut) && currentBreak && (
              <>
                {/* Preview Video - Separate muted video element */}
                <div className="relative w-full aspect-video bg-black">
                  <video
                    ref={previewVideoRef}
                    src={videoUrl}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="auto"
                  />
                  {/* Overlay gradient at bottom */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                </div>
                
                {/* Preview Info */}
                <div className="p-4">
                  <div className="text-xs text-muted-foreground mb-1">Next Exercise</div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {currentBreak.nextExerciseName}
                  </h3>
                  <div className="text-sm text-muted-foreground">
                    Starting in {Math.ceil(currentBreak.endTime - (videoRef.current?.currentTime || 0))}s
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right sidebar: program videos list */}
        <div className="w-80 bg-white dark:bg-slate-900 border-l border-border flex flex-col overflow-y-auto">
          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="font-bold text-foreground mb-3">Program Content</h3>
            <div className="space-y-2">
              {(allVideos || []).map((v, index) => {
                // Use live progress for current video, stored progress for others
                const progress = v.id === videoId ? currentProgress : (videoProgress?.[v.id] || 0);
                const isCurrentVideo = v.id === videoId;
                const isCompleted = progress >= 90;
                
                // Check if previous video is completed (for sequential unlock)
                const isFirstVideo = index === 0;
                const previousVideo = index > 0 ? (allVideos || [])[index - 1] : null;
                // Use live progress for previous video if it's the current one
                const previousProgress = previousVideo 
                  ? (previousVideo.id === videoId ? currentProgress : (videoProgress?.[previousVideo.id] || 0))
                  : 100;
                const isPreviousCompleted = previousProgress >= 90;
                const isUnlocked = isFirstVideo || isPreviousCompleted;

                // Format day title
                const dayNumber = index + 1;
                const fullTitle = v.title 
                  ? `Day ${dayNumber} - ${v.title}` 
                  : `Day ${dayNumber}`;
                
                // Truncate title if longer than 40 characters
                const displayTitle = fullTitle.length > 40 
                  ? fullTitle.substring(0, 40) + '...' 
                  : fullTitle;

                return (
                  <div
                    key={v.id}
                    className={`p-3 rounded-lg border transition-all ${
                      isCurrentVideo
                        ? 'bg-primary/10 border-primary'
                        : isUnlocked 
                        ? 'bg-muted hover:bg-muted/80 cursor-pointer'
                        : 'bg-muted/50 opacity-50 cursor-not-allowed'
                    }`}
                    onClick={() => {
                      if (!isUnlocked || isCurrentVideo) return;
                      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
                      const fullUrl = v.url.startsWith('http') ? v.url : `${API_URL}${v.url.startsWith('/') ? '' : '/'}${v.url}`;
                      onVideoSelect?.(v.id, fullUrl, v.title || `Exercises for Day ${dayNumber}`, progress);
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1 flex-1 min-w-0">
                            {!isUnlocked && <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                            <div 
                              className="font-semibold text-sm truncate"
                              title={fullTitle.length > 40 ? fullTitle : undefined}
                            >
                              {displayTitle}
                            </div>
                          </div>
                          {isCompleted && (
                            <span className="text-xs font-bold text-green-600 dark:text-green-400 flex-shrink-0">✓</span>
                          )}
                        </div>
                        
                        {/* Progress percentage */}
                        <div className={`text-xs mb-2 font-medium ${
                          isCurrentVideo 
                            ? 'text-primary' 
                            : isCompleted 
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-muted-foreground'
                        }`}>
                          {!isUnlocked ? 'Locked - Complete previous video' : `${Math.round(progress)}% Complete`}
                        </div>
                        
                        {/* Progress bar */}
                        <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isCompleted
                                ? 'bg-green-500'
                                : 'bg-gradient-to-r from-[hsl(14,90%,55%)] to-[hsl(25,95%,53%)]'
                            }`}
                            style={{ width: `${Math.min(100, Math.round(progress))}%` }}
                          ></div>
                        </div>
                        
                        {/* Status label */}
                        {isCurrentVideo && (
                          <div className="mt-2 text-xs font-semibold text-primary">
                            ▶ Currently Playing
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {(!allVideos || allVideos.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-8">No videos in this program</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default VideoModal;
