import React, { useRef, useEffect, useState } from 'react';
import { X, Lock, ArrowLeft } from 'lucide-react';
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
  allVideos?: Array<{ id: number; title: string | null; createdAt: string; url: string }>;
  videoProgress?: Record<number, number>; // videoId -> percentage
  onVideoSelect?: (videoId: number, videoUrl: string, videoTitle: string, progress: number) => void;
  onProgressUpdate?: (videoId: number, progress: number) => void;
  onClose: () => void;
}

const VideoModal: React.FC<VideoModalProps> = ({ isOpen, videoUrl, videoTitle, videoId, programId, initialProgressPercent, allVideos, videoProgress, onVideoSelect, onProgressUpdate, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedPercentRef = useRef<number>(0);
  const [currentProgress, setCurrentProgress] = useState<number>(initialProgressPercent || 0);

  // Reset current progress when video changes
  useEffect(() => {
    setCurrentProgress(initialProgressPercent || 0);
  }, [videoId, initialProgressPercent]);

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
          console.warn('Could not set video currentTime', e);
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
              .catch(err => console.error('Error updating video progress', err));
            lastSavedPercentRef.current = 100;
            // Notify parent component about progress update
            onProgressUpdate?.(videoId, 100);
          }
          return;
        }

        if (percentage - lastSavedPercentRef.current >= thresholdPercent) {
          if (videoId && programId) {
            trainingProgramApi.updateVideoProgress(programId, videoId, percentage)
              .catch(err => console.error('Error updating video progress', err));
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
            .catch(err => console.error('Error updating video progress on ended', err));
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
            .catch(err => console.error('Error updating final video progress', err));
        }
      }
    };
  }, [isOpen, videoId, programId]);

  if (!isOpen) return null;

  return (
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
      <div className="flex-1 flex overflow-hidden">
        {/* Video player */}
        <div className="flex-1 flex items-center justify-center bg-background p-4 overflow-hidden">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            autoPlay
            className="w-full h-full object-contain"
          />
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
                const displayTitle = v.title 
                  ? `Day ${dayNumber} - ${v.title}` 
                  : `Day ${dayNumber}`;

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
                            <div className="font-semibold text-sm truncate">
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
  );
};

export default VideoModal;
