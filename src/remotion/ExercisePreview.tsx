import React from 'react';
import { Video, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

interface ExercisePreviewProps {
  videoSrc: string;
  exerciseName: string;
  startFrame: number;
  duration: number;
}

export const ExercisePreview: React.FC<ExercisePreviewProps> = ({ 
  videoSrc, 
  exerciseName, 
  startFrame, 
  duration 
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const relativeFrame = frame - startFrame;
  const isVisible = relativeFrame >= 0 && relativeFrame < duration * fps;
  
  const scale = interpolate(
    relativeFrame,
    [0, 15, duration * fps - 15, duration * fps],
    [0.8, 1, 1, 0.8],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
  
  const opacity = interpolate(
    relativeFrame,
    [0, 10, duration * fps - 10, duration * fps],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
  
  if (!isVisible) return null;
  
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 40,
        left: 40,
        width: 320,
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: 12,
          padding: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: '#000' }}>
          Next: {exerciseName}
        </div>
        {videoSrc ? (
          <Video
            src={videoSrc}
            style={{ width: '100%', borderRadius: 8 }}
            muted
          />
        ) : (
          <div style={{ 
            width: '100%', 
            height: 180, 
            borderRadius: 8, 
            backgroundColor: '#f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6b7280',
            fontSize: 14
          }}>
            Preview clip unavailable
          </div>
        )}
      </div>
    </div>
  );
};

