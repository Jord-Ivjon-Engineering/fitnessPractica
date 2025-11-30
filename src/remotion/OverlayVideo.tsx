import React from 'react';
import { Video, Sequence, useVideoConfig, useCurrentFrame } from 'remotion';
import { TextOverlay } from './overlays/TextOverlay';
import { TimerOverlayComponent } from './overlays/TimerOverlayComponent';
import { ImageOverlay } from './overlays/ImageOverlay';

export interface OverlayData {
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
}

interface OverlayVideoCompositionProps {
  videoUrl: string;
  overlays: OverlayData[];
}

export const OverlayVideoComposition: React.FC<OverlayVideoCompositionProps> = ({
  videoUrl,
  overlays
}) => {
  const { fps } = useVideoConfig();

  return (
    <>
      {/* Base Video */}
      <Video src={videoUrl} />

      {/* Render all overlays */}
      {overlays.map((overlay) => {
        const startFrame = Math.floor(overlay.startTime * fps);
        const endFrame = Math.floor(overlay.endTime * fps);
        const durationInFrames = endFrame - startFrame;

        if (durationInFrames <= 0) return null;

        return (
          <Sequence
            key={overlay.id}
            from={startFrame}
            durationInFrames={durationInFrames}
          >
            {overlay.type === 'text' && (
              <TextOverlay
                text={overlay.text || ''}
                x={overlay.x}
                y={overlay.y}
                fontSize={overlay.fontSize || 48}
                fontColor={overlay.fontColor || '#FFFFFF'}
                backgroundColor={overlay.backgroundColor}
                startFrame={startFrame}
                durationInFrames={durationInFrames}
              />
            )}
            {overlay.type === 'timer' && (
              <TimerOverlayComponent
                startTime={overlay.startTime}
                endTime={overlay.endTime}
                x={overlay.x}
                y={overlay.y}
                fontSize={overlay.fontSize || 48}
                fontColor={overlay.fontColor || '#FFFFFF'}
                backgroundColor={overlay.backgroundColor}
                timerType={overlay.timerType || 'countdown'}
                timerFormat={overlay.timerFormat || 'MM:SS'}
                startFrame={startFrame}
                durationInFrames={durationInFrames}
                text={overlay.text}
              />
            )}
            {overlay.type === 'image' && overlay.imageUrl && (
              <ImageOverlay
                imageUrl={overlay.imageUrl}
                x={overlay.x}
                y={overlay.y}
                width={overlay.width || 200}
                height={overlay.height || 200}
                startFrame={startFrame}
                durationInFrames={durationInFrames}
              />
            )}
          </Sequence>
        );
      })}
    </>
  );
};

