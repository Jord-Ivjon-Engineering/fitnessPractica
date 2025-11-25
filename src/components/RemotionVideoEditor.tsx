import React, { useState } from 'react';
import { Player } from '@remotion/player';
import { OverlayVideoComposition } from '../remotion/OverlayVideo';
import { WorkoutVideoComposition } from '../remotion/WorkoutVideo';
import { Overlay } from './VideoOverlayEditor';
import { Download, Play, Loader2, Info } from 'lucide-react';

interface Exercise {
  id: number;
  name: string;
  start: number;
  end: number;
}

interface RemotionVideoEditorProps {
  videoUrl: string;
  videoDuration: number;
  exercises?: Exercise[];
  overlays?: Overlay[];
  onExportComplete?: (videoUrl: string) => void;
}

const RemotionVideoEditor: React.FC<RemotionVideoEditorProps> = ({
  videoUrl,
  videoDuration,
  exercises = [],
  overlays = [],
  onExportComplete,
}) => {
  const [editorMode, setEditorMode] = useState<'preview' | 'info'>('preview');

  // Determine which composition to use
  const useOverlayComposition = overlays.length > 0;
  const compositionId = useOverlayComposition ? 'OverlayVideo' : 'WorkoutVideo';
  const durationInFrames = Math.ceil(videoDuration * 30);

  const handleExportToServer = async () => {
    // Export data to server for rendering
    const exportData = {
      videoUrl,
      exercises: exercises.length > 0 ? exercises : undefined,
      overlays: overlays.length > 0 ? overlays : undefined,
      duration: videoDuration,
      compositionId,
    };

    // Copy to clipboard for easy server-side rendering
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    alert('Export data copied to clipboard! Use Remotion CLI to render:\n\nnpx remotion render <composition-id> <output.mp4> --props="<paste-data>"');
  };

  return (
    <div className="remotion-video-editor">
      <div className="editor-header">
        <h2>Remotion Video Editor</h2>
        <div className="editor-mode-tabs">
          <button
            className={editorMode === 'preview' ? 'active' : ''}
            onClick={() => setEditorMode('preview')}
          >
            Preview
          </button>
          <button
            className={editorMode === 'info' ? 'active' : ''}
            onClick={() => setEditorMode('info')}
          >
            Export Info
          </button>
        </div>
      </div>

      {editorMode === 'preview' && (
        <div className="preview-container">
          <Player
            component={useOverlayComposition ? OverlayVideoComposition : WorkoutVideoComposition}
            inputProps={{
              videoUrl,
              exercises: exercises.length > 0 ? exercises : undefined,
              overlays: overlays.length > 0 ? overlays : undefined,
            }}
            durationInFrames={durationInFrames}
            fps={30}
            compositionWidth={1920}
            compositionHeight={1080}
            style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}
            controls
            acknowledgeRemotionLicense
          />
        </div>
      )}

      {editorMode === 'info' && (
        <div className="export-container">
          <div className="export-info">
            <h3>
              <Info size={24} style={{ display: 'inline', marginRight: '10px' }} />
              Remotion Export Information
            </h3>
            <div className="info-section">
              <h4>Composition Details</h4>
              <p><strong>Composition ID:</strong> {compositionId}</p>
              <p><strong>Duration:</strong> {Math.ceil(videoDuration)}s ({durationInFrames} frames)</p>
              <p><strong>FPS:</strong> 30</p>
              <p><strong>Resolution:</strong> 1920x1080</p>
              {exercises.length > 0 && <p><strong>Exercises:</strong> {exercises.length}</p>}
              {overlays.length > 0 && <p><strong>Overlays:</strong> {overlays.length}</p>}
            </div>

            <div className="info-section">
              <h4>Export Options</h4>
              <p>Remotion video rendering is best done server-side using the Remotion CLI.</p>
              <p>You can:</p>
              <ol>
                <li>Use the "Process & Export Video" button (uses FFmpeg backend)</li>
                <li>Export using Remotion CLI on your server</li>
                <li>Use Remotion Studio for advanced editing</li>
              </ol>
            </div>

            <div className="info-section">
              <h4>Remotion CLI Command</h4>
              <pre className="code-block">
{`npx remotion render ${compositionId} output.mp4 \\
  --props='${JSON.stringify({
  videoUrl,
  exercises: exercises.length > 0 ? exercises : undefined,
  overlays: overlays.length > 0 ? overlays : undefined,
  duration: videoDuration,
}, null, 2)}'`}
              </pre>
            </div>

            <button
              onClick={handleExportToServer}
              className="btn-export"
            >
              <Download size={20} /> Copy Export Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RemotionVideoEditor;

