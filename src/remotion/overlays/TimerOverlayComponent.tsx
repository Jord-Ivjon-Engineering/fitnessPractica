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
  text?: string; // Exercise name label
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
  text,
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

  // Calculate position in pixels (centered)
  const xPos = (width * x) / 100;
  const yPos = (height * y) / 100;
  
  // Font sizes: larger for clarity on export
  const nameSize = Math.max(24, Math.floor(fontSize * 1.2));
  const timerSize = Math.max(32, Math.floor(fontSize * 1.6));

  return (
    <div
      style={{
        position: 'absolute',
        left: xPos,
        top: yPos,
        transform: 'translate(-50%, -50%)',
        width: 'auto',
        height: 'auto',
        backgroundColor: 'transparent',
        borderRadius: 0,
        padding: 0,
        color: fontColor || '#fff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        opacity,
        boxShadow: 'none',
        zIndex: 10,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Exercise name at top */}
      {text && (
        <div style={{ 
          fontSize: `${nameSize}px`, 
          lineHeight: 1.1, 
          fontWeight: 700, 
          marginBottom: 4 
        }}>
          {text}
        </div>
      )}
      {/* Timer at bottom */}
      <div style={{ 
        fontSize: `${timerSize}px`, 
        fontWeight: 600 
      }}>
        {formatTimer(timerValue)}
      </div>
    </div>
  );
};

