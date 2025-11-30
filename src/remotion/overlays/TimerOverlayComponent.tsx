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
  
  // Badge size matching preview and final render
  const badgeSize = 120;
  
  // Font sizes matching preview
  const nameSize = Math.max(12, Math.floor(fontSize * 0.7));
  const timerSize = Math.max(14, Math.floor(fontSize * 0.85));

  return (
    <div
      style={{
        position: 'absolute',
        left: xPos,
        top: yPos,
        transform: 'translate(-50%, -50%)',
        width: badgeSize,
        height: badgeSize,
        backgroundColor: backgroundColor || 'rgba(34, 197, 94, 0.9)', // Green circular badge matching preview
        borderRadius: '50%', // Circular shape
        padding: '8px',
        color: fontColor || '#fff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        opacity,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
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

