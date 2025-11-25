import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

interface TimerOverlayProps {
  type: 'exercise' | 'break';
  duration: number;
  startFrame: number;
}

export const TimerOverlay: React.FC<TimerOverlayProps> = ({ type, duration, startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const relativeFrame = frame - startFrame;
  const currentSeconds = Math.floor(relativeFrame / fps);
  const remainingSeconds = Math.max(0, duration - currentSeconds);
  
  const opacity = interpolate(
    relativeFrame,
    [0, 10, duration * fps - 10, duration * fps],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div
      style={{
        position: 'absolute',
        top: 40,
        right: 40,
        backgroundColor: type === 'exercise' ? '#10b981' : '#f59e0b',
        color: 'white',
        padding: '20px 30px',
        borderRadius: 12,
        fontSize: 48,
        fontWeight: 'bold',
        opacity,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}
    >
      <div style={{ fontSize: 24, marginBottom: 8 }}>
        {type === 'exercise' ? '🏋️ Exercise' : '⏸️ Break'}
      </div>
      <div>{formatTime(remainingSeconds)}</div>
    </div>
  );
};

