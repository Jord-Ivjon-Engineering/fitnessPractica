import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RenderProps {
  videoUrl: string;
  exercises?: Array<{ id: number; name: string; start: number; end: number }>;
  overlays?: Array<{
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
  }>;
  duration: number;
}

async function renderVideo(
  compositionId: 'WorkoutVideo' | 'OverlayVideo',
  outputPath: string,
  props: RenderProps
) {
  console.log('Bundling Remotion code...');
  
  const bundled = await bundle({
    entryPoint: path.resolve(__dirname, '../src/remotion/Root.tsx'),
    webpackOverride: (config) => config,
  });

  console.log('Selecting composition...');
  const composition = await selectComposition({
    serveUrl: bundled,
    id: compositionId,
    inputProps: props,
  });

  console.log(`Rendering ${compositionId} to ${outputPath}...`);
  console.log(`Duration: ${props.duration}s (${composition.durationInFrames} frames)`);

  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: props,
    onProgress: ({ progress }) => {
      console.log(`Progress: ${Math.round(progress * 100)}%`);
    },
  });

  console.log(`✅ Video rendered successfully: ${outputPath}`);
}

// CLI usage
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: tsx render-video.ts <composition-id> <output-path> [props-json]');
  console.error('Example: tsx render-video.ts OverlayVideo output.mp4 \'{"videoUrl":"...","duration":60}\'');
  process.exit(1);
}

const [compositionId, outputPath, propsJson] = args;

if (compositionId !== 'WorkoutVideo' && compositionId !== 'OverlayVideo') {
  console.error('Composition ID must be either "WorkoutVideo" or "OverlayVideo"');
  process.exit(1);
}

let props: RenderProps;
if (propsJson) {
  try {
    props = JSON.parse(propsJson);
  } catch (e) {
    console.error('Invalid JSON props:', e);
    process.exit(1);
  }
} else {
  console.error('Props JSON is required');
  process.exit(1);
}

renderVideo(compositionId as 'WorkoutVideo' | 'OverlayVideo', outputPath, props)
  .catch((error) => {
    console.error('Render error:', error);
    process.exit(1);
  });

