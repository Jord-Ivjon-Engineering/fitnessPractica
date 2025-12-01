import React from 'react';
import { Composition, Video, Sequence, useVideoConfig } from 'remotion';
import { TimerOverlay } from './TimerOverlay';
import { ExercisePreview } from './ExercisePreview';

interface Exercise {
  id: number;
  name: string;
  start: number;
  end: number;
}

interface Preview {
  exerciseId: number;
  url: string;
  showAt: number;
}

interface WorkoutVideoCompositionProps {
  videoUrl: string;
  exercises: Exercise[];
  previews: Preview[];
}

export const WorkoutVideoComposition: React.FC<WorkoutVideoCompositionProps> = ({ 
  videoUrl, 
  exercises, 
  previews 
}) => {
  const { fps } = useVideoConfig();
  
  // Calculate breaks between exercises
  const segments: Array<{
    type: 'exercise' | 'break';
    name?: string;
    start: number;
    duration: number;
    nextExercise?: string;
    nextExerciseStart?: number;
    previewUrl?: string;
  }> = [];
  
  for (let i = 0; i < exercises.length; i++) {
    const exercise = exercises[i];
    const exerciseDuration = exercise.end - exercise.start;
    
    segments.push({
      type: 'exercise',
      name: exercise.name,
      start: exercise.start,
      duration: exerciseDuration
    });
    
    // Add break if not last exercise and there's a gap between exercises
    if (i < exercises.length - 1) {
      const breakStart = exercise.end;
      const breakEnd = exercises[i + 1].start;
      const breakDuration = breakEnd - breakStart;
      
      // Only add break segment if there's actually a gap (breakDuration > 0)
      if (breakDuration > 0) {
        segments.push({
          type: 'break',
          start: breakStart,
          duration: breakDuration,
          nextExercise: exercises[i + 1].name,
          nextExerciseStart: exercises[i + 1].start,
          previewUrl: previews.find(p => p.exerciseId === exercises[i + 1].id)?.url
        });
      }
    }
  }
  
  return (
    <>
      {/* Base Video */}
      <Video src={videoUrl} />
      
      {/* Render overlays for each segment */}
      {segments.map((segment, index) => (
        <Sequence
          key={index}
          from={Math.floor(segment.start * fps)}
          durationInFrames={Math.floor(segment.duration * fps)}
        >
          <TimerOverlay
            type={segment.type}
            duration={segment.duration}
            startFrame={Math.floor(segment.start * fps)}
          />
          
          {/* Show preview during breaks - show even without preview video */}
          {segment.type === 'break' && segment.nextExercise && (
            <>
              {/* Top-centered Breathe banner during break */}
              <div
                style={{
                  position: 'absolute',
                  top: 24,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 48,
                  textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                  zIndex: 20,
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                }}
              >
                Breathe
              </div>

              {/* Bottom-right mini preview of next exercise: first 5 seconds loop */}
              <div
                style={{
                  position: 'absolute',
                  right: 24,
                  bottom: 24,
                  width: 420,
                  height: 236,
                  borderRadius: 12,
                  overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                  background: '#000',
                  display: 'flex',
                  flexDirection: 'column',
                  zIndex: 20,
                }}
              >
                <div style={{ padding: '8px 10px', color: '#fff', fontSize: 20, fontWeight: 700, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  Next: {segment.nextExercise}
                </div>
                {/* Render the source video as PiP: loop the first 5 seconds of the next exercise */}
                {segment.nextExerciseStart !== undefined && (
                  <Sequence
                    from={0}
                    durationInFrames={Math.floor(segment.duration * fps)}
                  >
                    <Video
                      src={videoUrl}
                      startFrom={Math.floor(segment.nextExerciseStart * fps)}
                      endAt={Math.floor((segment.nextExerciseStart + 5) * fps)}
                      loop
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </Sequence>
                )}
              </div>
            </>
          )}
        </Sequence>
      ))}
    </>
  );
};

// This composition is now registered in Root.tsx

