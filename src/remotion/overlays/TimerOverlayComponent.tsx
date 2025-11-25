import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

interface TimerOverlayComponentProps {
  startTime: number;
  endTime: number;
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  fontSize: number;
  fontColor: string;
  backgroundColor?: string;
  timerType: 'countdown' | 'elapsed';
  timerFormat: 'MM:SS' | 'SS';
  startFrame: number;
  durationInFrames: number;
}

export const TimerOverlayComponent: React.FC<TimerOverlayComponentProps> = ({
  startTime,
  endTime,
  x,
  y,
  fontSize,
  fontColor,
  backgroundColor,
  timerType,
  timerFormat,
  startFrame,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  
  const relativeFrame = frame - startFrame;
  const currentSeconds = relativeFrame / fps;
  
  // Calculate timer value
  let timerValue: number;
  if (timerType === 'countdown') {
    timerValue = Math.max(0, endTime - startTime - currentSeconds);
  } else {
    timerValue = currentSeconds;
  }
  
  // Format timer
  const formatTimer = (seconds: number): string => {
    if (timerFormat === 'SS') {
      return Math.floor(seconds).toString();
    } else {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  };
  
  // Fade in/out animation
  const opacity = interpolate(
    relativeFrame,
    [0, 10, durationInFrames - 10, durationInFrames],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Calculate position in pixels
  const xPos = (width * x) / 100;
  const yPos = (height * y) / 100;

  return (
    <div
      style={{
        position: 'absolute',
        left: xPos,
        top: yPos,
        transform: 'translate(-50%, -50%)',
        fontSize: `${fontSize}px`,
        color: fontColor,
        backgroundColor: backgroundColor || 'rgba(0, 0, 0, 0.7)',
        padding: '16px 24px',
        borderRadius: '12px',
        fontWeight: 'bold',
        textAlign: 'center',
        opacity,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        zIndex: 10,
      }}
    >
      {timerType === 'countdown' ? '⏱️ ' : '⏰ '}
      {formatTimer(timerValue)}
    </div>
  );
};

