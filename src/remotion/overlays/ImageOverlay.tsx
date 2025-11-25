import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Img } from 'remotion';

interface ImageOverlayProps {
  imageUrl: string;
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  width: number;
  height: number;
  startFrame: number;
  durationInFrames: number;
}

export const ImageOverlay: React.FC<ImageOverlayProps> = ({
  imageUrl,
  x,
  y,
  width,
  height,
  startFrame,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { width: videoWidth, height: videoHeight } = useVideoConfig();
  
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

  // Scale animation
  const scale = interpolate(
    relativeFrame,
    [0, 15, durationInFrames - 15, durationInFrames],
    [0.8, 1, 1, 0.8],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Calculate position in pixels
  const xPos = (videoWidth * x) / 100;
  const yPos = (videoHeight * y) / 100;

  return (
    <div
      style={{
        position: 'absolute',
        left: xPos,
        top: yPos,
        transform: `translate(-50%, -50%) scale(${scale})`,
        width: `${width}px`,
        height: `${height}px`,
        opacity,
        zIndex: 10,
      }}
    >
      <Img
        src={imageUrl}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      />
    </div>
  );
};

