import React from 'react';
import { Play, Pause, Undo, Redo, ZoomIn, ZoomOut, Download, Save } from 'lucide-react';
import '../../styles/Toolbar.css';

interface ToolbarProps {
  onPlayPause: () => void;
  playing: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  zoom: number;
  onExport: () => void;
  onSave: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  onPlayPause,
  playing,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onZoomIn,
  onZoomOut,
  zoom,
  onExport,
  onSave,
}) => {
  return (
    <div className="editor-toolbar">
      <div className="toolbar-section">
        <button onClick={onPlayPause} className="toolbar-btn play-btn">
          {playing ? <Pause size={20} /> : <Play size={20} />}
        </button>
      </div>

      <div className="toolbar-section">
        <button onClick={onUndo} disabled={!canUndo} className="toolbar-btn" title="Undo">
          <Undo size={18} />
        </button>
        <button onClick={onRedo} disabled={!canRedo} className="toolbar-btn" title="Redo">
          <Redo size={18} />
        </button>
      </div>

      <div className="toolbar-section">
        <button onClick={onZoomOut} className="toolbar-btn" title="Zoom Out">
          <ZoomOut size={18} />
        </button>
        <span className="zoom-indicator">{Math.round(zoom * 100)}%</span>
        <button onClick={onZoomIn} className="toolbar-btn" title="Zoom In">
          <ZoomIn size={18} />
        </button>
      </div>

      <div className="toolbar-section toolbar-actions">
        <button onClick={onSave} className="toolbar-btn save-btn" title="Save">
          <Save size={18} /> Save
        </button>
        <button onClick={onExport} className="toolbar-btn export-btn" title="Export">
          <Download size={18} /> Export
        </button>
      </div>
    </div>
  );
};

export default Toolbar;

