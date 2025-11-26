import React from 'react';
import { OverlayVideoComposition } from '../remotion/OverlayVideo';
import { WorkoutVideoComposition } from '../remotion/WorkoutVideo';

// Normalized props for Remotion Player to avoid union type issues
export interface RemotionPreviewProps {
  videoUrl: string;
  exercises: Array<{ id: number; name: string; start: number; end: number }>;
  overlays: Array<{
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
  }>;
}

/**
 * Adapter component that picks the correct composition and normalizes props
 * to keep the Player typing happy.
 */
export const RemotionPreview: React.FC<RemotionPreviewProps> = ({ videoUrl, exercises, overlays }) => {
  const hasOverlays = overlays && overlays.length > 0;
  // Ensure arrays (never undefined) to match composition prop types
  const safeExercises = Array.isArray(exercises) ? exercises : [];
  const safeOverlays = Array.isArray(overlays) ? overlays : [];

  if (hasOverlays) {
    return (
      <OverlayVideoComposition
        videoUrl={videoUrl}
        overlays={safeOverlays}
      />
    );
  }

  return (
    <WorkoutVideoComposition
      videoUrl={videoUrl}
      exercises={safeExercises}
      previews={[]}
    />
  );
};

export default RemotionPreview;
