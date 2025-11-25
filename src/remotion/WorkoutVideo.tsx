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
            <ExercisePreview
              videoSrc={segment.previewUrl || ''}
              exerciseName={segment.nextExercise}
              startFrame={Math.floor(segment.start * fps)}
              duration={segment.duration}
            />
          )}
        </Sequence>
      ))}
    </>
  );
};

// This composition is now registered in Root.tsx

