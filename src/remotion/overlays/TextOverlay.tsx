import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

interface TextOverlayProps {
  text: string;
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  fontSize: number;
  fontColor: string;
  backgroundColor?: string;
  startFrame: number;
  durationInFrames: number;
}

export const TextOverlay: React.FC<TextOverlayProps> = ({
  text,
  x,
  y,
  fontSize,
  fontColor,
  backgroundColor,
  startFrame,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  
  const relativeFrame = frame - startFrame;
  
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
        backgroundColor: backgroundColor || 'transparent',
        padding: backgroundColor ? '12px 24px' : '0',
        borderRadius: backgroundColor ? '8px' : '0',
        fontWeight: 'bold',
        textAlign: 'center',
        opacity,
        textShadow: backgroundColor ? 'none' : '2px 2px 4px rgba(0,0,0,0.8)',
        whiteSpace: 'nowrap',
        zIndex: 10,
      }}
    >
      {text}
    </div>
  );
};

