import React from 'react';
import { Composition, getInputProps } from 'remotion';
import { WorkoutVideoComposition } from './WorkoutVideo';
import { OverlayVideoComposition } from './OverlayVideo';

// Get input props if available (for Remotion Studio)
const inputProps = getInputProps() as {
  videoUrl?: string;
  exercises?: Array<{ id: number; name: string; start: number; end: number }>;
  previews?: Array<{ exerciseId: number; url: string; showAt: number }>;
  overlays?: Array<{
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
  duration?: number;
};

export const RemotionRoot: React.FC = () => {
  const defaultDuration = inputProps.duration || 300; // 5 minutes default
  const defaultVideoUrl = inputProps.videoUrl || '';

  return (
    <>
      {/* Workout Video Composition - for exercise-based editing */}
      <Composition
        id="WorkoutVideo"
        component={WorkoutVideoComposition}
        durationInFrames={defaultDuration * 30}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          videoUrl: defaultVideoUrl,
          exercises: inputProps.exercises || [],
          previews: inputProps.previews || [],
        }}
      />

      {/* Overlay Video Composition - for overlay-based editing */}
      <Composition
        id="OverlayVideo"
        component={OverlayVideoComposition}
        durationInFrames={defaultDuration * 30}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          videoUrl: defaultVideoUrl,
          overlays: inputProps.overlays || [],
        }}
      />
    </>
  );
};

