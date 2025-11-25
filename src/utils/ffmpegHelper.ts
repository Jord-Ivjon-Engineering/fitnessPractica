import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

export const initFFmpeg = async (): Promise<FFmpeg> => {
  if (ffmpeg) return ffmpeg;
  
  ffmpeg = new FFmpeg();
  
  try {
    // Try using CDN URLs directly first
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
  } catch (error) {
    console.error('Error loading FFmpeg from CDN, trying alternative method:', error);
    
    // Fallback: try loading without blob URLs
    try {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await ffmpeg.load({
        coreURL: `${baseURL}/ffmpeg-core.js`,
        wasmURL: `${baseURL}/ffmpeg-core.wasm`,
      });
    } catch (fallbackError) {
      console.error('Error loading FFmpeg with fallback method:', fallbackError);
      throw new Error('Failed to load FFmpeg. Preview clips will not be available, but overlays will still work.');
    }
  }
  
  return ffmpeg;
};

export const extractVideoSegment = async (
  videoFile: File, 
  startTime: number, 
  endTime: number, 
  outputName: string
): Promise<string> => {
  const ffmpegInstance = await initFFmpeg();
  
  // Write input file
  await ffmpegInstance.writeFile('input.mp4', await fetchFile(videoFile));
  
  // Extract segment
  await ffmpegInstance.exec([
    '-i', 'input.mp4',
    '-ss', startTime.toString(),
    '-to', endTime.toString(),
    '-c', 'copy',
    outputName
  ]);
  
  // Read output
  const data = await ffmpegInstance.readFile(outputName);
  const blob = new Blob([data.buffer], { type: 'video/mp4' });
  
  return URL.createObjectURL(blob);
};

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

export const createPreviewClips = async (
  videoFile: File, 
  exercises: Exercise[]
): Promise<Preview[]> => {
  const previews: Preview[] = [];
  
  for (const exercise of exercises) {
    // Extract first 3 seconds of each exercise as preview
    const previewDuration = Math.min(3, exercise.end - exercise.start);
    const previewUrl = await extractVideoSegment(
      videoFile,
      exercise.start,
      exercise.start + previewDuration,
      `preview_${exercise.id}.mp4`
    );
    
    previews.push({
      exerciseId: exercise.id,
      url: previewUrl,
      showAt: exercise.start // Show during break before this exercise
    });
  }
  
  return previews;
};

